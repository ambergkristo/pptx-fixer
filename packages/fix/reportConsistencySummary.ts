import type { DeckQaSummary } from "../audit/deckQaSummary.ts";
import type { BrandScoreImprovementSummary } from "./brandScoreImprovementSummary.ts";
import type { CleanupOutcomeSummary } from "./cleanupOutcomeSummary.ts";
import type { DeckReadinessSummary } from "./deckReadinessSummary.ts";
import type { RecommendedActionSummary } from "./recommendedActionSummary.ts";
import type { RemainingIssuesSummary } from "./remainingIssuesSummary.ts";

export type ReportConsistencyLabel =
  | "consistent"
  | "minorMismatch"
  | "inconsistent";

export type ReportConsistencyFlag =
  | "readinessWithoutImprovement"
  | "readinessWithRemainingHighIssues"
  | "noRemainingIssuesButManualReview"
  | "manualReviewDespiteNoRemainingIssues"
  | "improvementWithoutOutcomeSignal";

export interface ReportConsistencySummary {
  consistencyLabel: ReportConsistencyLabel;
  consistencyFlags: ReportConsistencyFlag[];
  summaryLine: string;
}

export function summarizeReportConsistencySummary(input: {
  cleanupOutcomeSummary: CleanupOutcomeSummary;
  recommendedActionSummary: RecommendedActionSummary;
  brandScoreImprovementSummary: BrandScoreImprovementSummary;
  remainingIssuesSummary: RemainingIssuesSummary;
  deckReadinessSummary: DeckReadinessSummary;
  deckQaSummary: DeckQaSummary;
}): ReportConsistencySummary {
  const consistencyFlags = summarizeConsistencyFlags(input);
  const consistencyLabel = summarizeConsistencyLabel(consistencyFlags.length);

  return {
    consistencyLabel,
    consistencyFlags,
    summaryLine: summarizeSummaryLine(consistencyLabel)
  };
}

function summarizeConsistencyFlags(input: {
  cleanupOutcomeSummary: CleanupOutcomeSummary;
  recommendedActionSummary: RecommendedActionSummary;
  brandScoreImprovementSummary: BrandScoreImprovementSummary;
  remainingIssuesSummary: RemainingIssuesSummary;
  deckReadinessSummary: DeckReadinessSummary;
  deckQaSummary: DeckQaSummary;
}): ReportConsistencyFlag[] {
  const flags: ReportConsistencyFlag[] = [];
  const isPositiveReadiness =
    input.deckReadinessSummary.readinessLabel === "ready" ||
    input.deckReadinessSummary.readinessLabel === "mostlyReady";
  const hasImprovement =
    input.brandScoreImprovementSummary.improvementLabel === "minor" ||
    input.brandScoreImprovementSummary.improvementLabel === "moderate" ||
    input.brandScoreImprovementSummary.improvementLabel === "major";

  if (isPositiveReadiness && input.brandScoreImprovementSummary.improvementLabel === "none") {
    flags.push("readinessWithoutImprovement");
  }

  if (
    isPositiveReadiness &&
    input.remainingIssuesSummary.remainingSeverityLabel === "high"
  ) {
    flags.push("readinessWithRemainingHighIssues");
  }

  if (
    input.remainingIssuesSummary.remainingSeverityLabel === "none" &&
    input.recommendedActionSummary.primaryAction === "manual_attention"
  ) {
    flags.push("noRemainingIssuesButManualReview");
  }

  if (
    input.remainingIssuesSummary.remainingSeverityLabel === "none" &&
    input.deckReadinessSummary.readinessLabel === "manualReviewRecommended"
  ) {
    flags.push("manualReviewDespiteNoRemainingIssues");
  }

  // Flag E is intentionally skipped. cleanupOutcomeSummary does not expose a dedicated,
  // stable machine-readable "cleanup improved something" signal beyond coarse totals/summary.
  // Per milestone instructions, do not infer this by parsing text or guessing semantics.
  void hasImprovement;

  return flags;
}

function summarizeConsistencyLabel(flagCount: number): ReportConsistencyLabel {
  if (flagCount === 0) {
    return "consistent";
  }

  if (flagCount === 1) {
    return "minorMismatch";
  }

  return "inconsistent";
}

function summarizeSummaryLine(
  consistencyLabel: ReportConsistencyLabel
): string {
  if (consistencyLabel === "consistent") {
    return "Report outputs are internally consistent.";
  }

  if (consistencyLabel === "minorMismatch") {
    return "Report outputs are mostly consistent, with one detected mismatch.";
  }

  return "Report outputs contain multiple detected mismatches.";
}
