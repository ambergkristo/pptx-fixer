import type { DominantBodyStyle } from "./dominantStyleAudit.ts";
import type { LineSpacingStyleSignature, ParagraphGroupWithStyleSignature, ParagraphGroupStyleSignature } from "./styleSignatureAudit.ts";

export interface CleanupCandidateSummary {
  eligible: boolean;
  reasons: string[];
}

export interface BodyParagraphGroupWithCleanupCandidate extends ParagraphGroupWithStyleSignature {
  cleanupCandidate?: CleanupCandidateSummary;
}

export function attachCleanupCandidates(
  groups: ParagraphGroupWithStyleSignature[],
  dominantBodyStyle: DominantBodyStyle
): BodyParagraphGroupWithCleanupCandidate[] {
  return groups.map((group) => {
    if (group.type !== "body") {
      return group;
    }

    return {
      ...group,
      cleanupCandidate: summarizeCleanupCandidate(group.styleSignature, dominantBodyStyle)
    };
  });
}

export function summarizeCleanupCandidate(
  styleSignature: ParagraphGroupStyleSignature,
  dominantBodyStyle: DominantBodyStyle
): CleanupCandidateSummary {
  const reasons: string[] = [];
  const hasDominantStyle = hasAnyDominantProperty(dominantBodyStyle);
  const hasComparableProperties = hasAnyComparableProperty(styleSignature, dominantBodyStyle);
  const hasAnyExplicitGroupProperty = hasAnyExplicitGroupPropertyValue(styleSignature);
  const lineSpacingKindMismatch = hasLineSpacingKindMismatch(styleSignature.lineSpacing, dominantBodyStyle.lineSpacing);
  const differsFromDominant = hasDifferingComparableProperty(styleSignature, dominantBodyStyle);

  if (!hasDominantStyle) {
    reasons.push("no_dominant_style");
  }

  if (styleSignature.bulletLevel !== null) {
    reasons.push("structurally_unsafe_body_group");
  }

  if (!hasAnyExplicitGroupProperty) {
    reasons.push("mixed_or_ambiguous_signature");
  }

  if (lineSpacingKindMismatch) {
    reasons.push("line_spacing_kind_mismatch");
  }

  if (!hasComparableProperties) {
    reasons.push("no_comparable_properties");
  } else if (!differsFromDominant) {
    reasons.push("matches_dominant_style");
  }

  if (differsFromDominant && hasComparableProperties && hasDominantStyle && !lineSpacingKindMismatch && styleSignature.bulletLevel === null) {
    reasons.push("body_group_differs_from_dominant");
  }

  return {
    eligible: reasons.length === 1 && reasons[0] === "body_group_differs_from_dominant",
    reasons
  };
}

function hasAnyDominantProperty(dominantBodyStyle: DominantBodyStyle): boolean {
  return dominantBodyStyle.fontFamily !== null ||
    dominantBodyStyle.fontSize !== null ||
    dominantBodyStyle.spacingBefore !== null ||
    dominantBodyStyle.spacingAfter !== null ||
    dominantBodyStyle.alignment !== null ||
    dominantBodyStyle.lineSpacing !== null;
}

function hasAnyExplicitGroupPropertyValue(styleSignature: ParagraphGroupStyleSignature): boolean {
  return styleSignature.fontFamily !== null ||
    styleSignature.fontSize !== null ||
    styleSignature.spacingBefore !== null ||
    styleSignature.spacingAfter !== null ||
    styleSignature.alignment !== null ||
    styleSignature.lineSpacing !== null;
}

function hasAnyComparableProperty(
  styleSignature: ParagraphGroupStyleSignature,
  dominantBodyStyle: DominantBodyStyle
): boolean {
  return comparableValues(styleSignature, dominantBodyStyle).length > 0;
}

function hasDifferingComparableProperty(
  styleSignature: ParagraphGroupStyleSignature,
  dominantBodyStyle: DominantBodyStyle
): boolean {
  return comparableValues(styleSignature, dominantBodyStyle).some(([groupValue, dominantValue]) => groupValue !== dominantValue);
}

function comparableValues(
  styleSignature: ParagraphGroupStyleSignature,
  dominantBodyStyle: DominantBodyStyle
): Array<[string, string]> {
  const values: Array<[string, string]> = [];

  if (styleSignature.fontFamily !== null && dominantBodyStyle.fontFamily !== null) {
    values.push([styleSignature.fontFamily, dominantBodyStyle.fontFamily]);
  }

  if (styleSignature.fontSize !== null && dominantBodyStyle.fontSize !== null) {
    values.push([styleSignature.fontSize.toString(), dominantBodyStyle.fontSize.toString()]);
  }

  const groupSpacingBefore = numericSpacingValue(styleSignature.spacingBefore);
  if (groupSpacingBefore !== null && dominantBodyStyle.spacingBefore !== null) {
    values.push([groupSpacingBefore.toString(), dominantBodyStyle.spacingBefore.toString()]);
  }

  const groupSpacingAfter = numericSpacingValue(styleSignature.spacingAfter);
  if (groupSpacingAfter !== null && dominantBodyStyle.spacingAfter !== null) {
    values.push([groupSpacingAfter.toString(), dominantBodyStyle.spacingAfter.toString()]);
  }

  if (styleSignature.alignment !== null && dominantBodyStyle.alignment !== null) {
    values.push([styleSignature.alignment, dominantBodyStyle.alignment]);
  }

  if (
    styleSignature.lineSpacing !== null &&
    dominantBodyStyle.lineSpacing !== null &&
    styleSignature.lineSpacing.kind === dominantBodyStyle.lineSpacing.kind
  ) {
    values.push([
      serializeLineSpacing(styleSignature.lineSpacing),
      serializeLineSpacing(dominantBodyStyle.lineSpacing)
    ]);
  }

  return values;
}

function hasLineSpacingKindMismatch(
  groupValue: LineSpacingStyleSignature | null,
  dominantValue: LineSpacingStyleSignature | null
): boolean {
  return groupValue !== null &&
    dominantValue !== null &&
    groupValue.kind !== dominantValue.kind;
}

function numericSpacingValue(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  return Number.parseFloat(match[0]);
}

function serializeLineSpacing(value: LineSpacingStyleSignature): string {
  return `${value.kind}:${value.value}`;
}
