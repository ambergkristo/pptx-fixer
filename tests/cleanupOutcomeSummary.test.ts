import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeCleanupOutcomeSummary } from "../packages/fix/cleanupOutcomeSummary.ts";

test("lists only real applied stages in pipeline order", () => {
  const summary = summarizeCleanupOutcomeSummary({
    steps: [
      { name: "fontFamilyFix", changedRuns: 1 },
      { name: "fontSizeFix", changedRuns: 0 },
      { name: "spacingFix", changedParagraphs: 2 },
      { name: "bulletFix", changedParagraphs: 0 }
    ],
    totals: {
      fontFamilyChanges: 1,
      fontSizeChanges: 0,
      spacingChanges: 2,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    changesBySlide: [
      {} as never,
      {} as never
    ],
    verification: {
      inputSlideCount: 2,
      outputSlideCount: 2,
      fontDriftBefore: 1,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 0,
      fontSizeDriftAfter: 0,
      spacingDriftBefore: 2,
      spacingDriftAfter: 0,
      bulletIndentDriftBefore: 0,
      bulletIndentDriftAfter: 0,
      alignmentDriftBefore: 0,
      alignmentDriftAfter: 0,
      lineSpacingDriftBefore: 0,
      lineSpacingDriftAfter: 0
    }
  });

  assert.deepEqual(summary.appliedStages, ["fontFamilyFix", "spacingFix"]);
});

test("computes changedSlides and totalChanges from existing report data", () => {
  const summary = summarizeCleanupOutcomeSummary({
    steps: [
      { name: "fontFamilyFix", changedRuns: 1 }
    ],
    totals: {
      fontFamilyChanges: 1,
      fontSizeChanges: 2,
      spacingChanges: 3,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 4,
      dominantFontSizeChanges: 0
    },
    changesBySlide: [
      {} as never,
      {} as never,
      {} as never
    ],
    verification: {
      inputSlideCount: 3,
      outputSlideCount: 3,
      fontDriftBefore: 4,
      fontDriftAfter: 1,
      fontSizeDriftBefore: 4,
      fontSizeDriftAfter: 1,
      spacingDriftBefore: 3,
      spacingDriftAfter: 1,
      bulletIndentDriftBefore: 0,
      bulletIndentDriftAfter: 0,
      alignmentDriftBefore: 0,
      alignmentDriftAfter: 0,
      lineSpacingDriftBefore: 0,
      lineSpacingDriftAfter: 0
    }
  });

  assert.equal(summary.changedSlides, 3);
  assert.equal(summary.totalChanges, 10);
});

test("copies remaining drift from existing post-fix verification output", () => {
  const summary = summarizeCleanupOutcomeSummary({
    steps: [
      { name: "fontFamilyFix", changedRuns: 1 }
    ],
    totals: {
      fontFamilyChanges: 1,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    changesBySlide: [
      {} as never
    ],
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 1,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 2,
      fontSizeDriftAfter: 1,
      spacingDriftBefore: 3,
      spacingDriftAfter: 2,
      bulletIndentDriftBefore: 4,
      bulletIndentDriftAfter: 3,
      alignmentDriftBefore: 5,
      alignmentDriftAfter: 4,
      lineSpacingDriftBefore: 6,
      lineSpacingDriftAfter: 5
    }
  });

  assert.deepEqual(summary.remainingDrift, {
    fontDrift: 0,
    fontSizeDrift: 1,
    spacingDriftCount: 2,
    bulletIndentDriftCount: 3,
    alignmentDriftCount: 4,
    lineSpacingDriftCount: 5
  });
});

test("returns a no-op summary line when no cleanup changes were applied", () => {
  const summary = summarizeCleanupOutcomeSummary({
    steps: [
      { name: "fontFamilyFix", changedRuns: 0 }
    ],
    totals: {
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    changesBySlide: [],
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 0,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 0,
      fontSizeDriftAfter: 0,
      spacingDriftBefore: 0,
      spacingDriftAfter: 0,
      bulletIndentDriftBefore: 0,
      bulletIndentDriftAfter: 0,
      alignmentDriftBefore: 0,
      alignmentDriftAfter: 0,
      lineSpacingDriftBefore: 0,
      lineSpacingDriftAfter: 0
    }
  });

  assert.equal(summary.summaryLine, "No cleanup changes were applied.");
});

test("is deterministic across repeated calls", () => {
  const input = {
    steps: [
      { name: "fontFamilyFix", changedRuns: 1 as const },
      { name: "fontSizeFix", changedRuns: 1 as const }
    ],
    totals: {
      fontFamilyChanges: 1,
      fontSizeChanges: 1,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    changesBySlide: [
      {} as never
    ],
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 1,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 1,
      fontSizeDriftAfter: 0,
      spacingDriftBefore: 0,
      spacingDriftAfter: 0,
      bulletIndentDriftBefore: 0,
      bulletIndentDriftAfter: 0,
      alignmentDriftBefore: 0,
      alignmentDriftAfter: 0,
      lineSpacingDriftBefore: 0,
      lineSpacingDriftAfter: 0
    }
  };

  assert.deepEqual(
    summarizeCleanupOutcomeSummary(input),
    summarizeCleanupOutcomeSummary(input)
  );
});
