import {
  groupParagraphs,
  type ParagraphGroupDescriptor,
  type SlideStructureParagraphDescriptor
} from "../audit/slideStructureAudit.ts";
import { summarizeStyleSignature } from "../audit/styleSignatureAudit.ts";
import {
  findChildElements,
  getAttributes,
  getElementChildren,
  type OrderedXmlNode
} from "./textFidelity.ts";

export interface ShapeFontNormalizationGuard {
  protectedFontFamilyParagraphIndexes: Set<number>;
  protectedFontSizeParagraphIndexes: Set<number>;
}

export function paragraphHasVisibleText(paragraph: OrderedXmlNode): boolean {
  return extractParagraphText(paragraph).length > 0;
}

export function summarizeShapeFontNormalizationGuard(
  shape: OrderedXmlNode
): ShapeFontNormalizationGuard {
  const paragraphDescriptors = extractStructureParagraphs(shape);
  const paragraphGroups = groupParagraphs(paragraphDescriptors);
  const contentGroups = paragraphGroups.filter((group) => group.type !== "title");

  if (
    contentGroups.length <= 1 &&
    !contentGroups.some((group) => hasRepeatedCompetingFontFamilyRoles(group))
  ) {
    return emptyGuard();
  }

  const protectedFontFamilyParagraphIndexes = new Set<number>();
  const protectedFontSizeParagraphIndexes = new Set<number>();

  for (const group of contentGroups) {
    const styleSignature = summarizeStyleSignature(group);
    const preserveStandaloneHierarchy = group.type === "standalone";

    if (preserveStandaloneHierarchy) {
      addParagraphIndexes(protectedFontFamilyParagraphIndexes, group.paragraphs);
      addParagraphIndexes(protectedFontSizeParagraphIndexes, group.paragraphs);
      continue;
    }

    if (styleSignature.fontFamily === null && hasRepeatedCompetingFontFamilyRoles(group)) {
      addParagraphIndexes(protectedFontFamilyParagraphIndexes, group.paragraphs);
    }

    if (styleSignature.fontSize === null) {
      addParagraphIndexes(protectedFontSizeParagraphIndexes, group.paragraphs);
    }
  }

  return {
    protectedFontFamilyParagraphIndexes,
    protectedFontSizeParagraphIndexes
  };
}

function emptyGuard(): ShapeFontNormalizationGuard {
  return {
    protectedFontFamilyParagraphIndexes: new Set<number>(),
    protectedFontSizeParagraphIndexes: new Set<number>()
  };
}

function addParagraphIndexes(
  target: Set<number>,
  paragraphs: SlideStructureParagraphDescriptor[]
): void {
  for (const paragraph of paragraphs) {
    target.add(paragraph.shapeParagraphIndex);
  }
}

function extractStructureParagraphs(shape: OrderedXmlNode): SlideStructureParagraphDescriptor[] {
  const paragraphs = findChildElements(findChildElements(shape, "p:txBody")[0] ?? {}, "a:p");
  const descriptors: SlideStructureParagraphDescriptor[] = [];
  let shapeParagraphIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphText = extractParagraphText(paragraph);
    if (!paragraphText) {
      continue;
    }

    const properties = findChildElements(paragraph, "a:pPr")[0];
    const explicitLineSpacing = extractExplicitLineSpacingValue(findChildElements(properties ?? {}, "a:lnSpc")[0]);

    descriptors.push({
      shape: 1,
      shapeParagraphIndex,
      slideParagraphIndex: null,
      isTitle: false,
      isBullet: isBulletParagraph(properties),
      bulletLevel: numericValue(getAttributes(properties ?? {})["@_lvl"]),
      fontFamily: extractParagraphFontFamily(paragraph),
      fontSize: extractParagraphFontSize(paragraph),
      spacingBefore: extractSpacingValue(findChildElements(properties ?? {}, "a:spcBef")[0])?.display ?? null,
      spacingAfter: extractSpacingValue(findChildElements(properties ?? {}, "a:spcAft")[0])?.display ?? null,
      lineSpacing: explicitLineSpacing?.display ?? null,
      lineSpacingKind: explicitLineSpacing?.kind ?? null,
      lineSpacingValue: explicitLineSpacing?.value ?? null,
      alignment: normalizeAlignmentValue(stringValue(getAttributes(properties ?? {})["@_algn"]))
    });
    shapeParagraphIndex += 1;
  }

  return descriptors;
}

function hasRepeatedCompetingFontFamilyRoles(group: ParagraphGroupDescriptor): boolean {
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

function extractParagraphText(paragraph: OrderedXmlNode): string {
  const texts: string[] = [];

  for (const child of getElementChildren(paragraph)) {
    if (!isTextRunNode(child)) {
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

function isTextRunNode(node: OrderedXmlNode): boolean {
  const elementName = getElementName(node);
  return elementName === "a:r" || elementName === "a:fld";
}

function getElementName(node: OrderedXmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text");
}

function extractParagraphFontFamily(paragraph: OrderedXmlNode): string | null {
  const runs = findChildElementsInOrder(paragraph, "a:r");
  if (runs.length === 0) {
    return null;
  }

  const fontFamilies = runs.map((run) => extractRunFontFamily(run));
  if (fontFamilies.some((fontFamily) => fontFamily === null)) {
    return null;
  }

  const distinctFamilies = new Set(fontFamilies);
  return distinctFamilies.size === 1 ? fontFamilies[0] : null;
}

function extractRunFontFamily(run: OrderedXmlNode): string | null {
  return extractExplicitFontFamily(findChildElements(run, "a:rPr")[0] ?? {}) ?? null;
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

function extractParagraphFontSize(paragraph: OrderedXmlNode): number | null {
  const runs = findChildElementsInOrder(paragraph, "a:r");
  if (runs.length === 0) {
    return null;
  }

  const fontSizes = runs.map((run) => {
    const size = extractExplicitSizePt(findChildElements(run, "a:rPr")[0] ?? {});
    return size === null ? null : size;
  });

  if (fontSizes.some((fontSize) => fontSize === null)) {
    return null;
  }

  const distinctSizes = new Set(fontSizes);
  return distinctSizes.size === 1 ? fontSizes[0] : null;
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

function extractSpacingValue(spacingNode: OrderedXmlNode | undefined): NormalizedSpacingValue | null {
  const pointValue = numericValue(getAttributes(findChildElements(spacingNode ?? {}, "a:spcPts")[0] ?? {})["@_val"]);
  if (pointValue !== null) {
    const spacingPt = Number.parseFloat((pointValue / 100).toFixed(2));
    return {
      unit: "pt",
      value: spacingPt,
      display: `${formatMetricValue(spacingPt)}pt`
    };
  }

  const percentValue = numericValue(getAttributes(findChildElements(spacingNode ?? {}, "a:spcPct")[0] ?? {})["@_val"]);
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
  spacingNode: OrderedXmlNode | undefined
): ExplicitLineSpacingValue | null {
  const pointValue = numericValue(getAttributes(findChildElements(spacingNode ?? {}, "a:spcPts")[0] ?? {})["@_val"]);
  if (pointValue !== null) {
    const spacingPt = Number.parseFloat((pointValue / 100).toFixed(2));
    return {
      kind: "spcPts",
      value: spacingPt,
      display: `${formatMetricValue(spacingPt)}pt`
    };
  }

  const percentValue = numericValue(getAttributes(findChildElements(spacingNode ?? {}, "a:spcPct")[0] ?? {})["@_val"]);
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

function isBulletParagraph(paragraphProperties: OrderedXmlNode | undefined): boolean {
  if (!paragraphProperties || findChildElements(paragraphProperties, "a:buNone").length > 0) {
    return false;
  }

  if (numericValue(getAttributes(paragraphProperties)["@_lvl"]) !== null) {
    return true;
  }

  return [
    "a:buChar",
    "a:buAutoNum",
    "a:buBlip",
    "a:buClr",
    "a:buClrTx",
    "a:buFont",
    "a:buFontTx",
    "a:buSzPct",
    "a:buSzPts",
    "a:buSzTx"
  ].some((childName) => findChildElements(paragraphProperties, childName).length > 0);
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

function findChildElementsInOrder(node: OrderedXmlNode, childName: string): OrderedXmlNode[] {
  return getElementChildren(node).filter((child) => Object.prototype.hasOwnProperty.call(child, childName));
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toPointSize(openXmlSize: number): number {
  return Number.parseFloat((openXmlSize / 100).toString());
}

function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\\.?0+$/, "");
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
