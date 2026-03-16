export type ParagraphGroupType = "title" | "body" | "bulletList" | "standalone";

export interface ParagraphGroupSummary {
  type: ParagraphGroupType;
  paragraphCount: number;
}

export interface SlideStructureParagraphDescriptor {
  shape: number;
  isTitle: boolean;
  isBullet: boolean;
  bulletLevel: number | null;
  spacingBefore: string | null;
  spacingAfter: string | null;
  lineSpacing: string | null;
  alignment: string | null;
}

export function summarizeParagraphGroups(
  paragraphs: SlideStructureParagraphDescriptor[]
): ParagraphGroupSummary[] {
  const groups: ParagraphGroupSummary[] = [];
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
): ParagraphGroupSummary[] {
  if (paragraphs.length === 0) {
    return [];
  }

  if (paragraphs.every((paragraph) => paragraph.isTitle)) {
    return [{
      type: "title",
      paragraphCount: paragraphs.length
    }];
  }

  const groups: ParagraphGroupSummary[] = [];
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
        paragraphCount: titleCount
      });
      continue;
    }

    if (paragraph.isBullet) {
      let bulletCount = 1;
      index += 1;
      while (index < paragraphs.length && paragraphs[index].isBullet) {
        bulletCount += 1;
        index += 1;
      }

      groups.push({
        type: "bulletList",
        paragraphCount: bulletCount
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
): ParagraphGroupSummary[] {
  const groups: ParagraphGroupSummary[] = [];
  let index = 0;

  while (index < paragraphs.length) {
    const signature = structureSignature(paragraphs[index]);
    let runLength = 1;
    index += 1;

    while (index < paragraphs.length && structureSignature(paragraphs[index]) === signature) {
      runLength += 1;
      index += 1;
    }

    groups.push({
      type: runLength > 1 ? "body" : "standalone",
      paragraphCount: runLength
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
