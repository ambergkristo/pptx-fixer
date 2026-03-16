import type { CleanupCandidateSummary, BodyParagraphGroupWithCleanupCandidate } from "./cleanupCandidateAudit.ts";
import type { DominantBodyStyle } from "./dominantStyleAudit.ts";

export interface BodyParagraphGroupWithDominantFontCleanupCandidates extends BodyParagraphGroupWithCleanupCandidate {
  dominantFontFamilyCleanupCandidate?: CleanupCandidateSummary;
  dominantFontSizeCleanupCandidate?: CleanupCandidateSummary;
}

export function attachDominantFontCleanupCandidates(
  groups: BodyParagraphGroupWithCleanupCandidate[],
  dominantBodyStyle: DominantBodyStyle
): BodyParagraphGroupWithDominantFontCleanupCandidates[] {
  return groups.map((group) => {
    if (group.type !== "body") {
      return group;
    }

    return {
      ...group,
      dominantFontFamilyCleanupCandidate: summarizeDominantFontFamilyCleanupCandidate(
        group.styleSignature.fontFamily,
        dominantBodyStyle.fontFamily
      ),
      dominantFontSizeCleanupCandidate: summarizeDominantFontSizeCleanupCandidate(
        group.styleSignature.fontSize,
        dominantBodyStyle.fontSize
      )
    };
  });
}

export function summarizeDominantFontFamilyCleanupCandidate(
  groupFontFamily: string | null,
  dominantFontFamily: string | null
): CleanupCandidateSummary {
  return summarizePropertyCandidate(
    groupFontFamily,
    dominantFontFamily,
    "no_dominant_font_family",
    "no_group_font_family",
    "matches_dominant_font_family",
    "group_differs_from_dominant_font_family"
  );
}

export function summarizeDominantFontSizeCleanupCandidate(
  groupFontSize: number | null,
  dominantFontSize: number | null
): CleanupCandidateSummary {
  return summarizePropertyCandidate(
    groupFontSize,
    dominantFontSize,
    "no_dominant_font_size",
    "no_group_font_size",
    "matches_dominant_font_size",
    "group_differs_from_dominant_font_size"
  );
}

function summarizePropertyCandidate<T extends string | number>(
  groupValue: T | null,
  dominantValue: T | null,
  noDominantReason: string,
  noGroupReason: string,
  matchesReason: string,
  differsReason: string
): CleanupCandidateSummary {
  const reasons: string[] = [];

  if (dominantValue === null) {
    reasons.push(noDominantReason);
  }

  if (groupValue === null) {
    reasons.push(noGroupReason);
  } else if (dominantValue !== null) {
    reasons.push(groupValue === dominantValue ? matchesReason : differsReason);
  }

  return {
    eligible: reasons.length === 1 && reasons[0] === differsReason,
    reasons
  };
}
