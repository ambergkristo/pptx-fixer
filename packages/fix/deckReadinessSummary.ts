import type { DeckQaSummary } from "../audit/deckQaSummary.ts";
import type { BrandScoreImprovementSummary } from "./brandScoreImprovementSummary.ts";
import type { CategoryReductionReportingSummary } from "./categoryReductionReportingSummary.ts";
import type { CleanupOutcomeSummary } from "./cleanupOutcomeSummary.ts";
import type { RecommendedActionSummary } from "./recommendedActionSummary.ts";
import type { RemainingIssuesSummary } from "./remainingIssuesSummary.ts";

export type DeckReadinessLabel =
  | "ready"
  | "mostlyReady"
  | "manualReviewRecommended";

export type DeckReadinessReason =
  | "noRemainingIssues"
  | "minorRemainingIssues"
  | "unresolvedFormattingRisk"
  | "cleanupDidNotImprove"
  | "manualActionStillNeeded";

export interface DeckReadinessSummary {
  readinessLabel: DeckReadinessLabel;
  readinessReason: DeckReadinessReason;
  summaryLine: string;
}

export function summarizeDeckReadinessSummary(input: {
  cleanupOutcomeSummary: CleanupOutcomeSummary;
  recommendedActionSummary: RecommendedActionSummary;
  brandScoreImprovementSummary: BrandScoreImprovementSummary;
  remainingIssuesSummary: RemainingIssuesSummary;
  categoryReductionReportingSummary: CategoryReductionReportingSummary;
  deckQaSummary: DeckQaSummary;
}): DeckReadinessSummary {
  const { readinessLabel, readinessReason } = summarizeClassification(input);

  return {
    readinessLabel,
    readinessReason,
    summaryLine: summarizeSummaryLine(readinessLabel, readinessReason)
  };
}

function summarizeClassification(input: {
  recommendedActionSummary: RecommendedActionSummary;
  brandScoreImprovementSummary: BrandScoreImprovementSummary;
  remainingIssuesSummary: RemainingIssuesSummary;
  categoryReductionReportingSummary: CategoryReductionReportingSummary;
  cleanupOutcomeSummary: CleanupOutcomeSummary;
  deckQaSummary: DeckQaSummary;
}): Pick<DeckReadinessSummary, "readinessLabel" | "readinessReason"> {
  const hasMeaningfulCategoryReduction =
    input.categoryReductionReportingSummary.resolvedCategories.length > 0 ||
    input.categoryReductionReportingSummary.partiallyReducedCategories.length > 0;

  if (input.categoryReductionReportingSummary.deckBoundary === "manualReviewBoundary") {
    return {
      readinessLabel: "manualReviewRecommended",
      readinessReason: input.recommendedActionSummary.primaryAction === "manual_attention"
        ? "manualActionStillNeeded"
        : "unresolvedFormattingRisk"
    };
  }

  if (input.remainingIssuesSummary.remainingSeverityLabel === "none") {
    return {
      readinessLabel: "ready",
      readinessReason: "noRemainingIssues"
    };
  }

  if (
    input.remainingIssuesSummary.remainingSeverityLabel === "low" &&
    input.brandScoreImprovementSummary.improvementLabel !== "none" &&
    hasMeaningfulCategoryReduction
  ) {
    return {
      readinessLabel: "mostlyReady",
      readinessReason: "minorRemainingIssues"
    };
  }

  if (input.recommendedActionSummary.primaryAction === "manual_attention") {
    return {
      readinessLabel: "manualReviewRecommended",
      readinessReason: "manualActionStillNeeded"
    };
  }

  if (input.brandScoreImprovementSummary.improvementLabel === "none") {
    return {
      readinessLabel: "manualReviewRecommended",
      readinessReason: "cleanupDidNotImprove"
    };
  }

  return {
    readinessLabel: "manualReviewRecommended",
    readinessReason: "unresolvedFormattingRisk"
  };
}

function summarizeSummaryLine(
  readinessLabel: DeckReadinessLabel,
  readinessReason: DeckReadinessReason
): string {
  if (readinessLabel === "ready" && readinessReason === "noRemainingIssues") {
    return "This deck appears ready after cleanup with no remaining formatting issues detected.";
  }

  if (
    readinessLabel === "mostlyReady" &&
    readinessReason === "minorRemainingIssues"
  ) {
    return "This deck appears mostly ready after cleanup, with only minor remaining formatting issues.";
  }

  if (
    readinessLabel === "manualReviewRecommended" &&
    readinessReason === "manualActionStillNeeded"
  ) {
    return "This deck still requires manual review after cleanup.";
  }

  if (
    readinessLabel === "manualReviewRecommended" &&
    readinessReason === "cleanupDidNotImprove"
  ) {
    return "This deck requires manual review because cleanup did not improve the overall result.";
  }

  return "This deck requires manual review because unresolved formatting issues remain after cleanup.";
}
