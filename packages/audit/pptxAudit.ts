import { readFile } from "node:fs/promises";
import path from "node:path";

import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

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
  fontsUsed: FontUsageSummary[];
  fontSizesUsed: FontSizeUsageSummary[];
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

export interface AuditReport {
  file: string;
  slideCount: number;
  slides: SlideAuditSummary[];
  fontsUsed: FontUsageSummary[];
  fontSizesUsed: FontSizeUsageSummary[];
  fontDrift: FontDriftSummary;
  fontSizeDrift: FontSizeDriftSummary;
  spacingDrift: SpacingDriftSummary;
  spacingDriftCount: number;
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
  const slides = presentation.slides.map((slide) => {
    const shapes = getSlideShapes(slide.xml);
    const textShapes = shapes.filter(hasTextBody);
    const titleShape = shapes.find(isTitleShape);
    const slideFontRuns: FontRun[] = [];
    let paragraphIndex = 1;

    for (const shape of textShapes) {
      const shapeFontRuns = extractFontRuns(shape, slide.index);
      fontRuns.push(...shapeFontRuns);
      slideFontRuns.push(...shapeFontRuns);

      if (isTitleShape(shape)) {
        continue;
      }

      const shapeParagraphSpacings = extractParagraphSpacings(shape, slide.index, paragraphIndex);
      paragraphSpacings.push(...shapeParagraphSpacings);
      paragraphIndex += shapeParagraphSpacings.length;
    }

    return {
      index: slide.index,
      title: titleShape ? extractShapeText(titleShape) : null,
      textBoxCount: textShapes.length,
      fontsUsed: summarizeFonts(slideFontRuns),
      fontSizesUsed: summarizeFontSizes(slideFontRuns)
    };
  });

  const fontsUsed = summarizeFonts(fontRuns);
  const dominantFont = fontsUsed[0]?.fontFamily ?? null;
  const fontSizesUsed = summarizeFontSizes(fontRuns);
  const dominantFontSizePt = fontSizesUsed[0]?.sizePt ?? null;
  const spacingDrift = summarizeSpacingDrift(paragraphSpacings);

  return {
    file: presentation.sourcePath,
    slideCount: slides.length,
    slides,
    fontsUsed,
    fontSizesUsed,
    fontDrift: {
      dominantFont,
      driftRuns: summarizeFontDrift(fontRuns, dominantFont)
    },
    fontSizeDrift: {
      dominantSizePt: dominantFontSizePt,
      driftRuns: summarizeFontSizeDrift(fontRuns, dominantFontSizePt)
    },
    spacingDrift,
    spacingDriftCount: spacingDrift.driftParagraphs.length
  };
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

interface ParagraphSpacingSignature {
  slide: number;
  paragraph: number;
  signature: string;
  spacingBefore: string | null;
  spacingAfter: string | null;
  lineSpacing: string | null;
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

function extractParagraphSpacings(
  shape: XmlNode,
  slideIndex: number,
  startingParagraphIndex: number
): ParagraphSpacingSignature[] {
  const paragraphs = asArray<XmlNode>(asXmlNode(shape.txBody)?.p);
  const spacingSignatures: ParagraphSpacingSignature[] = [];
  let paragraphIndex = startingParagraphIndex;

  for (const paragraph of paragraphs) {
    const paragraphText = extractParagraphText(paragraph);
    if (!paragraphText) {
      continue;
    }

    const paragraphProperties = asXmlNode(paragraph.pPr);
    const spacingBefore = extractSpacingValue(asXmlNode(paragraphProperties?.spcBef));
    const spacingAfter = extractSpacingValue(asXmlNode(paragraphProperties?.spcAft));
    const lineSpacing = extractSpacingValue(asXmlNode(paragraphProperties?.lnSpc));

    spacingSignatures.push({
      slide: slideIndex,
      paragraph: paragraphIndex,
      signature: [
        spacingBefore?.display ?? "inherit",
        spacingAfter?.display ?? "inherit",
        lineSpacing?.display ?? "inherit"
      ].join("|"),
      spacingBefore: spacingBefore?.display ?? null,
      spacingAfter: spacingAfter?.display ?? null,
      lineSpacing: lineSpacing?.display ?? null
    });

    paragraphIndex += 1;
  }

  return spacingSignatures;
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

function extractParagraphText(paragraph: XmlNode): string {
  const runTexts = asArray<XmlNode>(paragraph.r).map((run) => stringValue(run.t) ?? "");
  const fieldTexts = asArray<XmlNode>(paragraph.fld).map((field) => stringValue(field.t) ?? "");
  return [...runTexts, ...fieldTexts].join("").trim();
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
