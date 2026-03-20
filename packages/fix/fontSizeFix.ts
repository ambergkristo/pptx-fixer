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

export interface ChangedFontSizeRunSummary {
  slide: number;
  fromSizePt: number;
  toSizePt: number;
  count: number;
}

export interface SkippedFontSizeFixSummary {
  reason: string;
}

export interface FontSizeFixReport {
  applied: boolean;
  dominantSizePt: number | null;
  changedRuns: ChangedFontSizeRunSummary[];
  skipped: SkippedFontSizeFixSummary[];
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

export async function normalizeFontSizes(
  inputPath: string,
  outputPath: string
): Promise<FontSizeFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const dominantSizePt = auditReport.fontSizeDrift.dominantSizePt;
  const inputBuffer = await readFile(resolvedInputPath);

  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyFontSizeFixToArchive(archive, presentation, dominantSizePt);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);

  return report;
}

export async function applyFontSizeFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  dominantSizePt: number | null
): Promise<FontSizeFixReport> {
  if (dominantSizePt === null) {
    return {
      applied: false,
      dominantSizePt: null,
      changedRuns: [],
      skipped: [
        {
          reason: "no dominant font size"
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
    const changedInSlide = normalizeSlideFontSizes(parsedSlide, slide.index, dominantSizePt, changedRuns);
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
      dominantSizePt,
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
    dominantSizePt,
    changedRuns: summarizeChangedRuns(changedRuns),
    skipped: []
  };
}

function normalizeSlideFontSizes(
  slideXml: OrderedXmlDocument,
  slideIndex: number,
  dominantSizePt: number,
  changedRuns: Map<string, number>
): number {
  let changedCount = 0;
  for (const shape of findSlideShapes(slideXml)) {
    if (!hasTextBody(shape) || isTitleShape(shape)) {
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
      if (guard.protectedFontSizeParagraphIndexes.has(paragraphIndex)) {
        continue;
      }

      for (const run of findChildElementsInOrder(paragraph, "a:r")) {
        const runProperties = findChildElements(run, "a:rPr")[0];
        if (!runProperties) {
          continue;
        }

        const currentSizePt = extractExplicitSizePt(runProperties);
        if (currentSizePt === null || currentSizePt === dominantSizePt) {
          continue;
        }

        const updated = updateExplicitSize(runProperties, dominantSizePt);
        if (!updated) {
          continue;
        }

        changedCount += 1;
        const key = `${slideIndex}::${currentSizePt}::${dominantSizePt}`;
        changedRuns.set(key, (changedRuns.get(key) ?? 0) + 1);
      }
    }
  }

  return changedCount;
}

function summarizeChangedRuns(changedRuns: Map<string, number>): ChangedFontSizeRunSummary[] {
  return [...changedRuns.entries()]
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

function extractExplicitSizePt(runProperties: OrderedXmlNode): number | null {
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

function updateExplicitSize(runProperties: OrderedXmlNode, dominantSizePt: number): boolean {
  const attributes = getAttributes(runProperties);
  if (attributes["@_sz"] === undefined) {
    return false;
  }

  attributes["@_sz"] = toOpenXmlSize(dominantSizePt).toString();
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
