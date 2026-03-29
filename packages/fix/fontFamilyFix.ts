import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type LoadedPresentation } from "../audit/pptxAudit.ts";
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
import {
  paragraphHasVisibleText,
  summarizeShapeFontNormalizationGuard
} from "./fontNormalizationGuard.ts";

export interface ChangedFontRunSummary {
  slide: number;
  from: string;
  to: string;
  count: number;
}

export interface SkippedFixSummary {
  reason: string;
}

export interface FontFamilyFixReport {
  applied: boolean;
  dominantFont: string | null;
  changedRuns: ChangedFontRunSummary[];
  skipped: SkippedFixSummary[];
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

export async function normalizeFontFamilies(
  inputPath: string,
  outputPath: string
): Promise<FontFamilyFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const dominantFont = auditReport.fontDrift.dominantFont;
  const inputBuffer = await readFile(resolvedInputPath);

  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyFontFamilyFixToArchive(archive, presentation, dominantFont);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);

  return report;
}

export async function applyFontFamilyFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  dominantFont: string | null
): Promise<FontFamilyFixReport> {
  if (!dominantFont) {
    return {
      applied: false,
      dominantFont: null,
      changedRuns: [],
      skipped: [
        {
          reason: "no dominant font"
        }
      ]
    };
  }

  const changedRuns = new Map<string, number>();
  let totalChangedRuns = 0;

  for (const slide of presentation.slides) {
    const entry = archive.file(slide.archivePath);
    if (!entry) {
      continue;
    }

    const slideXml = await entry.async("string");
    const parsedSlide = xmlParser.parse(slideXml) as OrderedXmlDocument;
    const originalSlide = structuredClone(parsedSlide);
    const changedInSlide = normalizeSlideFonts(parsedSlide, slide.index, dominantFont, changedRuns);
    totalChangedRuns += changedInSlide;

    if (changedInSlide > 0) {
      assertSlideXmlSafety(originalSlide, parsedSlide, slide.index);
      assertSlideTextFidelity(originalSlide, parsedSlide, slide.index);
      archive.file(slide.archivePath, xmlBuilder.build(parsedSlide));
    }
  }

  if (totalChangedRuns === 0) {
    return {
      applied: false,
      dominantFont,
      changedRuns: [],
      skipped: [
        {
          reason: "no safe changes"
        }
      ]
    };
  }

  return {
    applied: true,
    dominantFont,
    changedRuns: summarizeChangedRuns(changedRuns),
    skipped: []
  };
}

function normalizeSlideFonts(
  slideXml: OrderedXmlDocument,
  slideIndex: number,
  dominantFont: string,
  changedRuns: Map<string, number>
): number {
  let changedCount = 0;
  const textShapes = findSlideShapes(slideXml).filter(hasTextBody);
  const titleShapeForSimpleMixedNormalization = findSimpleMixedTitleNormalizationTarget(
    textShapes,
    dominantFont
  );

  for (const shape of textShapes) {
    if (isTitleShape(shape)) {
      continue;
    }

    const guard = summarizeShapeFontNormalizationGuard(shape);
    const paragraphs = findChildElements(findChildElements(shape, "p:txBody")[0] ?? {}, "a:p");
    let comparableParagraphIndex = 0;
    for (const paragraph of paragraphs) {
      if (!paragraphHasVisibleText(paragraph)) {
        continue;
      }

      const paragraphIndex = comparableParagraphIndex;
      comparableParagraphIndex += 1;
      if (guard.protectedFontFamilyParagraphIndexes.has(paragraphIndex)) {
        continue;
      }

      for (const run of findChildElementsInOrder(paragraph, "a:r")) {
        const runProperties = findChildElements(run, "a:rPr")[0];
        if (!runProperties) {
          continue;
        }

        const currentFont = extractExplicitFontFamily(runProperties);
        if (!currentFont || currentFont === dominantFont) {
          continue;
        }

        const updated = updateExplicitFontFamily(runProperties, dominantFont);
        if (!updated) {
          continue;
        }

        changedCount += 1;
        const key = `${slideIndex}::${currentFont}::${dominantFont}`;
        changedRuns.set(key, (changedRuns.get(key) ?? 0) + 1);
      }
    }
  }

  if (titleShapeForSimpleMixedNormalization) {
    changedCount += normalizeShapeRunsToDominantFont(
      titleShapeForSimpleMixedNormalization,
      slideIndex,
      dominantFont,
      changedRuns
    );
  }

  return changedCount;
}

function findSimpleMixedTitleNormalizationTarget(
  textShapes: OrderedXmlNode[],
  dominantFont: string
): OrderedXmlNode | null {
  if (textShapes.length !== 2) {
    return null;
  }

  const titleShapes = textShapes.filter((shape) => isTitleShape(shape));
  const bodyShapes = textShapes.filter((shape) => !isTitleShape(shape));
  if (titleShapes.length !== 1 || bodyShapes.length !== 1) {
    return null;
  }

  const titleShape = titleShapes[0];
  const titleParagraphs = findVisibleParagraphs(titleShape);
  if (titleParagraphs.length !== 1) {
    return null;
  }

  const titleRuns = findChildElementsInOrder(titleParagraphs[0], "a:r");
  if (titleRuns.length === 0) {
    return null;
  }

  const titleFamilies = titleRuns.map((run) =>
    extractExplicitFontFamily(findChildElements(run, "a:rPr")[0] ?? {})
  );
  if (titleFamilies.some((family) => !family)) {
    return null;
  }

  const distinctTitleFamilies = new Set(titleFamilies);
  if (distinctTitleFamilies.size !== 1 || titleFamilies[0] === dominantFont) {
    return null;
  }

  const bodyParagraphs = findVisibleParagraphs(bodyShapes[0]);
  if (bodyParagraphs.length !== 1) {
    return null;
  }

  const bodyRuns = findChildElementsInOrder(bodyParagraphs[0], "a:r");
  if (bodyRuns.length < 3) {
    return null;
  }

  const bodyFamilies = bodyRuns.map((run) =>
    extractExplicitFontFamily(findChildElements(run, "a:rPr")[0] ?? {})
  );
  if (bodyFamilies.some((family) => !family)) {
    return null;
  }

  const familyCounts = new Map<string, number>();
  for (const family of bodyFamilies) {
    familyCounts.set(family!, (familyCounts.get(family!) ?? 0) + 1);
  }

  if (familyCounts.size < 2) {
    return null;
  }

  const rankedFamilies = [...familyCounts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });
  const dominantBodyFamily = rankedFamilies[0];
  const nextFamily = rankedFamilies[1];
  if (!dominantBodyFamily || !nextFamily) {
    return null;
  }

  const nonDominantRunCount = bodyRuns.length - dominantBodyFamily[1];
  if (
    dominantBodyFamily[0] !== dominantFont ||
    dominantBodyFamily[1] <= nextFamily[1] ||
    nonDominantRunCount !== 1
  ) {
    return null;
  }

  return titleShape;
}

function findVisibleParagraphs(shape: OrderedXmlNode): OrderedXmlNode[] {
  return findChildElements(findChildElements(shape, "p:txBody")[0] ?? {}, "a:p")
    .filter((paragraph) => paragraphHasVisibleText(paragraph));
}

function normalizeShapeRunsToDominantFont(
  shape: OrderedXmlNode,
  slideIndex: number,
  dominantFont: string,
  changedRuns: Map<string, number>
): number {
  let changedCount = 0;

  for (const paragraph of findVisibleParagraphs(shape)) {
    for (const run of findChildElementsInOrder(paragraph, "a:r")) {
      const runProperties = findChildElements(run, "a:rPr")[0];
      if (!runProperties) {
        continue;
      }

      const currentFont = extractExplicitFontFamily(runProperties);
      if (!currentFont || currentFont === dominantFont) {
        continue;
      }

      const updated = updateExplicitFontFamily(runProperties, dominantFont);
      if (!updated) {
        continue;
      }

      changedCount += 1;
      const key = `${slideIndex}::${currentFont}::${dominantFont}`;
      changedRuns.set(key, (changedRuns.get(key) ?? 0) + 1);
    }
  }

  return changedCount;
}

function summarizeChangedRuns(changedRuns: Map<string, number>): ChangedFontRunSummary[] {
  return [...changedRuns.entries()]
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

function updateExplicitFontFamily(runProperties: OrderedXmlNode, dominantFont: string): boolean {
  const attributes = getAttributes(runProperties);
  let updated = false;

  if (typeof attributes["@_typeface"] === "string") {
    attributes["@_typeface"] = dominantFont;
    updated = true;
  }

  updated = updateTypefaceNode(runProperties, "a:latin", dominantFont) || updated;
  updated = updateTypefaceNode(runProperties, "a:ea", dominantFont) || updated;
  updated = updateTypefaceNode(runProperties, "a:cs", dominantFont) || updated;
  updated = updateTypefaceNode(runProperties, "a:sym", dominantFont) || updated;

  return updated;
}

function updateTypefaceNode(
  runProperties: OrderedXmlNode,
  nodeName: string,
  dominantFont: string
): boolean {
  const typefaceNode = findChildElements(runProperties, nodeName)[0];
  const attributes = getAttributes(typefaceNode ?? {});
  if (!typefaceNode || typeof attributes["@_typeface"] !== "string") {
    return false;
  }

  attributes["@_typeface"] = dominantFont;
  return true;
}

function findChildElementsInOrder(
  node: OrderedXmlNode,
  childName: string
): OrderedXmlNode[] {
  return getElementChildren(node).filter((child) => Object.prototype.hasOwnProperty.call(child, childName));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
