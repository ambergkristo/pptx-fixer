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

export interface ChangedParagraphSpacingSummary {
  slide: number;
  fromBefore: string;
  fromAfter: string;
  toBefore: string;
  toAfter: string;
  count: number;
}

export interface SkippedSpacingFixSummary {
  reason: string;
}

export interface SpacingFixReport {
  applied: boolean;
  changedParagraphs: ChangedParagraphSpacingSummary[];
  skipped: SkippedSpacingFixSummary[];
}

interface RawSpacingValue {
  kind: "pts" | "pct";
  rawVal: string;
  display: string;
}

interface ExplicitSpacingParagraph {
  slide: number;
  paragraph: number;
  paragraphNode: OrderedXmlNode;
  paragraphProperties: OrderedXmlNode | undefined;
  before: RawSpacingValue | null;
  after: RawSpacingValue | null;
  lineSpacingKind: RawSpacingValue["kind"] | null;
  alignment: string | null;
  signature: string;
}

interface ShapeSpacingCandidate {
  paragraphs: ExplicitSpacingParagraph[];
}

interface DominantSpacingSignature {
  before: RawSpacingValue | null;
  after: RawSpacingValue | null;
  signature: string;
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

export async function normalizeParagraphSpacing(
  inputPath: string,
  outputPath: string
): Promise<SpacingFixReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);
  const report = await applyParagraphSpacingFixToArchive(archive, presentation, auditReport);

  if (!report.applied) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return report;
  }

  const outputBuffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeOutput(resolvedOutputPath, outputBuffer);
  return report;
}

export async function applyParagraphSpacingFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<SpacingFixReport> {
  if (auditReport.spacingDriftCount === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [
        {
          reason: "no spacing drift"
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
    const changedInSlide = normalizeSlideParagraphSpacing(
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

  for (const paragraph of auditReport.spacingDrift.driftParagraphs) {
    const paragraphs = driftBySlide.get(paragraph.slide) ?? new Set<number>();
    paragraphs.add(paragraph.paragraph);
    driftBySlide.set(paragraph.slide, paragraphs);
  }

  return driftBySlide;
}

function normalizeSlideParagraphSpacing(
  slideXml: OrderedXmlDocument,
  slideIndex: number,
  auditedDriftParagraphs: Set<number>,
  changedParagraphs: Map<string, number>
): number {
  let changedCount = 0;
  let paragraphIndex = 1;
  const shapeCandidates: ShapeSpacingCandidate[] = [];

  for (const shape of findSlideShapes(slideXml)) {
    if (!hasTextBody(shape) || isTitleShape(shape)) {
      continue;
    }

    const comparableParagraphs: ExplicitSpacingParagraph[] = [];
    const paragraphs = findChildElements(findChildElements(shape, "p:txBody")[0] ?? {}, "a:p");

    for (const paragraph of paragraphs) {
      const paragraphText = extractParagraphText(paragraph);
      if (!paragraphText) {
        continue;
      }

      const paragraphProperties = findChildElements(paragraph, "a:pPr")[0];
      const explicitSpacing = extractExplicitParagraphSpacing(
        paragraph,
        paragraphProperties,
        slideIndex,
        paragraphIndex
      );
      comparableParagraphs.push(explicitSpacing);

      paragraphIndex += 1;
    }

    shapeCandidates.push({ paragraphs: comparableParagraphs });
  }

  for (const candidate of shapeCandidates) {
    if (hasConflictingLineSpacingKinds(candidate.paragraphs)) {
      continue;
    }

    if (isProtectedUniformNonLeftAlignmentRole(candidate.paragraphs)) {
      continue;
    }

    const dominantSignature = determineDominantSpacingSignature(candidate.paragraphs);
    if (!dominantSignature) {
      continue;
    }

    changedCount += applySpacingSignatureToParagraphs(
      candidate.paragraphs.filter(
        (paragraph) =>
          auditedDriftParagraphs.has(paragraph.paragraph) &&
          paragraph.signature !== dominantSignature.signature
      ),
      dominantSignature,
      slideIndex,
      changedParagraphs
    );
  }

  const slideDominantSignature = determineSlideLevelDominantSpacingSignature(
    shapeCandidates.flatMap((candidate) => candidate.paragraphs)
  );
  if (!slideDominantSignature) {
    return changedCount;
  }

  const currentSlideDriftParagraphs = new Set(
    summarizeCurrentSlideSpacingDrift(shapeCandidates.flatMap((candidate) => candidate.paragraphs)).map(
      (paragraph) => paragraph.paragraph
    )
  );

  for (const candidate of shapeCandidates) {
    if (!isEligibleUniformLineSpacingShapeForSlideLevelNormalization(
      candidate.paragraphs,
      currentSlideDriftParagraphs,
      slideDominantSignature
    )) {
      continue;
    }

    changedCount += applySpacingSignatureToParagraphs(
      candidate.paragraphs.filter((paragraph) => paragraph.signature !== slideDominantSignature.signature),
      slideDominantSignature,
      slideIndex,
      changedParagraphs
    );
  }

  return changedCount;
}

function determineDominantSpacingSignature(
  paragraphs: ExplicitSpacingParagraph[]
): DominantSpacingSignature | null {
  if (paragraphs.length < 2) {
    return null;
  }

  const countsBySignature = new Map<string, number>();
  for (const paragraph of paragraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
  }

  if (countsBySignature.size < 2) {
    return null;
  }

  const maxCount = Math.max(...countsBySignature.values());
  const dominantParagraphs = paragraphs.filter(
    (paragraph) => (countsBySignature.get(paragraph.signature) ?? 0) === maxCount
  );

  if (dominantParagraphs.length === 0) {
    return null;
  }

  const dominantSignatures = [...new Set(dominantParagraphs.map((paragraph) => paragraph.signature))];
  if (dominantSignatures.length !== 1) {
    return null;
  }

  const dominantParagraph = dominantParagraphs
    .slice()
    .sort((left, right) => left.paragraph - right.paragraph)[0];

  return {
    before: dominantParagraph.before,
    after: dominantParagraph.after,
    signature: dominantParagraph.signature
  };
}

function determineSlideLevelDominantSpacingSignature(
  paragraphs: ExplicitSpacingParagraph[]
): DominantSpacingSignature | null {
  if (paragraphs.length < 2) {
    return null;
  }

  const countsBySignature = new Map<string, number>();
  const paragraphBySignature = new Map<string, ExplicitSpacingParagraph>();
  for (const paragraph of paragraphs) {
    countsBySignature.set(paragraph.signature, (countsBySignature.get(paragraph.signature) ?? 0) + 1);
    if (!paragraphBySignature.has(paragraph.signature)) {
      paragraphBySignature.set(paragraph.signature, paragraph);
    }
  }

  if (countsBySignature.size < 2) {
    return null;
  }

  const maxCount = Math.max(...countsBySignature.values());
  const dominantCandidates = [...countsBySignature.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([signature]) => paragraphBySignature.get(signature))
    .filter((paragraph): paragraph is ExplicitSpacingParagraph => paragraph !== undefined);

  if (dominantCandidates.length === 0) {
    return null;
  }

  const maxExplicitValueCount = Math.max(...dominantCandidates.map(countExplicitSpacingValues));
  const explicitCandidates = dominantCandidates.filter(
    (paragraph) => countExplicitSpacingValues(paragraph) === maxExplicitValueCount
  );
  if (explicitCandidates.length !== 1) {
    return null;
  }

  const dominantParagraph = explicitCandidates[0];
  return {
    before: dominantParagraph.before,
    after: dominantParagraph.after,
    signature: dominantParagraph.signature
  };
}

function summarizeCurrentSlideSpacingDrift(
  paragraphs: ExplicitSpacingParagraph[]
): ExplicitSpacingParagraph[] {
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

function extractExplicitParagraphSpacing(
  paragraphNode: OrderedXmlNode,
  paragraphProperties: OrderedXmlNode | undefined,
  slideIndex: number,
  paragraphIndex: number
): ExplicitSpacingParagraph {
  const before = extractRawSpacingValue(paragraphProperties ? findChildElements(paragraphProperties, "a:spcBef")[0] : undefined);
  const after = extractRawSpacingValue(paragraphProperties ? findChildElements(paragraphProperties, "a:spcAft")[0] : undefined);
  return {
    slide: slideIndex,
    paragraph: paragraphIndex,
    paragraphNode,
    paragraphProperties,
    before,
    after,
    lineSpacingKind: extractRawSpacingValue(
      paragraphProperties ? findChildElements(paragraphProperties, "a:lnSpc")[0] : undefined
    )?.kind ?? null,
    alignment: normalizeAlignmentValue(stringValue(getAttributes(paragraphProperties ?? {})["@_algn"])),
    signature: `${before?.display ?? "inherit"}|${after?.display ?? "inherit"}`
  };
}

function hasConflictingLineSpacingKinds(paragraphs: ExplicitSpacingParagraph[]): boolean {
  const explicitKinds = new Set(
    paragraphs
      .map((paragraph) => paragraph.lineSpacingKind)
      .filter((kind): kind is RawSpacingValue["kind"] => kind !== null)
  );

  return explicitKinds.size > 1;
}

function isProtectedUniformNonLeftAlignmentRole(paragraphs: ExplicitSpacingParagraph[]): boolean {
  if (paragraphs.length < 2) {
    return false;
  }

  const explicitAlignments = paragraphs
    .map((paragraph) => paragraph.alignment)
    .filter((alignment): alignment is string => alignment !== null);

  if (explicitAlignments.length !== paragraphs.length) {
    return false;
  }

  const alignments = new Set(explicitAlignments);

  if (alignments.size !== 1) {
    return false;
  }

  const [alignment] = [...alignments];
  return alignment === "center" || alignment === "right" || alignment === "justify";
}

function isEligibleUniformLineSpacingShapeForSlideLevelNormalization(
  paragraphs: ExplicitSpacingParagraph[],
  auditedDriftParagraphs: Set<number>,
  dominantSignature: DominantSpacingSignature
): boolean {
  if (paragraphs.length === 1) {
    return isEligibleSingletonShapeForSlideLevelNormalization(
      paragraphs[0],
      auditedDriftParagraphs,
      dominantSignature
    );
  }

  if (paragraphs.length < 2) {
    return false;
  }

  if (hasConflictingLineSpacingKinds(paragraphs) || isProtectedUniformNonLeftAlignmentRole(paragraphs)) {
    return false;
  }

  if (!paragraphs.every((paragraph) => auditedDriftParagraphs.has(paragraph.paragraph))) {
    return false;
  }

  const signatureSet = new Set(paragraphs.map((paragraph) => paragraph.signature));
  if (signatureSet.size !== 1) {
    return false;
  }

  const lineSpacingKinds = new Set(
    paragraphs
      .map((paragraph) => paragraph.lineSpacingKind)
      .filter((kind): kind is RawSpacingValue["kind"] => kind !== null)
  );
  if (lineSpacingKinds.size !== 1) {
    return false;
  }

  if (
    paragraphs.some((paragraph) => paragraph.alignment !== null && paragraph.alignment !== "left")
  ) {
    return false;
  }

  if (dominantSignature.before === null || dominantSignature.after === null) {
    return false;
  }

  return paragraphs[0]?.signature !== dominantSignature.signature;
}

function isEligibleSingletonShapeForSlideLevelNormalization(
  paragraph: ExplicitSpacingParagraph,
  auditedDriftParagraphs: Set<number>,
  dominantSignature: DominantSpacingSignature
): boolean {
  if (
    auditedDriftParagraphs.size !== 1 ||
    !auditedDriftParagraphs.has(paragraph.paragraph) ||
    paragraph.signature === dominantSignature.signature
  ) {
    return false;
  }

  if (
    dominantSignature.before !== null ||
    dominantSignature.after !== null ||
    paragraph.before !== null ||
    paragraph.after === null
  ) {
    return false;
  }

  if (paragraph.alignment !== null && paragraph.alignment !== "left") {
    return false;
  }

  if (hasVisibleBulletMarker(paragraph.paragraphProperties)) {
    return false;
  }

  return true;
}

function applySpacingSignatureToParagraphs(
  paragraphs: ExplicitSpacingParagraph[],
  targetSignature: DominantSpacingSignature,
  slideIndex: number,
  changedParagraphs: Map<string, number>
): number {
  let changedCount = 0;

  for (const paragraph of paragraphs) {
    const fromBefore = paragraph.before?.display ?? "inherit";
    const fromAfter = paragraph.after?.display ?? "inherit";
    const updated = updateParagraphSpacing(
      paragraph.paragraphNode,
      paragraph.paragraphProperties,
      targetSignature.before,
      targetSignature.after
    );
    if (!updated) {
      continue;
    }

    changedCount += 1;
    const key = [
      slideIndex,
      fromBefore,
      fromAfter,
      targetSignature.before?.display ?? "inherit",
      targetSignature.after?.display ?? "inherit"
    ].join("::");
    changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + 1);
    paragraph.before = targetSignature.before;
    paragraph.after = targetSignature.after;
    paragraph.signature = targetSignature.signature;
  }

  return changedCount;
}

function countExplicitSpacingValues(paragraph: Pick<ExplicitSpacingParagraph, "before" | "after">): number {
  return Number(paragraph.before !== null) + Number(paragraph.after !== null);
}

function hasVisibleBulletMarker(paragraphProperties: OrderedXmlNode | undefined): boolean {
  if (!paragraphProperties) {
    return false;
  }

  return (
    findChildElements(paragraphProperties, "a:buChar").length > 0 ||
    findChildElements(paragraphProperties, "a:buAutoNum").length > 0 ||
    findChildElements(paragraphProperties, "a:buBlip").length > 0
  );
}

function extractRawSpacingValue(spacingNode: OrderedXmlNode | undefined): RawSpacingValue | null {
  if (!spacingNode) {
    return null;
  }

  const pointsNode = findChildElements(spacingNode, "a:spcPts")[0];
  if (pointsNode) {
    const rawVal = stringValue(getAttributes(pointsNode)["@_val"]);
    if (!rawVal) {
      return null;
    }

    const parsed = Number.parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    const spacingPt = Number.parseFloat((parsed / 100).toFixed(2));
    return {
      kind: "pts",
      rawVal,
      display: `${formatMetricValue(spacingPt)}pt`
    };
  }

  const percentNode = findChildElements(spacingNode, "a:spcPct")[0];
  if (percentNode) {
    const rawVal = stringValue(getAttributes(percentNode)["@_val"]);
    if (!rawVal) {
      return null;
    }

    const parsed = Number.parseInt(rawVal, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    const spacingPercent = Number.parseFloat((parsed / 1000).toFixed(2));
    return {
      kind: "pct",
      rawVal,
      display: `${formatMetricValue(spacingPercent)}%`
    };
  }

  return null;
}

function updateParagraphSpacing(
  paragraphNode: OrderedXmlNode,
  paragraphProperties: OrderedXmlNode | undefined,
  before: RawSpacingValue | null,
  after: RawSpacingValue | null
): boolean {
  const initialParagraphProperties = paragraphProperties;
  const beforeUpdate = getSpacingUpdate(initialParagraphProperties, before, "a:spcBef");
  const afterUpdate = getSpacingUpdate(initialParagraphProperties, after, "a:spcAft");

  if (!beforeUpdate.changed && !afterUpdate.changed) {
    return false;
  }

  const targetParagraphProperties =
    initialParagraphProperties ?? getOrCreateParagraphProperties(paragraphNode);
  const children = getElementChildren(targetParagraphProperties);

  applySpacingUpdate(children, beforeUpdate, "a:spcBef");
  applySpacingUpdate(children, afterUpdate, "a:spcAft");

  if (children.length === 0) {
    removeParagraphProperties(paragraphNode, targetParagraphProperties);
  }

  return true;
}

function getSpacingUpdate(
  paragraphProperties: OrderedXmlNode | undefined,
  expectedValue: RawSpacingValue | null,
  spacingName: "a:spcBef" | "a:spcAft"
): {
  changed: boolean;
  action: "none" | "insert" | "replace" | "remove";
  replacement: OrderedXmlNode | null;
} {
  const spacingNode = paragraphProperties
    ? findChildElements(paragraphProperties, spacingName)[0]
    : undefined;

  if (expectedValue === null) {
    return {
      changed: spacingNode !== undefined,
      action: spacingNode ? "remove" : "none",
      replacement: null
    };
  }

  if (!spacingNode) {
    return {
      changed: true,
      action: "insert",
      replacement: buildSpacingNode(spacingName, expectedValue)
    };
  }

  if (spacingNodesEqual(spacingNode, expectedValue, spacingName)) {
    return {
      changed: false,
      action: "none",
      replacement: null
    };
  }

  return {
    changed: true,
    action: "replace",
    replacement: buildSpacingNode(spacingName, expectedValue)
  };
}

function applySpacingUpdate(
  children: OrderedXmlNode[],
  update: {
    changed: boolean;
    action: "none" | "insert" | "replace" | "remove";
    replacement: OrderedXmlNode | null;
  },
  spacingName: "a:spcBef" | "a:spcAft"
): void {
  if (!update.changed) {
    return;
  }

  const spacingIndex = findSpacingNodeIndex(children, spacingName);
  if (update.action === "remove") {
    if (spacingIndex !== -1) {
      children.splice(spacingIndex, 1);
    }
    return;
  }

  if (!update.replacement) {
    return;
  }

  if (update.action === "replace") {
    if (spacingIndex !== -1) {
      children[spacingIndex] = update.replacement;
    }
    return;
  }

  if (update.action === "insert") {
    const insertIndex = resolveSpacingInsertIndex(children, spacingName);
    children.splice(insertIndex, 0, update.replacement);
  }
}

function findSpacingNodeIndex(
  children: OrderedXmlNode[],
  spacingName: "a:spcBef" | "a:spcAft"
): number {
  return children.findIndex((child) => Object.prototype.hasOwnProperty.call(child, spacingName));
}

function resolveSpacingInsertIndex(
  children: OrderedXmlNode[],
  spacingName: "a:spcBef" | "a:spcAft"
): number {
  const anchorNames =
    spacingName === "a:spcBef"
      ? ["a:spcAft", "a:lnSpc"]
      : ["a:lnSpc"];

  const anchorIndex = children.findIndex((child) => {
    const childName = getOrderedXmlNodeName(child);
    return childName ? anchorNames.includes(childName) : false;
  });

  return anchorIndex === -1 ? children.length : anchorIndex;
}

function getOrCreateParagraphProperties(paragraphNode: OrderedXmlNode): OrderedXmlNode {
  const existing = findChildElements(paragraphNode, "a:pPr")[0];
  if (existing) {
    return existing;
  }

  const children = getElementChildren(paragraphNode);
  const paragraphProperties: OrderedXmlNode = { "a:pPr": [] };
  children.unshift(paragraphProperties);
  return paragraphProperties;
}

function removeParagraphProperties(
  paragraphNode: OrderedXmlNode,
  paragraphProperties: OrderedXmlNode
): void {
  const children = getElementChildren(paragraphNode);
  const index = children.indexOf(paragraphProperties);
  if (index !== -1) {
    children.splice(index, 1);
  }
}

function spacingNodesEqual(
  spacingNode: OrderedXmlNode,
  expectedValue: RawSpacingValue,
  spacingName: "a:spcBef" | "a:spcAft"
): boolean {
  const container = findChildElements(spacingNode, spacingName)[0];
  if (!container) {
    return false;
  }

  const actual = extractRawSpacingValue(container);
  return actual?.kind === expectedValue.kind && actual.rawVal === expectedValue.rawVal;
}

function buildSpacingNode(
  spacingName: "a:spcBef" | "a:spcAft",
  value: RawSpacingValue
): OrderedXmlNode {
  const childName = value.kind === "pts" ? "a:spcPts" : "a:spcPct";

  return {
    [spacingName]: [
      {
        [childName]: [],
        ":@": {
          "@_val": value.rawVal
        }
      }
    ]
  };
}

function getOrderedXmlNodeName(node: OrderedXmlNode): string | null {
  return Object.keys(node).find((key) => key !== ":@") ?? null;
}

function summarizeChangedParagraphs(
  changedParagraphs: Map<string, number>
): ChangedParagraphSpacingSummary[] {
  return [...changedParagraphs.entries()]
    .map(([key, count]) => {
      const [slide, fromBefore, fromAfter, toBefore, toAfter] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        fromBefore,
        fromAfter,
        toBefore,
        toAfter,
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (left.fromBefore !== right.fromBefore) {
        return left.fromBefore.localeCompare(right.fromBefore);
      }

      if (left.fromAfter !== right.fromAfter) {
        return left.fromAfter.localeCompare(right.fromAfter);
      }

      if (left.toBefore !== right.toBefore) {
        return left.toBefore.localeCompare(right.toBefore);
      }

      return left.toAfter.localeCompare(right.toAfter);
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

function getElementName(node: OrderedXmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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

function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
