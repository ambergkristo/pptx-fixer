import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type AuditReport, type LoadedPresentation } from "../audit/pptxAudit.ts";
import {
  assertSlideXmlSafety,
  assertSlideTextFidelity,
  findChildElements,
  findElements,
  getAttributes,
  getElementChildren,
  type OrderedXmlDocument,
  type OrderedXmlNode
} from "./textFidelity.ts";

export interface ChangedLineSpacingSummary {
  slide: number;
  fromLineSpacing: string;
  toLineSpacing: string;
  count: number;
}

export interface SkippedLineSpacingFixSummary {
  reason: string;
}

export interface LineSpacingFixReport {
  applied: boolean;
  changedParagraphs: ChangedLineSpacingSummary[];
  skipped: SkippedLineSpacingFixSummary[];
}

interface ExplicitLineSpacingValue {
  kind: "pts" | "pct";
  rawVal: string;
  display: string;
}

interface LineSpacingParagraphDescriptor {
  slide: number;
  paragraph: number;
  lineSpacing: ExplicitLineSpacingValue;
  lineSpacingNode: OrderedXmlNode;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  trimValues: false,
  processEntities: false,
  preserveOrder: true
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  processEntities: false,
  suppressEmptyNode: false,
  preserveOrder: true
});

export async function normalizeParagraphLineSpacing(
  inputPath: string,
  outputPath: string
): Promise<LineSpacingFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyLineSpacingFixToArchive(archive, presentation, auditReport);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);
  return report;
}

export async function applyLineSpacingFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<LineSpacingFixReport> {
  if (auditReport.lineSpacingDriftCount === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [
        {
          reason: "no line spacing drift"
        }
      ]
    };
  }

  const auditedDriftBySlide = groupAuditedDriftBySlide(auditReport);
  const changedParagraphs = new Map<string, number>();
  let totalChangedParagraphs = 0;

  for (const slide of presentation.slides) {
    const auditedDriftParagraphs = auditedDriftBySlide.get(slide.index);
    if (!auditedDriftParagraphs || auditedDriftParagraphs.size === 0) {
      continue;
    }

    const entry = archive.file(slide.archivePath);
    if (!entry) {
      continue;
    }

    const slideXml = await entry.async("string");
    const parsedSlide = xmlParser.parse(slideXml) as OrderedXmlDocument;
    const originalSlide = structuredClone(parsedSlide);
    const changedInSlide = normalizeSlideLineSpacing(
      parsedSlide,
      slide.index,
      auditedDriftParagraphs,
      changedParagraphs
    );
    totalChangedParagraphs += changedInSlide;

    if (changedInSlide > 0) {
      assertSlideXmlSafety(originalSlide, parsedSlide, slide.index);
      assertSlideTextFidelity(originalSlide, parsedSlide, slide.index);
      archive.file(slide.archivePath, xmlBuilder.build(parsedSlide));
    }
  }

  if (totalChangedParagraphs === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [
        {
          reason: "no safe changes"
        }
      ]
    };
  }

  return {
    applied: true,
    changedParagraphs: summarizeChangedParagraphs(changedParagraphs),
    skipped: []
  };
}

function groupAuditedDriftBySlide(auditReport: AuditReport): Map<number, Set<number>> {
  const driftBySlide = new Map<number, Set<number>>();

  for (const paragraph of auditReport.lineSpacingDrift.driftParagraphs) {
    const paragraphs = driftBySlide.get(paragraph.slide) ?? new Set<number>();
    paragraphs.add(paragraph.paragraph);
    driftBySlide.set(paragraph.slide, paragraphs);
  }

  return driftBySlide;
}

function normalizeSlideLineSpacing(
  slideXml: OrderedXmlDocument,
  slideIndex: number,
  auditedDriftParagraphs: Set<number>,
  changedParagraphs: Map<string, number>
): number {
  let changedCount = 0;
  let paragraphIndex = 1;

  for (const shape of findSlideShapes(slideXml)) {
    if (!hasTextBody(shape) || isTitleShape(shape)) {
      continue;
    }

    const paragraphs = findChildElements(findChildElements(shape, "p:txBody")[0] ?? {}, "a:p");
    let explicitGroup: LineSpacingParagraphDescriptor[] = [];
    let stableBaseline: ExplicitLineSpacingValue | null = null;
    const explicitGroups: LineSpacingParagraphDescriptor[][] = [];

    for (const paragraph of paragraphs) {
      const paragraphText = extractParagraphText(paragraph);
      if (!paragraphText) {
        continue;
      }

      const paragraphProperties = findChildElements(paragraph, "a:pPr")[0];
      const explicitLineSpacing = extractExplicitLineSpacing(paragraphProperties, slideIndex, paragraphIndex);
      if (!explicitLineSpacing) {
        if (explicitGroup.length > 0) {
          explicitGroups.push(explicitGroup);
        }
        const groupResult = normalizeLineSpacingGroup(
          explicitGroup,
          auditedDriftParagraphs,
          changedParagraphs,
          stableBaseline
        );
        changedCount += groupResult.changedCount;
        stableBaseline = groupResult.nextStableBaseline;
        explicitGroup = [];
        paragraphIndex += 1;
        continue;
      }

      explicitGroup.push(explicitLineSpacing);
      paragraphIndex += 1;
    }

    if (explicitGroup.length > 0) {
      explicitGroups.push(explicitGroup);
    }
    const groupResult = normalizeLineSpacingGroup(
      explicitGroup,
      auditedDriftParagraphs,
      changedParagraphs,
      stableBaseline
    );
    changedCount += groupResult.changedCount;
    changedCount += normalizeSplitTailLineSpacingGroups(
      explicitGroups,
      auditedDriftParagraphs,
      changedParagraphs
    );
  }

  return changedCount;
}

function normalizeLineSpacingGroup(
  paragraphs: LineSpacingParagraphDescriptor[],
  auditedDriftParagraphs: Set<number>,
  changedParagraphs: Map<string, number>,
  inheritedStableBaseline: ExplicitLineSpacingValue | null
): { changedCount: number; nextStableBaseline: ExplicitLineSpacingValue | null } {
  if (paragraphs.length === 0) {
    return {
      changedCount: 0,
      nextStableBaseline: inheritedStableBaseline
    };
  }

  let changedCount = 0;

  if (paragraphs.length >= 3) {
    for (let index = 1; index < paragraphs.length - 1; index += 1) {
      const current = paragraphs[index];
      if (!auditedDriftParagraphs.has(current.paragraph)) {
        continue;
      }

      const targetValue = resolveTargetLineSpacing(paragraphs, index);
      if (!targetValue) {
        continue;
      }

      const fromDisplay = current.lineSpacing.display;
      if (!updateLineSpacingValue(current.lineSpacingNode, targetValue)) {
        continue;
      }

      current.lineSpacing = targetValue;
      changedCount += 1;
      const key = `${current.slide}::${fromDisplay}::${targetValue.display}`;
      changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
    }

    const firstParagraph = paragraphs[0];
    if (firstParagraph && auditedDriftParagraphs.has(firstParagraph.paragraph)) {
      const targetValue = resolveTargetLineSpacing(paragraphs, 0);
      const fromDisplay = firstParagraph.lineSpacing.display;
      if (targetValue && updateLineSpacingValue(firstParagraph.lineSpacingNode, targetValue)) {
        firstParagraph.lineSpacing = targetValue;
        changedCount += 1;
        const key = `${firstParagraph.slide}::${fromDisplay}::${targetValue.display}`;
        changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
      }
    }

    const lastIndex = paragraphs.length - 1;
    const lastParagraph = paragraphs[lastIndex];
    if (lastParagraph && auditedDriftParagraphs.has(lastParagraph.paragraph)) {
      const targetValue = resolveTargetLineSpacing(paragraphs, lastIndex);
      const fromDisplay = lastParagraph.lineSpacing.display;
      if (targetValue && updateLineSpacingValue(lastParagraph.lineSpacingNode, targetValue)) {
        lastParagraph.lineSpacing = targetValue;
        changedCount += 1;
        const key = `${lastParagraph.slide}::${fromDisplay}::${targetValue.display}`;
        changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
      }
    }
  }

  if (paragraphs.length === 2) {
    const pairTailTarget = resolveTailPairTargetLineSpacing(paragraphs, auditedDriftParagraphs, inheritedStableBaseline);
    if (pairTailTarget) {
      const current = paragraphs[1];
      const fromDisplay = current.lineSpacing.display;
      if (updateLineSpacingValue(current.lineSpacingNode, pairTailTarget)) {
        current.lineSpacing = pairTailTarget;
        changedCount += 1;
        const key = `${current.slide}::${fromDisplay}::${pairTailTarget.display}`;
        changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
      }
    }
  }

  changedCount += normalizeGroupDominantExplicitLineSpacing(
    paragraphs,
    auditedDriftParagraphs,
    changedParagraphs
  );

  return {
    changedCount,
    nextStableBaseline: summarizeStableBaseline(paragraphs) ?? inheritedStableBaseline
  };
}

function normalizeGroupDominantExplicitLineSpacing(
  paragraphs: LineSpacingParagraphDescriptor[],
  auditedDriftParagraphs: Set<number>,
  changedParagraphs: Map<string, number>
): number {
  if (paragraphs.length < 3) {
    return 0;
  }

  const counts = new Map<string, { count: number; value: ExplicitLineSpacingValue }>();
  for (const paragraph of paragraphs) {
    const key = `${paragraph.lineSpacing.kind}::${paragraph.lineSpacing.display}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(key, {
      count: 1,
      value: paragraph.lineSpacing
    });
  }

  if (counts.size < 2) {
    return 0;
  }

  const dominantEntries = [...counts.values()].sort((left, right) => right.count - left.count);
  const [dominantEntry, nextEntry] = dominantEntries;
  if (!dominantEntry || dominantEntry.count < 2) {
    return 0;
  }

  if (nextEntry && nextEntry.count === dominantEntry.count) {
    return 0;
  }

  if (paragraphs.some((paragraph) => paragraph.lineSpacing.kind !== dominantEntry.value.kind)) {
    return 0;
  }

  let changedCount = 0;

  for (const paragraph of paragraphs) {
    if (!auditedDriftParagraphs.has(paragraph.paragraph)) {
      continue;
    }

    if (paragraph.lineSpacing.display === dominantEntry.value.display) {
      continue;
    }

    const fromDisplay = paragraph.lineSpacing.display;
    if (!updateLineSpacingValue(paragraph.lineSpacingNode, dominantEntry.value)) {
      continue;
    }

    paragraph.lineSpacing = dominantEntry.value;
    changedCount += 1;
    const key = `${paragraph.slide}::${fromDisplay}::${dominantEntry.value.display}`;
    changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
  }

  return changedCount;
}

function normalizeSplitTailLineSpacingGroups(
  explicitGroups: LineSpacingParagraphDescriptor[][],
  auditedDriftParagraphs: Set<number>,
  changedParagraphs: Map<string, number>
): number {
  if (explicitGroups.length < 2) {
    return 0;
  }

  let changedCount = 0;

  for (let index = 0; index < explicitGroups.length - 1; index += 1) {
    const group = explicitGroups[index];
    if (!group || group.length !== 2) {
      continue;
    }

    const anchor = group[0];
    const current = group[1];
    if (!anchor || !current || !auditedDriftParagraphs.has(current.paragraph)) {
      continue;
    }

    if (
      anchor.lineSpacing.kind !== current.lineSpacing.kind ||
      anchor.lineSpacing.display === current.lineSpacing.display
    ) {
      continue;
    }

    const futureAnchorExists = explicitGroups
      .slice(index + 1)
      .some((futureGroup) =>
        futureGroup.some(
          (paragraph) =>
            paragraph.lineSpacing.kind === anchor.lineSpacing.kind &&
            paragraph.lineSpacing.display === anchor.lineSpacing.display
        )
      );
    if (!futureAnchorExists) {
      continue;
    }

    const fromDisplay = current.lineSpacing.display;
    if (!updateLineSpacingValue(current.lineSpacingNode, anchor.lineSpacing)) {
      continue;
    }

    current.lineSpacing = anchor.lineSpacing;
    changedCount += 1;
    const key = `${current.slide}::${fromDisplay}::${anchor.lineSpacing.display}`;
    changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
  }

  return changedCount;
}

function resolveTailPairTargetLineSpacing(
  paragraphs: LineSpacingParagraphDescriptor[],
  auditedDriftParagraphs: Set<number>,
  inheritedStableBaseline: ExplicitLineSpacingValue | null
): ExplicitLineSpacingValue | null {
  if (paragraphs.length !== 2 || !inheritedStableBaseline) {
    return null;
  }

  const anchor = paragraphs[0];
  const current = paragraphs[1];
  if (!auditedDriftParagraphs.has(current.paragraph)) {
    return null;
  }

  if (
    anchor.lineSpacing.kind !== inheritedStableBaseline.kind ||
    anchor.lineSpacing.display !== inheritedStableBaseline.display ||
    current.lineSpacing.kind !== inheritedStableBaseline.kind ||
    current.lineSpacing.display === inheritedStableBaseline.display
  ) {
    return null;
  }

  return inheritedStableBaseline;
}

function summarizeStableBaseline(
  paragraphs: LineSpacingParagraphDescriptor[]
): ExplicitLineSpacingValue | null {
  if (paragraphs.length < 2) {
    return null;
  }

  const counts = new Map<string, { count: number; value: ExplicitLineSpacingValue }>();
  for (const paragraph of paragraphs) {
    const key = `${paragraph.lineSpacing.kind}::${paragraph.lineSpacing.display}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(key, {
      count: 1,
      value: paragraph.lineSpacing
    });
  }

  const entries = [...counts.values()];
  const stableEntries = entries.filter((entry) => entry.count >= 2);
  if (stableEntries.length !== 1) {
    return null;
  }

  return stableEntries[0].value;
}

function resolveTargetLineSpacing(
  paragraphs: LineSpacingParagraphDescriptor[],
  index: number
): ExplicitLineSpacingValue | null {
  const current = paragraphs[index];
  if (!current) {
    return null;
  }

  const anchorPair =
    index === 0 && paragraphs.length >= 3
      ? [paragraphs[1], paragraphs[2]]
      : index === paragraphs.length - 1 && paragraphs.length >= 3
        ? [paragraphs[paragraphs.length - 3], paragraphs[paragraphs.length - 2]]
        : index > 0 && index < paragraphs.length - 1
          ? [paragraphs[index - 1], paragraphs[index + 1]]
          : null;

  if (!anchorPair || anchorPair.some((paragraph) => !paragraph)) {
    return null;
  }

  const [leftAnchor, rightAnchor] = anchorPair;
  if (
    leftAnchor.lineSpacing.kind !== current.lineSpacing.kind ||
    rightAnchor.lineSpacing.kind !== current.lineSpacing.kind ||
    leftAnchor.lineSpacing.display !== rightAnchor.lineSpacing.display ||
    current.lineSpacing.display === leftAnchor.lineSpacing.display
  ) {
    return null;
  }

  return leftAnchor.lineSpacing;
}

function extractExplicitLineSpacing(
  paragraphProperties: OrderedXmlNode | undefined,
  slideIndex: number,
  paragraphIndex: number
): LineSpacingParagraphDescriptor | null {
  if (!paragraphProperties) {
    return null;
  }

  const lineSpacingNode = findChildElements(paragraphProperties, "a:lnSpc")[0];
  const lineSpacing = extractExplicitLineSpacingValue(lineSpacingNode);
  if (!lineSpacing || !lineSpacingNode) {
    return null;
  }

  return {
    slide: slideIndex,
    paragraph: paragraphIndex,
    lineSpacing,
    lineSpacingNode
  };
}

function extractExplicitLineSpacingValue(lineSpacingNode: OrderedXmlNode | undefined): ExplicitLineSpacingValue | null {
  if (!lineSpacingNode) {
    return null;
  }

  const pointsNode = findChildElements(lineSpacingNode, "a:spcPts")[0];
  if (pointsNode) {
    const rawVal = stringValue(getAttributes(pointsNode)["@_val"]);
    if (!rawVal) {
      return null;
    }

    const parsed = Number.parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    const valuePt = Number.parseFloat((parsed / 100).toFixed(2));
    return {
      kind: "pts",
      rawVal,
      display: `${formatMetricValue(valuePt)}pt`
    };
  }

  const percentNode = findChildElements(lineSpacingNode, "a:spcPct")[0];
  if (percentNode) {
    const rawVal = stringValue(getAttributes(percentNode)["@_val"]);
    if (!rawVal) {
      return null;
    }

    const parsed = Number.parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    const valuePercent = Number.parseFloat((parsed / 1000).toFixed(2));
    return {
      kind: "pct",
      rawVal,
      display: `${formatMetricValue(valuePercent)}%`
    };
  }

  return null;
}

function updateLineSpacingValue(
  lineSpacingNode: OrderedXmlNode,
  targetValue: ExplicitLineSpacingValue
): boolean {
  const childName = targetValue.kind === "pts" ? "a:spcPts" : "a:spcPct";
  const childNode = findChildElements(lineSpacingNode, childName)[0];
  if (!childNode) {
    return false;
  }

  const attributes = getAttributes(childNode);
  const currentValue = stringValue(attributes["@_val"]);
  if (!currentValue || currentValue === targetValue.rawVal) {
    return false;
  }

  attributes["@_val"] = targetValue.rawVal;
  return true;
}

function summarizeChangedParagraphs(
  changedParagraphs: Map<string, number>
): ChangedLineSpacingSummary[] {
  return [...changedParagraphs.entries()]
    .map(([key, count]) => {
      const [slide, fromLineSpacing, toLineSpacing] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        fromLineSpacing,
        toLineSpacing,
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (left.fromLineSpacing !== right.fromLineSpacing) {
        return left.fromLineSpacing.localeCompare(right.fromLineSpacing);
      }

      return left.toLineSpacing.localeCompare(right.toLineSpacing);
    });
}

function findSlideShapes(slideXml: OrderedXmlDocument): OrderedXmlNode[] {
  const shapes: OrderedXmlNode[] = [];

  for (const slide of findElements(slideXml, "p:sld")) {
    for (const contentSlide of findChildElements(slide, "p:cSld")) {
      for (const shapeTree of findChildElements(contentSlide, "p:spTree")) {
        shapes.push(...findChildElements(shapeTree, "p:sp"));
      }
    }
  }

  return shapes;
}

function hasTextBody(shape: OrderedXmlNode): boolean {
  return findChildElements(shape, "p:txBody").length > 0;
}

function isTitleShape(shape: OrderedXmlNode): boolean {
  const nonVisualProperties = findChildElements(shape, "p:nvSpPr")[0];
  const placeholderNode = findChildElements(
    findChildElements(nonVisualProperties ?? {}, "p:nvPr")[0] ?? {},
    "p:ph"
  )[0];
  const placeholderType = stringValue(getAttributes(placeholderNode ?? {})["@_type"]);
  if (placeholderType === "title" || placeholderType === "ctrTitle") {
    return true;
  }

  const shapeName = stringValue(
    getAttributes(findChildElements(nonVisualProperties ?? {}, "p:cNvPr")[0] ?? {})["@_name"]
  );
  return typeof shapeName === "string" && /^title\b/i.test(shapeName);
}

function extractParagraphText(paragraph: OrderedXmlNode): string {
  const texts: string[] = [];

  for (const child of getElementChildren(paragraph)) {
    const childName = getElementName(child);
    if (childName !== "a:r" && childName !== "a:fld") {
      continue;
    }

    const textNode = findChildElements(child, "a:t")[0];
    if (!textNode) {
      continue;
    }

    for (const textChild of getElementChildren(textNode)) {
      if (typeof textChild["#text"] === "string") {
        texts.push(textChild["#text"]);
      } else if (typeof textChild["#text"] === "number") {
        texts.push(textChild["#text"].toString());
      }
    }
  }

  return texts.join("").trim();
}

function getElementName(node: OrderedXmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
