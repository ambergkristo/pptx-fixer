import type {
  CategoryReductionDeckBoundary,
  CategoryReductionReportingSummary
} from "./categoryReductionReportingSummary.ts";
import type { DeckQaSummary } from "../audit/deckQaSummary.ts";
import type { FixVerificationSummary } from "./runAllFixes.ts";

export type BrandScoreImprovementLabel = "none" | "minor" | "moderate" | "major";
export type BrandScoreInterpretationLabel =
  | "noTrustedRuntimeImprovement"
  | "deckSpecificRuntimeImprovement"
  | "manualReviewConstrainedImprovement";

export interface BrandScoreImprovementSummary {
  brandScoreBefore: number;
  brandScoreAfter: number;
  scoreDelta: number;
  improvementLabel: BrandScoreImprovementLabel;
  scoreInterpretationLabel: BrandScoreInterpretationLabel;
  scoreInterpretationScope: "currentRuntimeEvidencedCategoriesOnly";
  deckBoundary: CategoryReductionDeckBoundary;
  trustedResolvedCategoryCount: number;
  trustedPartiallyReducedCategoryCount: number;
  fullBrandComplianceScoringAvailable: false;
  futureTaxonomyExcluded: true;
  summaryLine: string;
}

export function summarizeBrandScoreImprovementSummary(input: {
  verification: FixVerificationSummary;
  deckQaSummary?: DeckQaSummary;
  postFixBrandScore?: number | null;
  categoryReductionReportingSummary?: Pick<
    CategoryReductionReportingSummary,
    "deckBoundary" | "resolvedCategories" | "partiallyReducedCategories"
  >;
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
  const deckBoundary = input.categoryReductionReportingSummary?.deckBoundary ?? "eligibleCleanupBoundary";
  const trustedResolvedCategoryCount = input.categoryReductionReportingSummary?.resolvedCategories.length ?? 0;
  const trustedPartiallyReducedCategoryCount = input.categoryReductionReportingSummary?.partiallyReducedCategories.length ?? 0;
  const scoreInterpretationLabel = summarizeScoreInterpretationLabel({
    improvementLabel,
    deckBoundary,
    trustedResolvedCategoryCount,
    trustedPartiallyReducedCategoryCount
  });

  return {
    brandScoreBefore,
    brandScoreAfter,
    scoreDelta,
    improvementLabel,
    scoreInterpretationLabel,
    scoreInterpretationScope: "currentRuntimeEvidencedCategoriesOnly",
    deckBoundary,
    trustedResolvedCategoryCount,
    trustedPartiallyReducedCategoryCount,
    fullBrandComplianceScoringAvailable: false,
    futureTaxonomyExcluded: true,
    summaryLine: summarizeSummaryLine(scoreInterpretationLabel)
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

function summarizeScoreInterpretationLabel(input: {
  improvementLabel: BrandScoreImprovementLabel;
  deckBoundary: CategoryReductionDeckBoundary;
  trustedResolvedCategoryCount: number;
  trustedPartiallyReducedCategoryCount: number;
}): BrandScoreInterpretationLabel {
  const hasTrustedRuntimeReduction =
    input.trustedResolvedCategoryCount + input.trustedPartiallyReducedCategoryCount > 0;

  if (
    input.deckBoundary === "manualReviewBoundary" &&
    input.improvementLabel !== "none" &&
    hasTrustedRuntimeReduction
  ) {
    return "manualReviewConstrainedImprovement";
  }

  if (input.improvementLabel !== "none" && hasTrustedRuntimeReduction) {
    return "deckSpecificRuntimeImprovement";
  }

  return "noTrustedRuntimeImprovement";
}

function summarizeSummaryLine(
  scoreInterpretationLabel: BrandScoreInterpretationLabel
): string {
  if (scoreInterpretationLabel === "noTrustedRuntimeImprovement") {
    return "Brand score did not show trusted runtime-evidenced improvement; it is not a full brand compliance score.";
  }

  if (scoreInterpretationLabel === "deckSpecificRuntimeImprovement") {
    return "Brand score improvement is limited to current runtime-evidenced category reduction on this deck; it is not a full brand compliance score.";
  }

  return "Brand score improvement is limited to current runtime-evidenced category reduction on a manual-review-boundary deck; it is not a trusted brand compliance score.";
}
