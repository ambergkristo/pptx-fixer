export type ParagraphGroupType = "title" | "body" | "bulletList" | "standalone";

export interface ParagraphGroupSummary {
  type: ParagraphGroupType;
  paragraphCount: number;
  startParagraphIndex: number;
  endParagraphIndex: number;
}

export interface SlideStructureParagraphDescriptor {
  shape: number;
  shapeParagraphIndex: number;
  slideParagraphIndex?: number | null;
  isTitle: boolean;
  isBullet: boolean;
  bulletLevel: number | null;
  fontFamily: string | null;
  fontSize: number | null;
  spacingBefore: string | null;
  spacingAfter: string | null;
  lineSpacing: string | null;
  lineSpacingKind: "spcPct" | "spcPts" | null;
  lineSpacingValue: number | null;
  alignment: string | null;
}

export interface ParagraphGroupDescriptor {
  type: ParagraphGroupType;
  paragraphs: SlideStructureParagraphDescriptor[];
}

export function summarizeParagraphGroups(
  paragraphs: SlideStructureParagraphDescriptor[]
): ParagraphGroupSummary[] {
  return groupParagraphs(paragraphs).map((group) => ({
    type: group.type,
    paragraphCount: group.paragraphs.length,
    startParagraphIndex: group.paragraphs[0]?.shapeParagraphIndex ?? 0,
    endParagraphIndex: group.paragraphs[group.paragraphs.length - 1]?.shapeParagraphIndex ?? -1
  }));
}

export function groupParagraphs(
  paragraphs: SlideStructureParagraphDescriptor[]
): ParagraphGroupDescriptor[] {
  const groups: ParagraphGroupDescriptor[] = [];
  let index = 0;

  while (index < paragraphs.length) {
    const shape = paragraphs[index].shape;
    const shapeParagraphs: SlideStructureParagraphDescriptor[] = [];

    while (index < paragraphs.length && paragraphs[index].shape === shape) {
      shapeParagraphs.push(paragraphs[index]);
      index += 1;
    }

    groups.push(...summarizeShapeParagraphGroups(shapeParagraphs));
  }

  return groups;
}

function summarizeShapeParagraphGroups(
  paragraphs: SlideStructureParagraphDescriptor[]
): ParagraphGroupDescriptor[] {
  if (paragraphs.length === 0) {
    return [];
  }

  if (paragraphs.every((paragraph) => paragraph.isTitle)) {
    return [{
      type: "title",
      paragraphs
    }];
  }

  const groups: ParagraphGroupDescriptor[] = [];
  let index = 0;

  while (index < paragraphs.length) {
    const paragraph = paragraphs[index];

    if (paragraph.isTitle) {
      let titleCount = 1;
      index += 1;
      while (index < paragraphs.length && paragraphs[index].isTitle) {
        titleCount += 1;
        index += 1;
      }

      groups.push({
        type: "title",
        paragraphs: paragraphs.slice(index - titleCount, index)
      });
      continue;
    }

    if (paragraph.isBullet) {
      const startIndex = index;
      index += 1;
      while (index < paragraphs.length && paragraphs[index].isBullet) {
        index += 1;
      }

      groups.push({
        type: "bulletList",
        paragraphs: paragraphs.slice(startIndex, index)
      });
      continue;
    }

    const nonBulletRun: SlideStructureParagraphDescriptor[] = [paragraph];
    index += 1;
    while (index < paragraphs.length && !paragraphs[index].isTitle && !paragraphs[index].isBullet) {
      nonBulletRun.push(paragraphs[index]);
      index += 1;
    }

    groups.push(...summarizeNonBulletRun(nonBulletRun));
  }

  return groups;
}

function summarizeNonBulletRun(
  paragraphs: SlideStructureParagraphDescriptor[]
): ParagraphGroupDescriptor[] {
  const groups: ParagraphGroupDescriptor[] = [];
  let index = 0;

  while (index < paragraphs.length) {
    const startIndex = index;
    const signature = structureSignature(paragraphs[index]);
    let runLength = 1;
    index += 1;

    while (index < paragraphs.length && structureSignature(paragraphs[index]) === signature) {
      runLength += 1;
      index += 1;
    }

    groups.push({
      type: runLength > 1 ? "body" : "standalone",
      paragraphs: paragraphs.slice(startIndex, index)
    });
  }

  return groups;
}

function structureSignature(paragraph: SlideStructureParagraphDescriptor): string {
  return [
    paragraph.spacingBefore ?? "inherit",
    paragraph.spacingAfter ?? "inherit",
    paragraph.lineSpacing ?? "inherit",
    paragraph.alignment ?? "inherit"
  ].join("|");
}
