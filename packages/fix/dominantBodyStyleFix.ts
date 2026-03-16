import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { BodyParagraphGroupWithCleanupCandidate } from "../audit/cleanupCandidateAudit.ts";
import type { DominantBodyStyle } from "../audit/dominantStyleAudit.ts";
import { analyzeSlides, loadPresentation, type AuditReport, type LoadedPresentation } from "../audit/pptxAudit.ts";
import type { LineSpacingStyleSignature } from "../audit/styleSignatureAudit.ts";
import {
  assertSlideTextFidelity,
  assertSlideXmlSafety,
  findChildElements,
  findElements,
  getAttributes,
  getElementChildren,
  type OrderedXmlDocument,
  type OrderedXmlNode
} from "./textFidelity.ts";

export interface ChangedDominantBodyStyleSummary {
  slide: number;
  property: "alignment" | "spacingBefore" | "spacingAfter" | "lineSpacing";
  fromValue: string;
  toValue: string;
  count: number;
}

export interface SkippedDominantBodyStyleFixSummary {
  reason: string;
}

export interface DominantBodyStyleFixReport {
  applied: boolean;
  changedParagraphs: ChangedDominantBodyStyleSummary[];
  telemetryBySlide: DominantBodyStyleSlideTelemetry[];
  skipped: SkippedDominantBodyStyleFixSummary[];
}

export interface DominantBodyStyleSlideTelemetry {
  slide: number;
  dominantBodyStyleEligibleGroups: number;
  dominantBodyStyleTouchedGroups: number;
  dominantBodyStyleSkippedGroups: number;
  dominantBodyStyleAlignmentChanges: number;
  dominantBodyStyleSpacingBeforeChanges: number;
  dominantBodyStyleSpacingAfterChanges: number;
  dominantBodyStyleLineSpacingChanges: number;
}

interface RawMetricValue {
  kind: "pts" | "pct";
  rawVal: string;
  display: string;
}

interface SlideParagraphReference {
  paragraphNode: OrderedXmlNode;
  paragraphProperties: OrderedXmlNode | undefined;
}

interface DominantBodyStyleSlideNormalizationResult {
  changedParagraphs: number;
  touchedGroups: number;
  alignmentChanges: number;
  spacingBeforeChanges: number;
  spacingAfterChanges: number;
  lineSpacingChanges: number;
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

export async function normalizeDominantBodyStyle(
  inputPath: string,
  outputPath: string
): Promise<DominantBodyStyleFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyDominantBodyStyleFixToArchive(archive, presentation, auditReport);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);
  return report;
}

export async function applyDominantBodyStyleFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<DominantBodyStyleFixReport> {
  const changedParagraphs = new Map<string, number>();
  const telemetryBySlide: DominantBodyStyleSlideTelemetry[] = [];
  let totalChangedParagraphs = 0;
  let eligibleGroupCount = 0;

  for (const slide of presentation.slides) {
    const slideAudit = auditReport.slides.find((entry) => entry.index === slide.index);
    if (!slideAudit) {
      continue;
    }

    const hasEligibleGroups = slideAudit.paragraphGroups.some(
      (group) => group.type === "body" && group.cleanupCandidate?.eligible === true
    );
    if (!hasEligibleGroups) {
      continue;
    }

    const eligibleGroups = slideAudit.paragraphGroups.filter(
      (group) => group.type === "body" && group.cleanupCandidate?.eligible === true
    ).length;
    eligibleGroupCount += eligibleGroups;

    const entry = archive.file(slide.archivePath);
    if (!entry) {
      continue;
    }

    const slideXml = await entry.async("string");
    const parsedSlide = xmlParser.parse(slideXml) as OrderedXmlDocument;
    const originalSlide = structuredClone(parsedSlide);
    const changedInSlide = normalizeSlideToDominantBodyStyle(
      parsedSlide,
      slideAudit.paragraphGroups,
      slideAudit.dominantBodyStyle,
      slide.index,
      changedParagraphs
    );
    totalChangedParagraphs += changedInSlide.changedParagraphs;
    telemetryBySlide.push({
      slide: slide.index,
      dominantBodyStyleEligibleGroups: eligibleGroups,
      dominantBodyStyleTouchedGroups: changedInSlide.touchedGroups,
      dominantBodyStyleSkippedGroups: eligibleGroups - changedInSlide.touchedGroups,
      dominantBodyStyleAlignmentChanges: changedInSlide.alignmentChanges,
      dominantBodyStyleSpacingBeforeChanges: changedInSlide.spacingBeforeChanges,
      dominantBodyStyleSpacingAfterChanges: changedInSlide.spacingAfterChanges,
      dominantBodyStyleLineSpacingChanges: changedInSlide.lineSpacingChanges
    });

    if (changedInSlide.changedParagraphs > 0) {
      assertSlideXmlSafety(originalSlide, parsedSlide, slide.index);
      assertSlideTextFidelity(originalSlide, parsedSlide, slide.index);
      archive.file(slide.archivePath, xmlBuilder.build(parsedSlide));
    }
  }

  if (totalChangedParagraphs === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      telemetryBySlide,
      skipped: [
        {
          reason: eligibleGroupCount > 0 ? "no safe changes" : "no eligible cleanup candidates"
        }
      ]
    };
  }

  return {
    applied: true,
    changedParagraphs: summarizeChangedParagraphs(changedParagraphs),
    telemetryBySlide,
    skipped: []
  };
}

function normalizeSlideToDominantBodyStyle(
  slideXml: OrderedXmlDocument,
  paragraphGroups: BodyParagraphGroupWithCleanupCandidate[],
  dominantBodyStyle: DominantBodyStyle,
  slideIndex: number,
  changedParagraphs: Map<string, number>
): DominantBodyStyleSlideNormalizationResult {
  const paragraphReferencesByShape = collectSlideParagraphsByShape(slideXml);
  const mappedGroups = mapParagraphGroupsByRange(paragraphReferencesByShape, paragraphGroups);
  if (!mappedGroups) {
    return {
      changedParagraphs: 0,
      touchedGroups: 0,
      alignmentChanges: 0,
      spacingBeforeChanges: 0,
      spacingAfterChanges: 0,
      lineSpacingChanges: 0
    };
  }

  const dominantSpacingBefore = inferDominantSpacingTarget(paragraphGroups, dominantBodyStyle, "spacingBefore");
  const dominantSpacingAfter = inferDominantSpacingTarget(paragraphGroups, dominantBodyStyle, "spacingAfter");
  const dominantLineSpacing = buildDominantLineSpacingTarget(dominantBodyStyle.lineSpacing);
  let changedParagraphCount = 0;
  let touchedGroups = 0;
  let alignmentChanges = 0;
  let spacingBeforeChanges = 0;
  let spacingAfterChanges = 0;
  let lineSpacingChanges = 0;

  for (let index = 0; index < paragraphGroups.length; index += 1) {
    const group = paragraphGroups[index];
    if (group.type !== "body" || group.cleanupCandidate?.eligible !== true) {
      continue;
    }

    const groupParagraphs = mappedGroups[index];
    const changedAlignment = applyAlignmentChange(groupParagraphs, group.styleSignature.alignment, dominantBodyStyle.alignment, slideIndex, changedParagraphs);
    const changedSpacingBefore = applySpacingChange(groupParagraphs, "spacingBefore", group.styleSignature.spacingBefore, dominantSpacingBefore, slideIndex, changedParagraphs);
    const changedSpacingAfter = applySpacingChange(groupParagraphs, "spacingAfter", group.styleSignature.spacingAfter, dominantSpacingAfter, slideIndex, changedParagraphs);
    const changedLineSpacing = applyLineSpacingChange(groupParagraphs, group.styleSignature.lineSpacing, dominantLineSpacing, slideIndex, changedParagraphs);

    const groupChangedCount = changedAlignment + changedSpacingBefore + changedSpacingAfter + changedLineSpacing;
    changedParagraphCount += groupChangedCount;
    alignmentChanges += changedAlignment;
    spacingBeforeChanges += changedSpacingBefore;
    spacingAfterChanges += changedSpacingAfter;
    lineSpacingChanges += changedLineSpacing;
    if (groupChangedCount > 0) {
      touchedGroups += 1;
    }
  }

  return {
    changedParagraphs: changedParagraphCount,
    touchedGroups,
    alignmentChanges,
    spacingBeforeChanges,
    spacingAfterChanges,
    lineSpacingChanges
  };
}

function applyAlignmentChange(
  paragraphs: SlideParagraphReference[],
  groupAlignment: string | null,
  dominantAlignment: string | null,
  slideIndex: number,
  changedParagraphs: Map<string, number>
): number {
  if (!groupAlignment || !dominantAlignment || groupAlignment === dominantAlignment) {
    return 0;
  }

  const paragraphPropertiesNodes = paragraphs.map((paragraph) => paragraph.paragraphProperties);
  if (paragraphPropertiesNodes.some((paragraphPropertiesEntry) => !paragraphPropertiesEntry)) {
    return 0;
  }

  for (const paragraphPropertiesNode of paragraphPropertiesNodes) {
    const rawAlignment = stringValue(getAttributes(paragraphPropertiesNode!)["@_algn"]);
    const alignment = normalizeAlignmentValue(rawAlignment);
    if (!rawAlignment || !alignment || alignment !== groupAlignment) {
      return 0;
    }
  }

  const targetAlignment = toOpenXmlAlignment(dominantAlignment);
  if (!targetAlignment) {
    return 0;
  }

  for (const paragraphPropertiesNode of paragraphPropertiesNodes) {
    getAttributes(paragraphPropertiesNode!)["@_algn"] = targetAlignment;
  }

  registerChangedParagraphs(
    changedParagraphs,
    slideIndex,
    "alignment",
    groupAlignment,
    dominantAlignment,
    paragraphs.length
  );
  return paragraphs.length;
}

function applySpacingChange(
  paragraphs: SlideParagraphReference[],
  property: "spacingBefore" | "spacingAfter",
  groupSpacing: string | null,
  dominantSpacing: RawMetricValue | null,
  slideIndex: number,
  changedParagraphs: Map<string, number>
): number {
  if (!groupSpacing || !dominantSpacing || groupSpacing === dominantSpacing.display) {
    return 0;
  }

  const spacingNodeName = property === "spacingBefore" ? "a:spcBef" : "a:spcAft";

  for (const paragraph of paragraphs) {
    const paragraphProperties = paragraph.paragraphProperties;
    if (!paragraphProperties) {
      return 0;
    }

    const spacingNode = findChildElements(paragraphProperties, spacingNodeName)[0];
    const currentSpacing = extractRawMetricValue(spacingNode);
    if (!spacingNode || !currentSpacing || currentSpacing.display !== groupSpacing || currentSpacing.kind !== dominantSpacing.kind) {
      return 0;
    }
  }

  for (const paragraph of paragraphs) {
    const spacingNode = findChildElements(paragraph.paragraphProperties!, spacingNodeName)[0];
    if (!updateRawMetricValue(spacingNode, dominantSpacing)) {
      return 0;
    }
  }

  registerChangedParagraphs(
    changedParagraphs,
    slideIndex,
    property,
    groupSpacing,
    dominantSpacing.display,
    paragraphs.length
  );
  return paragraphs.length;
}

function applyLineSpacingChange(
  paragraphs: SlideParagraphReference[],
  groupLineSpacing: LineSpacingStyleSignature | null,
  dominantLineSpacing: RawMetricValue | null,
  slideIndex: number,
  changedParagraphs: Map<string, number>
): number {
  if (!groupLineSpacing || !dominantLineSpacing) {
    return 0;
  }

  const currentDisplay = displayLineSpacing(groupLineSpacing);
  if (!currentDisplay || currentDisplay === dominantLineSpacing.display) {
    return 0;
  }

  for (const paragraph of paragraphs) {
    const paragraphProperties = paragraph.paragraphProperties;
    if (!paragraphProperties) {
      return 0;
    }

    const lineSpacingNode = findChildElements(paragraphProperties, "a:lnSpc")[0];
    const currentLineSpacing = extractRawMetricValue(lineSpacingNode);
    if (!lineSpacingNode || !currentLineSpacing || currentLineSpacing.display !== currentDisplay || currentLineSpacing.kind !== dominantLineSpacing.kind) {
      return 0;
    }
  }

  for (const paragraph of paragraphs) {
    const lineSpacingNode = findChildElements(paragraph.paragraphProperties!, "a:lnSpc")[0];
    if (!updateRawMetricValue(lineSpacingNode, dominantLineSpacing)) {
      return 0;
    }
  }

  registerChangedParagraphs(
    changedParagraphs,
    slideIndex,
    "lineSpacing",
    currentDisplay,
    dominantLineSpacing.display,
    paragraphs.length
  );
  return paragraphs.length;
}

function collectSlideParagraphsByShape(slideXml: OrderedXmlDocument): SlideParagraphReference[][] {
  const paragraphsByShape: SlideParagraphReference[][] = [];

  for (const shape of findSlideShapes(slideXml)) {
    if (!hasTextBody(shape)) {
      continue;
    }

    const shapeParagraphs: SlideParagraphReference[] = [];
    for (const paragraph of findChildElements(findChildElements(shape, "p:txBody")[0] ?? {}, "a:p")) {
      if (!extractParagraphText(paragraph)) {
        continue;
      }

      shapeParagraphs.push({
        paragraphNode: paragraph,
        paragraphProperties: findChildElements(paragraph, "a:pPr")[0]
      });
    }

    if (shapeParagraphs.length > 0) {
      paragraphsByShape.push(shapeParagraphs);
    }
  }

  return paragraphsByShape;
}

function mapParagraphGroupsByRange(
  paragraphsByShape: SlideParagraphReference[][],
  paragraphGroups: BodyParagraphGroupWithCleanupCandidate[]
): SlideParagraphReference[][] | null {
  const mappedGroups: SlideParagraphReference[][] = [];
  let shapeIndex = 0;
  let previousEndParagraphIndex = -1;

  for (const paragraphGroup of paragraphGroups) {
    if (paragraphGroup.paragraphCount !== paragraphGroup.endParagraphIndex - paragraphGroup.startParagraphIndex + 1) {
      return null;
    }

    if (mappedGroups.length > 0 && paragraphGroup.startParagraphIndex === 0) {
      shapeIndex += 1;
      previousEndParagraphIndex = -1;
    }

    if (previousEndParagraphIndex >= 0 && paragraphGroup.startParagraphIndex !== previousEndParagraphIndex + 1) {
      return null;
    }

    const shapeParagraphs = paragraphsByShape[shapeIndex];
    if (!shapeParagraphs) {
      return null;
    }

    const groupParagraphs = shapeParagraphs.slice(
      paragraphGroup.startParagraphIndex,
      paragraphGroup.endParagraphIndex + 1
    );
    if (groupParagraphs.length !== paragraphGroup.paragraphCount) {
      return null;
    }

    mappedGroups.push(groupParagraphs);
    previousEndParagraphIndex = paragraphGroup.endParagraphIndex;
  }

  return mappedGroups;
}

function inferDominantSpacingTarget(
  paragraphGroups: BodyParagraphGroupWithCleanupCandidate[],
  dominantBodyStyle: DominantBodyStyle,
  property: "spacingBefore" | "spacingAfter"
): RawMetricValue | null {
  const dominantValue = dominantBodyStyle[property];
  if (dominantValue === null) {
    return null;
  }

  const matchingDisplays = new Set<string>();
  for (const paragraphGroup of paragraphGroups) {
    if (paragraphGroup.type !== "body") {
      continue;
    }

    const groupValue = paragraphGroup.styleSignature[property];
    if (!groupValue) {
      continue;
    }

    const numericValue = parseNumericMetric(groupValue);
    if (numericValue === null || numericValue !== dominantValue) {
      continue;
    }

    matchingDisplays.add(groupValue);
  }

  if (matchingDisplays.size !== 1) {
    return null;
  }

  return buildRawMetricValue([...matchingDisplays][0]);
}

function buildDominantLineSpacingTarget(
  lineSpacing: LineSpacingStyleSignature | null
): RawMetricValue | null {
  if (!lineSpacing || lineSpacing.kind === null || lineSpacing.value === null) {
    return null;
  }

  if (lineSpacing.kind === "spcPts") {
    return {
      kind: "pts",
      rawVal: Math.round(lineSpacing.value * 100).toString(),
      display: `${formatMetricValue(lineSpacing.value)}pt`
    };
  }

  return {
    kind: "pct",
    rawVal: Math.round(lineSpacing.value * 1000).toString(),
    display: `${formatMetricValue(lineSpacing.value)}%`
  };
}

function buildRawMetricValue(display: string): RawMetricValue | null {
  if (display.endsWith("pt")) {
    const value = Number.parseFloat(display.slice(0, -2));
    if (Number.isNaN(value)) {
      return null;
    }

    return {
      kind: "pts",
      rawVal: Math.round(value * 100).toString(),
      display
    };
  }

  if (display.endsWith("%")) {
    const value = Number.parseFloat(display.slice(0, -1));
    if (Number.isNaN(value)) {
      return null;
    }

    return {
      kind: "pct",
      rawVal: Math.round(value * 1000).toString(),
      display
    };
  }

  return null;
}

function extractRawMetricValue(metricNode: OrderedXmlNode | undefined): RawMetricValue | null {
  if (!metricNode) {
    return null;
  }

  const pointsNode = findChildElements(metricNode, "a:spcPts")[0];
  if (pointsNode) {
    const rawVal = stringValue(getAttributes(pointsNode)["@_val"]);
    if (!rawVal) {
      return null;
    }

    const parsed = Number.parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    const metricValue = Number.parseFloat((parsed / 100).toFixed(2));
    return {
      kind: "pts",
      rawVal,
      display: `${formatMetricValue(metricValue)}pt`
    };
  }

  const percentNode = findChildElements(metricNode, "a:spcPct")[0];
  if (percentNode) {
    const rawVal = stringValue(getAttributes(percentNode)["@_val"]);
    if (!rawVal) {
      return null;
    }

    const parsed = Number.parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    const metricValue = Number.parseFloat((parsed / 1000).toFixed(2));
    return {
      kind: "pct",
      rawVal,
      display: `${formatMetricValue(metricValue)}%`
    };
  }

  return null;
}

function updateRawMetricValue(metricNode: OrderedXmlNode | undefined, targetValue: RawMetricValue): boolean {
  if (!metricNode) {
    return false;
  }

  const childName = targetValue.kind === "pts" ? "a:spcPts" : "a:spcPct";
  const childNode = findChildElements(metricNode, childName)[0];
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

function normalizeAlignmentValue(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value === "l") {
    return "left";
  }

  if (value === "ctr") {
    return "center";
  }

  if (value === "r") {
    return "right";
  }

  if (value === "just") {
    return "justify";
  }

  return value;
}

function toOpenXmlAlignment(value: string): string | null {
  if (value === "left") {
    return "l";
  }

  if (value === "center") {
    return "ctr";
  }

  if (value === "right") {
    return "r";
  }

  if (value === "justify") {
    return "just";
  }

  return null;
}

function displayLineSpacing(value: LineSpacingStyleSignature): string | null {
  if (value.kind === null || value.value === null) {
    return null;
  }

  return value.kind === "spcPts"
    ? `${formatMetricValue(value.value)}pt`
    : `${formatMetricValue(value.value)}%`;
}

function parseNumericMetric(value: string): number | null {
  const match = value.match(/^-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  return Number.parseFloat(match[0]);
}

function registerChangedParagraphs(
  changedParagraphs: Map<string, number>,
  slide: number,
  property: "alignment" | "spacingBefore" | "spacingAfter" | "lineSpacing",
  fromValue: string,
  toValue: string,
  count: number
): void {
  const key = [slide, property, fromValue, toValue].join("::");
  changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + count);
}

function summarizeChangedParagraphs(
  changedParagraphs: Map<string, number>
): ChangedDominantBodyStyleSummary[] {
  return [...changedParagraphs.entries()]
    .map(([key, count]) => {
      const [slide, property, fromValue, toValue] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        property: property as ChangedDominantBodyStyleSummary["property"],
        fromValue,
        toValue,
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (left.property !== right.property) {
        return left.property.localeCompare(right.property);
      }

      if (left.fromValue !== right.fromValue) {
        return left.fromValue.localeCompare(right.fromValue);
      }

      return left.toValue.localeCompare(right.toValue);
    });
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
