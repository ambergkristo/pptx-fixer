import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeCategoryReductionReportingSummary } from "../packages/fix/categoryReductionReportingSummary.ts";

test("reports resolved, partial, unchanged, and clean categories on the eligible-cleanup boundary", () => {
  const summary = summarizeCategoryReductionReportingSummary({
    issueCategorySummary: [
      { category: "font_consistency", detectedBefore: 2, fixed: 2, remaining: 0, status: "improved" },
      { category: "font_size_consistency", detectedBefore: 4, fixed: 2, remaining: 2, status: "improved" },
      { category: "paragraph_spacing", detectedBefore: 3, fixed: 0, remaining: 3, status: "unchanged" },
      { category: "bullet_indentation", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "alignment", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "line_spacing", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" }
    ],
    deckReadinessSummary: {
      readinessLabel: "mostlyReady",
      readinessReason: "minorRemainingIssues",
      summaryLine: "placeholder"
    }
  });

  assert.deepEqual(summary, {
    cleanCategories: [
      "bullet_indentation",
      "alignment",
      "line_spacing"
    ],
    resolvedCategories: [
      "font_consistency"
    ],
    partiallyReducedCategories: [
      "font_size_consistency"
    ],
    unchangedCategories: [
      "paragraph_spacing"
    ],
    deckBoundary: "eligibleCleanupBoundary",
    claimScope: "deckSpecificReductionOnly",
    closureClaimBlocked: true,
    runtimeReportOnlyLabelAvailable: false,
    summaryLine: "Category reduction reporting is limited to deck-specific reduction on the current eligible-cleanup boundary; it does not imply category closure."
  });
});

test("holds category claims on the manual-review boundary when residual drift remains", () => {
  const summary = summarizeCategoryReductionReportingSummary({
    issueCategorySummary: [
      { category: "font_consistency", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "font_size_consistency", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "paragraph_spacing", detectedBefore: 2, fixed: 1, remaining: 1, status: "improved" },
      { category: "bullet_indentation", detectedBefore: 1, fixed: 0, remaining: 1, status: "unchanged" },
      { category: "alignment", detectedBefore: 2, fixed: 1, remaining: 1, status: "improved" },
      { category: "line_spacing", detectedBefore: 1, fixed: 0, remaining: 1, status: "unchanged" }
    ],
    deckReadinessSummary: {
      readinessLabel: "manualReviewRecommended",
      readinessReason: "manualActionStillNeeded",
      summaryLine: "placeholder"
    }
  });

  assert.deepEqual(summary, {
    cleanCategories: [
      "font_consistency",
      "font_size_consistency"
    ],
    resolvedCategories: [],
    partiallyReducedCategories: [
      "paragraph_spacing",
      "alignment"
    ],
    unchangedCategories: [
      "bullet_indentation",
      "line_spacing"
    ],
    deckBoundary: "manualReviewBoundary",
    claimScope: "deckSpecificReductionOnly",
    closureClaimBlocked: true,
    runtimeReportOnlyLabelAvailable: false,
    summaryLine: "Category reduction reporting is limited to deck-specific reduction on the current manual-review boundary; it does not imply category closure."
  });
});

test("is deterministic across repeated calls", () => {
  const input = {
    issueCategorySummary: [
      { category: "font_consistency", detectedBefore: 1, fixed: 1, remaining: 0, status: "improved" },
      { category: "font_size_consistency", detectedBefore: 1, fixed: 0, remaining: 1, status: "unchanged" },
      { category: "paragraph_spacing", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "bullet_indentation", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "alignment", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "line_spacing", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" }
    ],
    deckReadinessSummary: {
      readinessLabel: "ready" as const,
      readinessReason: "noRemainingIssues" as const,
      summaryLine: "placeholder"
    }
  };

  assert.deepEqual(
    summarizeCategoryReductionReportingSummary(input),
    summarizeCategoryReductionReportingSummary(input)
  );
});
