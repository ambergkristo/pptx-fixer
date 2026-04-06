import type { DominantBodyStyle } from "./dominantStyleAudit.ts";
import type {
  ParagraphGroupDescriptor,
  ParagraphGroupType,
  SlideStructureParagraphDescriptor
} from "./slideStructureAudit.ts";

export type TextRole =
  | "title"
  | "section_title"
  | "subtitle"
  | "body"
  | "bullet_list"
  | "note"
  | "footer";

export interface TextRoleGroupSummary {
  role: TextRole;
  sourceGroupType: ParagraphGroupType;
  shape: number;
  paragraphCount: number;
  startParagraphIndex: number;
  endParagraphIndex: number;
  averageFontSize: number | null;
  alignment: string | null;
}

export interface SlideTextRoleSummary {
  groupCounts: Record<TextRole, number>;
  paragraphCounts: Record<TextRole, number>;
  groups: TextRoleGroupSummary[];
}

export interface DeckTextRoleSummary {
  groupCounts: Record<TextRole, number>;
  paragraphCounts: Record<TextRole, number>;
}

const TEXT_ROLES: TextRole[] = [
  "title",
  "section_title",
  "subtitle",
  "body",
  "bullet_list",
  "note",
  "footer"
];

export function summarizeSlideTextRoles(input: {
  paragraphGroups: ParagraphGroupDescriptor[];
  dominantBodyStyle: DominantBodyStyle;
}): SlideTextRoleSummary {
  const maxShape = Math.max(0, ...input.paragraphGroups.flatMap((group) => group.paragraphs.map((paragraph) => paragraph.shape)));
  const groups = input.paragraphGroups.map((group, index) => summarizeTextRoleGroup({
    group,
    groupIndex: index,
    maxShape,
    dominantBodyStyle: input.dominantBodyStyle
  }));

  const groupCounts = createEmptyRoleCounts();
  const paragraphCounts = createEmptyRoleCounts();

  for (const group of groups) {
    groupCounts[group.role] += 1;
    paragraphCounts[group.role] += group.paragraphCount;
  }

  return {
    groupCounts,
    paragraphCounts,
    groups
  };
}

export function summarizeDeckTextRoles(slides: SlideTextRoleSummary[]): DeckTextRoleSummary {
  const groupCounts = createEmptyRoleCounts();
  const paragraphCounts = createEmptyRoleCounts();

  for (const slide of slides) {
    for (const role of TEXT_ROLES) {
      groupCounts[role] += slide.groupCounts[role];
      paragraphCounts[role] += slide.paragraphCounts[role];
    }
  }

  return {
    groupCounts,
    paragraphCounts
  };
}

function summarizeTextRoleGroup(input: {
  group: ParagraphGroupDescriptor;
  groupIndex: number;
  maxShape: number;
  dominantBodyStyle: DominantBodyStyle;
}): TextRoleGroupSummary {
  const role = classifyTextRole(input);
  const firstParagraph = input.group.paragraphs[0];

  return {
    role,
    sourceGroupType: input.group.type,
    shape: firstParagraph?.shape ?? 0,
    paragraphCount: input.group.paragraphs.length,
    startParagraphIndex: firstParagraph?.shapeParagraphIndex ?? 0,
    endParagraphIndex: input.group.paragraphs[input.group.paragraphs.length - 1]?.shapeParagraphIndex ?? 0,
    averageFontSize: summarizeAverageFontSize(input.group.paragraphs),
    alignment: summarizeUniformAlignment(input.group.paragraphs)
  };
}

function classifyTextRole(input: {
  group: ParagraphGroupDescriptor;
  groupIndex: number;
  maxShape: number;
  dominantBodyStyle: DominantBodyStyle;
}): TextRole {
  const { group } = input;

  if (group.type === "title") {
    return "title";
  }

  if (group.type === "bulletList") {
    return "bullet_list";
  }

  if (isFooterGroup(input)) {
    return "footer";
  }

  if (isSectionTitleGroup(input)) {
    return "section_title";
  }

  if (isSubtitleGroup(input)) {
    return "subtitle";
  }

  if (isNoteGroup(input)) {
    return "note";
  }

  return "body";
}

function isFooterGroup(input: {
  group: ParagraphGroupDescriptor;
  maxShape: number;
  dominantBodyStyle: DominantBodyStyle;
}): boolean {
  const paragraphs = input.group.paragraphs;
  const firstParagraph = paragraphs[0];
  const dominantBodyFontSize = input.dominantBodyStyle.fontSize;
  const averageFontSize = summarizeAverageFontSize(paragraphs);
  const textLength = summarizeVisibleTextLength(paragraphs);

  if (!firstParagraph || firstParagraph.isBullet || paragraphs.length > 2) {
    return false;
  }

  if (firstParagraph.alignment === "center") {
    return false;
  }

  if (firstParagraph.shape < Math.max(2, input.maxShape - 1)) {
    return false;
  }

  if (textLength > 90) {
    return false;
  }

  if (dominantBodyFontSize !== null && averageFontSize !== null) {
    return averageFontSize < dominantBodyFontSize;
  }

  return averageFontSize !== null && averageFontSize <= 12;
}

function isSectionTitleGroup(input: {
  group: ParagraphGroupDescriptor;
  groupIndex: number;
  dominantBodyStyle: DominantBodyStyle;
}): boolean {
  const paragraphs = input.group.paragraphs;
  const firstParagraph = paragraphs[0];
  const averageFontSize = summarizeAverageFontSize(paragraphs);
  const dominantBodyFontSize = input.dominantBodyStyle.fontSize;
  const textLength = summarizeVisibleTextLength(paragraphs);

  if (!firstParagraph || firstParagraph.isBullet || paragraphs.length > 2) {
    return false;
  }

  if (firstParagraph.alignment !== null && firstParagraph.alignment !== "left") {
    return false;
  }

  if (textLength > 80) {
    return false;
  }

  if (dominantBodyFontSize !== null && averageFontSize !== null && averageFontSize >= dominantBodyFontSize + 2) {
    return true;
  }

  return input.groupIndex <= 1 && averageFontSize !== null && averageFontSize >= 18;
}

function isSubtitleGroup(input: {
  group: ParagraphGroupDescriptor;
  groupIndex: number;
  dominantBodyStyle: DominantBodyStyle;
}): boolean {
  const paragraphs = input.group.paragraphs;
  const firstParagraph = paragraphs[0];
  const averageFontSize = summarizeAverageFontSize(paragraphs);
  const dominantBodyFontSize = input.dominantBodyStyle.fontSize;
  const textLength = summarizeVisibleTextLength(paragraphs);

  if (!firstParagraph || firstParagraph.isBullet || paragraphs.length > 2) {
    return false;
  }

  if (input.groupIndex > 2) {
    return false;
  }

  if (firstParagraph.alignment !== null && firstParagraph.alignment !== "left") {
    return false;
  }

  if (textLength > 140) {
    return false;
  }

  if (dominantBodyFontSize !== null && averageFontSize !== null) {
    return averageFontSize > dominantBodyFontSize && averageFontSize < dominantBodyFontSize + 2;
  }

  return averageFontSize !== null && averageFontSize >= 14 && averageFontSize < 18;
}

function isNoteGroup(input: {
  group: ParagraphGroupDescriptor;
  dominantBodyStyle: DominantBodyStyle;
}): boolean {
  const paragraphs = input.group.paragraphs;
  const firstParagraph = paragraphs[0];
  const averageFontSize = summarizeAverageFontSize(paragraphs);
  const dominantBodyFontSize = input.dominantBodyStyle.fontSize;
  const textLength = summarizeVisibleTextLength(paragraphs);

  if (!firstParagraph || firstParagraph.isBullet) {
    return false;
  }

  if (paragraphs.length > 2) {
    return false;
  }

  if (firstParagraph.alignment !== null && firstParagraph.alignment !== "left") {
    return true;
  }

  if (dominantBodyFontSize !== null && averageFontSize !== null && averageFontSize < dominantBodyFontSize) {
    return textLength <= 140;
  }

  return false;
}

function summarizeAverageFontSize(paragraphs: SlideStructureParagraphDescriptor[]): number | null {
  const fontSizes = paragraphs
    .map((paragraph) => paragraph.fontSize)
    .filter((fontSize): fontSize is number => typeof fontSize === "number");

  if (fontSizes.length === 0) {
    return null;
  }

  return Number.parseFloat((fontSizes.reduce((sum, fontSize) => sum + fontSize, 0) / fontSizes.length).toFixed(2));
}

function summarizeUniformAlignment(paragraphs: SlideStructureParagraphDescriptor[]): string | null {
  const alignments = new Set(paragraphs.map((paragraph) => paragraph.alignment ?? "inherit"));
  return alignments.size === 1 ? paragraphs[0]?.alignment ?? null : null;
}

function summarizeVisibleTextLength(paragraphs: SlideStructureParagraphDescriptor[]): number {
  return paragraphs.reduce((total, paragraph) => total + paragraph.text.trim().length, 0);
}

function createEmptyRoleCounts(): Record<TextRole, number> {
  return {
    title: 0,
    section_title: 0,
    subtitle: 0,
    body: 0,
    bullet_list: 0,
    note: 0,
    footer: 0
  };
}
