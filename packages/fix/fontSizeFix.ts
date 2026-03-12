import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type LoadedPresentation } from "../audit/pptxAudit.ts";

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

type XmlNode = Record<string, unknown>;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  trimValues: false,
  processEntities: false
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  processEntities: false,
  suppressEmptyNode: false
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
    const parsedSlide = xmlParser.parse(slideXml) as XmlNode;
    const changedInSlide = normalizeSlideFontSizes(parsedSlide, slide.index, dominantSizePt, changedRuns);
    totalChangedRuns += changedInSlide;

    if (changedInSlide > 0) {
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
  slideXml: XmlNode,
  slideIndex: number,
  dominantSizePt: number,
  changedRuns: Map<string, number>
): number {
  const shapes = asArray<XmlNode>(asXmlNode(slideXml["p:sld"])?.["p:cSld"])
    .flatMap((contentSlide) => asArray<XmlNode>(asXmlNode(contentSlide["p:spTree"])?.["p:sp"]));

  let changedCount = 0;
  for (const shape of shapes) {
    if (!hasTextBody(shape) || isTitleShape(shape)) {
      continue;
    }

    const paragraphs = asArray<XmlNode>(asXmlNode(shape["p:txBody"])?.["a:p"]);
    for (const paragraph of paragraphs) {
      for (const run of asArray<XmlNode>(paragraph["a:r"])) {
        const runProperties = asXmlNode(run["a:rPr"]);
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

function hasTextBody(shape: XmlNode): boolean {
  return shape["p:txBody"] !== undefined;
}

function isTitleShape(shape: XmlNode): boolean {
  const nonVisualProperties = asXmlNode(shape["p:nvSpPr"]);
  const placeholderNode = asXmlNode(asXmlNode(nonVisualProperties?.["p:nvPr"])?.["p:ph"]);
  const placeholderType = stringValue(placeholderNode?.["@_type"]);
  if (placeholderType === "title" || placeholderType === "ctrTitle") {
    return true;
  }

  const shapeName = stringValue(asXmlNode(nonVisualProperties?.["p:cNvPr"])?.["@_name"]);
  return typeof shapeName === "string" && /^title\b/i.test(shapeName);
}

function extractExplicitSizePt(runProperties: XmlNode): number | null {
  const rawSize = runProperties["@_sz"];
  if (typeof rawSize === "number") {
    return toPointSize(rawSize);
  }

  if (typeof rawSize === "string" && rawSize.length > 0) {
    const parsed = Number.parseInt(rawSize, 10);
    return Number.isNaN(parsed) ? null : toPointSize(parsed);
  }

  return null;
}

function updateExplicitSize(runProperties: XmlNode, dominantSizePt: number): boolean {
  if (runProperties["@_sz"] === undefined) {
    return false;
  }

  runProperties["@_sz"] = toOpenXmlSize(dominantSizePt).toString();
  return true;
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
