import type { IssueCategory, IssueCategorySummaryEntry } from "./issueCategorySummary.ts";
import type { RecommendedActionSummary } from "./recommendedActionSummary.ts";
import type { RemainingIssuesSummary } from "./remainingIssuesSummary.ts";

export type CategoryReductionDeckBoundary =
  | "eligibleCleanupBoundary"
  | "manualReviewBoundary";

export interface CategoryReductionReportingSummary {
  cleanCategories: IssueCategory[];
  resolvedCategories: IssueCategory[];
  partiallyReducedCategories: IssueCategory[];
  unchangedCategories: IssueCategory[];
  deckBoundary: CategoryReductionDeckBoundary;
  claimScope: "deckSpecificReductionOnly";
  closureClaimBlocked: true;
  runtimeReportOnlyLabelAvailable: false;
  summaryLine:
    | "Category reduction reporting is limited to deck-specific reduction on the current eligible-cleanup boundary; it does not imply category closure."
    | "Category reduction reporting is limited to deck-specific reduction on the current manual-review boundary; it does not imply category closure.";
}

export function summarizeCategoryReductionReportingSummary(input: {
  issueCategorySummary: IssueCategorySummaryEntry[];
  remainingIssuesSummary: RemainingIssuesSummary;
  recommendedActionSummary: RecommendedActionSummary;
}): CategoryReductionReportingSummary {
  const cleanCategories = collectCategories(input.issueCategorySummary, (entry) => entry.status === "clean");
  const resolvedCategories = collectCategories(
    input.issueCategorySummary,
    (entry) => entry.fixed > 0 && entry.remaining === 0
  );
  const partiallyReducedCategories = collectCategories(
    input.issueCategorySummary,
    (entry) => entry.fixed > 0 && entry.remaining > 0
  );
  const unchangedCategories = collectCategories(
    input.issueCategorySummary,
    (entry) => entry.detectedBefore > 0 && entry.fixed === 0
  );
  const deckBoundary = summarizeDeckBoundary({
    remainingIssuesSummary: input.remainingIssuesSummary,
    recommendedActionSummary: input.recommendedActionSummary
  });

  return {
    cleanCategories,
    resolvedCategories,
    partiallyReducedCategories,
    unchangedCategories,
    deckBoundary,
    claimScope: "deckSpecificReductionOnly",
    closureClaimBlocked: true,
    runtimeReportOnlyLabelAvailable: false,
    summaryLine: deckBoundary === "eligibleCleanupBoundary"
      ? "Category reduction reporting is limited to deck-specific reduction on the current eligible-cleanup boundary; it does not imply category closure."
      : "Category reduction reporting is limited to deck-specific reduction on the current manual-review boundary; it does not imply category closure."
  };
}

function summarizeDeckBoundary(input: {
  remainingIssuesSummary: RemainingIssuesSummary;
  recommendedActionSummary: RecommendedActionSummary;
}): CategoryReductionDeckBoundary {
  if (input.recommendedActionSummary.primaryAction === "manual_attention") {
    return "manualReviewBoundary";
  }

  if (
    input.remainingIssuesSummary.remainingSeverityLabel === "moderate" ||
    input.remainingIssuesSummary.remainingSeverityLabel === "high"
  ) {
    return "manualReviewBoundary";
  }

  return "eligibleCleanupBoundary";
}

function collectCategories(
  issueCategorySummary: IssueCategorySummaryEntry[],
  predicate: (entry: IssueCategorySummaryEntry) => boolean
): IssueCategory[] {
  return issueCategorySummary
    .filter(predicate)
    .map((entry) => entry.category);
}
