import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeDeckReadinessSummary } from "../packages/fix/deckReadinessSummary.ts";

test("returns ready when no remaining issues remain", () => {
  const summary = summarizeDeckReadinessSummary(buildInput({
    remainingSeverityLabel: "none",
    improvementLabel: "minor",
    primaryAction: "review"
  }));

  assert.deepEqual(summary, {
    readinessLabel: "ready",
    readinessReason: "noRemainingIssues",
    summaryLine: "This deck appears ready after cleanup with no remaining formatting issues detected."
  });
});

test("returns mostlyReady when low remaining issues remain and improvement is positive", () => {
  const summary = summarizeDeckReadinessSummary(buildInput({
    remainingSeverityLabel: "low",
    improvementLabel: "moderate",
    primaryAction: "review"
  }));

  assert.deepEqual(summary, {
    readinessLabel: "mostlyReady",
    readinessReason: "minorRemainingIssues",
    summaryLine: "This deck appears mostly ready after cleanup, with only minor remaining formatting issues."
  });
});

test("returns manualReviewRecommended when manual attention is still recommended", () => {
  const summary = summarizeDeckReadinessSummary(buildInput({
    remainingSeverityLabel: "high",
    improvementLabel: "major",
    primaryAction: "manual_attention"
  }));

  assert.deepEqual(summary, {
    readinessLabel: "manualReviewRecommended",
    readinessReason: "manualActionStillNeeded",
    summaryLine: "This deck still requires manual review after cleanup."
  });
});

test("returns manualReviewRecommended when cleanup did not improve the result", () => {
  const summary = summarizeDeckReadinessSummary(buildInput({
    remainingSeverityLabel: "moderate",
    improvementLabel: "none",
    primaryAction: "review"
  }));

  assert.deepEqual(summary, {
    readinessLabel: "manualReviewRecommended",
    readinessReason: "cleanupDidNotImprove",
    summaryLine: "This deck requires manual review because cleanup did not improve the overall result."
  });
});

test("returns manualReviewRecommended with unresolved risk fallback", () => {
  const summary = summarizeDeckReadinessSummary(buildInput({
    remainingSeverityLabel: "moderate",
    improvementLabel: "minor",
    primaryAction: "refine"
  }));

  assert.deepEqual(summary, {
    readinessLabel: "manualReviewRecommended",
    readinessReason: "unresolvedFormattingRisk",
    summaryLine: "This deck requires manual review because unresolved formatting issues remain after cleanup."
  });
});

test("is deterministic across repeated calls", () => {
  const input = buildInput({
    remainingSeverityLabel: "low",
    improvementLabel: "minor",
    primaryAction: "review"
  });

  assert.deepEqual(
    summarizeDeckReadinessSummary(input),
    summarizeDeckReadinessSummary(input)
  );
});

function buildInput(options: {
  remainingSeverityLabel: "none" | "low" | "moderate" | "high";
  improvementLabel: "none" | "minor" | "moderate" | "major";
  primaryAction: "none" | "review" | "refine" | "manual_attention";
}) {
  return {
    cleanupOutcomeSummary: {
      changedSlides: 1,
      totalChanges: 1,
      appliedStages: ["fontFamilyFix"],
      remainingDrift: {
        fontDrift: 0,
        fontSizeDrift: 0,
        spacingDriftCount: 0,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 0,
        lineSpacingDriftCount: 0
      },
      summaryLine: "Cleanup applied successfully with no remaining detected drift."
    },
    recommendedActionSummary: {
      primaryAction: options.primaryAction,
      actionReason: "placeholder",
      focusAreas: []
    },
    brandScoreImprovementSummary: {
      brandScoreBefore: 90,
      brandScoreAfter: 95,
      scoreDelta: 5,
      improvementLabel: options.improvementLabel,
      summaryLine: "placeholder"
    },
    remainingIssuesSummary: {
      remainingIssueCount:
        options.remainingSeverityLabel === "none"
          ? 0
          : options.remainingSeverityLabel === "low"
            ? 1
            : options.remainingSeverityLabel === "moderate"
              ? 2
              : 4,
      remainingSeverityLabel: options.remainingSeverityLabel,
      topRemainingIssueCategories: [],
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
