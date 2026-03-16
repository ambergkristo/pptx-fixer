import type { ParagraphGroupDescriptor, ParagraphGroupSummary } from "./slideStructureAudit.ts";

export function summarizeParagraphGroupMapping(
  group: ParagraphGroupDescriptor
): ParagraphGroupSummary {
  const startParagraphIndex = group.paragraphs[0]?.shapeParagraphIndex ?? 0;
  const endParagraphIndex = group.paragraphs[group.paragraphs.length - 1]?.shapeParagraphIndex ?? -1;
  const paragraphCount = group.paragraphs.length;

  if (paragraphCount !== endParagraphIndex - startParagraphIndex + 1) {
    throw new Error("Paragraph group mapping is inconsistent.");
  }

  return {
    type: group.type,
    paragraphCount,
    startParagraphIndex,
    endParagraphIndex
  };
}

export function attachParagraphGroupMappings(
  groups: ParagraphGroupDescriptor[]
): ParagraphGroupSummary[] {
  return groups.map(summarizeParagraphGroupMapping);
}
