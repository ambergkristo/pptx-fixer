import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { LoadedPresentation, AuditReport } from "../audit/pptxAudit.ts";
import { analyzeSlides, loadPresentation } from "../audit/pptxAudit.ts";
import type { BodyParagraphGroupWithDominantFontCleanupCandidates } from "../audit/dominantFontCleanupCandidateAudit.ts";
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

export interface ChangedDominantFontSizeSummary {
  slide: number;
  fromSizePt: number;
  toSizePt: number;
  count: number;
}

export interface SkippedDominantFontSizeFixSummary {
  reason: string;
}

export interface DominantFontSizeFixReport {
  applied: boolean;
  changedParagraphs: ChangedDominantFontSizeSummary[];
  skipped: SkippedDominantFontSizeFixSummary[];
}

interface SlideParagraphReference {
  paragraphNode: OrderedXmlNode;
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

export async function normalizeDominantFontSizes(
  inputPath: string,
  outputPath: string
): Promise<DominantFontSizeFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyDominantFontSizeFixToArchive(archive, presentation, auditReport);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);
  return report;
}

export async function applyDominantFontSizeFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<DominantFontSizeFixReport> {
  const deckDominantFontSize = auditReport.fontSizeDrift.dominantSizePt;
  const changedParagraphs = new Map<string, number>();
  let totalChangedParagraphs = 0;
  let eligibleGroupCount = 0;

  for (const slide of presentation.slides) {
    const slideAudit = auditReport.slides.find((entry) => entry.index === slide.index);
    if (!slideAudit || slideAudit.dominantBodyStyle.fontSize === null) {
      continue;
    }

    if (deckDominantFontSize === null || slideAudit.dominantBodyStyle.fontSize !== deckDominantFontSize) {
      continue;
    }

    const eligibleGroups = slideAudit.paragraphGroups.filter(
      (group) => group.type === "body" && group.dominantFontSizeCleanupCandidate?.eligible === true
    );
    if (eligibleGroups.length === 0) {
      continue;
    }

    eligibleGroupCount += eligibleGroups.length;

    const entry = archive.file(slide.archivePath);
    if (!entry) {
      continue;
    }

    const slideXml = await entry.async("string");
    const parsedSlide = xmlParser.parse(slideXml) as OrderedXmlDocument;
    const originalSlide = structuredClone(parsedSlide);
    const changedInSlide = normalizeSlideDominantFontSize(
      parsedSlide,
      slideAudit.paragraphGroups,
      slideAudit.dominantBodyStyle.fontSize,
      slide.index,
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
          reason: eligibleGroupCount > 0 ? "no safe changes" : "no eligible cleanup candidates"
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

function normalizeSlideDominantFontSize(
  slideXml: OrderedXmlDocument,
  paragraphGroups: BodyParagraphGroupWithDominantFontCleanupCandidates[],
  dominantFontSize: number,
  slideIndex: number,
  changedParagraphs: Map<string, number>
): number {
  const paragraphReferencesByShape = collectSlideParagraphsByShape(slideXml);
  const mappedGroups = mapParagraphGroupsByRange(paragraphReferencesByShape, paragraphGroups);
  if (!mappedGroups) {
    return 0;
  }

  let changedParagraphCount = 0;

  for (let index = 0; index < paragraphGroups.length; index += 1) {
    const group = paragraphGroups[index];
    if (group.type !== "body" || group.dominantFontSizeCleanupCandidate?.eligible !== true) {
      continue;
    }

    changedParagraphCount += applyFontSizeChange(
      mappedGroups[index],
      dominantFontSize,
      slideIndex,
      changedParagraphs
    );
  }

  return changedParagraphCount;
}

function applyFontSizeChange(
  paragraphs: SlideParagraphReference[],
  dominantFontSize: number,
  slideIndex: number,
  changedParagraphs: Map<string, number>
): number {
  const paragraphRuns = paragraphs.map(collectParagraphRunProperties);
  if (paragraphRuns.some((entry) => entry === null)) {
    return 0;
  }

  let currentGroupFontSize: number | null = null;

  for (const runProperties of paragraphRuns) {
    const paragraphFontSizes = runProperties!.map((entry) => extractExplicitFontSize(entry));
    if (paragraphFontSizes.some((value) => value === null)) {
      return 0;
    }

    const distinctParagraphSizes = new Set(paragraphFontSizes);
    if (distinctParagraphSizes.size !== 1) {
      return 0;
    }

    const paragraphFontSize = paragraphFontSizes[0]!;
    if (currentGroupFontSize === null) {
      currentGroupFontSize = paragraphFontSize;
      continue;
    }

    if (currentGroupFontSize !== paragraphFontSize) {
      return 0;
    }
  }

  if (currentGroupFontSize === null || currentGroupFontSize === dominantFontSize) {
    return 0;
  }

  for (const runProperties of paragraphRuns) {
    for (const runProperty of runProperties!) {
      if (!updateExplicitFontSize(runProperty, dominantFontSize)) {
        return 0;
      }
    }
  }

  const key = `${slideIndex}::${currentGroupFontSize}::${dominantFontSize}`;
  changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + paragraphs.length);
  return paragraphs.length;
}

function collectParagraphRunProperties(paragraph: SlideParagraphReference): OrderedXmlNode[] | null {
  const runProperties: OrderedXmlNode[] = [];

  for (const child of getElementChildren(paragraph.paragraphNode)) {
    const elementName = getElementName(child);
    if (elementName === "a:fld") {
      return null;
    }

    if (elementName !== "a:r") {
      continue;
    }

    const properties = findChildElements(child, "a:rPr")[0];
    if (!properties || !hasUpdatableExplicitFontSize(properties)) {
      return null;
    }

    runProperties.push(properties);
  }

  return runProperties.length > 0 ? runProperties : null;
}

function hasUpdatableExplicitFontSize(runProperties: OrderedXmlNode): boolean {
  const attributes = getAttributes(runProperties);
  return typeof attributes["@_sz"] === "string" || typeof attributes["@_sz"] === "number";
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
        paragraphNode: paragraph
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
  paragraphGroups: BodyParagraphGroupWithDominantFontCleanupCandidates[]
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

function summarizeChangedParagraphs(
  changedParagraphs: Map<string, number>
): ChangedDominantFontSizeSummary[] {
  return [...changedParagraphs.entries()]
    .map(([key, count]) => {
      const [slide, fromSizePt, toSizePt] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        fromSizePt: Number.parseFloat(fromSizePt),
        toSizePt: Number.parseFloat(toSizePt),
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (left.fromSizePt !== right.fromSizePt) {
        return right.fromSizePt - left.fromSizePt;
      }

      return right.toSizePt - left.toSizePt;
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

function extractExplicitFontSize(runProperties: OrderedXmlNode): number | null {
  const rawSize = getAttributes(runProperties)["@_sz"];
  if (typeof rawSize === "number") {
    return toPointSize(rawSize);
  }

  if (typeof rawSize === "string" && rawSize.length > 0) {
    const parsed = Number.parseInt(rawSize, 10);
    return Number.isNaN(parsed) ? null : toPointSize(parsed);
  }

  return null;
}

function updateExplicitFontSize(runProperties: OrderedXmlNode, dominantFontSize: number): boolean {
  const attributes = getAttributes(runProperties);
  if (attributes["@_sz"] === undefined) {
    return false;
  }

  const targetSize = toOpenXmlSize(dominantFontSize).toString();
  if (attributes["@_sz"] === targetSize) {
    return false;
  }

  attributes["@_sz"] = targetSize;
  return true;
}

function getElementName(node: OrderedXmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text");
}

function toPointSize(openXmlSize: number): number {
  return Number.parseFloat((openXmlSize / 100).toString());
}

function toOpenXmlSize(sizePt: number): number {
  return Math.round(sizePt * 100);
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
