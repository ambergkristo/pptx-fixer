import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { AuditReport, LoadedPresentation } from "../audit/pptxAudit.ts";
import type { TextRole } from "../audit/textRoleAudit.ts";
import type { ChangedParagraphSpacingSummary } from "./spacingFix.ts";
import type { ChangedLineSpacingSummary } from "./lineSpacingFix.ts";
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
  paragraphProperties?: OrderedXmlNode;
}

interface RawSpacingValue {
  kind: "pts" | "pct";
  rawVal: string;
  display: string;
}

interface ExplicitLineSpacingValue {
  kind: "pts" | "pct";
  rawVal: string;
  display: string;
}

interface RoleParagraphSpacingProfile {
  before: RawSpacingValue | null;
  after: RawSpacingValue | null;
  signature: string;
}

export interface RoleBasedParagraphSpacingFixReport {
  applied: boolean;
  changedParagraphs: ChangedParagraphSpacingSummary[];
  skipped: Array<{ reason: string }>;
}

export interface RoleBasedLineSpacingFixReport {
  applied: boolean;
  changedParagraphs: ChangedLineSpacingSummary[];
  skipped: Array<{ reason: string }>;
}

export interface RoleBasedSpacingResidualSummary {
  spacingDriftCount: number;
  lineSpacingDriftCount: number;
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

const NORMALIZE_SPACING_ROLES = new Set<TextRole>([
  "title",
  "section_title",
  "subtitle"
]);

export async function applyRoleBasedParagraphSpacingFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<RoleBasedParagraphSpacingFixReport> {
  const profiles = summarizeRoleParagraphSpacingProfiles(auditReport);
  if (Object.keys(profiles).length === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [{ reason: "no role paragraph spacing profile" }]
    };
  }

  const changedParagraphs = new Map<string, number>();
  let totalChangedParagraphs = 0;

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
    const changedInSlide = normalizeSlideRoleParagraphSpacing(
      parsedSlide,
      slideAudit,
      profiles,
      changedParagraphs
    );
    totalChangedParagraphs += changedInSlide;

    if (changedInSlide === 0) {
      continue;
    }

    assertSlideXmlSafety(originalSlide, parsedSlide, slide.index);
    assertSlideTextFidelity(originalSlide, parsedSlide, slide.index);
    archive.file(slide.archivePath, xmlBuilder.build(parsedSlide));
  }

  if (totalChangedParagraphs === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [{ reason: "no eligible role paragraph spacing changes" }]
    };
  }

  return {
    applied: true,
    changedParagraphs: summarizeChangedParagraphSpacing(changedParagraphs),
    skipped: []
  };
}

export async function applyRoleBasedLineSpacingFixToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport
): Promise<RoleBasedLineSpacingFixReport> {
  const profiles = summarizeRoleLineSpacingProfiles(auditReport);
  if (Object.keys(profiles).length === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [{ reason: "no role line spacing profile" }]
    };
  }

  const changedParagraphs = new Map<string, number>();
  let totalChangedParagraphs = 0;

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
    const changedInSlide = normalizeSlideRoleLineSpacing(
      parsedSlide,
      slideAudit,
      profiles,
      changedParagraphs
    );
    totalChangedParagraphs += changedInSlide;

    if (changedInSlide === 0) {
      continue;
    }

    assertSlideXmlSafety(originalSlide, parsedSlide, slide.index);
    assertSlideTextFidelity(originalSlide, parsedSlide, slide.index);
    archive.file(slide.archivePath, xmlBuilder.build(parsedSlide));
  }

  if (totalChangedParagraphs === 0) {
    return {
      applied: false,
      changedParagraphs: [],
      skipped: [{ reason: "no eligible role line spacing changes" }]
    };
  }

  return {
    applied: true,
    changedParagraphs: summarizeChangedLineSpacing(changedParagraphs),
    skipped: []
  };
}

export function summarizeRoleBasedSpacingResidual(
  auditReport: AuditReport
): RoleBasedSpacingResidualSummary {
  const paragraphProfiles = summarizeRoleParagraphSpacingProfiles(auditReport);
  const lineProfiles = summarizeRoleLineSpacingProfiles(auditReport);
  let spacingDriftCount = 0;
  let lineSpacingDriftCount = 0;

  for (const slide of auditReport.slides) {
    const pairCount = Math.min(slide.paragraphGroups.length, slide.textRoleSummary.groups.length);
    for (let index = 0; index < pairCount; index += 1) {
      const role = slide.textRoleSummary.groups[index]?.role;
      if (!role || !NORMALIZE_SPACING_ROLES.has(role)) {
        continue;
      }

      const paragraphGroup = slide.paragraphGroups[index];
      const paragraphProfile = paragraphProfiles[role];
      if (
        paragraphProfile &&
        buildSpacingSignature(
          paragraphGroup.styleSignature.spacingBefore,
          paragraphGroup.styleSignature.spacingAfter
        ) !== paragraphProfile.signature
      ) {
        spacingDriftCount += paragraphGroup.paragraphCount;
      }

      const lineProfile = lineProfiles[role];
      const currentLineSpacing = paragraphGroup.styleSignature.lineSpacing;
      if (
        lineProfile &&
        currentLineSpacing &&
        serializeLineSpacing(currentLineSpacing) !== lineProfile.display
      ) {
        lineSpacingDriftCount += paragraphGroup.paragraphCount;
      }
    }
  }

  return {
    spacingDriftCount,
    lineSpacingDriftCount
  };
}

function normalizeSlideRoleParagraphSpacing(
  slideXml: OrderedXmlDocument,
  slideAudit: AuditReport["slides"][number],
  profiles: Partial<Record<TextRole, RoleParagraphSpacingProfile>>,
  changedParagraphs: Map<string, number>
): number {
  const paragraphReferencesByShape = collectSlideParagraphsByShape(slideXml);
  const mappedGroups = mapParagraphGroupsByRange(paragraphReferencesByShape, slideAudit.paragraphGroups);
  if (!mappedGroups) {
    return 0;
  }

  let changedCount = 0;

  for (let index = 0; index < slideAudit.paragraphGroups.length; index += 1) {
    const role = slideAudit.textRoleSummary.groups[index]?.role;
    if (!role || !NORMALIZE_SPACING_ROLES.has(role)) {
      continue;
    }

    const profile = profiles[role];
    if (!profile) {
      continue;
    }

    const paragraphGroup = slideAudit.paragraphGroups[index];
    const currentSignature = buildSpacingSignature(
      paragraphGroup.styleSignature.spacingBefore,
      paragraphGroup.styleSignature.spacingAfter
    );
    if (currentSignature === profile.signature) {
      continue;
    }

    changedCount += applyParagraphSpacingChange(
      mappedGroups[index] ?? [],
      slideAudit.index,
      paragraphGroup.styleSignature.spacingBefore ?? "inherit",
      paragraphGroup.styleSignature.spacingAfter ?? "inherit",
      profile,
      changedParagraphs
    );
  }

  return changedCount;
}

function normalizeSlideRoleLineSpacing(
  slideXml: OrderedXmlDocument,
  slideAudit: AuditReport["slides"][number],
  profiles: Partial<Record<TextRole, ExplicitLineSpacingValue>>,
  changedParagraphs: Map<string, number>
): number {
  const paragraphReferencesByShape = collectSlideParagraphsByShape(slideXml);
  const mappedGroups = mapParagraphGroupsByRange(paragraphReferencesByShape, slideAudit.paragraphGroups);
  if (!mappedGroups) {
    return 0;
  }

  let changedCount = 0;

  for (let index = 0; index < slideAudit.paragraphGroups.length; index += 1) {
    const role = slideAudit.textRoleSummary.groups[index]?.role;
    if (!role || !NORMALIZE_SPACING_ROLES.has(role)) {
      continue;
    }

    const profile = profiles[role];
    if (!profile) {
      continue;
    }

    const paragraphGroup = slideAudit.paragraphGroups[index];
    const currentLineSpacing = paragraphGroup.styleSignature.lineSpacing;
    if (!currentLineSpacing || serializeLineSpacing(currentLineSpacing) === profile.display) {
      continue;
    }

    changedCount += applyLineSpacingChange(
      mappedGroups[index] ?? [],
      slideAudit.index,
      serializeLineSpacing(currentLineSpacing),
      profile,
      changedParagraphs
    );
  }

  return changedCount;
}

function summarizeRoleParagraphSpacingProfiles(
  auditReport: AuditReport
): Partial<Record<TextRole, RoleParagraphSpacingProfile>> {
  const signaturesByRole = new Map<TextRole, RoleParagraphSpacingProfile[]>();

  for (const slide of auditReport.slides) {
    const pairCount = Math.min(slide.paragraphGroups.length, slide.textRoleSummary.groups.length);
    for (let index = 0; index < pairCount; index += 1) {
      const role = slide.textRoleSummary.groups[index]?.role;
      const paragraphGroup = slide.paragraphGroups[index];
      if (!role || !NORMALIZE_SPACING_ROLES.has(role)) {
        continue;
      }

      const spacingBefore = parseSpacingDisplay(paragraphGroup.styleSignature.spacingBefore);
      const spacingAfter = parseSpacingDisplay(paragraphGroup.styleSignature.spacingAfter);
      if (spacingBefore === null && spacingAfter === null) {
        continue;
      }

      const signatures = signaturesByRole.get(role) ?? [];
      signatures.push({
        before: spacingBefore,
        after: spacingAfter,
        signature: buildSpacingSignature(paragraphGroup.styleSignature.spacingBefore, paragraphGroup.styleSignature.spacingAfter)
      });
      signaturesByRole.set(role, signatures);
    }
  }

  const profiles: Partial<Record<TextRole, RoleParagraphSpacingProfile>> = {};
  for (const role of NORMALIZE_SPACING_ROLES) {
    const profile = pickDominantRoleValue(
      signaturesByRole.get(role) ?? [],
      (value) => value.signature
    );
    if (profile) {
      profiles[role] = profile;
    }
  }

  return profiles;
}

function summarizeRoleLineSpacingProfiles(
  auditReport: AuditReport
): Partial<Record<TextRole, ExplicitLineSpacingValue>> {
  const valuesByRole = new Map<TextRole, ExplicitLineSpacingValue[]>();

  for (const slide of auditReport.slides) {
    const pairCount = Math.min(slide.paragraphGroups.length, slide.textRoleSummary.groups.length);
    for (let index = 0; index < pairCount; index += 1) {
      const role = slide.textRoleSummary.groups[index]?.role;
      const paragraphGroup = slide.paragraphGroups[index];
      if (!role || !NORMALIZE_SPACING_ROLES.has(role)) {
        continue;
      }

      const lineSpacing = paragraphGroup.styleSignature.lineSpacing;
      if (!lineSpacing) {
        continue;
      }

      const values = valuesByRole.get(role) ?? [];
      values.push({
        kind: lineSpacing.kind,
        rawVal: lineSpacing.kind === "spcPts"
          ? Math.round((lineSpacing.value ?? 0) * 100).toString()
          : Math.round((lineSpacing.value ?? 0) * 1000).toString(),
        display: serializeLineSpacing(lineSpacing)
      });
      valuesByRole.set(role, values);
    }
  }

  const profiles: Partial<Record<TextRole, ExplicitLineSpacingValue>> = {};
  for (const role of NORMALIZE_SPACING_ROLES) {
    const profile = pickDominantRoleValue(valuesByRole.get(role) ?? [], (value) => `${value.kind}:${value.display}`);
    if (profile) {
      profiles[role] = profile;
    }
  }

  return profiles;
}

function pickDominantRoleValue<T>(values: T[], serialize: (value: T) => string): T | null {
  if (values.length < 2) {
    return null;
  }

  const counts = new Map<string, { count: number; value: T }>();
  for (const value of values) {
    const key = serialize(value);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(key, { count: 1, value });
  }

  const ranked = [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return serialize(left.value).localeCompare(serialize(right.value));
  });

  const winner = ranked[0];
  const runnerUp = ranked[1];
  if (!winner || winner.count < 2) {
    return null;
  }

  if (runnerUp && runnerUp.count === winner.count) {
    return null;
  }

  return winner.value;
}

function applyParagraphSpacingChange(
  paragraphs: SlideParagraphReference[],
  slideIndex: number,
  fromBefore: string,
  fromAfter: string,
  profile: RoleParagraphSpacingProfile,
  changedParagraphs: Map<string, number>
): number {
  if (paragraphs.length === 0) {
    return 0;
  }

  let changedCount = 0;
  for (const paragraph of paragraphs) {
    const updated = updateParagraphSpacing(
      paragraph.paragraphNode,
      paragraph.paragraphProperties,
      profile.before,
      profile.after
    );
    paragraph.paragraphProperties = paragraph.paragraphProperties ?? findChildElements(paragraph.paragraphNode, "a:pPr")[0];
    if (!updated) {
      continue;
    }

    changedCount += 1;
  }

  if (changedCount === 0) {
    return 0;
  }

  const key = [
    slideIndex,
    fromBefore,
    fromAfter,
    profile.before?.display ?? "inherit",
    profile.after?.display ?? "inherit"
  ].join("::");
  changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + changedCount);
  return changedCount;
}

function applyLineSpacingChange(
  paragraphs: SlideParagraphReference[],
  slideIndex: number,
  fromLineSpacing: string,
  targetValue: ExplicitLineSpacingValue,
  changedParagraphs: Map<string, number>
): number {
  if (paragraphs.length === 0) {
    return 0;
  }

  let changedCount = 0;
  for (const paragraph of paragraphs) {
    const lineSpacingNode = upsertLineSpacingNode(paragraph, targetValue);
    if (!lineSpacingNode) {
      continue;
    }

    const updated = updateLineSpacingValue(lineSpacingNode, targetValue);
    if (!updated && !lineSpacingNodeWasInserted(paragraph, lineSpacingNode)) {
      continue;
    }

    changedCount += 1;
  }

  if (changedCount === 0) {
    return 0;
  }

  const key = `${slideIndex}::${fromLineSpacing}::${targetValue.display}`;
  changedParagraphs.set(key, (changedParagraphs.get(key) ?? 0) + changedCount);
  return changedCount;
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
        paragraphNode: paragraph,
        paragraphProperties: findChildElements(paragraph, "a:pPr")[0]
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

function summarizeChangedParagraphSpacing(changedParagraphs: Map<string, number>): ChangedParagraphSpacingSummary[] {
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

function summarizeChangedLineSpacing(changedParagraphs: Map<string, number>): ChangedLineSpacingSummary[] {
  return [...changedParagraphs.entries()]
    .map(([key, count]) => {
      const [slide, fromLineSpacing, toLineSpacing] = key.split("::");
      return {
        slide: Number.parseInt(slide, 10),
        fromLineSpacing,
        toLineSpacing,
        count
      };
    })
    .sort((left, right) => {
      if (left.slide !== right.slide) {
        return left.slide - right.slide;
      }

      if (left.fromLineSpacing !== right.fromLineSpacing) {
        return left.fromLineSpacing.localeCompare(right.fromLineSpacing);
      }

      return left.toLineSpacing.localeCompare(right.toLineSpacing);
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

function parseSpacingDisplay(value: string | null): RawSpacingValue | null {
  if (!value) {
    return null;
  }

  if (value.endsWith("pt")) {
    const numericValue = Number.parseFloat(value.slice(0, -2));
    if (Number.isNaN(numericValue)) {
      return null;
    }

    return {
      kind: "pts",
      rawVal: Math.round(numericValue * 100).toString(),
      display: value
    };
  }

  if (value.endsWith("%")) {
    const numericValue = Number.parseFloat(value.slice(0, -1));
    if (Number.isNaN(numericValue)) {
      return null;
    }

    return {
      kind: "pct",
      rawVal: Math.round(numericValue * 1000).toString(),
      display: value
    };
  }

  return null;
}

function buildSpacingSignature(before: string | null, after: string | null): string {
  return `${before ?? "inherit"}|${after ?? "inherit"}`;
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
    action: "none" | "insert" | "replace" | "remove";
    replacement: OrderedXmlNode | null;
  },
  spacingName: "a:spcBef" | "a:spcAft"
): void {
  if (update.action === "none") {
    return;
  }

  const existingIndex = children.findIndex((child) => Object.prototype.hasOwnProperty.call(child, spacingName));
  if (update.action === "remove") {
    if (existingIndex !== -1) {
      children.splice(existingIndex, 1);
    }
    return;
  }

  if (update.action === "replace") {
    if (existingIndex !== -1 && update.replacement) {
      children.splice(existingIndex, 1, update.replacement);
    }
    return;
  }

  if (update.action === "insert" && update.replacement) {
    const insertIndex = resolveSpacingInsertIndex(children, spacingName);
    children.splice(insertIndex, 0, update.replacement);
  }
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

function buildSpacingNode(
  spacingName: "a:spcBef" | "a:spcAft",
  value: RawSpacingValue
): OrderedXmlNode {
  return {
    [spacingName]: [
      {
        [value.kind === "pts" ? "a:spcPts" : "a:spcPct"]: [],
        ":@": {
          "@_val": value.rawVal
        }
      }
    ]
  };
}

function spacingNodesEqual(
  spacingNode: OrderedXmlNode,
  value: RawSpacingValue,
  spacingName: "a:spcBef" | "a:spcAft"
): boolean {
  const container = findChildElements(spacingNode, spacingName)[0];
  if (!container) {
    return false;
  }

  const node = findChildElements(container, value.kind === "pts" ? "a:spcPts" : "a:spcPct")[0];
  if (!node) {
    return false;
  }

  return stringValue(getAttributes(node)["@_val"]) === value.rawVal;
}

function upsertLineSpacingNode(
  paragraph: SlideParagraphReference,
  targetValue: ExplicitLineSpacingValue
): OrderedXmlNode | null {
  const paragraphProperties = paragraph.paragraphProperties ?? getOrCreateParagraphProperties(paragraph.paragraphNode);
  paragraph.paragraphProperties = paragraphProperties;
  const existingLineSpacingNode = findChildElements(paragraphProperties, "a:lnSpc")[0];
  if (existingLineSpacingNode) {
    return existingLineSpacingNode;
  }

  const children = getElementChildren(paragraphProperties);
  const lineSpacingNode = buildLineSpacingNode(targetValue);
  const insertIndex = resolveLineSpacingInsertIndex(children);
  children.splice(insertIndex, 0, lineSpacingNode);
  return lineSpacingNode;
}

function lineSpacingNodeWasInserted(
  paragraph: SlideParagraphReference,
  lineSpacingNode: OrderedXmlNode
): boolean {
  return findChildElements(paragraph.paragraphProperties ?? {}, "a:lnSpc")[0] === lineSpacingNode &&
    findChildElements(lineSpacingNode, targetValueKindNodeName(lineSpacingNode))[0] !== undefined;
}

function updateLineSpacingValue(
  lineSpacingNode: OrderedXmlNode,
  targetValue: ExplicitLineSpacingValue
): boolean {
  const childName = targetValue.kind === "pts" ? "a:spcPts" : "a:spcPct";
  const childNode = findChildElements(lineSpacingNode, childName)[0];
  if (!childNode) {
    return false;
  }

  const attributes = getAttributes(childNode);
  const currentValue = stringValue(attributes["@_val"]);
  if (!currentValue || currentValue === targetValue.rawVal) {
    return false;
  }

  attributes["@_val"] = targetValue.rawVal;
  return true;
}

function buildLineSpacingNode(targetValue: ExplicitLineSpacingValue): OrderedXmlNode {
  const childName = targetValue.kind === "pts" ? "a:spcPts" : "a:spcPct";

  return {
    "a:lnSpc": [
      {
        [childName]: [
          {
            ":@": {
              "@_val": targetValue.rawVal
            }
          }
        ]
      }
    ]
  };
}

function resolveLineSpacingInsertIndex(children: OrderedXmlNode[]): number {
  const afterIndex = children.findIndex((child) => Object.prototype.hasOwnProperty.call(child, "a:spcAft"));
  if (afterIndex !== -1) {
    return afterIndex + 1;
  }

  const beforeIndex = children.findIndex((child) => Object.prototype.hasOwnProperty.call(child, "a:spcBef"));
  return beforeIndex !== -1 ? beforeIndex + 1 : 0;
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

function serializeLineSpacing(
  value: { kind: "spcPct" | "spcPts" | null; value: number | null }
): string {
  if (value.kind === "spcPts") {
    return `${formatMetricValue(value.value ?? 0)}pt`;
  }

  return `${formatMetricValue(value.value ?? 0)}%`;
}

function getOrderedXmlNodeName(node: OrderedXmlNode): string | null {
  return Object.keys(node).find((key) => key !== ":@") ?? null;
}

function targetValueKindNodeName(lineSpacingNode: OrderedXmlNode): "a:spcPts" | "a:spcPct" {
  return findChildElements(lineSpacingNode, "a:spcPts")[0] ? "a:spcPts" : "a:spcPct";
}

function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
