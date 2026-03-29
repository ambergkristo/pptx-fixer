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

export interface ChangedBulletIndentSummary {
  slide: number;
  kind: "level" | "symbol";
  fromValue: string;
  toValue: string;
  count: number;
}

export interface SkippedBulletFixSummary {
  reason: string;
}

export interface BulletFixReport {
  applied: boolean;
  changedParagraphs: ChangedBulletIndentSummary[];
  skipped: SkippedBulletFixSummary[];
}

interface AuditedBulletDrift {
  paragraph: number;
  level: number;
  reason: string;
}

interface BulletParagraphDescriptor {
  slide: number;
  paragraph: number;
  level: number;
  list: number;
  markerSignature: string | null;
  paragraphProperties: OrderedXmlNode;
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

export async function normalizeBulletIndentation(
  inputPath: string,
  outputPath: string
): Promise<BulletFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyBulletIndentFixToArchive(archive, presentation, auditReport);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);
  return report;
}

export async function applyBulletIndentFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<BulletFixReport> {
  if (auditReport.bulletIndentDriftCount === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [
        {
          reason: "no bullet drift"
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
    const changedInSlide = normalizeSlideBulletIndentation(
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

function groupAuditedDriftBySlide(auditReport: AuditReport): Map<number, Map<number, AuditedBulletDrift>> {
  const driftBySlide = new Map<number, Map<number, AuditedBulletDrift>>();

  for (const paragraph of auditReport.bulletIndentDrift.driftParagraphs) {
    const paragraphs = driftBySlide.get(paragraph.slide) ?? new Map<number, AuditedBulletDrift>();
    paragraphs.set(paragraph.paragraph, {
      paragraph: paragraph.paragraph,
      level: paragraph.level,
      reason: paragraph.reason
    });
    driftBySlide.set(paragraph.slide, paragraphs);
  }

  return driftBySlide;
}

function normalizeSlideBulletIndentation(
  slideXml: OrderedXmlDocument,
  slideIndex: number,
  auditedDriftParagraphs: Map<number, AuditedBulletDrift>,
  changedParagraphs: Map<string, number>
): number {
  let changedCount = 0;
  let paragraphIndex = 1;
  let bulletListIndex = 1;

  for (const shape of findSlideShapes(slideXml)) {
    if (!hasTextBody(shape) || isTitleShape(shape)) {
      continue;
    }

    const { bulletParagraphs, nextParagraphIndex, nextListIndex } = extractBulletParagraphs(
      shape,
      slideIndex,
      paragraphIndex,
      bulletListIndex
    );
    paragraphIndex = nextParagraphIndex;
    bulletListIndex = nextListIndex;

    const paragraphsByList = new Map<number, BulletParagraphDescriptor[]>();
    for (const paragraph of bulletParagraphs) {
      const list = paragraphsByList.get(paragraph.list) ?? [];
      list.push(paragraph);
      paragraphsByList.set(paragraph.list, list);
    }

    for (const [, list] of [...paragraphsByList.entries()].sort(([left], [right]) => left - right)) {
      changedCount += normalizeBulletList(list, auditedDriftParagraphs, changedParagraphs);
    }
  }

  return changedCount;
}

function normalizeBulletList(
  paragraphs: BulletParagraphDescriptor[],
  auditedDriftParagraphs: Map<number, AuditedBulletDrift>,
  changedParagraphs: Map<string, number>
): number {
  let changedCount = normalizeBulletListSymbols(paragraphs, changedParagraphs);

  if (paragraphs.length < 2) {
    return changedCount;
  }

  const countsByLevel = new Map<number, number>();
  for (const paragraph of paragraphs) {
    countsByLevel.set(paragraph.level, (countsByLevel.get(paragraph.level) ?? 0) + 1);
  }

  const dominantLevel = determineDominantLevel(countsByLevel);
  for (const [index, paragraph] of paragraphs.entries()) {
    const auditedDrift = auditedDriftParagraphs.get(paragraph.paragraph);
    if (!auditedDrift) {
      continue;
    }

    const targetLevel = determineSafeTargetLevel(paragraphs, index, auditedDrift, countsByLevel, dominantLevel);
    if (targetLevel === null || targetLevel === paragraph.level) {
      continue;
    }

    if (!updateParagraphLevel(paragraph.paragraphProperties, targetLevel)) {
      continue;
    }

    changedCount += 1;
    const key = `${paragraph.slide}::level::${paragraph.level}::${targetLevel}`;
    changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
  }

  return changedCount;
}

function normalizeBulletListSymbols(
  paragraphs: BulletParagraphDescriptor[],
  changedParagraphs: Map<string, number>
): number {
  const explicitMarkerParagraphs = paragraphs.filter((paragraph) => paragraph.markerSignature !== null);
  if (explicitMarkerParagraphs.length < 2) {
    return 0;
  }

  const countsByMarker = new Map<string, number>();
  for (const paragraph of explicitMarkerParagraphs) {
    countsByMarker.set(
      paragraph.markerSignature!,
      (countsByMarker.get(paragraph.markerSignature!) ?? 0) + 1
    );
  }

  const dominantMarker = determineDominantMarker(countsByMarker);
  const targetParagraph = resolveTargetMarkerParagraph(explicitMarkerParagraphs, dominantMarker);
  const targetMarker = targetParagraph?.markerSignature;
  if (!targetParagraph || !targetMarker) {
    return 0;
  }

  let changedCount = 0;
  for (const paragraph of explicitMarkerParagraphs) {
    if (paragraph === targetParagraph) {
      continue;
    }

    const fromMarker = paragraph.markerSignature ?? "inherit";
    const markerChanged = updateParagraphMarker(paragraph.paragraphProperties, targetMarker);
    const indentationChanged = updateParagraphIndentation(
      paragraph.paragraphProperties,
      targetParagraph.paragraphProperties
    );
    if (!markerChanged && !indentationChanged) {
      continue;
    }

    paragraph.markerSignature = targetMarker;
    changedCount += 1;
    const key = `${paragraph.slide}::symbol::${fromMarker}::${targetMarker}`;
    changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
  }

  return changedCount;
}

function determineDominantLevel(countsByLevel: Map<number, number>): number | null {
  if (countsByLevel.size < 2) {
    return null;
  }

  const maxCount = Math.max(...countsByLevel.values());
  if (maxCount < 2) {
    return null;
  }

  const dominantLevels = [...countsByLevel.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([level]) => level);

  if (dominantLevels.length !== 1) {
    return null;
  }

  return dominantLevels[0];
}

function determineDominantMarker(countsByMarker: Map<string, number>): string | null {
  if (countsByMarker.size < 2) {
    return null;
  }

  const maxCount = Math.max(...countsByMarker.values());
  if (maxCount < 2) {
    return null;
  }

  const dominantMarkers = [...countsByMarker.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([marker]) => marker);

  if (dominantMarkers.length !== 1) {
    return null;
  }

  return dominantMarkers[0];
}

function resolveTargetMarkerParagraph(
  paragraphs: BulletParagraphDescriptor[],
  dominantMarker: string | null
): BulletParagraphDescriptor | null {
  if (dominantMarker) {
    return paragraphs.find((paragraph) => paragraph.markerSignature === dominantMarker) ?? null;
  }

  if (paragraphs.length < 2) {
    return null;
  }

  const levels = new Set(paragraphs.map((paragraph) => paragraph.level));
  if (levels.size !== 1) {
    return null;
  }

  return paragraphs[0] ?? null;
}

function determineSafeTargetLevel(
  paragraphs: BulletParagraphDescriptor[],
  index: number,
  auditedDrift: AuditedBulletDrift,
  countsByLevel: Map<number, number>,
  dominantLevel: number | null
): number | null {
  if (auditedDrift.reason.startsWith("jump")) {
    return determineSafeJumpTarget(paragraphs, index, countsByLevel);
  }

  if (auditedDrift.reason.startsWith("outlier")) {
    return determineSafeOutlierTarget(paragraphs, index, countsByLevel, dominantLevel);
  }

  return null;
}

function determineSafeJumpTarget(
  paragraphs: BulletParagraphDescriptor[],
  index: number,
  countsByLevel: Map<number, number>
): number | null {
  if (index === 0) {
    return null;
  }

  const current = paragraphs[index];
  const previous = paragraphs[index - 1];
  if (current.level !== previous.level + 2) {
    return null;
  }

  if ((countsByLevel.get(current.level) ?? 0) !== 1) {
    return null;
  }

  if (index === paragraphs.length - 1) {
    return previous.level + 1;
  }

  const next = paragraphs[index + 1];
  if (next.level !== previous.level) {
    return null;
  }

  // A single unsupported deep jump bracketed by the same sibling depth is
  // safer to flatten back to that surrounding depth than to preserve.
  return previous.level;
}

function determineSafeOutlierTarget(
  paragraphs: BulletParagraphDescriptor[],
  index: number,
  countsByLevel: Map<number, number>,
  dominantLevel: number | null
): number | null {
  if (dominantLevel === null || index === 0 || index === paragraphs.length - 1) {
    return null;
  }

  const current = paragraphs[index];
  const previous = paragraphs[index - 1];
  const next = paragraphs[index + 1];
  if ((countsByLevel.get(current.level) ?? 0) !== 1) {
    return null;
  }

  if (previous.level !== dominantLevel || next.level !== dominantLevel) {
    return null;
  }

  if (Math.abs(current.level - dominantLevel) !== 1) {
    return null;
  }

  return dominantLevel;
}

function updateParagraphLevel(paragraphProperties: OrderedXmlNode, targetLevel: number): boolean {
  const attributes = getAttributes(paragraphProperties);
  const currentLevel = numericValue(attributes["@_lvl"]);
  if (currentLevel === null || currentLevel === targetLevel) {
    return false;
  }

  attributes["@_lvl"] = targetLevel.toString();
  return true;
}

function updateParagraphMarker(paragraphProperties: OrderedXmlNode, targetMarker: string): boolean {
  const [kind, value] = targetMarker.split(":", 2);
  if (!kind || !value) {
    return false;
  }

  const paragraphChildren = getElementChildren(paragraphProperties);
  const existingBulletCharNode = findChildElements(paragraphProperties, "a:buChar")[0];
  const existingAutoNumberNode = findChildElements(paragraphProperties, "a:buAutoNum")[0];

  if (kind === "char") {
    if (existingBulletCharNode) {
      const attributes = getAttributes(existingBulletCharNode);
      const currentChar = stringValue(attributes["@_char"]);
      if (currentChar === value && !existingAutoNumberNode) {
        return false;
      }

      attributes["@_char"] = value;
      if (existingAutoNumberNode) {
        const autoNumberIndex = paragraphChildren.indexOf(existingAutoNumberNode);
        if (autoNumberIndex !== -1) {
          paragraphChildren.splice(autoNumberIndex, 1);
        }
      }
      return true;
    }

    if (existingAutoNumberNode) {
      const autoNumberIndex = paragraphChildren.indexOf(existingAutoNumberNode);
      if (autoNumberIndex === -1) {
        return false;
      }

      paragraphChildren.splice(autoNumberIndex, 1, buildBulletMarkerNode(targetMarker));
      return true;
    }

    const insertIndex = resolveBulletMarkerInsertIndex(paragraphChildren);
    paragraphChildren.splice(insertIndex, 0, buildBulletMarkerNode(targetMarker));
    return true;
  }

  if (kind === "auto") {
    if (existingAutoNumberNode) {
      const attributes = getAttributes(existingAutoNumberNode);
      const currentType = stringValue(attributes["@_type"]);
      if (currentType === value && !existingBulletCharNode) {
        return false;
      }

      attributes["@_type"] = value;
      if (existingBulletCharNode) {
        const bulletCharIndex = paragraphChildren.indexOf(existingBulletCharNode);
        if (bulletCharIndex !== -1) {
          paragraphChildren.splice(bulletCharIndex, 1);
        }
      }
      return true;
    }

    if (existingBulletCharNode) {
      const bulletCharIndex = paragraphChildren.indexOf(existingBulletCharNode);
      if (bulletCharIndex === -1) {
        return false;
      }

      paragraphChildren.splice(bulletCharIndex, 1, buildBulletMarkerNode(targetMarker));
      return true;
    }

    const insertIndex = resolveBulletMarkerInsertIndex(paragraphChildren);
    paragraphChildren.splice(insertIndex, 0, buildBulletMarkerNode(targetMarker));
    return true;
  }

  return false;
}

function updateParagraphIndentation(
  paragraphProperties: OrderedXmlNode,
  targetParagraphProperties: OrderedXmlNode
): boolean {
  const attributes = getAttributes(paragraphProperties);
  const targetAttributes = getAttributes(targetParagraphProperties);
  const currentMarL = stringValue(attributes["@_marL"]);
  const currentIndent = stringValue(attributes["@_indent"]);
  const targetMarL = stringValue(targetAttributes["@_marL"]);
  const targetIndent = stringValue(targetAttributes["@_indent"]);

  let changed = false;

  if (currentMarL !== targetMarL) {
    if (targetMarL === undefined) {
      delete attributes["@_marL"];
    } else {
      attributes["@_marL"] = targetMarL;
    }
    changed = true;
  }

  if (currentIndent !== targetIndent) {
    if (targetIndent === undefined) {
      delete attributes["@_indent"];
    } else {
      attributes["@_indent"] = targetIndent;
    }
    changed = true;
  }

  return changed;
}

function buildBulletMarkerNode(targetMarker: string): OrderedXmlNode {
  const [kind, value] = targetMarker.split(":", 2);
  if (kind === "char") {
    return {
      "a:buChar": [],
      ":@": {
        "@_char": value
      }
    };
  }

  return {
    "a:buAutoNum": [],
    ":@": {
      "@_type": value
    }
  };
}

function resolveBulletMarkerInsertIndex(children: OrderedXmlNode[]): number {
  const anchorNames = [
    "a:buClr",
    "a:buClrTx",
    "a:buFont",
    "a:buFontTx"
  ];

  let insertIndex = 0;
  for (const anchorName of anchorNames) {
    const anchorIndex = children.findIndex((child) => getElementName(child) === anchorName);
    if (anchorIndex !== -1) {
      insertIndex = Math.max(insertIndex, anchorIndex + 1);
    }
  }

  return insertIndex;
}

function summarizeChangedParagraphs(
  changedParagraphs: Map<string, number>
): ChangedBulletIndentSummary[] {
  return [...changedParagraphs.entries()]
    .map(([key, count]) => {
      const [slide, kind, fromValue, toValue] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        kind: kind as ChangedBulletIndentSummary["kind"],
        fromValue,
        toValue,
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (left.kind !== right.kind) {
        return left.kind.localeCompare(right.kind);
      }

      if (left.fromValue !== right.fromValue) {
        return left.fromValue.localeCompare(right.fromValue);
      }

      return left.toValue.localeCompare(right.toValue);
    });
}

function extractBulletParagraphs(
  shape: OrderedXmlNode,
  slideIndex: number,
  startingParagraphIndex: number,
  startingListIndex: number
): {
  bulletParagraphs: BulletParagraphDescriptor[];
  nextParagraphIndex: number;
  nextListIndex: number;
} {
  const paragraphs = findChildElements(findChildElements(shape, "p:txBody")[0] ?? {}, "a:p");
  const bulletParagraphs: BulletParagraphDescriptor[] = [];
  let paragraphIndex = startingParagraphIndex;
  let nextListIndex = startingListIndex;
  let activeListIndex: number | null = null;

  for (const paragraph of paragraphs) {
    const paragraphText = extractParagraphText(paragraph);
    if (!paragraphText) {
      continue;
    }

    const paragraphProperties = findChildElements(paragraph, "a:pPr")[0];
    if (!isBulletParagraph(paragraphProperties)) {
      activeListIndex = null;
      paragraphIndex += 1;
      continue;
    }

    if (!paragraphProperties) {
      paragraphIndex += 1;
      activeListIndex = null;
      continue;
    }

    if (activeListIndex === null) {
      activeListIndex = nextListIndex;
      nextListIndex += 1;
    }

    bulletParagraphs.push({
      slide: slideIndex,
      paragraph: paragraphIndex,
      level: numericValue(getAttributes(paragraphProperties)["@_lvl"]) ?? 0,
      list: activeListIndex,
      markerSignature: extractBulletMarkerSignature(paragraphProperties),
      paragraphProperties
    });
    paragraphIndex += 1;
  }

  return {
    bulletParagraphs,
    nextParagraphIndex: paragraphIndex,
    nextListIndex
  };
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

function isBulletParagraph(paragraphProperties: OrderedXmlNode | undefined): boolean {
  if (!paragraphProperties) {
    return false;
  }

  if (findChildElements(paragraphProperties, "a:buNone").length > 0) {
    return false;
  }

  if (numericValue(getAttributes(paragraphProperties)["@_lvl"]) !== null) {
    return true;
  }

  return [
    "a:buChar",
    "a:buAutoNum",
    "a:buBlip",
    "a:buClr",
    "a:buClrTx",
    "a:buFont",
    "a:buFontTx",
    "a:buSzPct",
    "a:buSzPts",
    "a:buSzTx"
  ].some((childName) => findChildElements(paragraphProperties, childName).length > 0);
}

function extractBulletMarkerSignature(paragraphProperties: OrderedXmlNode): string | null {
  const bulletCharNode = findChildElements(paragraphProperties, "a:buChar")[0];
  const bulletChar = stringValue(getAttributes(bulletCharNode ?? {})["@_char"]);
  if (bulletChar) {
    return `char:${bulletChar}`;
  }

  const autoNumberNode = findChildElements(paragraphProperties, "a:buAutoNum")[0];
  const autoNumberType = stringValue(getAttributes(autoNumberNode ?? {})["@_type"]);
  if (autoNumberType) {
    return `auto:${autoNumberType}`;
  }

  return null;
}

function markerKind(markerSignature: string): string {
  return markerSignature.split(":", 1)[0] ?? "";
}

function getElementName(node: OrderedXmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
