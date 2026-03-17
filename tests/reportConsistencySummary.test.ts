import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeReportConsistencySummary } from "../packages/fix/reportConsistencySummary.ts";

test("returns consistent when no flags are present", () => {
  const summary = summarizeReportConsistencySummary(buildInput({}));

  assert.deepEqual(summary, {
    consistencyLabel: "consistent",
    consistencyFlags: [],
    summaryLine: "Report outputs are internally consistent."
  });
});

test("returns minorMismatch when exactly one flag is present", () => {
  const summary = summarizeReportConsistencySummary(buildInput({
    deckReadinessLabel: "ready",
    improvementLabel: "none"
  }));

  assert.deepEqual(summary, {
    consistencyLabel: "minorMismatch",
    consistencyFlags: [
      "readinessWithoutImprovement"
    ],
    summaryLine: "Report outputs are mostly consistent, with one detected mismatch."
  });
});

test("returns inconsistent when multiple flags are present", () => {
  const summary = summarizeReportConsistencySummary(buildInput({
    deckReadinessLabel: "mostlyReady",
    remainingSeverityLabel: "high",
    improvementLabel: "none"
  }));

  assert.deepEqual(summary, {
    consistencyLabel: "inconsistent",
    consistencyFlags: [
      "readinessWithoutImprovement",
      "readinessWithRemainingHighIssues"
    ],
    summaryLine: "Report outputs contain multiple detected mismatches."
  });
});

test("orders flags deterministically in the fixed rule order", () => {
  const summary = summarizeReportConsistencySummary(buildInput({
    deckReadinessLabel: "manualReviewRecommended",
    remainingSeverityLabel: "none",
    primaryAction: "manual_attention"
  }));

  assert.deepEqual(summary.consistencyFlags, [
    "noRemainingIssuesButManualReview",
    "manualReviewDespiteNoRemainingIssues"
  ]);
});

test("safely skips improvementWithoutOutcomeSignal without text parsing", () => {
  const summary = summarizeReportConsistencySummary(buildInput({
    improvementLabel: "major",
    cleanupTotalChanges: 0,
    cleanupSummaryLine: "No cleanup changes were applied."
  }));

  assert.deepEqual(summary.consistencyFlags, []);
});

test("is deterministic across repeated calls", () => {
  const input = buildInput({
    deckReadinessLabel: "ready",
    improvementLabel: "none"
  });

  assert.deepEqual(
    summarizeReportConsistencySummary(input),
    summarizeReportConsistencySummary(input)
  );
});

function buildInput(options: {
  deckReadinessLabel?: "ready" | "mostlyReady" | "manualReviewRecommended";
  remainingSeverityLabel?: "none" | "low" | "moderate" | "high";
  improvementLabel?: "none" | "minor" | "moderate" | "major";
  primaryAction?: "none" | "review" | "refine" | "manual_attention";
  cleanupTotalChanges?: number;
  cleanupSummaryLine?: string;
} = {}) {
  return {
    cleanupOutcomeSummary: {
      changedSlides: 1,
      totalChanges: options.cleanupTotalChanges ?? 1,
      appliedStages: ["fontFamilyFix"],
      remainingDrift: {
        fontDrift: 0,
        fontSizeDrift: 0,
        spacingDriftCount: 0,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 0,
        lineSpacingDriftCount: 0
      },
      summaryLine: options.cleanupSummaryLine ?? "Cleanup applied successfully with no remaining detected drift."
    },
    recommendedActionSummary: {
      primaryAction: options.primaryAction ?? "review",
      actionReason: "placeholder",
      focusAreas: []
    },
    brandScoreImprovementSummary: {
      brandScoreBefore: 90,
      brandScoreAfter: 95,
      scoreDelta: 5,
      improvementLabel: options.improvementLabel ?? "minor",
      summaryLine: "placeholder"
    },
    remainingIssuesSummary: {
      remainingIssueCount:
        options.remainingSeverityLabel === "none" || options.remainingSeverityLabel === undefined
          ? 0
          : options.remainingSeverityLabel === "low"
            ? 1
            : options.remainingSeverityLabel === "moderate"
              ? 2
              : 4,
      remainingSeverityLabel: options.remainingSeverityLabel ?? "none",
      topRemainingIssueCategories: [],
      summaryLine: "placeholder"
    },
    deckReadinessSummary: {
      readinessLabel: options.deckReadinessLabel ?? "ready",
      readinessReason:
        options.deckReadinessLabel === "manualReviewRecommended"
          ? "manualActionStillNeeded"
          : options.deckReadinessLabel === "mostlyReady"
            ? "minorRemainingIssues"
            : "noRemainingIssues",
      summaryLine: "placeholder"
    },
    deckQaSummary: {
      brandScore: 95,
      qualityLabel: "good" as const,
      summaryLine: "placeholder",
      keyIssues: [],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 1
      }
    }
  };
}
