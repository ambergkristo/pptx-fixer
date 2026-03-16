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

export interface ChangedDominantFontFamilySummary {
  slide: number;
  from: string;
  to: string;
  count: number;
}

export interface SkippedDominantFontFamilyFixSummary {
  reason: string;
}

export interface DominantFontFamilyFixReport {
  applied: boolean;
  changedParagraphs: ChangedDominantFontFamilySummary[];
  skipped: SkippedDominantFontFamilyFixSummary[];
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

export async function normalizeDominantFontFamilies(
  inputPath: string,
  outputPath: string
): Promise<DominantFontFamilyFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyDominantFontFamilyFixToArchive(archive, presentation, auditReport);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);
  return report;
}

export async function applyDominantFontFamilyFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<DominantFontFamilyFixReport> {
  const deckDominantFontFamily = auditReport.fontDrift.dominantFont;
  const changedParagraphs = new Map<string, number>();
  let totalChangedParagraphs = 0;
  let eligibleGroupCount = 0;

  for (const slide of presentation.slides) {
    const slideAudit = auditReport.slides.find((entry) => entry.index === slide.index);
    if (!slideAudit || slideAudit.dominantBodyStyle.fontFamily === null) {
      continue;
    }

    if (deckDominantFontFamily === null || slideAudit.dominantBodyStyle.fontFamily !== deckDominantFontFamily) {
      continue;
    }

    const eligibleGroups = slideAudit.paragraphGroups.filter(
      (group) => group.type === "body" && group.dominantFontFamilyCleanupCandidate?.eligible === true
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
    const changedInSlide = normalizeSlideDominantFontFamily(
      parsedSlide,
      slideAudit.paragraphGroups,
      slideAudit.dominantBodyStyle.fontFamily,
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

function normalizeSlideDominantFontFamily(
  slideXml: OrderedXmlDocument,
  paragraphGroups: BodyParagraphGroupWithDominantFontCleanupCandidates[],
  dominantFontFamily: string,
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
    if (group.type !== "body" || group.dominantFontFamilyCleanupCandidate?.eligible !== true) {
      continue;
    }

    changedParagraphCount += applyFontFamilyChange(
      mappedGroups[index],
      dominantFontFamily,
      slideIndex,
      changedParagraphs
    );
  }

  return changedParagraphCount;
}

function applyFontFamilyChange(
  paragraphs: SlideParagraphReference[],
  dominantFontFamily: string,
  slideIndex: number,
  changedParagraphs: Map<string, number>
): number {
  const paragraphRuns = paragraphs.map(collectParagraphRunProperties);
  if (paragraphRuns.some((entry) => entry === null)) {
    return 0;
  }

  let currentGroupFontFamily: string | null = null;

  for (const runProperties of paragraphRuns) {
    const paragraphFontFamilies = runProperties!.map((entry) => extractExplicitFontFamily(entry));
    if (paragraphFontFamilies.some((value) => !value)) {
      return 0;
    }

    const distinctParagraphFonts = new Set(paragraphFontFamilies);
    if (distinctParagraphFonts.size !== 1) {
      return 0;
    }

    const paragraphFontFamily = paragraphFontFamilies[0]!;
    if (currentGroupFontFamily === null) {
      currentGroupFontFamily = paragraphFontFamily;
      continue;
    }

    if (currentGroupFontFamily !== paragraphFontFamily) {
      return 0;
    }
  }

  if (currentGroupFontFamily === null || currentGroupFontFamily === dominantFontFamily) {
    return 0;
  }

  for (const runProperties of paragraphRuns) {
    for (const runProperty of runProperties!) {
      if (!updateExplicitFontFamily(runProperty, dominantFontFamily)) {
        return 0;
      }
    }
  }

  const key = `${slideIndex}::${currentGroupFontFamily}::${dominantFontFamily}`;
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
    if (!properties || !hasUpdatableExplicitFontFamily(properties)) {
      return null;
    }

    runProperties.push(properties);
  }

  return runProperties.length > 0 ? runProperties : null;
}

function hasUpdatableExplicitFontFamily(runProperties: OrderedXmlNode): boolean {
  const attributes = getAttributes(runProperties);
  if (typeof attributes["@_typeface"] === "string") {
    return true;
  }

  return ["a:latin", "a:ea", "a:cs", "a:sym"].some((nodeName) => {
    const node = findChildElements(runProperties, nodeName)[0];
    return typeof getAttributes(node ?? {})["@_typeface"] === "string";
  });
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
): ChangedDominantFontFamilySummary[] {
  return [...changedParagraphs.entries()]
    .map(([key, count]) => {
      const [slide, from, to] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        from,
        to,
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (left.from !== right.from) {
        return left.from.localeCompare(right.from);
      }

      return left.to.localeCompare(right.to);
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

function extractExplicitFontFamily(runProperties: OrderedXmlNode): string | undefined {
  const directTypeface = stringValue(getAttributes(runProperties)["@_typeface"]);
  if (directTypeface) {
    return directTypeface;
  }

  return (
    stringValue(getAttributes(findChildElements(runProperties, "a:latin")[0] ?? {})["@_typeface"]) ??
    stringValue(getAttributes(findChildElements(runProperties, "a:ea")[0] ?? {})["@_typeface"]) ??
    stringValue(getAttributes(findChildElements(runProperties, "a:cs")[0] ?? {})["@_typeface"]) ??
    stringValue(getAttributes(findChildElements(runProperties, "a:sym")[0] ?? {})["@_typeface"])
  );
}

function updateExplicitFontFamily(runProperties: OrderedXmlNode, dominantFontFamily: string): boolean {
  const attributes = getAttributes(runProperties);
  let updated = false;

  if (typeof attributes["@_typeface"] === "string" && attributes["@_typeface"] !== dominantFontFamily) {
    attributes["@_typeface"] = dominantFontFamily;
    updated = true;
  }

  updated = updateTypefaceNode(runProperties, "a:latin", dominantFontFamily) || updated;
  updated = updateTypefaceNode(runProperties, "a:ea", dominantFontFamily) || updated;
  updated = updateTypefaceNode(runProperties, "a:cs", dominantFontFamily) || updated;
  updated = updateTypefaceNode(runProperties, "a:sym", dominantFontFamily) || updated;

  return updated;
}

function updateTypefaceNode(
  runProperties: OrderedXmlNode,
  nodeName: string,
  dominantFontFamily: string
): boolean {
  const typefaceNode = findChildElements(runProperties, nodeName)[0];
  const attributes = getAttributes(typefaceNode ?? {});
  if (!typefaceNode || typeof attributes["@_typeface"] !== "string") {
    return false;
  }

  if (attributes["@_typeface"] === dominantFontFamily) {
    return false;
  }

  attributes["@_typeface"] = dominantFontFamily;
  return true;
}

function getElementName(node: OrderedXmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
