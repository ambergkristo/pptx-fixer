import type { DeckReadinessSummary } from "./deckReadinessSummary.ts";
import type { IssueCategory, IssueCategorySummaryEntry } from "./issueCategorySummary.ts";

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
  deckReadinessSummary: DeckReadinessSummary;
}): CategoryReductionReportingSummary {
  const deckBoundary = input.deckReadinessSummary.readinessLabel === "manualReviewRecommended"
    ? "manualReviewBoundary"
    : "eligibleCleanupBoundary";

  return {
    cleanCategories: collectCategories(input.issueCategorySummary, (entry) => entry.status === "clean"),
    resolvedCategories: collectCategories(
      input.issueCategorySummary,
      (entry) => entry.fixed > 0 && entry.remaining === 0
    ),
    partiallyReducedCategories: collectCategories(
      input.issueCategorySummary,
      (entry) => entry.fixed > 0 && entry.remaining > 0
    ),
    unchangedCategories: collectCategories(
      input.issueCategorySummary,
      (entry) => entry.detectedBefore > 0 && entry.fixed === 0
    ),
    deckBoundary,
    claimScope: "deckSpecificReductionOnly",
    closureClaimBlocked: true,
    runtimeReportOnlyLabelAvailable: false,
    summaryLine: deckBoundary === "eligibleCleanupBoundary"
      ? "Category reduction reporting is limited to deck-specific reduction on the current eligible-cleanup boundary; it does not imply category closure."
      : "Category reduction reporting is limited to deck-specific reduction on the current manual-review boundary; it does not imply category closure."
  };
}

function collectCategories(
  issueCategorySummary: IssueCategorySummaryEntry[],
  predicate: (entry: IssueCategorySummaryEntry) => boolean
): IssueCategory[] {
  return issueCategorySummary
    .filter(predicate)
    .map((entry) => entry.category);
}
