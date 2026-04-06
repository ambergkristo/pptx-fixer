import { readFile } from "node:fs/promises";
import path from "node:path";

import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import {
  groupParagraphs,
  type ParagraphGroupDescriptor,
  type SlideStructureParagraphDescriptor
} from "./slideStructureAudit.ts";
import {
  attachStyleSignatures,
  type ParagraphGroupWithStyleSignature
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
import {
  summarizeSlideQaSummary,
  type SlideQaSummary
} from "./slideQaSummary.ts";
import {
  summarizeTopProblemSlides,
  type TopProblemSlideSummary
} from "./topProblemSlides.ts";

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
  slideQaSummary: SlideQaSummary;
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
  markerSignature?: string | null;
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
  topProblemSlides: TopProblemSlideSummary[];
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
  const dominantBodyAlignmentDriftParagraphs: AlignmentDriftParagraph[] = [];
  const slides = presentation.slides.map((slide) => {
    const shapes = getSlideShapes(slide.xml);
    const textShapes = shapes.filter(hasTextBody);
    const titleShape = shapes.find(isTitleShape);
    const slideFontRuns: FontRun[] = [];
    const slideParagraphSpacings: ParagraphSpacingSignature[] = [];
    const structureParagraphs: SlideStructureParagraphDescriptor[] = [];
    let paragraphIndex = 1;
    let bulletListIndex = 1;
    let comparableShapeIndex = 1;
    let structureShapeIndex = 1;

    for (const shape of textShapes) {
      const titleShapeFlag = isTitleShape(shape);
      structureParagraphs.push(
        ...extractStructureParagraphs(
          shape,
          structureShapeIndex,
          titleShapeFlag,
          titleShapeFlag ? null : paragraphIndex
        )
      );
      structureShapeIndex += 1;

    if (titleShapeFlag) {
        const shapeFontRuns = extractFontRuns(shape, slide.index, undefined, true);
        fontRuns.push(...shapeFontRuns);
        slideFontRuns.push(...shapeFontRuns);
        continue;
      }

      const paragraphDescriptors = extractParagraphDescriptors(shape, slide.index, paragraphIndex, comparableShapeIndex);
      const shapeFontRuns = extractFontRuns(shape, slide.index, paragraphDescriptors.paragraphs);
      fontRuns.push(...shapeFontRuns);
      slideFontRuns.push(...shapeFontRuns);
      slideParagraphSpacings.push(...extractParagraphSpacings(paragraphDescriptors.paragraphs));
      const shapeBulletParagraphs = extractBulletParagraphs(paragraphDescriptors.paragraphs, bulletListIndex);
      bulletParagraphs.push(...shapeBulletParagraphs.bulletParagraphs);
      lineSpacingParagraphs.push(...extractLineSpacingSignatures(paragraphDescriptors.paragraphs));
      alignmentParagraphs.push(...extractAlignmentSignatures(paragraphDescriptors.paragraphs));
      bulletListIndex = shapeBulletParagraphs.nextListIndex;
      paragraphIndex = paragraphDescriptors.nextParagraphIndex;
      comparableShapeIndex += 1;
    }

    const rawParagraphGroups = groupParagraphs(structureParagraphs);
    const groupedParagraphs = attachStyleSignatures(rawParagraphGroups);
    const dominantBodyStyle = summarizeDominantBodyStyle(groupedParagraphs);
    const paragraphGroups = attachDominantFontCleanupCandidates(
      attachCleanupCandidates(groupedParagraphs, dominantBodyStyle),
      dominantBodyStyle
    );
    const protectedFontFamilyParagraphIndexes = summarizeProtectedFontFamilyParagraphIndexes(
      rawParagraphGroups,
      groupedParagraphs
    );
    const protectedFontSizeParagraphIndexes = summarizeProtectedFontSizeParagraphIndexes(
      rawParagraphGroups,
      groupedParagraphs
    );
    const protectedParagraphSpacingParagraphIndexes = summarizeProtectedParagraphSpacingParagraphIndexes(
      rawParagraphGroups,
      groupedParagraphs,
      dominantBodyStyle
    );
    for (const fontRun of slideFontRuns) {
      fontRun.protectedFontFamilyDrift = fontRun.slideParagraphIndex !== null &&
        protectedFontFamilyParagraphIndexes.has(fontRun.slideParagraphIndex);
      fontRun.protectedFontSizeDrift = fontRun.slideParagraphIndex !== null &&
        protectedFontSizeParagraphIndexes.has(fontRun.slideParagraphIndex);
    }
    for (const paragraphSpacing of slideParagraphSpacings) {
      paragraphSpacing.protectedValueDrift =
        protectedParagraphSpacingParagraphIndexes.has(paragraphSpacing.paragraph);
    }
    paragraphSpacings.push(...slideParagraphSpacings);
    dominantBodyAlignmentDriftParagraphs.push(
      ...summarizeDominantBodyAlignmentDrift(rawParagraphGroups, paragraphGroups, dominantBodyStyle, slide.index)
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
      slideQaSummary: summarizeSlideQaSummary({
        fontDriftCount: 0,
        fontSizeDriftCount: 0,
        spacingDriftCount: 0,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 0,
        lineSpacingDriftCount: 0
      }),
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
  const alignmentDrift = summarizeAlignmentDrift(alignmentParagraphs, dominantBodyAlignmentDriftParagraphs);
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
    }),
    slideQaSummary: summarizeSlideQaSummary({
      fontDriftCount: fontDriftCountsBySlide.get(slide.index) ?? 0,
      fontSizeDriftCount: fontSizeDriftCountsBySlide.get(slide.index) ?? 0,
      spacingDriftCount: spacingDriftCountsBySlide.get(slide.index) ?? 0,
      bulletIndentDriftCount: bulletIndentDriftCountsBySlide.get(slide.index) ?? 0,
      alignmentDriftCount: alignmentDriftCountsBySlide.get(slide.index) ?? 0,
      lineSpacingDriftCount: lineSpacingDriftCountsBySlide.get(slide.index) ?? 0
    })
  }));
  const deckFontUsage = summarizeDeckFontUsage(slidesWithSeverity.flatMap((slide) => slide.paragraphGroups));
  const deckStyleFingerprint = summarizeDeckStyleFingerprint(slidesWithSeverity, deckFontUsage);
  const fontDriftCount = countChangedRuns(fontDriftRuns);
  const fontSizeDriftCount = countChangedRuns(fontSizeDriftRuns);
  const topProblemSlides = summarizeTopProblemSlides(
    slidesWithSeverity.map((slide) => ({
      slideIndex: slide.index,
      slideQaSummary: slide.slideQaSummary
    }))
  );
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
    topProblemSlides,
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
  slideParagraphIndex: number | null;
  titleRole: boolean;
  protectedFontFamilyDrift: boolean;
  protectedFontSizeDrift: boolean;
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
  shape: number;
  signature: string;
  spacingBefore: string | null;
  spacingAfter: string | null;
  lineSpacing: string | null;
  alignment: string | null;
  isBullet: boolean;
  protectedValueDrift: boolean;
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
  isTitle: boolean,
  startingSlideParagraphIndex: number | null
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
      slideParagraphIndex: startingSlideParagraphIndex === null
        ? null
        : startingSlideParagraphIndex + shapeParagraphIndex,
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
  markerSignature: string | null;
}

interface LineSpacingSignature {
  slide: number;
  paragraph: number;
  shape: number;
  lineSpacing: string | null;
  alignment: string | null;
  isBullet: boolean;
  signature: string;
}

interface AlignmentSignature {
  slide: number;
  paragraph: number;
  shape: number;
  alignment: string | null;
  signature: string;
}

function summarizeProtectedFontFamilyParagraphIndexes(
  rawParagraphGroups: ParagraphGroupDescriptor[],
  groupedParagraphs: ParagraphGroupWithStyleSignature[]
): Set<number> {
  const contentGroups = rawParagraphGroups
    .map((rawGroup, index) => ({
      rawGroup,
      styledGroup: groupedParagraphs[index]
    }))
    .filter(
      (entry): entry is { rawGroup: ParagraphGroupDescriptor; styledGroup: ParagraphGroupWithStyleSignature } =>
        entry.styledGroup !== undefined && entry.rawGroup.type !== "title"
    );
  const protectedParagraphIndexes = new Set<number>();

  for (const { rawGroup, styledGroup } of contentGroups) {
    const preserveStandaloneHierarchy = rawGroup.type === "standalone" && contentGroups.length > 1;
    if (preserveStandaloneHierarchy) {
      addProtectedSlideParagraphIndexes(protectedParagraphIndexes, rawGroup.paragraphs);
      continue;
    }

    if (styledGroup.styleSignature.fontFamily === null && hasRepeatedCompetingFontFamilyRoles(rawGroup)) {
      addProtectedSlideParagraphIndexes(protectedParagraphIndexes, rawGroup.paragraphs);
    }

    if (rawGroup.type === "body") {
      protectParagraphLevelRoleOutliers(
        protectedParagraphIndexes,
        rawGroup.paragraphs,
        (paragraph) => paragraph.fontFamily
      );
    }
  }

  return protectedParagraphIndexes;
}

function summarizeProtectedFontSizeParagraphIndexes(
  rawParagraphGroups: ParagraphGroupDescriptor[],
  groupedParagraphs: ParagraphGroupWithStyleSignature[]
): Set<number> {
  const contentGroups = rawParagraphGroups
    .map((rawGroup, index) => ({
      rawGroup,
      styledGroup: groupedParagraphs[index]
    }))
    .filter(
      (entry): entry is { rawGroup: ParagraphGroupDescriptor; styledGroup: ParagraphGroupWithStyleSignature } =>
        entry.styledGroup !== undefined && entry.rawGroup.type !== "title"
    );
  const protectedParagraphIndexes = new Set<number>();

  for (const { rawGroup, styledGroup } of contentGroups) {
    const preserveStandaloneHierarchy = rawGroup.type === "standalone" && contentGroups.length > 1;
    if (preserveStandaloneHierarchy) {
      addProtectedSlideParagraphIndexes(protectedParagraphIndexes, rawGroup.paragraphs);
      continue;
    }

    if (
      styledGroup.styleSignature.fontSize === null &&
      shouldProtectEntireGroupForFontSize(rawGroup, contentGroups.length)
    ) {
      addProtectedSlideParagraphIndexes(protectedParagraphIndexes, rawGroup.paragraphs);
      continue;
    }

    if (rawGroup.type === "body") {
      protectParagraphLevelRoleOutliers(
        protectedParagraphIndexes,
        rawGroup.paragraphs,
        (paragraph) => paragraph.fontSize
      );
    }
  }

  return protectedParagraphIndexes;
}

function summarizeProtectedParagraphSpacingParagraphIndexes(
  rawParagraphGroups: ParagraphGroupDescriptor[],
  groupedParagraphs: ParagraphGroupWithStyleSignature[],
  dominantBodyStyle: DominantBodyStyle
): Set<number> {
  const contentGroups = rawParagraphGroups
    .map((rawGroup, index) => ({
      rawGroup,
      styledGroup: groupedParagraphs[index]
    }))
    .filter(
      (entry): entry is { rawGroup: ParagraphGroupDescriptor; styledGroup: ParagraphGroupWithStyleSignature } =>
        entry.styledGroup !== undefined && entry.rawGroup.type !== "title"
    );
  const protectedParagraphIndexes = new Set<number>();

  for (const { rawGroup, styledGroup } of contentGroups) {
    if (rawGroup.type !== "standalone" || contentGroups.length <= 1) {
      continue;
    }

    if (
      !shouldProtectStandaloneParagraphSpacingRole(
        rawGroup,
        styledGroup,
        dominantBodyStyle,
        contentGroups
      )
    ) {
      continue;
    }

    addProtectedSlideParagraphIndexes(protectedParagraphIndexes, rawGroup.paragraphs);
  }

  return protectedParagraphIndexes;
}

function shouldProtectStandaloneParagraphSpacingRole(
  rawGroup: ParagraphGroupDescriptor,
  styledGroup: ParagraphGroupWithStyleSignature,
  dominantBodyStyle: DominantBodyStyle,
  contentGroups: Array<{
    rawGroup: ParagraphGroupDescriptor;
    styledGroup: ParagraphGroupWithStyleSignature;
  }>
): boolean {
  if (rawGroup.paragraphs.some((paragraph) => paragraph.alignment !== null && paragraph.alignment !== "left")) {
    return hasRepeatedSameShapeNonLeftSpacingRole(rawGroup, contentGroups);
  }

  if (
    styledGroup.styleSignature.fontFamily !== null &&
    dominantBodyStyle.fontFamily !== null &&
    styledGroup.styleSignature.fontFamily !== dominantBodyStyle.fontFamily
  ) {
    return true;
  }

  if (
    styledGroup.styleSignature.fontSize !== null &&
    dominantBodyStyle.fontSize !== null &&
    styledGroup.styleSignature.fontSize !== dominantBodyStyle.fontSize
  ) {
    return true;
  }

  return false;
}

function hasRepeatedSameShapeNonLeftSpacingRole(
  rawGroup: ParagraphGroupDescriptor,
  contentGroups: Array<{
    rawGroup: ParagraphGroupDescriptor;
    styledGroup: ParagraphGroupWithStyleSignature;
  }>
): boolean {
  const alignment = rawGroup.paragraphs[0]?.alignment;
  const shape = rawGroup.paragraphs[0]?.shape;
  if (!alignment || alignment === "left" || shape === undefined) {
    return false;
  }

  let groupedParagraphCount = 0;

  for (const entry of contentGroups) {
    if (
      entry.rawGroup.paragraphs.some(
        (paragraph) =>
          paragraph.shape !== shape ||
          paragraph.isTitle ||
          paragraph.isBullet ||
          paragraph.alignment !== alignment
      )
    ) {
      continue;
    }

    groupedParagraphCount += entry.rawGroup.paragraphs.length;
  }

  return groupedParagraphCount >= 2;
}

function addProtectedSlideParagraphIndexes(
  target: Set<number>,
  paragraphs: SlideStructureParagraphDescriptor[]
): void {
  for (const paragraph of paragraphs) {
    if (paragraph.slideParagraphIndex !== null) {
      target.add(paragraph.slideParagraphIndex);
    }
  }
}

function hasRepeatedCompetingFontFamilyRoles(
  group: ParagraphGroupDescriptor
): boolean {
  if (group.type !== "body") {
    return false;
  }

  const paragraphFontFamilyCounts = new Map<string, number>();

  for (const paragraph of group.paragraphs) {
    if (paragraph.fontFamily === null) {
      return false;
    }

    paragraphFontFamilyCounts.set(
      paragraph.fontFamily,
      (paragraphFontFamilyCounts.get(paragraph.fontFamily) ?? 0) + 1
    );
  }

  if (paragraphFontFamilyCounts.size < 2) {
    return false;
  }

  const repeatedFamilies = [...paragraphFontFamilyCounts.values()].filter((count) => count >= 2);
  return repeatedFamilies.length >= 2;
}

function shouldProtectEntireGroupForFontSize(
  group: ParagraphGroupDescriptor,
  contentGroupCount: number
): boolean {
  if (group.type === "standalone" && contentGroupCount === 1) {
    return false;
  }

  if (group.type !== "body") {
    return true;
  }

  return group.paragraphs.every((paragraph) => paragraph.fontSize === null);
}

function protectParagraphLevelRoleOutliers<T extends string | number>(
  target: Set<number>,
  paragraphs: SlideStructureParagraphDescriptor[],
  readValue: (paragraph: SlideStructureParagraphDescriptor) => T | null
): void {
  const explicitParagraphs = paragraphs
    .map((paragraph) => ({
      paragraph,
      value: readValue(paragraph)
    }))
    .filter((entry): entry is { paragraph: SlideStructureParagraphDescriptor; value: T } => entry.value !== null);

  if (explicitParagraphs.length < 2) {
    return;
  }

  const valueCounts = new Map<T, number>();
  for (const entry of explicitParagraphs) {
    valueCounts.set(entry.value, (valueCounts.get(entry.value) ?? 0) + 1);
  }

  if (valueCounts.size < 2) {
    return;
  }

  const highestCount = Math.max(...valueCounts.values());
  const mostCommonValues = [...valueCounts.entries()]
    .filter(([, count]) => count === highestCount)
    .map(([value]) => value);

  if (mostCommonValues.length !== 1) {
    addProtectedSlideParagraphIndexes(
      target,
      explicitParagraphs.map((entry) => entry.paragraph)
    );
    return;
  }

  const dominantValue = mostCommonValues[0];
  addProtectedSlideParagraphIndexes(
    target,
    explicitParagraphs
      .filter((entry) => entry.value !== dominantValue)
      .map((entry) => entry.paragraph)
  );
}

function extractFontRuns(
  shape: XmlNode,
  slideIndex: number,
  paragraphDescriptors: ParagraphDescriptor[] = [],
  titleRole = false
): FontRun[] {
  const paragraphs = asArray<XmlNode>(asXmlNode(shape.txBody)?.p);
  const fontRuns: FontRun[] = [];
  let descriptorIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphText = extractParagraphText(paragraph);
    const slideParagraphIndex = paragraphText.length > 0
      ? paragraphDescriptors[descriptorIndex]?.paragraph ?? null
      : null;
    if (paragraphText.length > 0) {
      descriptorIndex += 1;
    }

    for (const run of asArray<XmlNode>(paragraph.r)) {
      const runProperties = asXmlNode(run.rPr);
      const fontFamily = extractFontFamily(runProperties);
      if (!fontFamily) {
        continue;
      }

      fontRuns.push({
        fontFamily,
        fontSize: numericValue(runProperties?.sz),
        slide: slideIndex,
        slideParagraphIndex,
        titleRole,
        protectedFontFamilyDrift: false,
        protectedFontSizeDrift: false
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
    const alignment = normalizeAlignmentValue(stringValue(paragraph.properties?.algn));

    return {
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      shape: paragraph.shape,
      signature: [
        spacingBefore?.display ?? "inherit",
        spacingAfter?.display ?? "inherit"
      ].join("|"),
      spacingBefore: spacingBefore?.display ?? null,
      spacingAfter: spacingAfter?.display ?? null,
      lineSpacing: lineSpacing?.display ?? null,
      alignment,
      isBullet: isBulletParagraph(paragraph.properties),
      protectedValueDrift: false
    };
  });
}

function extractLineSpacingSignatures(
  paragraphs: ParagraphDescriptor[]
): LineSpacingSignature[] {
  return paragraphs.map((paragraph) => {
    const lineSpacing = extractExplicitLineSpacingValue(asXmlNode(paragraph.properties?.lnSpc));
    const alignment = normalizeAlignmentValue(stringValue(paragraph.properties?.algn));

    return {
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      shape: paragraph.shape,
      lineSpacing: lineSpacing?.display ?? null,
      alignment,
      isBullet: isBulletParagraph(paragraph.properties),
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
      level: numericValue(paragraph.properties?.lvl) ?? 0,
      markerSignature: extractBulletMarkerSignature(paragraph.properties)
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
    if (fontRun.protectedFontFamilyDrift) {
      continue;
    }

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
    if (fontRun.titleRole || fontRun.protectedFontSizeDrift) {
      continue;
    }

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

    for (const paragraph of summarizeBulletListSymbolDrift(list)) {
      const key = `${paragraph.slide}:${paragraph.paragraph}`;
      const existing = driftByParagraph.get(key);
      if (!existing) {
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
  alignmentParagraphs: AlignmentSignature[],
  additionalDriftParagraphs: AlignmentDriftParagraph[] = []
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

  return {
    driftParagraphs: dedupeAlignmentDriftParagraphs([
      ...driftParagraphs,
      ...additionalDriftParagraphs
    ])
  };
}

function summarizeDominantBodyAlignmentDrift(
  rawParagraphGroups: ParagraphGroupDescriptor[],
  paragraphGroups: BodyParagraphGroupWithDominantFontCleanupCandidates[],
  dominantBodyStyle: DominantBodyStyle,
  slide: number
): AlignmentDriftParagraph[] {
  if (!dominantBodyStyle.alignment) {
    return [];
  }

  const driftParagraphs: AlignmentDriftParagraph[] = [];

  for (let index = 0; index < paragraphGroups.length; index += 1) {
    const paragraphGroup = paragraphGroups[index];
    const rawParagraphGroup = rawParagraphGroups[index];
    if (!paragraphGroup || !rawParagraphGroup || paragraphGroup.type !== "body") {
      continue;
    }

    if (paragraphGroup.cleanupCandidate?.eligible !== true) {
      continue;
    }

    const groupAlignment = paragraphGroup.styleSignature.alignment;
    if (!groupAlignment || groupAlignment === dominantBodyStyle.alignment) {
      continue;
    }

    for (const paragraph of rawParagraphGroup.paragraphs) {
      if (paragraph.slideParagraphIndex === null || paragraph.slideParagraphIndex === undefined) {
        continue;
      }

      driftParagraphs.push({
        slide,
        paragraph: paragraph.slideParagraphIndex,
        alignment: groupAlignment
      });
    }
  }

  return dedupeAlignmentDriftParagraphs(driftParagraphs);
}

function dedupeAlignmentDriftParagraphs(
  driftParagraphs: AlignmentDriftParagraph[]
): AlignmentDriftParagraph[] {
  const dedupedParagraphs = new Map<string, AlignmentDriftParagraph>();

  for (const paragraph of driftParagraphs) {
    dedupedParagraphs.set(`${paragraph.slide}:${paragraph.paragraph}`, paragraph);
  }

  return [...dedupedParagraphs.values()].sort((left, right) => {
    if (left.slide !== right.slide) {
      return left.slide - right.slide;
    }

    return left.paragraph - right.paragraph;
  });
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

function summarizeBulletListSymbolDrift(
  paragraphs: BulletParagraphSignature[]
): BulletIndentDriftParagraph[] {
  if (paragraphs.length < 2) {
    return [];
  }

  const explicitMarkerParagraphs = paragraphs.filter((paragraph) => paragraph.markerSignature !== null);
  if (explicitMarkerParagraphs.length < 2) {
    return [];
  }

  const countsByMarker = new Map<string, number>();
  for (const paragraph of explicitMarkerParagraphs) {
    countsByMarker.set(
      paragraph.markerSignature!,
      (countsByMarker.get(paragraph.markerSignature!) ?? 0) + 1
    );
  }

  if (countsByMarker.size < 2) {
    return [];
  }

  const maxCount = Math.max(...countsByMarker.values());
  const dominantMarkers = [...countsByMarker.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([marker]) => marker);
  if (dominantMarkers.length !== 1) {
    return explicitMarkerParagraphs.map((paragraph) => ({
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      level: paragraph.level,
      reason: `marker mismatch ${paragraph.markerSignature}`,
      markerSignature: paragraph.markerSignature
    }));
  }

  const dominantMarker = dominantMarkers[0];
  return explicitMarkerParagraphs
    .filter((paragraph) => paragraph.markerSignature !== dominantMarker)
    .map((paragraph) => ({
      slide: paragraph.slide,
      paragraph: paragraph.paragraph,
      level: paragraph.level,
      reason: `marker mismatch ${paragraph.markerSignature} vs ${dominantMarker}`,
      markerSignature: paragraph.markerSignature
    }));
}

function summarizeSlideSpacingDrift(
  paragraphs: ParagraphSpacingSignature[]
): ParagraphSpacingSignature[] {
  const unprotectedParagraphs = paragraphs.filter((paragraph) => !paragraph.protectedValueDrift);
  if (unprotectedParagraphs.length < 2) {
    return [];
  }

  const paragraphsByShape = new Map<number, ParagraphSpacingSignature[]>();
  for (const paragraph of unprotectedParagraphs) {
    const shapeParagraphs = paragraphsByShape.get(paragraph.shape) ?? [];
    shapeParagraphs.push(paragraph);
    paragraphsByShape.set(paragraph.shape, shapeParagraphs);
  }

  const protectedUniformShapeIds = new Set<number>();
  const uniformShapeCandidates = [...paragraphsByShape.entries()].filter(([, shapeParagraphs]) =>
    isProtectedUniformParagraphSpacingShape(shapeParagraphs)
  );
  const uniformShapeSignatures = new Set(
    uniformShapeCandidates.map(([, shapeParagraphs]) => shapeParagraphs[0]?.signature).filter(Boolean)
  );
  if (uniformShapeCandidates.length >= 2 && uniformShapeSignatures.size >= 2) {
    for (const [shape] of uniformShapeCandidates) {
      protectedUniformShapeIds.add(shape);
    }
  }

  const protectedRepeatedNonLeftShapes = new Set<number>();
  for (const [shape, shapeParagraphs] of paragraphsByShape.entries()) {
    if (isProtectedRepeatedNonLeftParagraphSpacingShape(shapeParagraphs)) {
      protectedRepeatedNonLeftShapes.add(shape);
    }
  }

  const protectedTailCadenceShapes = new Set<number>();
  for (const [shape, shapeParagraphs] of paragraphsByShape.entries()) {
    if (isProtectedTailCadenceParagraphSpacingShape(shapeParagraphs)) {
      protectedTailCadenceShapes.add(shape);
    }
  }

  const protectedIntroPlusBulletShapes = new Set<number>();
  for (const [shape, shapeParagraphs] of paragraphsByShape.entries()) {
    if (isProtectedIntroPlusBulletParagraphSpacingShape(shapeParagraphs)) {
      protectedIntroPlusBulletShapes.add(shape);
    }
  }

  const protectedEdgeCadenceShapes = new Set<number>();
  for (const [shape, shapeParagraphs] of paragraphsByShape.entries()) {
    if (isProtectedEdgeCadenceParagraphSpacingShape(shapeParagraphs)) {
      protectedEdgeCadenceShapes.add(shape);
    }
  }

  const protectedMarkerExplanationShapes = new Set<number>();
  for (const [shape, shapeParagraphs] of paragraphsByShape.entries()) {
    if (isProtectedMarkerExplanationParagraphSpacingShape(shapeParagraphs)) {
      protectedMarkerExplanationShapes.add(shape);
    }
  }

  const protectedRepeatedLocalCadenceShapes = new Set<number>();
  for (const [shape, shapeParagraphs] of paragraphsByShape.entries()) {
    if (isProtectedRepeatedLocalCadenceParagraphSpacingShape(shapeParagraphs)) {
      protectedRepeatedLocalCadenceShapes.add(shape);
    }
  }

  const comparableParagraphs = unprotectedParagraphs.filter(
    (paragraph) =>
      !paragraph.isBullet &&
      !protectedUniformShapeIds.has(paragraph.shape) &&
      !protectedRepeatedNonLeftShapes.has(paragraph.shape) &&
      !protectedTailCadenceShapes.has(paragraph.shape) &&
      !protectedIntroPlusBulletShapes.has(paragraph.shape) &&
      !protectedEdgeCadenceShapes.has(paragraph.shape) &&
      !protectedMarkerExplanationShapes.has(paragraph.shape) &&
      !protectedRepeatedLocalCadenceShapes.has(paragraph.shape)
  );
  if (comparableParagraphs.length < 2) {
    return [];
  }

  const countsBySignature = new Map<string, number>();
  for (const paragraph of comparableParagraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
  }

  if (countsBySignature.size < 2) {
    return [];
  }

  const maxCount = Math.max(...countsBySignature.values());
  if (maxCount === 1) {
    return comparableParagraphs;
  }

  const paragraphBySignature = new Map<string, ParagraphSpacingSignature>();
  for (const paragraph of comparableParagraphs) {
    if (!paragraphBySignature.has(paragraph.signature)) {
      paragraphBySignature.set(paragraph.signature, paragraph);
    }
  }

  const dominantCandidates = [...countsBySignature.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([signature]) => paragraphBySignature.get(signature))
    .filter((paragraph): paragraph is ParagraphSpacingSignature => paragraph !== undefined);

  if (dominantCandidates.length === 0) {
    return [];
  }

  const minExplicitSpacingCount = Math.min(
    ...dominantCandidates.map((paragraph) => countExplicitParagraphSpacingValues(paragraph))
  );
  const conservativeCandidates = dominantCandidates.filter(
    (paragraph) => countExplicitParagraphSpacingValues(paragraph) === minExplicitSpacingCount
  );
  const dominantSignature = conservativeCandidates
    .map((paragraph) => paragraph.signature)
    .sort((left, right) => left.localeCompare(right))[0];

  return comparableParagraphs.filter(
    (paragraph) =>
      paragraph.signature !== dominantSignature &&
      !shouldProtectRepeatedLocalCadenceParagraph(
        paragraph,
        paragraphsByShape.get(paragraph.shape) ?? []
      )
  );
}

function countExplicitParagraphSpacingValues(
  paragraph: Pick<ParagraphSpacingSignature, "spacingBefore" | "spacingAfter">
): number {
  return Number(paragraph.spacingBefore !== null) + Number(paragraph.spacingAfter !== null);
}

function isProtectedUniformParagraphSpacingShape(
  paragraphs: ParagraphSpacingSignature[]
): boolean {
  if (paragraphs.length < 2) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.isBullet)) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.alignment !== null && paragraph.alignment !== "left")) {
    return false;
  }

  const spacingSignatures = new Set(paragraphs.map((paragraph) => paragraph.signature));
  if (spacingSignatures.size !== 1) {
    return false;
  }

  const explicitLineSpacings = new Set(
    paragraphs
      .map((paragraph) => paragraph.lineSpacing)
      .filter((lineSpacing): lineSpacing is string => lineSpacing !== null)
  );

  return explicitLineSpacings.size === 1;
}

function isProtectedRepeatedNonLeftParagraphSpacingShape(
  paragraphs: ParagraphSpacingSignature[]
): boolean {
  if (paragraphs.length < 2) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.isBullet)) {
    return false;
  }

  const nonLeftAlignment = paragraphs[0]?.alignment;
  if (!nonLeftAlignment || nonLeftAlignment === "left") {
    return false;
  }

  return paragraphs.every((paragraph) => paragraph.alignment === nonLeftAlignment);
}

function isProtectedTailCadenceParagraphSpacingShape(
  paragraphs: ParagraphSpacingSignature[]
): boolean {
  if (paragraphs.length < 3) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.isBullet)) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.alignment !== null && paragraph.alignment !== "left")) {
    return false;
  }

  const inheritedParagraphs = paragraphs.filter((paragraph) => paragraph.signature === "inherit|inherit");
  if (inheritedParagraphs.length !== 1) {
    return false;
  }

  if (paragraphs[paragraphs.length - 1]?.signature !== "inherit|inherit") {
    return false;
  }

  const explicitSignatures = new Set(
    paragraphs
      .slice(0, -1)
      .map((paragraph) => paragraph.signature)
      .filter((signature) => signature !== "inherit|inherit")
  );

  return explicitSignatures.size === 1;
}

function isProtectedIntroPlusBulletParagraphSpacingShape(
  paragraphs: ParagraphSpacingSignature[]
): boolean {
  if (paragraphs.length < 2) {
    return false;
  }

  const nonBulletParagraphs = paragraphs.filter((paragraph) => !paragraph.isBullet);
  if (nonBulletParagraphs.length !== 1) {
    return false;
  }

  const firstParagraph = paragraphs[0];
  if (!firstParagraph || firstParagraph !== nonBulletParagraphs[0]) {
    return false;
  }

  if (firstParagraph.alignment !== null && firstParagraph.alignment !== "left" && firstParagraph.alignment !== "center") {
    return false;
  }

  if (firstParagraph.spacingBefore === null && firstParagraph.spacingAfter === null) {
    return false;
  }

  return paragraphs.slice(1).every((paragraph) => paragraph.isBullet);
}

function isProtectedEdgeCadenceParagraphSpacingShape(
  paragraphs: ParagraphSpacingSignature[]
): boolean {
  if (paragraphs.length < 4) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.isBullet)) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.alignment !== null && paragraph.alignment !== "left")) {
    return false;
  }

  const firstParagraph = paragraphs[0];
  const lastParagraph = paragraphs[paragraphs.length - 1];
  if (!firstParagraph || !lastParagraph) {
    return false;
  }

  if (firstParagraph.spacingBefore !== null || firstParagraph.spacingAfter === null) {
    return false;
  }

  if (lastParagraph.spacingBefore === null || lastParagraph.spacingAfter !== null) {
    return false;
  }

  const middleParagraphs = paragraphs.slice(1, -1);
  if (middleParagraphs.length < 2) {
    return false;
  }

  const middleSignature = middleParagraphs[0]?.signature;
  if (!middleSignature || middleSignature === "inherit|inherit") {
    return false;
  }

  if (!middleParagraphs.every((paragraph) => paragraph.signature === middleSignature)) {
    return false;
  }

  const explicitLineSpacings = new Set(
    paragraphs
      .map((paragraph) => paragraph.lineSpacing)
      .filter((lineSpacing): lineSpacing is string => lineSpacing !== null)
  );

  return explicitLineSpacings.size === 1;
}

function isProtectedMarkerExplanationParagraphSpacingShape(
  paragraphs: ParagraphSpacingSignature[]
): boolean {
  if (paragraphs.length < 5) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.alignment !== null && paragraph.alignment !== "left")) {
    return false;
  }

  const firstParagraph = paragraphs[0];
  if (!firstParagraph || firstParagraph.signature !== "inherit|inherit" || firstParagraph.isBullet) {
    return false;
  }

  let trailingBulletIndex = paragraphs.length;
  while (trailingBulletIndex > 0 && paragraphs[trailingBulletIndex - 1]?.isBullet) {
    trailingBulletIndex -= 1;
  }

  const trailingBulletParagraphs = paragraphs.slice(trailingBulletIndex);
  if (trailingBulletParagraphs.length < 2) {
    return false;
  }

  const repeatedNonBulletParagraphs = paragraphs.slice(1, trailingBulletIndex);
  if (
    repeatedNonBulletParagraphs.length < 2 ||
    repeatedNonBulletParagraphs.some((paragraph) => paragraph.isBullet)
  ) {
    return false;
  }

  const repeatedSignature = repeatedNonBulletParagraphs[0]?.signature;
  if (!repeatedSignature || repeatedSignature === "inherit|inherit") {
    return false;
  }

  return repeatedNonBulletParagraphs.every((paragraph) => paragraph.signature === repeatedSignature);
}

function isProtectedRepeatedLocalCadenceParagraphSpacingShape(
  paragraphs: ParagraphSpacingSignature[]
): boolean {
  if (paragraphs.length < 3) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.alignment !== null && paragraph.alignment !== "left")) {
    return false;
  }

  const nonBulletParagraphs = paragraphs.filter((paragraph) => !paragraph.isBullet);
  if (nonBulletParagraphs.length < 3) {
    return false;
  }

  const countsBySignature = new Map<string, number>();
  for (const paragraph of nonBulletParagraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
  }

  const repeatedSignatureEntries = [...countsBySignature.entries()].filter(
    ([signature, count]) => signature !== "inherit|inherit" && count >= 2
  );
  if (repeatedSignatureEntries.length !== 1) {
    return false;
  }

  const [[repeatedSignature, repeatedCount]] = repeatedSignatureEntries;
  if (!repeatedSignature || repeatedCount < 2) {
    return false;
  }

  const remainingNonBulletParagraphs = nonBulletParagraphs.filter(
    (paragraph) => paragraph.signature !== repeatedSignature
  );
  if (remainingNonBulletParagraphs.length === 0 || remainingNonBulletParagraphs.length > 2) {
    return false;
  }

  const firstParagraph = nonBulletParagraphs[0];
  const lastParagraph = nonBulletParagraphs[nonBulletParagraphs.length - 1];
  if (!firstParagraph || !lastParagraph) {
    return false;
  }

  return remainingNonBulletParagraphs.every(
    (paragraph) =>
      paragraph === firstParagraph ||
      paragraph === lastParagraph ||
      paragraph.signature === "inherit|inherit"
  );
}

function resolveProtectedRepeatedLocalCadenceSignature(
  paragraphs: ParagraphSpacingSignature[]
): string | null {
  if (paragraphs.length < 3) {
    return null;
  }

  if (paragraphs.some((paragraph) => paragraph.alignment !== null && paragraph.alignment !== "left")) {
    return null;
  }

  const nonBulletParagraphs = paragraphs.filter((paragraph) => !paragraph.isBullet);
  if (nonBulletParagraphs.length < 3) {
    return null;
  }

  const countsBySignature = new Map<string, number>();
  for (const paragraph of nonBulletParagraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
  }

  const repeatedSignatureEntries = [...countsBySignature.entries()].filter(
    ([signature, count]) => signature !== "inherit|inherit" && count >= 2
  );
  if (repeatedSignatureEntries.length !== 1) {
    return null;
  }

  const [[repeatedSignature]] = repeatedSignatureEntries;
  if (!repeatedSignature) {
    return null;
  }

  const remainingNonBulletParagraphs = nonBulletParagraphs.filter(
    (paragraph) => paragraph.signature !== repeatedSignature
  );
  if (remainingNonBulletParagraphs.length === 0 || remainingNonBulletParagraphs.length > 2) {
    return null;
  }

  const firstParagraph = nonBulletParagraphs[0];
  const lastParagraph = nonBulletParagraphs[nonBulletParagraphs.length - 1];
  if (!firstParagraph || !lastParagraph) {
    return null;
  }

  const edgeCompatible = remainingNonBulletParagraphs.every(
    (paragraph) =>
      paragraph === firstParagraph ||
      paragraph === lastParagraph ||
      paragraph.signature === "inherit|inherit"
  );
  return edgeCompatible ? repeatedSignature : null;
}

function shouldProtectRepeatedLocalCadenceParagraph(
  paragraph: ParagraphSpacingSignature,
  shapeParagraphs: ParagraphSpacingSignature[]
): boolean {
  const repeatedSignature = resolveProtectedRepeatedLocalCadenceSignature(shapeParagraphs);
  return repeatedSignature !== null && paragraph.signature === repeatedSignature;
}

function summarizeSlideLineSpacingDrift(
  paragraphs: LineSpacingSignature[]
): LineSpacingSignature[] {
  if (paragraphs.length < 2) {
    return [];
  }

  const paragraphsByShape = new Map<number, LineSpacingSignature[]>();
  for (const paragraph of paragraphs) {
    const shapeParagraphs = paragraphsByShape.get(paragraph.shape) ?? [];
    shapeParagraphs.push(paragraph);
    paragraphsByShape.set(paragraph.shape, shapeParagraphs);
  }

  const protectedShapeIds = new Set<number>();
  for (const [shape, shapeParagraphs] of paragraphsByShape.entries()) {
    if (
      isProtectedStandaloneLineSpacingShape(shapeParagraphs) ||
      isProtectedLeadingSingletonExplicitLineSpacingShape(shapeParagraphs) ||
      isProtectedUniformExplicitNonLeftLineSpacingShape(shapeParagraphs)
    ) {
      protectedShapeIds.add(shape);
    }
  }

  const comparableParagraphs = paragraphs.filter((paragraph) => !protectedShapeIds.has(paragraph.shape));
  if (comparableParagraphs.length < 2) {
    return [];
  }

  const countsBySignature = new Map<string, number>();
  for (const paragraph of comparableParagraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
  }

  if (countsBySignature.size < 2) {
    return [];
  }

  const maxCount = Math.max(...countsBySignature.values());
  if (maxCount === 1) {
    return comparableParagraphs;
  }

  const dominantSignature = [...countsBySignature.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([signature]) => signature)
    .sort((left, right) => left.localeCompare(right))[0];

  return comparableParagraphs.filter((paragraph) => paragraph.signature !== dominantSignature);
}

function isProtectedStandaloneLineSpacingShape(
  paragraphs: LineSpacingSignature[]
): boolean {
  return paragraphs.length === 1;
}

function isProtectedLeadingSingletonExplicitLineSpacingShape(
  paragraphs: LineSpacingSignature[]
): boolean {
  if (paragraphs.length < 2) {
    return false;
  }

  if (paragraphs.some((paragraph) => paragraph.isBullet)) {
    return false;
  }

  const explicitParagraphIndexes = paragraphs
    .map((paragraph, index) => ({ paragraph, index }))
    .filter((entry) => entry.paragraph.lineSpacing !== null);
  if (explicitParagraphIndexes.length !== 1) {
    return false;
  }

  const explicitIndex = explicitParagraphIndexes[0]!.index;
  const inheritedParagraphCount = paragraphs.length - explicitParagraphIndexes.length;
  if (inheritedParagraphCount === 0) {
    return false;
  }

  return explicitIndex === 0 || explicitIndex === paragraphs.length - 1 || paragraphs.length === 2;
}

function isProtectedUniformExplicitNonLeftLineSpacingShape(
  paragraphs: LineSpacingSignature[]
): boolean {
  if (paragraphs.length < 2) {
    return false;
  }

  const nonLeftAlignment = paragraphs[0]?.alignment;
  if (!nonLeftAlignment || nonLeftAlignment === "left") {
    return false;
  }

  if (!paragraphs.every((paragraph) => paragraph.alignment === nonLeftAlignment && paragraph.lineSpacing !== null)) {
    return false;
  }

  return new Set(paragraphs.map((paragraph) => paragraph.signature)).size === 1;
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

function extractBulletMarkerSignature(paragraphProperties: XmlNode | undefined): string | null {
  if (!paragraphProperties) {
    return null;
  }

  const bulletChar = asXmlNode(paragraphProperties.buChar);
  const bulletCharValue = stringValue(bulletChar?.char);
  if (bulletCharValue) {
    return `char:${bulletCharValue}`;
  }

  const autoNumbering = asXmlNode(paragraphProperties.buAutoNum);
  const autoNumberingType = stringValue(autoNumbering?.type);
  if (autoNumberingType) {
    return `auto:${autoNumberingType}`;
  }

  return null;
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
