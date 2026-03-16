import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type AuditReport, type LoadedPresentation } from "../audit/pptxAudit.ts";
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

export interface ChangedAlignmentSummary {
  slide: number;
  fromAlignment: string;
  toAlignment: string;
  count: number;
}

export interface SkippedAlignmentFixSummary {
  reason: string;
}

export interface AlignmentFixReport {
  applied: boolean;
  changedParagraphs: ChangedAlignmentSummary[];
  skipped: SkippedAlignmentFixSummary[];
}

interface AlignmentParagraphDescriptor {
  slide: number;
  paragraph: number;
  alignment: string;
  paragraphProperties: OrderedXmlNode;
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

export async function normalizeParagraphAlignment(
  inputPath: string,
  outputPath: string
): Promise<AlignmentFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyAlignmentFixToArchive(archive, presentation, auditReport);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);
  return report;
}

export async function applyAlignmentFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<AlignmentFixReport> {
  if (auditReport.alignmentDriftCount === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [
        {
          reason: "no alignment drift"
        }
      ]
    };
  }

  const auditedDriftBySlide = groupAuditedDriftBySlide(auditReport);
  const changedParagraphs = new Map<string, number>();
  let totalChangedParagraphs = 0;

  for (const slide of presentation.slides) {
    const auditedDriftParagraphs = auditedDriftBySlide.get(slide.index);
    if (!auditedDriftParagraphs || auditedDriftParagraphs.size === 0) {
      continue;
    }

    const entry = archive.file(slide.archivePath);
    if (!entry) {
      continue;
    }

    const slideXml = await entry.async("string");
    const parsedSlide = xmlParser.parse(slideXml) as OrderedXmlDocument;
    const originalSlide = structuredClone(parsedSlide);
    const changedInSlide = normalizeSlideAlignment(
      parsedSlide,
      slide.index,
      auditedDriftParagraphs,
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
          reason: "no safe changes"
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

function groupAuditedDriftBySlide(auditReport: AuditReport): Map<number, Set<number>> {
  const driftBySlide = new Map<number, Set<number>>();

  for (const paragraph of auditReport.alignmentDrift.driftParagraphs) {
    const paragraphs = driftBySlide.get(paragraph.slide) ?? new Set<number>();
    paragraphs.add(paragraph.paragraph);
    driftBySlide.set(paragraph.slide, paragraphs);
  }

  return driftBySlide;
}

function normalizeSlideAlignment(
  slideXml: OrderedXmlDocument,
  slideIndex: number,
  auditedDriftParagraphs: Set<number>,
  changedParagraphs: Map<string, number>
): number {
  let changedCount = 0;
  let paragraphIndex = 1;

  for (const shape of findSlideShapes(slideXml)) {
    if (!hasTextBody(shape) || isTitleShape(shape)) {
      continue;
    }

    const explicitParagraphs: AlignmentParagraphDescriptor[] = [];
    const paragraphs = findChildElements(findChildElements(shape, "p:txBody")[0] ?? {}, "a:p");

    for (const paragraph of paragraphs) {
      const paragraphText = extractParagraphText(paragraph);
      if (!paragraphText) {
        continue;
      }

      const paragraphProperties = findChildElements(paragraph, "a:pPr")[0];
      const explicitAlignment = extractExplicitAlignment(paragraphProperties, slideIndex, paragraphIndex);
      if (explicitAlignment) {
        explicitParagraphs.push(explicitAlignment);
      }

      paragraphIndex += 1;
    }

    changedCount += normalizeAlignmentGroup(explicitParagraphs, auditedDriftParagraphs, changedParagraphs);
  }

  return changedCount;
}

function normalizeAlignmentGroup(
  paragraphs: AlignmentParagraphDescriptor[],
  auditedDriftParagraphs: Set<number>,
  changedParagraphs: Map<string, number>
): number {
  if (paragraphs.length < 3) {
    return 0;
  }

  let changedCount = 0;

  for (let index = 1; index < paragraphs.length - 1; index += 1) {
    const current = paragraphs[index];
    if (!auditedDriftParagraphs.has(current.paragraph)) {
      continue;
    }

    const previous = paragraphs[index - 1];
    const next = paragraphs[index + 1];
    if (previous.alignment !== next.alignment || current.alignment === previous.alignment) {
      continue;
    }

    if (!updateParagraphAlignment(current.paragraphProperties, previous.alignment)) {
      continue;
    }

    changedCount += 1;
    const key = `${current.slide}::${current.alignment}::${previous.alignment}`;
    changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
  }

  return changedCount;
}

function extractExplicitAlignment(
  paragraphProperties: OrderedXmlNode | undefined,
  slideIndex: number,
  paragraphIndex: number
): AlignmentParagraphDescriptor | null {
  if (!paragraphProperties) {
    return null;
  }

  const rawAlignment = stringValue(getAttributes(paragraphProperties)["@_algn"]);
  const alignment = normalizeAlignmentValue(rawAlignment);
  if (!alignment || !rawAlignment) {
    return null;
  }

  return {
    slide: slideIndex,
    paragraph: paragraphIndex,
    alignment,
    paragraphProperties
  };
}

function updateParagraphAlignment(paragraphProperties: OrderedXmlNode, targetAlignment: string): boolean {
  const attributes = getAttributes(paragraphProperties);
  const currentAlignment = stringValue(attributes["@_algn"]);
  const targetOpenXmlAlignment = toOpenXmlAlignment(targetAlignment);
  if (!currentAlignment || !targetOpenXmlAlignment || currentAlignment === targetOpenXmlAlignment) {
    return false;
  }

  attributes["@_algn"] = targetOpenXmlAlignment;
  return true;
}

function summarizeChangedParagraphs(
  changedParagraphs: Map<string, number>
): ChangedAlignmentSummary[] {
  return [...changedParagraphs.entries()]
    .map(([key, count]) => {
      const [slide, fromAlignment, toAlignment] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        fromAlignment,
        toAlignment,
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (left.fromAlignment !== right.fromAlignment) {
        return left.fromAlignment.localeCompare(right.fromAlignment);
      }

      return left.toAlignment.localeCompare(right.toAlignment);
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
