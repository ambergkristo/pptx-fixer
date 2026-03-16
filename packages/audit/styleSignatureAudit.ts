import type { ParagraphGroupDescriptor, ParagraphGroupSummary } from "./slideStructureAudit.ts";

export interface LineSpacingStyleSignature {
  kind: "spcPct" | "spcPts" | null;
  value: number | null;
}

export interface ParagraphGroupStyleSignature {
  fontFamily: string | null;
  fontSize: number | null;
  spacingBefore: string | null;
  spacingAfter: string | null;
  alignment: string | null;
  lineSpacing: LineSpacingStyleSignature | null;
  bulletLevel: number | null;
}

export interface ParagraphGroupWithStyleSignature extends ParagraphGroupSummary {
  styleSignature: ParagraphGroupStyleSignature;
}

export function attachStyleSignatures(
  groups: ParagraphGroupDescriptor[]
): ParagraphGroupWithStyleSignature[] {
  return groups.map((group) => ({
    type: group.type,
    paragraphCount: group.paragraphs.length,
    styleSignature: summarizeStyleSignature(group)
  }));
}

export function summarizeStyleSignature(
  group: ParagraphGroupDescriptor
): ParagraphGroupStyleSignature {
  return {
    fontFamily: resolveUniformExplicitValue(group.paragraphs.map((paragraph) => paragraph.fontFamily)),
    fontSize: resolveUniformExplicitValue(group.paragraphs.map((paragraph) => paragraph.fontSize)),
    spacingBefore: resolveUniformExplicitValue(group.paragraphs.map((paragraph) => paragraph.spacingBefore)),
    spacingAfter: resolveUniformExplicitValue(group.paragraphs.map((paragraph) => paragraph.spacingAfter)),
    alignment: resolveUniformExplicitValue(group.paragraphs.map((paragraph) => paragraph.alignment)),
    lineSpacing: resolveUniformLineSpacing(group),
    bulletLevel: resolveBulletLevel(group)
  };
}

function resolveBulletLevel(group: ParagraphGroupDescriptor): number | null {
  if (group.type !== "bulletList") {
    return null;
  }

  return resolveUniformExplicitValue(group.paragraphs.map((paragraph) => paragraph.bulletLevel));
}

function resolveUniformLineSpacing(
  group: ParagraphGroupDescriptor
): LineSpacingStyleSignature | null {
  const lineSpacingValues = group.paragraphs.map((paragraph) => {
    if (paragraph.lineSpacingKind === null || paragraph.lineSpacingValue === null) {
      return null;
    }

    return {
      kind: paragraph.lineSpacingKind,
      value: paragraph.lineSpacingValue
    };
  });

  if (lineSpacingValues.some((value) => value === null)) {
    return null;
  }

  const distinctValues = new Set(
    lineSpacingValues.map((value) => `${value.kind}:${value.value}`)
  );

  if (distinctValues.size !== 1) {
    return null;
  }

  return lineSpacingValues[0];
}

function resolveUniformExplicitValue<T extends string | number>(
  values: Array<T | null>
): T | null {
  if (values.length === 0 || values.some((value) => value === null)) {
    return null;
  }

  const distinctValues = new Set(values);
  return distinctValues.size === 1 ? values[0] : null;
}
