import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { AuditReport, LoadedPresentation } from "../audit/pptxAudit.ts";
import type { TextRole } from "../audit/textRoleAudit.ts";
import type { ChangedFontRunSummary } from "./fontFamilyFix.ts";
import type { ChangedFontSizeRunSummary } from "./fontSizeFix.ts";
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

interface SlideParagraphReference {
  paragraphNode: OrderedXmlNode;
}

interface RoleTypographyProfile {
  fontFamily: string | null;
  fontSizePt: number | null;
}

export interface RoleBasedTypographyFixReport {
  applied: boolean;
  fontFamilyChangedRuns: ChangedFontRunSummary[];
  fontSizeChangedRuns: ChangedFontSizeRunSummary[];
  skipped: Array<{ reason: string }>;
}

export interface RoleBasedTypographyResidualSummary {
  fontFamilyDriftCount: number;
  fontSizeDriftCount: number;
}

export interface RoleBasedTypographyOptions {
  preferredFontFamily?: string | null;
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

const NORMALIZE_ELIGIBLE_ROLES = new Set<TextRole>([
  "title",
  "section_title",
  "subtitle",
  "body",
  "bullet_list"
]);

export async function applyRoleBasedTypographyFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport,
  options: RoleBasedTypographyOptions = {}
): Promise<RoleBasedTypographyFixReport> {
  const profiles = summarizeRoleTypographyProfiles(auditReport, options);
  if (Object.keys(profiles).length === 0) {
    return {
      applied: false,
      fontFamilyChangedRuns: [],
      fontSizeChangedRuns: [],
      skipped: [{ reason: "no role typography profile" }]
    };
  }

  const changedFontFamilyRuns = new Map<string, number>();
  const changedFontSizeRuns = new Map<string, number>();
  let totalChangedRuns = 0;

  for (const slide of presentation.slides) {
    const slideAudit = auditReport.slides.find((entry) => entry.index === slide.index);
    if (!slideAudit || slideAudit.paragraphGroups.length !== slideAudit.textRoleSummary.groups.length) {
      continue;
    }

    const entry = archive.file(slide.archivePath);
    if (!entry) {
      continue;
    }

    const slideXml = await entry.async("string");
    const parsedSlide = xmlParser.parse(slideXml) as OrderedXmlDocument;
    const originalSlide = structuredClone(parsedSlide);
    const changedInSlide = normalizeSlideRoleTypography(
      parsedSlide,
      slideAudit,
      profiles,
      changedFontFamilyRuns,
      changedFontSizeRuns
    );

    totalChangedRuns += changedInSlide;
    if (changedInSlide === 0) {
      continue;
    }

    assertSlideXmlSafety(originalSlide, parsedSlide, slide.index);
    assertSlideTextFidelity(originalSlide, parsedSlide, slide.index);
    archive.file(slide.archivePath, xmlBuilder.build(parsedSlide));
  }

  if (totalChangedRuns === 0) {
    return {
      applied: false,
      fontFamilyChangedRuns: [],
      fontSizeChangedRuns: [],
      skipped: [{ reason: "no eligible role typography changes" }]
    };
  }

  return {
    applied: true,
    fontFamilyChangedRuns: summarizeChangedFontRuns(changedFontFamilyRuns),
    fontSizeChangedRuns: summarizeChangedFontSizeRuns(changedFontSizeRuns),
    skipped: []
  };
}

export function summarizeRoleBasedTypographyResidual(
  auditReport: AuditReport,
  options: RoleBasedTypographyOptions = {}
): RoleBasedTypographyResidualSummary {
  const profiles = summarizeRoleTypographyProfiles(auditReport, options);
  let fontFamilyDriftCount = 0;
  let fontSizeDriftCount = 0;

  for (const slide of auditReport.slides) {
    const pairCount = Math.min(slide.paragraphGroups.length, slide.textRoleSummary.groups.length);
    for (let index = 0; index < pairCount; index += 1) {
      const role = slide.textRoleSummary.groups[index]?.role;
      const paragraphGroup = slide.paragraphGroups[index];
      if (!role || !NORMALIZE_ELIGIBLE_ROLES.has(role)) {
        continue;
      }

      const profile = profiles[role];
      if (!profile) {
        continue;
      }

      if (
        paragraphGroup.styleSignature.fontFamily !== null &&
        profile.fontFamily !== null &&
        paragraphGroup.styleSignature.fontFamily !== profile.fontFamily
      ) {
        fontFamilyDriftCount += paragraphGroup.paragraphCount;
      }

      if (
        paragraphGroup.styleSignature.fontSize !== null &&
        profile.fontSizePt !== null &&
        paragraphGroup.styleSignature.fontSize !== profile.fontSizePt
      ) {
        fontSizeDriftCount += paragraphGroup.paragraphCount;
      }
    }
  }

  return {
    fontFamilyDriftCount,
    fontSizeDriftCount
  };
}

function normalizeSlideRoleTypography(
  slideXml: OrderedXmlDocument,
  slideAudit: AuditReport["slides"][number],
  profiles: Partial<Record<TextRole, RoleTypographyProfile>>,
  changedFontFamilyRuns: Map<string, number>,
  changedFontSizeRuns: Map<string, number>
): number {
  const paragraphReferencesByShape = collectSlideParagraphsByShape(slideXml);
  const mappedGroups = mapParagraphGroupsByRange(paragraphReferencesByShape, slideAudit.paragraphGroups);
  if (!mappedGroups) {
    return 0;
  }

  let changedRuns = 0;

  for (let index = 0; index < slideAudit.paragraphGroups.length; index += 1) {
    const roleGroup = slideAudit.textRoleSummary.groups[index];
    if (!roleGroup || !NORMALIZE_ELIGIBLE_ROLES.has(roleGroup.role)) {
      continue;
    }

    const profile = profiles[roleGroup.role];
    if (!profile) {
      continue;
    }

    const paragraphGroup = slideAudit.paragraphGroups[index];
    const mappedParagraphs = mappedGroups[index];
    if (!mappedParagraphs || mappedParagraphs.length === 0) {
      continue;
    }

    if (
      paragraphGroup.styleSignature.fontFamily !== null &&
      profile.fontFamily !== null &&
      paragraphGroup.styleSignature.fontFamily !== profile.fontFamily
    ) {
      changedRuns += applyFontFamilyRoleChange(
        mappedParagraphs,
        slideAudit.index,
        paragraphGroup.styleSignature.fontFamily,
        profile.fontFamily,
        changedFontFamilyRuns
      );
    }

    if (
      paragraphGroup.styleSignature.fontSize !== null &&
      profile.fontSizePt !== null &&
      paragraphGroup.styleSignature.fontSize !== profile.fontSizePt
    ) {
      changedRuns += applyFontSizeRoleChange(
        mappedParagraphs,
        slideAudit.index,
        paragraphGroup.styleSignature.fontSize,
        profile.fontSizePt,
        changedFontSizeRuns
      );
    }
  }

  return changedRuns;
}

function summarizeRoleTypographyProfiles(
  auditReport: AuditReport,
  options: RoleBasedTypographyOptions = {}
): Partial<Record<TextRole, RoleTypographyProfile>> {
  const familiesByRole = new Map<TextRole, string[]>();
  const sizesByRole = new Map<TextRole, number[]>();
  const preferredFontFamily = normalizePreferredFontFamily(options.preferredFontFamily);

  for (const slide of auditReport.slides) {
    const pairCount = Math.min(slide.paragraphGroups.length, slide.textRoleSummary.groups.length);
    for (let index = 0; index < pairCount; index += 1) {
      const role = slide.textRoleSummary.groups[index]?.role;
      const paragraphGroup = slide.paragraphGroups[index];
      if (!role || !NORMALIZE_ELIGIBLE_ROLES.has(role)) {
        continue;
      }

      if (paragraphGroup.styleSignature.fontFamily !== null) {
        const families = familiesByRole.get(role) ?? [];
        families.push(paragraphGroup.styleSignature.fontFamily);
        familiesByRole.set(role, families);
      }

      if (paragraphGroup.styleSignature.fontSize !== null) {
        const sizes = sizesByRole.get(role) ?? [];
        sizes.push(paragraphGroup.styleSignature.fontSize);
        sizesByRole.set(role, sizes);
      }
    }
  }

  const profiles: Partial<Record<TextRole, RoleTypographyProfile>> = {};
  for (const role of NORMALIZE_ELIGIBLE_ROLES) {
    const fontFamily = preferredFontFamily ?? pickDominantRoleValue(familiesByRole.get(role) ?? []);
    const fontSizePt = pickDominantRoleValue(sizesByRole.get(role) ?? []);
    if (fontFamily === null && fontSizePt === null) {
      continue;
    }

    profiles[role] = {
      fontFamily,
      fontSizePt
    };
  }

  return profiles;
}

function normalizePreferredFontFamily(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function pickDominantRoleValue<T extends string | number>(values: T[]): T | null {
  if (values.length < 2) {
    return null;
  }

  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return String(left[0]).localeCompare(String(right[0]));
  });

  const winner = ranked[0];
  const runnerUp = ranked[1];
  if (!winner || winner[1] < 2) {
    return null;
  }

  if (runnerUp && runnerUp[1] === winner[1]) {
    return null;
  }

  return winner[0];
}

function applyFontFamilyRoleChange(
  paragraphs: SlideParagraphReference[],
  slideIndex: number,
  currentFontFamily: string,
  targetFontFamily: string,
  changedRuns: Map<string, number>
): number {
  const runProperties = collectParagraphRunProperties(paragraphs, "fontFamily");
  if (!runProperties || currentFontFamily === targetFontFamily) {
    return 0;
  }

  let changedRunCount = 0;
  for (const properties of runProperties) {
    const currentRunFontFamily = extractExplicitFontFamily(properties);
    if (!currentRunFontFamily || currentRunFontFamily === targetFontFamily) {
      continue;
    }

    if (!updateExplicitFontFamily(properties, targetFontFamily)) {
      return 0;
    }

    changedRunCount += 1;
  }

  if (changedRunCount === 0) {
    return 0;
  }

  const key = `${slideIndex}::${currentFontFamily}::${targetFontFamily}`;
  changedRuns.set(key, (changedRuns.get(key) ?? 0) + changedRunCount);
  return changedRunCount;
}

function applyFontSizeRoleChange(
  paragraphs: SlideParagraphReference[],
  slideIndex: number,
  currentSizePt: number,
  targetSizePt: number,
  changedRuns: Map<string, number>
): number {
  const runProperties = collectParagraphRunProperties(paragraphs, "fontSize");
  if (!runProperties || currentSizePt === targetSizePt) {
    return 0;
  }

  let changedRunCount = 0;
  for (const properties of runProperties) {
    const currentRunSizePt = extractExplicitSizePt(properties);
    if (currentRunSizePt === null || currentRunSizePt === targetSizePt) {
      continue;
    }

    if (!updateExplicitSize(properties, targetSizePt)) {
      return 0;
    }

    changedRunCount += 1;
  }

  if (changedRunCount === 0) {
    return 0;
  }

  const key = `${slideIndex}::${currentSizePt}::${targetSizePt}`;
  changedRuns.set(key, (changedRuns.get(key) ?? 0) + changedRunCount);
  return changedRunCount;
}

function collectParagraphRunProperties(
  paragraphs: SlideParagraphReference[],
  property: "fontFamily" | "fontSize"
): OrderedXmlNode[] | null {
  const runProperties: OrderedXmlNode[] = [];

  for (const paragraph of paragraphs) {
    for (const child of getElementChildren(paragraph.paragraphNode)) {
      const elementName = getElementName(child);
      if (elementName === "a:fld") {
        return null;
      }

      if (elementName !== "a:r") {
        continue;
      }

      const properties = findChildElements(child, "a:rPr")[0];
      if (!properties) {
        return null;
      }

      if (property === "fontFamily" && !hasUpdatableExplicitFontFamily(properties)) {
        return null;
      }

      if (property === "fontSize" && extractExplicitSizePt(properties) === null) {
        return null;
      }

      runProperties.push(properties);
    }
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
  paragraphGroups: AuditReport["slides"][number]["paragraphGroups"]
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

function summarizeChangedFontRuns(changedRuns: Map<string, number>): ChangedFontRunSummary[] {
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

function summarizeChangedFontSizeRuns(changedRuns: Map<string, number>): ChangedFontSizeRunSummary[] {
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

function getElementName(node: OrderedXmlNode): string | null {
  const keys = Object.keys(node);
  return keys.length === 1 ? keys[0] ?? null : null;
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

function updateExplicitFontFamily(runProperties: OrderedXmlNode, fontFamily: string): boolean {
  const attributes = getAttributes(runProperties);
  let updated = false;

  if (typeof attributes["@_typeface"] === "string") {
    attributes["@_typeface"] = fontFamily;
    updated = true;
  }

  updated = updateTypefaceNode(runProperties, "a:latin", fontFamily) || updated;
  updated = updateTypefaceNode(runProperties, "a:ea", fontFamily) || updated;
  updated = updateTypefaceNode(runProperties, "a:cs", fontFamily) || updated;
  updated = updateTypefaceNode(runProperties, "a:sym", fontFamily) || updated;

  return updated;
}

function updateTypefaceNode(
  runProperties: OrderedXmlNode,
  nodeName: string,
  fontFamily: string
): boolean {
  const typefaceNode = findChildElements(runProperties, nodeName)[0];
  const attributes = getAttributes(typefaceNode ?? {});
  if (!typefaceNode || typeof attributes["@_typeface"] !== "string") {
    return false;
  }

  attributes["@_typeface"] = fontFamily;
  return true;
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

function updateExplicitSize(runProperties: OrderedXmlNode, sizePt: number): boolean {
  const attributes = getAttributes(runProperties);
  if (attributes["@_sz"] === undefined) {
    return false;
  }

  attributes["@_sz"] = toOpenXmlSize(sizePt).toString();
  return true;
}

function toPointSize(openXmlSize: number): number {
  return Number.parseFloat((openXmlSize / 100).toString());
}

function toOpenXmlSize(sizePt: number): number {
  return Math.round(sizePt * 100);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
