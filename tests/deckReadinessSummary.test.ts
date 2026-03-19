import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeDeckReadinessSummary } from "../packages/fix/deckReadinessSummary.ts";

test("returns ready when no remaining issues remain", () => {
  const summary = summarizeDeckReadinessSummary(buildInput({
    remainingSeverityLabel: "none",
    improvementLabel: "minor",
    primaryAction: "review",
    deckBoundary: "eligibleCleanupBoundary",
    resolvedCategories: ["font_consistency"]
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
    primaryAction: "review",
    deckBoundary: "eligibleCleanupBoundary",
    resolvedCategories: ["font_consistency"]
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
    primaryAction: "manual_attention",
    deckBoundary: "manualReviewBoundary",
    partiallyReducedCategories: ["alignment"]
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
    primaryAction: "review",
    deckBoundary: "eligibleCleanupBoundary"
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
    primaryAction: "refine",
    deckBoundary: "eligibleCleanupBoundary",
    partiallyReducedCategories: ["paragraph_spacing"]
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
    primaryAction: "review",
    deckBoundary: "eligibleCleanupBoundary",
    resolvedCategories: ["font_consistency"]
  });

  assert.deepEqual(
    summarizeDeckReadinessSummary(input),
    summarizeDeckReadinessSummary(input)
  );
});

test("forces manualReviewRecommended when category truth says the deck is in the manual-review boundary", () => {
  const summary = summarizeDeckReadinessSummary(buildInput({
    remainingSeverityLabel: "low",
    improvementLabel: "major",
    primaryAction: "review",
    deckBoundary: "manualReviewBoundary",
    partiallyReducedCategories: ["alignment"]
  }));

  assert.deepEqual(summary, {
    readinessLabel: "manualReviewRecommended",
    readinessReason: "unresolvedFormattingRisk",
    summaryLine: "This deck requires manual review because unresolved formatting issues remain after cleanup."
  });
});

test("forces manualReviewRecommended when low remaining drift lacks meaningful category reduction evidence", () => {
  const summary = summarizeDeckReadinessSummary(buildInput({
    remainingSeverityLabel: "low",
    improvementLabel: "minor",
    primaryAction: "review",
    deckBoundary: "eligibleCleanupBoundary"
  }));

  assert.deepEqual(summary, {
    readinessLabel: "manualReviewRecommended",
    readinessReason: "unresolvedFormattingRisk",
    summaryLine: "This deck requires manual review because unresolved formatting issues remain after cleanup."
  });
});

function buildInput(options: {
  remainingSeverityLabel: "none" | "low" | "moderate" | "high";
  improvementLabel: "none" | "minor" | "moderate" | "major";
  primaryAction: "none" | "review" | "refine" | "manual_attention";
  deckBoundary?: "eligibleCleanupBoundary" | "manualReviewBoundary";
  resolvedCategories?: Array<"font_consistency" | "font_size_consistency" | "paragraph_spacing" | "bullet_indentation" | "alignment" | "line_spacing">;
  partiallyReducedCategories?: Array<"font_consistency" | "font_size_consistency" | "paragraph_spacing" | "bullet_indentation" | "alignment" | "line_spacing">;
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
    categoryReductionReportingSummary: {
      cleanCategories: [],
      resolvedCategories: options.resolvedCategories ?? [],
      partiallyReducedCategories: options.partiallyReducedCategories ?? [],
      unchangedCategories: [],
      deckBoundary: options.deckBoundary ?? "eligibleCleanupBoundary",
      claimScope: "deckSpecificReductionOnly" as const,
      closureClaimBlocked: true as const,
      runtimeReportOnlyLabelAvailable: false as const,
      summaryLine: options.deckBoundary === "manualReviewBoundary"
        ? "Category reduction reporting is limited to deck-specific reduction on the current manual-review boundary; it does not imply category closure."
        : "Category reduction reporting is limited to deck-specific reduction on the current eligible-cleanup boundary; it does not imply category closure."
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
