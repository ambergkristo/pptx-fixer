import { readFile } from "node:fs/promises";
import path from "node:path";

import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import {
  groupParagraphs,
  type SlideStructureParagraphDescriptor
} from "./slideStructureAudit.ts";
import {
  attachStyleSignatures
} from "./styleSignatureAudit.ts";
import {
  summarizeDominantBodyStyle,
  type DominantBodyStyle
} from "./dominantStyleAudit.ts";
import {
  summarizeSlideSeverity,
  type SeverityLabel
} from "./severityAudit.ts";
import {
  attachCleanupCandidates
} from "./cleanupCandidateAudit.ts";
import {
  attachDominantFontCleanupCandidates,
  type BodyParagraphGroupWithDominantFontCleanupCandidates
} from "./dominantFontCleanupCandidateAudit.ts";
import {
  summarizeDeckQaSummary,
  type DeckQaSummary
} from "./deckQaSummary.ts";

export interface LoadedPresentation {
  sourcePath: string;
  slides: LoadedSlide[];
}

export interface LoadedSlide {
  index: number;
  archivePath: string;
  xml: SlideXmlNode;
}

export interface SlideAuditSummary {
  index: number;
  title: string | null;
  textBoxCount: number;
  paragraphGroups: BodyParagraphGroupWithDominantFontCleanupCandidates[];
  slideFontUsage: SlideFontUsageSummary;
  dominantBodyStyle: DominantBodyStyle;
  severityScore: number;
  severityLabel: SeverityLabel;
  fontsUsed: FontUsageSummary[];
  fontSizesUsed: FontSizeUsageSummary[];
}

export interface SlideFontUsageSummary {
  fontFamilyHistogram: Record<string, number>;
  fontSizeHistogram: Record<string, number>;
}

export interface DeckFontUsageSummary extends SlideFontUsageSummary {
  dominantFontFamilyCoverage: number;
  dominantFontSizeCoverage: number;
}

export type FontDriftSeverity = "low" | "medium" | "high";

export interface DeckStyleFingerprint {
  fontFamily: string | null;
  fontSize: number | null;
  alignment: string | null;
  lineSpacing: number | null;
  spacingBefore: number | null;
  spacingAfter: number | null;
}

export interface FontUsageSummary {
  fontFamily: string;
  usageCount: number;
}

export interface FontSizeUsageSummary {
  sizePt: number;
  usageCount: number;
}

export interface FontDriftRun {
  slide: number;
  fontFamily: string;
  count: number;
}

export interface FontDriftSummary {
  dominantFont: string | null;
  driftRuns: FontDriftRun[];
}

export interface FontSizeDriftRun {
  slide: number;
  sizePt: number;
  count: number;
}

export interface FontSizeDriftSummary {
  dominantSizePt: number | null;
  driftRuns: FontSizeDriftRun[];
}

export interface SpacingDriftParagraph {
  slide: number;
  paragraph: number;
  spacingBefore: string | null;
  spacingAfter: string | null;
  lineSpacing: string | null;
}

export interface SpacingDriftSummary {
  driftParagraphs: SpacingDriftParagraph[];
}

export interface BulletIndentDriftParagraph {
  slide: number;
  paragraph: number;
  level: number;
  reason: string;
}

export interface BulletIndentDriftSummary {
  driftParagraphs: BulletIndentDriftParagraph[];
}

export interface LineSpacingDriftParagraph {
  slide: number;
  paragraph: number;
  lineSpacing: string | null;
}

export interface LineSpacingDriftSummary {
  driftParagraphs: LineSpacingDriftParagraph[];
}

export interface AlignmentDriftParagraph {
  slide: number;
  paragraph: number;
  alignment: string;
}

export interface AlignmentDriftSummary {
  driftParagraphs: AlignmentDriftParagraph[];
}

export interface AuditReport {
  file: string;
  slideCount: number;
  slides: SlideAuditSummary[];
  deckFontUsage: DeckFontUsageSummary;
  deckStyleFingerprint: DeckStyleFingerprint;
  fontDriftSeverity: FontDriftSeverity;
  deckQaSummary: DeckQaSummary;
  fontsUsed: FontUsageSummary[];
  fontSizesUsed: FontSizeUsageSummary[];
  fontDrift: FontDriftSummary;
  fontSizeDrift: FontSizeDriftSummary;
  spacingDrift: SpacingDriftSummary;
  spacingDriftCount: number;
  bulletIndentDrift: BulletIndentDriftSummary;
  bulletIndentDriftCount: number;
  lineSpacingDrift: LineSpacingDriftSummary;
  lineSpacingDriftCount: number;
  alignmentDrift: AlignmentDriftSummary;
  alignmentDriftCount: number;
}

type XmlNode = Record<string, unknown>;
type SlideXmlNode = XmlNode;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  trimValues: false
});

export async function loadPresentation(filePath: string): Promise<LoadedPresentation> {
  if (path.extname(filePath).toLowerCase() !== ".pptx") {
    throw new Error(`Expected a .pptx file: ${filePath}`);
  }

  const sourcePath = path.resolve(filePath);
  const fileBuffer = await readFile(sourcePath);
  const archive = await JSZip.loadAsync(fileBuffer);

  const slidePaths = await getOrderedSlidePaths(archive);
  const slides = await Promise.all(
    slidePaths.map(async (archivePath, index) => ({
      index: index + 1,
      archivePath,
      xml: await readXmlEntry(archive, archivePath)
    }))
  );

  return {
    sourcePath,
    slides
  };
}

export function analyzeSlides(presentation: LoadedPresentation): AuditReport {
  const fontRuns: FontRun[] = [];
  const paragraphSpacings: ParagraphSpacingSignature[] = [];
  const bulletParagraphs: BulletParagraphSignature[] = [];
  const lineSpacingParagraphs: LineSpacingSignature[] = [];
  const alignmentParagraphs: AlignmentSignature[] = [];
  const slides = presentation.slides.map((slide) => {
    const shapes = getSlideShapes(slide.xml);
    const textShapes = shapes.filter(hasTextBody);
    const titleShape = shapes.find(isTitleShape);
    const slideFontRuns: FontRun[] = [];
    const structureParagraphs: SlideStructureParagraphDescriptor[] = [];
    let paragraphIndex = 1;
    let bulletListIndex = 1;
    let comparableShapeIndex = 1;
    let structureShapeIndex = 1;

    for (const shape of textShapes) {
      const titleShapeFlag = isTitleShape(shape);
      structureParagraphs.push(...extractStructureParagraphs(shape, structureShapeIndex, titleShapeFlag));
      structureShapeIndex += 1;

      const shapeFontRuns = extractFontRuns(shape, slide.index);
      fontRuns.push(...shapeFontRuns);
      slideFontRuns.push(...shapeFontRuns);

      if (titleShapeFlag) {
        continue;
      }

      const paragraphDescriptors = extractParagraphDescriptors(shape, slide.index, paragraphIndex, comparableShapeIndex);
      paragraphSpacings.push(...extractParagraphSpacings(paragraphDescriptors.paragraphs));
      const shapeBulletParagraphs = extractBulletParagraphs(paragraphDescriptors.paragraphs, bulletListIndex);
      bulletParagraphs.push(...shapeBulletParagraphs.bulletParagraphs);
      lineSpacingParagraphs.push(...extractLineSpacingSignatures(paragraphDescriptors.paragraphs));
      alignmentParagraphs.push(...extractAlignmentSignatures(paragraphDescriptors.paragraphs));
      bulletListIndex = shapeBulletParagraphs.nextListIndex;
      paragraphIndex = paragraphDescriptors.nextParagraphIndex;
      comparableShapeIndex += 1;
    }

    const groupedParagraphs = attachStyleSignatures(groupParagraphs(structureParagraphs));
    const dominantBodyStyle = summarizeDominantBodyStyle(groupedParagraphs);
    const paragraphGroups = attachDominantFontCleanupCandidates(
      attachCleanupCandidates(groupedParagraphs, dominantBodyStyle),
      dominantBodyStyle
    );
    const slideFontUsage = summarizeSlideFontUsage(paragraphGroups);

    return {
      index: slide.index,
      title: titleShape ? extractShapeText(titleShape) : null,
      textBoxCount: textShapes.length,
      paragraphGroups,
      slideFontUsage,
      dominantBodyStyle,
      severityScore: 0,
      severityLabel: "low" as const,
      fontsUsed: summarizeFonts(slideFontRuns),
      fontSizesUsed: summarizeFontSizes(slideFontRuns)
    };
  });

  const fontsUsed = summarizeFonts(fontRuns);
  const dominantFont = fontsUsed[0]?.fontFamily ?? null;
  const fontSizesUsed = summarizeFontSizes(fontRuns);
  const dominantFontSizePt = fontSizesUsed[0]?.sizePt ?? null;
  const spacingDrift = summarizeSpacingDrift(paragraphSpacings);
  const bulletIndentDrift = summarizeBulletIndentDrift(bulletParagraphs);
  const lineSpacingDrift = summarizeLineSpacingDrift(lineSpacingParagraphs);
  const alignmentDrift = summarizeAlignmentDrift(alignmentParagraphs);
  const fontDriftRuns = summarizeFontDrift(fontRuns, dominantFont);
  const fontSizeDriftRuns = summarizeFontSizeDrift(fontRuns, dominantFontSizePt);

  const fontDriftCountsBySlide = sumCountsBySlide(fontDriftRuns);
  const fontSizeDriftCountsBySlide = sumCountsBySlide(fontSizeDriftRuns);
  const spacingDriftCountsBySlide = countEntriesBySlide(spacingDrift.driftParagraphs);
  const bulletIndentDriftCountsBySlide = countEntriesBySlide(bulletIndentDrift.driftParagraphs);
  const lineSpacingDriftCountsBySlide = countEntriesBySlide(lineSpacingDrift.driftParagraphs);
  const alignmentDriftCountsBySlide = countEntriesBySlide(alignmentDrift.driftParagraphs);

  const slidesWithSeverity = slides.map((slide) => ({
    ...slide,
    ...summarizeSlideSeverity({
      fontDriftCount: fontDriftCountsBySlide.get(slide.index) ?? 0,
      fontSizeDriftCount: fontSizeDriftCountsBySlide.get(slide.index) ?? 0,
      spacingDriftCount: spacingDriftCountsBySlide.get(slide.index) ?? 0,
      bulletIndentDriftCount: bulletIndentDriftCountsBySlide.get(slide.index) ?? 0,
      alignmentDriftCount: alignmentDriftCountsBySlide.get(slide.index) ?? 0,
      lineSpacingDriftCount: lineSpacingDriftCountsBySlide.get(slide.index) ?? 0,
      paragraphGroups: slide.paragraphGroups,
      dominantBodyStyle: slide.dominantBodyStyle
    })
  }));
  const deckFontUsage = summarizeDeckFontUsage(slidesWithSeverity.flatMap((slide) => slide.paragraphGroups));
  const deckStyleFingerprint = summarizeDeckStyleFingerprint(slidesWithSeverity, deckFontUsage);
  const fontDriftCount = countChangedRuns(fontDriftRuns);
  const fontSizeDriftCount = countChangedRuns(fontSizeDriftRuns);
  const deckQaSummary = summarizeDeckQaSummary({
    slideCount: slidesWithSeverity.length,
    fontDriftCount,
    fontSizeDriftCount,
    spacingDriftCount: spacingDrift.driftParagraphs.length,
    bulletIndentDriftCount: bulletIndentDrift.driftParagraphs.length,
    alignmentDriftCount: alignmentDrift.driftParagraphs.length,
    lineSpacingDriftCount: lineSpacingDrift.driftParagraphs.length
  });

  return {
    file: presentation.sourcePath,
    slideCount: slidesWithSeverity.length,
    slides: slidesWithSeverity,
    deckFontUsage,
    deckStyleFingerprint,
    fontDriftSeverity: summarizeFontDriftSeverity(deckFontUsage),
    deckQaSummary,
    fontsUsed,
    fontSizesUsed,
    fontDrift: {
      dominantFont,
      driftRuns: fontDriftRuns
    },
    fontSizeDrift: {
      dominantSizePt: dominantFontSizePt,
      driftRuns: fontSizeDriftRuns
    },
    spacingDrift,
    spacingDriftCount: spacingDrift.driftParagraphs.length,
    bulletIndentDrift,
    bulletIndentDriftCount: bulletIndentDrift.driftParagraphs.length,
    lineSpacingDrift,
    lineSpacingDriftCount: lineSpacingDrift.driftParagraphs.length,
    alignmentDrift,
    alignmentDriftCount: alignmentDrift.driftParagraphs.length
  };
}

function summarizeDeckStyleFingerprint(
  slides: SlideAuditSummary[],
  deckFontUsage: DeckFontUsageSummary
): DeckStyleFingerprint {
  const dominantFontFamily = summarizeUniqueHistogramLeader(deckFontUsage.fontFamilyHistogram);
  const dominantBodyFontSize = summarizeUniqueDominantBodyMetric(
    slides.map((slide) => slide.dominantBodyStyle.fontSize)
  );
  const dominantBodyAlignment = summarizeUniqueDominantBodyMetric(
    slides.map((slide) => slide.dominantBodyStyle.alignment)
  );
  const dominantBodySpacingBefore = summarizeUniqueDominantBodyMetric(
    slides.map((slide) => slide.dominantBodyStyle.spacingBefore)
  );
  const dominantBodySpacingAfter = summarizeUniqueDominantBodyMetric(
    slides.map((slide) => slide.dominantBodyStyle.spacingAfter)
  );
  const dominantBodyLineSpacing = summarizeUniqueDominantLineSpacing(
    slides.map((slide) => slide.dominantBodyStyle.lineSpacing)
  );

  return {
    fontFamily: dominantFontFamily,
    fontSize: dominantBodyFontSize ?? parseNumericHistogramKey(summarizeUniqueHistogramLeader(deckFontUsage.fontSizeHistogram)),
    alignment: dominantBodyAlignment,
    lineSpacing: dominantBodyLineSpacing,
    spacingBefore: dominantBodySpacingBefore,
    spacingAfter: dominantBodySpacingAfter
  };
}

function summarizeSlideFontUsage(
  paragraphGroups: BodyParagraphGroupWithDominantFontCleanupCandidates[]
): SlideFontUsageSummary {
  return {
    fontFamilyHistogram: buildParagraphCountHistogram(paragraphGroups, (group) => group.styleSignature.fontFamily),
    fontSizeHistogram: buildParagraphCountHistogram(paragraphGroups, (group) => group.styleSignature.fontSize)
  };
}

function summarizeDeckFontUsage(
  paragraphGroups: BodyParagraphGroupWithDominantFontCleanupCandidates[]
): DeckFontUsageSummary {
  const fontFamilyHistogram = buildParagraphCountHistogram(paragraphGroups, (group) => group.styleSignature.fontFamily);
  const fontSizeHistogram = buildParagraphCountHistogram(paragraphGroups, (group) => group.styleSignature.fontSize);

  return {
    fontFamilyHistogram,
    fontSizeHistogram,
    dominantFontFamilyCoverage: summarizeCoverage(fontFamilyHistogram),
    dominantFontSizeCoverage: summarizeCoverage(fontSizeHistogram)
  };
}

function buildParagraphCountHistogram(
  paragraphGroups: BodyParagraphGroupWithDominantFontCleanupCandidates[],
  getValue: (group: BodyParagraphGroupWithDominantFontCleanupCandidates) => string | number | null
): Record<string, number> {
  const histogram = new Map<string, number>();

  for (const group of paragraphGroups) {
    const value = getValue(group);
    if (value === null) {
      continue;
    }

    const key = formatHistogramKey(value);
    histogram.set(key, (histogram.get(key) ?? 0) + group.paragraphCount);
  }

  return Object.fromEntries(
    [...histogram.entries()].sort(([leftKey, leftCount], [rightKey, rightCount]) => {
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }

      const leftNumeric = Number.parseFloat(leftKey);
      const rightNumeric = Number.parseFloat(rightKey);
      if (!Number.isNaN(leftNumeric) && !Number.isNaN(rightNumeric) && leftNumeric !== rightNumeric) {
        return rightNumeric - leftNumeric;
      }

      return leftKey.localeCompare(rightKey);
    })
  );
}

function summarizeCoverage(histogram: Record<string, number>): number {
  const totalParagraphCount = Object.values(histogram).reduce((total, count) => total + count, 0);
  if (totalParagraphCount === 0) {
    return 0;
  }

  const dominantCount = Math.max(0, ...Object.values(histogram));
  return Number.parseFloat(((dominantCount / totalParagraphCount) * 100).toFixed(2));
}

function summarizeFontDriftSeverity(deckFontUsage: DeckFontUsageSummary): FontDriftSeverity {
  const distinctFontFamilies = Object.keys(deckFontUsage.fontFamilyHistogram).length;
  const dominantCoverage = deckFontUsage.dominantFontFamilyCoverage;

  if (distinctFontFamilies === 0) {
    return "low";
  }

  if (distinctFontFamilies <= 1 && dominantCoverage >= 90) {
    return "low";
  }

  if (distinctFontFamilies <= 2 && dominantCoverage >= 70) {
    return "medium";
  }

  return "high";
}

function summarizeUniqueHistogramLeader(histogram: Record<string, number>): string | null {
  const entries = Object.entries(histogram);
  if (entries.length === 0) {
    return null;
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const dominantEntries = entries.filter(([, count]) => count === maxCount);
  if (dominantEntries.length !== 1) {
    return null;
  }

  return dominantEntries[0][0];
}

function summarizeUniqueDominantBodyMetric<T extends string | number>(
  values: Array<T | null>
): T | null {
  const counts = new Map<T, number>();

  for (const value of values) {
    if (value === null) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const entries = [...counts.entries()];
  if (entries.length === 0) {
    return null;
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const dominantEntries = entries.filter(([, count]) => count === maxCount);
  if (dominantEntries.length !== 1) {
    return null;
  }

  return dominantEntries[0][0];
}

function summarizeUniqueDominantLineSpacing(
  values: Array<DominantBodyStyle["lineSpacing"]>
): number | null {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value || value.kind === null || value.value === null) {
      continue;
    }

    const key = `${value.kind}::${value.value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const entries = [...counts.entries()];
  if (entries.length === 0) {
    return null;
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const dominantEntries = entries.filter(([, count]) => count === maxCount);
  if (dominantEntries.length !== 1) {
    return null;
  }

  const [, rawValue] = dominantEntries[0][0].split("::");
  const parsedValue = Number.parseFloat(rawValue);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function parseNumericHistogramKey(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatHistogramKey(value: string | number): string {
  if (typeof value === "number") {
    return formatMetricValue(value);
  }

  return value;
}

function countEntriesBySlide(entries: Array<{ slide: number }>): Map<number, number> {
  const counts = new Map<number, number>();

  for (const entry of entries) {
    counts.set(entry.slide, (counts.get(entry.slide) ?? 0) + 1);
  }

  return counts;
}

function countChangedRuns(entries: Array<{ count: number }>): number {
  return entries.reduce((total, entry) => total + entry.count, 0);
}

function sumCountsBySlide(entries: Array<{ slide: number; count: number }>): Map<number, number> {
  const counts = new Map<number, number>();

  for (const entry of entries) {
    counts.set(entry.slide, (counts.get(entry.slide) ?? 0) + entry.count);
  }

  return counts;
}

async function getOrderedSlidePaths(archive: JSZip): Promise<string[]> {
  const presentation = await readXmlEntry(archive, "ppt/presentation.xml");
  const relationships = await readXmlEntry(archive, "ppt/_rels/presentation.xml.rels");

  const relationshipById = new Map<string, string>();
  for (const relation of asArray<XmlNode>(relationships.Relationships?.Relationship)) {
    const relationId = stringValue(relation.Id);
    const target = stringValue(relation.Target);
    if (!relationId || !target) {
      continue;
    }

    relationshipById.set(relationId, normalizeArchivePath(path.posix.join("ppt", target)));
  }

  const orderedSlidePaths: string[] = [];
  for (const slideRef of asArray<XmlNode>(presentation.presentation?.sldIdLst?.sldId)) {
    const relationshipId = stringValue(slideRef["r:id"]) ?? stringValue(slideRef.id);
    if (!relationshipId) {
      continue;
    }

    const archivePath = relationshipById.get(relationshipId);
    if (archivePath) {
      orderedSlidePaths.push(archivePath);
    }
  }

  if (orderedSlidePaths.length > 0) {
    return orderedSlidePaths;
  }

  const fallbackSlidePaths = Object.keys(archive.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    .sort((left, right) => numericSlideIndex(left) - numericSlideIndex(right));

  if (fallbackSlidePaths.length === 0) {
    throw new Error("No slide XML entries found in the PPTX archive.");
  }

  return fallbackSlidePaths;
}

async function readXmlEntry(archive: JSZip, archivePath: string): Promise<XmlNode> {
  const entry = archive.file(archivePath);
  if (!entry) {
    throw new Error(`Missing archive entry: ${archivePath}`);
  }

  const xml = await entry.async("string");
  return xmlParser.parse(xml) as XmlNode;
}

function getSlideShapes(slideXml: SlideXmlNode): XmlNode[] {
  return asArray<XmlNode>(slideXml.sld?.cSld?.spTree?.sp);
}

function hasTextBody(shape: XmlNode): boolean {
  return shape.txBody !== undefined;
}

function isTitleShape(shape: XmlNode): boolean {
  const placeholder = asXmlNode(shape.nvSpPr)?.nvPr;
  const placeholderNode = asXmlNode(placeholder)?.ph;
  const placeholderType = stringValue(asXmlNode(placeholderNode)?.type);
  if (placeholderType === "title" || placeholderType === "ctrTitle") {
    return true;
  }

  const shapeName = stringValue(asXmlNode(asXmlNode(shape.nvSpPr)?.cNvPr)?.name);
  return typeof shapeName === "string" && /^title\b/i.test(shapeName);
}

function extractShapeText(shape: XmlNode): string | null {
  const paragraphs = asArray<XmlNode>(asXmlNode(shape.txBody)?.p);
  const paragraphTexts = paragraphs
    .map((paragraph) => {
      const runTexts = asArray<XmlNode>(paragraph.r).map((run) => stringValue(run.t) ?? "");
      const fieldTexts = asArray<XmlNode>(paragraph.fld).map((field) => stringValue(field.t) ?? "");
      return [...runTexts, ...fieldTexts].join("").trim();
    })
    .filter((text) => text.length > 0);

  if (paragraphTexts.length === 0) {
    return null;
  }

  return paragraphTexts.join("\n");
}

interface FontRun {
  fontFamily: string;
  fontSize: number | null;
  slide: number;
}

interface NormalizedSpacingValue {
  unit: "pt" | "percent";
  value: number;
  display: string;
}

interface ExplicitLineSpacingValue {
  kind: "spcPct" | "spcPts";
  value: number;
  display: string;
}

interface ParagraphSpacingSignature {
  slide: number;
  paragraph: number;
  signature: string;
  spacingBefore: string | null;
  spacingAfter: string | null;
  lineSpacing: string | null;
}

interface ParagraphDescriptor {
  slide: number;
  paragraph: number;
  shape: number;
  text: string;
  properties: XmlNode | undefined;
}

function extractStructureParagraphs(
  shape: XmlNode,
  shapeIndex: number,
  isTitle: boolean
): SlideStructureParagraphDescriptor[] {
  const paragraphs = asArray<XmlNode>(asXmlNode(shape.txBody)?.p);
  const descriptors: SlideStructureParagraphDescriptor[] = [];
  let shapeParagraphIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphText = extractParagraphText(paragraph);
    if (!paragraphText) {
      continue;
    }

    const properties = asXmlNode(paragraph.pPr);
    const explicitLineSpacing = extractExplicitLineSpacingValue(asXmlNode(properties?.lnSpc));
    descriptors.push({
      shape: shapeIndex,
      shapeParagraphIndex,
      isTitle,
      isBullet: isBulletParagraph(properties),
      bulletLevel: numericValue(properties?.lvl),
      fontFamily: extractParagraphFontFamily(paragraph),
      fontSize: extractParagraphFontSize(paragraph),
      spacingBefore: extractSpacingValue(asXmlNode(properties?.spcBef))?.display ?? null,
      spacingAfter: extractSpacingValue(asXmlNode(properties?.spcAft))?.display ?? null,
      lineSpacing: explicitLineSpacing?.display ?? null,
      lineSpacingKind: explicitLineSpacing?.kind ?? null,
      lineSpacingValue: explicitLineSpacing?.value ?? null,
      alignment: normalizeAlignmentValue(stringValue(properties?.algn))
    });
    shapeParagraphIndex += 1;
  }

  return descriptors;
}

interface BulletParagraphSignature {
  slide: number;
  paragraph: number;
  list: number;
  level: number;
}

interface LineSpacingSignature {
  slide: number;
  paragraph: number;
  lineSpacing: string | null;
  signature: string;
}

interface AlignmentSignature {
  slide: number;
  paragraph: number;
  shape: number;
  alignment: string | null;
  signature: string;
}

function extractFontRuns(shape: XmlNode, slideIndex: number): FontRun[] {
  const paragraphs = asArray<XmlNode>(asXmlNode(shape.txBody)?.p);
  const fontRuns: FontRun[] = [];

  for (const paragraph of paragraphs) {
    for (const run of asArray<XmlNode>(paragraph.r)) {
      const runProperties = asXmlNode(run.rPr);
      const fontFamily = extractFontFamily(runProperties);
      if (!fontFamily) {
        continue;
      }

      fontRuns.push({
        fontFamily,
        fontSize: numericValue(runProperties?.sz),
        slide: slideIndex
      });
    }
  }

  return fontRuns;
}

function extractParagraphDescriptors(
  shape: XmlNode,
  slideIndex: number,
  startingParagraphIndex: number,
  shapeIndex: number
): {
  paragraphs: ParagraphDescriptor[];
  nextParagraphIndex: number;
} {
  const paragraphs = asArray<XmlNode>(asXmlNode(shape.txBody)?.p);
  const descriptors: ParagraphDescriptor[] = [];
  let paragraphIndex = startingParagraphIndex;

  for (const paragraph of paragraphs) {
    const paragraphText = extractParagraphText(paragraph);
    if (!paragraphText) {
      continue;
    }

    descriptors.push({
      slide: slideIndex,
      paragraph: paragraphIndex,
      shape: shapeIndex,
      text: paragraphText,
      properties: asXmlNode(paragraph.pPr)
    });

    paragraphIndex += 1;
  }

  return {
    paragraphs: descriptors,
    nextParagraphIndex: paragraphIndex
  };
}

function extractParagraphSpacings(
  paragraphs: ParagraphDescriptor[]
): ParagraphSpacingSignature[] {
  return paragraphs.map((paragraph) => {
    const spacingBefore = extractSpacingValue(asXmlNode(paragraph.properties?.spcBef));
    const spacingAfter = extractSpacingValue(asXmlNode(paragraph.properties?.spcAft));
    const lineSpacing = extractSpacingValue(asXmlNode(paragraph.properties?.lnSpc));

    return {
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      signature: [
        spacingBefore?.display ?? "inherit",
        spacingAfter?.display ?? "inherit"
      ].join("|"),
      spacingBefore: spacingBefore?.display ?? null,
      spacingAfter: spacingAfter?.display ?? null,
      lineSpacing: lineSpacing?.display ?? null
    };
  });
}

function extractLineSpacingSignatures(
  paragraphs: ParagraphDescriptor[]
): LineSpacingSignature[] {
  return paragraphs.map((paragraph) => {
    const lineSpacing = extractExplicitLineSpacingValue(asXmlNode(paragraph.properties?.lnSpc));

    return {
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      lineSpacing: lineSpacing?.display ?? null,
      signature: lineSpacing?.display ?? "inherit"
    };
  });
}

function extractAlignmentSignatures(
  paragraphs: ParagraphDescriptor[]
): AlignmentSignature[] {
  return paragraphs.map((paragraph) => {
    const alignment = normalizeAlignmentValue(stringValue(paragraph.properties?.algn));

    return {
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      shape: paragraph.shape,
      alignment,
      signature: alignment ?? "inherit"
    };
  });
}

function extractBulletParagraphs(
  paragraphs: ParagraphDescriptor[],
  startingListIndex: number
): {
  bulletParagraphs: BulletParagraphSignature[];
  nextListIndex: number;
} {
  const bulletParagraphs: BulletParagraphSignature[] = [];
  let nextListIndex = startingListIndex;
  let activeListIndex: number | null = null;

  for (const paragraph of paragraphs) {
    if (!isBulletParagraph(paragraph.properties)) {
      activeListIndex = null;
      continue;
    }

    if (activeListIndex === null) {
      activeListIndex = nextListIndex;
      nextListIndex += 1;
    }

    bulletParagraphs.push({
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      list: activeListIndex,
      level: numericValue(paragraph.properties?.lvl) ?? 0
    });
  }

  return {
    bulletParagraphs,
    nextListIndex
  };
}

function summarizeFonts(fontRuns: FontRun[]): FontUsageSummary[] {
  const usageByFamily = new Map<string, number>();

  for (const fontRun of fontRuns) {
    usageByFamily.set(fontRun.fontFamily, (usageByFamily.get(fontRun.fontFamily) ?? 0) + 1);
  }

  return [...usageByFamily.entries()]
    .map(([fontFamily, usageCount]) => ({
      fontFamily,
      usageCount
    }))
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount;
      }

      return left.fontFamily.localeCompare(right.fontFamily);
    });
}

function summarizeFontSizes(fontRuns: FontRun[]): FontSizeUsageSummary[] {
  const usageBySizePt = new Map<number, number>();

  for (const fontRun of fontRuns) {
    if (fontRun.fontSize === null) {
      continue;
    }

    const sizePt = toPointSize(fontRun.fontSize);
    usageBySizePt.set(sizePt, (usageBySizePt.get(sizePt) ?? 0) + 1);
  }

  return [...usageBySizePt.entries()]
    .map(([sizePt, usageCount]) => ({
      sizePt,
      usageCount
    }))
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount;
      }

      return right.sizePt - left.sizePt;
    });
}

function summarizeFontDrift(fontRuns: FontRun[], dominantFont: string | null): FontDriftRun[] {
  if (!dominantFont) {
    return [];
  }

  const driftCounts = new Map<string, number>();
  for (const fontRun of fontRuns) {
    if (fontRun.fontFamily === dominantFont) {
      continue;
    }

    const key = `${fontRun.slide}::${fontRun.fontFamily}`;
    driftCounts.set(key, (driftCounts.get(key) ?? 0) + 1);
  }

  return [...driftCounts.entries()]
    .map(([key, count]) => {
      const [slide, fontFamily] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        fontFamily,
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.fontFamily.localeCompare(right.fontFamily);
    });
}

function summarizeFontSizeDrift(fontRuns: FontRun[], dominantSizePt: number | null): FontSizeDriftRun[] {
  if (dominantSizePt === null) {
    return [];
  }

  const driftCounts = new Map<string, number>();
  for (const fontRun of fontRuns) {
    if (fontRun.fontSize === null) {
      continue;
    }

    const sizePt = toPointSize(fontRun.fontSize);
    if (sizePt === dominantSizePt) {
      continue;
    }

    const key = `${fontRun.slide}::${sizePt}`;
    driftCounts.set(key, (driftCounts.get(key) ?? 0) + 1);
  }

  return [...driftCounts.entries()]
    .map(([key, count]) => {
      const [slide, size] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        sizePt: Number.parseFloat(size),
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.sizePt - left.sizePt;
    });
}

function summarizeSpacingDrift(
  paragraphSpacings: ParagraphSpacingSignature[]
): SpacingDriftSummary {
  const slideParagraphs = new Map<number, ParagraphSpacingSignature[]>();

  for (const paragraphSpacing of paragraphSpacings) {
    const paragraphs = slideParagraphs.get(paragraphSpacing.slide) ?? [];
    paragraphs.push(paragraphSpacing);
    slideParagraphs.set(paragraphSpacing.slide, paragraphs);
  }

  const driftParagraphs = [...slideParagraphs.entries()]
    .sort(([leftSlide], [rightSlide]) => leftSlide - rightSlide)
    .flatMap(([, paragraphs]) => summarizeSlideSpacingDrift(paragraphs))
    .map((paragraph) => ({
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      spacingBefore: paragraph.spacingBefore,
      spacingAfter: paragraph.spacingAfter,
      lineSpacing: paragraph.lineSpacing
    }));

  return { driftParagraphs };
}

function summarizeBulletIndentDrift(
  bulletParagraphs: BulletParagraphSignature[]
): BulletIndentDriftSummary {
  const bulletLists = new Map<string, BulletParagraphSignature[]>();

  for (const paragraph of bulletParagraphs) {
    const key = `${paragraph.slide}:${paragraph.list}`;
    const list = bulletLists.get(key) ?? [];
    list.push(paragraph);
    bulletLists.set(key, list);
  }

  const driftByParagraph = new Map<string, BulletIndentDriftParagraph>();

  for (const [, list] of [...bulletLists.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    for (const paragraph of summarizeBulletListDrift(list)) {
      const key = `${paragraph.slide}:${paragraph.paragraph}`;
      const existing = driftByParagraph.get(key);
      if (!existing || paragraph.reason.startsWith("jump")) {
        driftByParagraph.set(key, paragraph);
      }
    }
  }

  return {
    driftParagraphs: [...driftByParagraph.values()].sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      return left.paragraph - right.paragraph;
    })
  };
}

function summarizeLineSpacingDrift(
  lineSpacingParagraphs: LineSpacingSignature[]
): LineSpacingDriftSummary {
  const slideParagraphs = new Map<number, LineSpacingSignature[]>();

  for (const paragraph of lineSpacingParagraphs) {
    const paragraphs = slideParagraphs.get(paragraph.slide) ?? [];
    paragraphs.push(paragraph);
    slideParagraphs.set(paragraph.slide, paragraphs);
  }

  const driftParagraphs = [...slideParagraphs.entries()]
    .sort(([leftSlide], [rightSlide]) => leftSlide - rightSlide)
    .flatMap(([, paragraphs]) => summarizeSlideLineSpacingDrift(paragraphs))
    .map((paragraph) => ({
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      lineSpacing: paragraph.lineSpacing
    }));

  return { driftParagraphs };
}

function summarizeAlignmentDrift(
  alignmentParagraphs: AlignmentSignature[]
): AlignmentDriftSummary {
  const paragraphsByShape = new Map<string, AlignmentSignature[]>();

  for (const paragraph of alignmentParagraphs) {
    if (paragraph.alignment === null) {
      continue;
    }

    const key = `${paragraph.slide}:${paragraph.shape}`;
    const shapeParagraphs = paragraphsByShape.get(key) ?? [];
    shapeParagraphs.push(paragraph);
    paragraphsByShape.set(key, shapeParagraphs);
  }

  const driftParagraphs = [...paragraphsByShape.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, paragraphs]) => summarizeShapeAlignmentDrift(paragraphs))
    .map((paragraph) => ({
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      alignment: paragraph.alignment ?? "inherit"
    }));

  return { driftParagraphs };
}

function summarizeBulletListDrift(
  paragraphs: BulletParagraphSignature[]
): BulletIndentDriftParagraph[] {
  if (paragraphs.length < 2) {
    return [];
  }

  const driftParagraphs: BulletIndentDriftParagraph[] = [];

  for (let index = 1; index < paragraphs.length; index += 1) {
    const previousParagraph = paragraphs[index - 1];
    const paragraph = paragraphs[index];
    if (paragraph.level > previousParagraph.level + 1) {
      driftParagraphs.push({
        slide: paragraph.slide,
        paragraph: paragraph.paragraph,
        level: paragraph.level,
        reason: `jump from lvl=${previousParagraph.level} to lvl=${paragraph.level}`
      });
    }
  }

  const countsByLevel = new Map<number, number>();
  for (const paragraph of paragraphs) {
    countsByLevel.set(paragraph.level, (countsByLevel.get(paragraph.level) ?? 0) + 1);
  }

  if (countsByLevel.size < 2) {
    return driftParagraphs;
  }

  const maxCount = Math.max(...countsByLevel.values());
  const dominantLevels = [...countsByLevel.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([level]) => level);

  if (dominantLevels.length !== 1) {
    return driftParagraphs;
  }

  const dominantLevel = dominantLevels[0];
  for (const paragraph of paragraphs) {
    const levelCount = countsByLevel.get(paragraph.level) ?? 0;
    if (paragraph.level !== dominantLevel && levelCount === 1) {
      driftParagraphs.push({
        slide: paragraph.slide,
        paragraph: paragraph.paragraph,
        level: paragraph.level,
        reason: `outlier lvl=${paragraph.level} in list dominated by lvl=${dominantLevel}`
      });
    }
  }

  return driftParagraphs;
}

function summarizeSlideSpacingDrift(
  paragraphs: ParagraphSpacingSignature[]
): ParagraphSpacingSignature[] {
  if (paragraphs.length < 2) {
    return [];
  }

  const countsBySignature = new Map<string, number>();
  for (const paragraph of paragraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
  }

  if (countsBySignature.size < 2) {
    return [];
  }

  const maxCount = Math.max(...countsBySignature.values());
  if (maxCount === 1) {
    return paragraphs;
  }

  const dominantSignature = [...countsBySignature.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([signature]) => signature)
    .sort((left, right) => left.localeCompare(right))[0];

  return paragraphs.filter((paragraph) => paragraph.signature !== dominantSignature);
}

function summarizeSlideLineSpacingDrift(
  paragraphs: LineSpacingSignature[]
): LineSpacingSignature[] {
  if (paragraphs.length < 2) {
    return [];
  }

  const countsBySignature = new Map<string, number>();
  for (const paragraph of paragraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
  }

  if (countsBySignature.size < 2) {
    return [];
  }

  const maxCount = Math.max(...countsBySignature.values());
  if (maxCount === 1) {
    return paragraphs;
  }

  const dominantSignature = [...countsBySignature.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([signature]) => signature)
    .sort((left, right) => left.localeCompare(right))[0];

  return paragraphs.filter((paragraph) => paragraph.signature !== dominantSignature);
}

function summarizeShapeAlignmentDrift(
  paragraphs: AlignmentSignature[]
): AlignmentSignature[] {
  if (paragraphs.length < 2) {
    return [];
  }

  const countsBySignature = new Map<string, number>();
  for (const paragraph of paragraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
  }

  if (countsBySignature.size < 2) {
    return [];
  }

  const maxCount = Math.max(...countsBySignature.values());
  if (maxCount === 1) {
    return paragraphs;
  }

  const dominantSignature = [...countsBySignature.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([signature]) => signature)
    .sort((left, right) => left.localeCompare(right))[0];

  return paragraphs.filter((paragraph) => paragraph.signature !== dominantSignature);
}

function extractFontFamily(runProperties: XmlNode | undefined): string | undefined {
  const directTypeface = stringValue(runProperties?.typeface);
  if (directTypeface) {
    return directTypeface;
  }

  return (
    stringValue(asXmlNode(runProperties?.latin)?.typeface) ??
    stringValue(asXmlNode(runProperties?.ea)?.typeface) ??
    stringValue(asXmlNode(runProperties?.cs)?.typeface) ??
    stringValue(asXmlNode(runProperties?.sym)?.typeface)
  );
}

function extractParagraphFontFamily(paragraph: XmlNode): string | null {
  const runs = asArray<XmlNode>(paragraph.r);
  if (runs.length === 0) {
    return null;
  }

  const fontFamilies = runs.map((run) => extractFontFamily(asXmlNode(run.rPr)) ?? null);
  if (fontFamilies.some((fontFamily) => fontFamily === null)) {
    return null;
  }

  const distinctFamilies = new Set(fontFamilies);
  return distinctFamilies.size === 1 ? fontFamilies[0] : null;
}

function extractParagraphFontSize(paragraph: XmlNode): number | null {
  const runs = asArray<XmlNode>(paragraph.r);
  if (runs.length === 0) {
    return null;
  }

  const fontSizes = runs.map((run) => {
    const size = numericValue(asXmlNode(run.rPr)?.sz);
    return size === null ? null : toPointSize(size);
  });

  if (fontSizes.some((fontSize) => fontSize === null)) {
    return null;
  }

  const distinctSizes = new Set(fontSizes);
  return distinctSizes.size === 1 ? fontSizes[0] : null;
}

function extractSpacingValue(spacingNode: XmlNode | undefined): NormalizedSpacingValue | null {
  const pointValue = numericValue(asXmlNode(spacingNode?.spcPts)?.val);
  if (pointValue !== null) {
    const spacingPt = Number.parseFloat((pointValue / 100).toFixed(2));
    return {
      unit: "pt",
      value: spacingPt,
      display: `${formatMetricValue(spacingPt)}pt`
    };
  }

  const percentValue = numericValue(asXmlNode(spacingNode?.spcPct)?.val);
  if (percentValue !== null) {
    const spacingPercent = Number.parseFloat((percentValue / 1000).toFixed(2));
    return {
      unit: "percent",
      value: spacingPercent,
      display: `${formatMetricValue(spacingPercent)}%`
    };
  }

  return null;
}

function extractExplicitLineSpacingValue(
  spacingNode: XmlNode | undefined
): ExplicitLineSpacingValue | null {
  const pointValue = numericValue(asXmlNode(spacingNode?.spcPts)?.val);
  if (pointValue !== null) {
    const spacingPt = Number.parseFloat((pointValue / 100).toFixed(2));
    return {
      kind: "spcPts",
      value: spacingPt,
      display: `${formatMetricValue(spacingPt)}pt`
    };
  }

  const percentValue = numericValue(asXmlNode(spacingNode?.spcPct)?.val);
  if (percentValue !== null) {
    const spacingPercent = Number.parseFloat((percentValue / 1000).toFixed(2));
    return {
      kind: "spcPct",
      value: spacingPercent,
      display: `${formatMetricValue(spacingPercent)}%`
    };
  }

  return null;
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

function extractParagraphText(paragraph: XmlNode): string {
  const runTexts = asArray<XmlNode>(paragraph.r).map((run) => stringValue(run.t) ?? "");
  const fieldTexts = asArray<XmlNode>(paragraph.fld).map((field) => stringValue(field.t) ?? "");
  return [...runTexts, ...fieldTexts].join("").trim();
}

function isBulletParagraph(paragraphProperties: XmlNode | undefined): boolean {
  if (!paragraphProperties || paragraphProperties.buNone !== undefined) {
    return false;
  }

  if (numericValue(paragraphProperties.lvl) !== null) {
    return true;
  }

  return [
    paragraphProperties.buChar,
    paragraphProperties.buAutoNum,
    paragraphProperties.buBlip,
    paragraphProperties.buClr,
    paragraphProperties.buClrTx,
    paragraphProperties.buFont,
    paragraphProperties.buFontTx,
    paragraphProperties.buSzPct,
    paragraphProperties.buSzPts,
    paragraphProperties.buSzTx
  ].some((value) => value !== undefined);
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value as T];
}

function asXmlNode(value: unknown): XmlNode | undefined {
  return typeof value === "object" && value !== null ? (value as XmlNode) : undefined;
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

function toPointSize(openXmlSize: number): number {
  return Number.parseFloat((openXmlSize / 100).toString());
}

function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
}

function normalizeArchivePath(archivePath: string): string {
  return archivePath.replace(/\\/g, "/");
}

function numericSlideIndex(archivePath: string): number {
  const match = archivePath.match(/slide(\d+)\.xml$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}
