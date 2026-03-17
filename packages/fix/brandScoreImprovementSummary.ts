import type { DeckQaSummary } from "../audit/deckQaSummary.ts";
import type { FixVerificationSummary } from "./runAllFixes.ts";

export type BrandScoreImprovementLabel = "none" | "minor" | "moderate" | "major";

export interface BrandScoreImprovementSummary {
  brandScoreBefore: number;
  brandScoreAfter: number;
  scoreDelta: number;
  improvementLabel: BrandScoreImprovementLabel;
  summaryLine: string;
}

export function summarizeBrandScoreImprovementSummary(input: {
  verification: FixVerificationSummary;
  deckQaSummary?: DeckQaSummary;
  postFixBrandScore?: number | null;
}): BrandScoreImprovementSummary {
  const brandScoreBefore = summarizeBrandScoreFromDrift({
    fontDriftCount: input.verification.fontDriftBefore,
    fontSizeDriftCount: input.verification.fontSizeDriftBefore,
    spacingDriftCount: input.verification.spacingDriftBefore,
    bulletIndentDriftCount: input.verification.bulletIndentDriftBefore,
    alignmentDriftCount: input.verification.alignmentDriftBefore,
    lineSpacingDriftCount: input.verification.lineSpacingDriftBefore
  });
  const brandScoreAfter = input.postFixBrandScore ?? summarizeBrandScoreFromDrift({
    fontDriftCount: input.verification.fontDriftAfter ?? 0,
    fontSizeDriftCount: input.verification.fontSizeDriftAfter ?? 0,
    spacingDriftCount: input.verification.spacingDriftAfter ?? 0,
    bulletIndentDriftCount: input.verification.bulletIndentDriftAfter ?? 0,
    alignmentDriftCount: input.verification.alignmentDriftAfter ?? 0,
    lineSpacingDriftCount: input.verification.lineSpacingDriftAfter ?? 0
  });
  const scoreDelta = brandScoreAfter - brandScoreBefore;
  const improvementLabel = summarizeImprovementLabel(scoreDelta);

  return {
    brandScoreBefore,
    brandScoreAfter,
    scoreDelta,
    improvementLabel,
    summaryLine: summarizeSummaryLine(improvementLabel)
  };
}

function summarizeBrandScoreFromDrift(input: {
  fontDriftCount: number;
  fontSizeDriftCount: number;
  spacingDriftCount: number;
  bulletIndentDriftCount: number;
  alignmentDriftCount: number;
  lineSpacingDriftCount: number;
}): number {
  const penalty =
    input.fontDriftCount +
    input.fontSizeDriftCount +
    input.spacingDriftCount +
    (input.bulletIndentDriftCount * 2) +
    input.alignmentDriftCount +
    input.lineSpacingDriftCount;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function summarizeImprovementLabel(scoreDelta: number): BrandScoreImprovementLabel {
  if (scoreDelta <= 0) {
    return "none";
  }

  if (scoreDelta <= 9) {
    return "minor";
  }

  if (scoreDelta <= 24) {
    return "moderate";
  }

  return "major";
}

function summarizeSummaryLine(
  improvementLabel: BrandScoreImprovementLabel
): string {
  if (improvementLabel === "none") {
    return "Cleanup did not improve the overall brand score.";
  }

  if (improvementLabel === "minor") {
    return "Cleanup produced a small brand consistency improvement.";
  }

  if (improvementLabel === "moderate") {
    return "Cleanup produced a clear brand consistency improvement.";
  }

  return "Cleanup produced a major brand consistency improvement.";
}
