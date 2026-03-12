import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type LoadedPresentation } from "../audit/pptxAudit.ts";

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
    const parsedSlide = xmlParser.parse(slideXml) as XmlNode;
    const changedInSlide = normalizeSlideFonts(parsedSlide, slide.index, dominantFont, changedRuns);
    totalChangedRuns += changedInSlide;

    if (changedInSlide > 0) {
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
  slideXml: XmlNode,
  slideIndex: number,
  dominantFont: string,
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

function extractExplicitFontFamily(runProperties: XmlNode): string | undefined {
  const directTypeface = stringValue(runProperties["@_typeface"]);
  if (directTypeface) {
    return directTypeface;
  }

  return (
    stringValue(asXmlNode(runProperties["a:latin"])?.["@_typeface"]) ??
    stringValue(asXmlNode(runProperties["a:ea"])?.["@_typeface"]) ??
    stringValue(asXmlNode(runProperties["a:cs"])?.["@_typeface"]) ??
    stringValue(asXmlNode(runProperties["a:sym"])?.["@_typeface"])
  );
}

function updateExplicitFontFamily(runProperties: XmlNode, dominantFont: string): boolean {
  let updated = false;

  if (typeof runProperties["@_typeface"] === "string") {
    runProperties["@_typeface"] = dominantFont;
    updated = true;
  }

  updated = updateTypefaceNode(runProperties, "a:latin", dominantFont) || updated;
  updated = updateTypefaceNode(runProperties, "a:ea", dominantFont) || updated;
  updated = updateTypefaceNode(runProperties, "a:cs", dominantFont) || updated;
  updated = updateTypefaceNode(runProperties, "a:sym", dominantFont) || updated;

  return updated;
}

function updateTypefaceNode(runProperties: XmlNode, nodeName: string, dominantFont: string): boolean {
  const typefaceNode = asXmlNode(runProperties[nodeName]);
  if (!typefaceNode || typeof typefaceNode["@_typeface"] !== "string") {
    return false;
  }

  typefaceNode["@_typeface"] = dominantFont;
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

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
