import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeBrandScoreImprovementSummary } from "../packages/fix/brandScoreImprovementSummary.ts";

test("treats eligible score improvement as deck-specific runtime evidence only", () => {
  const summary = summarizeBrandScoreImprovementSummary({
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
    },
    categoryReductionReportingSummary: {
      deckBoundary: "eligibleCleanupBoundary",
      resolvedCategories: ["font_consistency", "font_size_consistency"],
      partiallyReducedCategories: []
    }
  });

  assert.deepEqual(summary, {
    brandScoreBefore: 98,
    brandScoreAfter: 100,
    scoreDelta: 2,
    improvementLabel: "minor",
    scoreInterpretationLabel: "deckSpecificRuntimeImprovement",
    scoreInterpretationScope: "currentRuntimeEvidencedCategoriesOnly",
    deckBoundary: "eligibleCleanupBoundary",
    trustedResolvedCategoryCount: 2,
    trustedPartiallyReducedCategoryCount: 0,
    fullBrandComplianceScoringAvailable: false,
    futureTaxonomyExcluded: true,
    summaryLine: "Brand score improvement is limited to current runtime-evidenced category reduction on this deck; it is not a full brand compliance score."
  });
});

test("keeps manual-review boundary score improvement conservative", () => {
  const summary = summarizeBrandScoreImprovementSummary({
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 12,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 28,
      fontSizeDriftAfter: 12,
      spacingDriftBefore: 12,
      spacingDriftAfter: 6,
      bulletIndentDriftBefore: 4,
      bulletIndentDriftAfter: 0,
      alignmentDriftBefore: 4,
      alignmentDriftAfter: 2,
      lineSpacingDriftBefore: 8,
      lineSpacingDriftAfter: 6
    },
    categoryReductionReportingSummary: {
      deckBoundary: "manualReviewBoundary",
      resolvedCategories: ["font_consistency", "bullet_indentation"],
      partiallyReducedCategories: [
        "font_size_consistency",
        "paragraph_spacing",
        "alignment",
        "line_spacing"
      ]
    }
  });

  assert.equal(summary.improvementLabel, "major");
  assert.equal(summary.scoreInterpretationLabel, "manualReviewConstrainedImprovement");
  assert.equal(summary.deckBoundary, "manualReviewBoundary");
  assert.equal(summary.trustedResolvedCategoryCount, 2);
  assert.equal(summary.trustedPartiallyReducedCategoryCount, 4);
  assert.equal(summary.fullBrandComplianceScoringAvailable, false);
  assert.equal(summary.futureTaxonomyExcluded, true);
  assert.equal(
    summary.summaryLine,
    "Brand score improvement is limited to current runtime-evidenced category reduction on a manual-review-boundary deck; it is not a trusted brand compliance score."
  );
});

test("does not trust score deltas without trusted runtime category reduction", () => {
  const summary = summarizeBrandScoreImprovementSummary({
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 10,
      fontDriftAfter: 10,
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
    },
    postFixBrandScore: 95
  });

  assert.deepEqual(summary, {
    brandScoreBefore: 90,
    brandScoreAfter: 95,
    scoreDelta: 5,
    improvementLabel: "minor",
    scoreInterpretationLabel: "noTrustedRuntimeImprovement",
    scoreInterpretationScope: "currentRuntimeEvidencedCategoriesOnly",
    deckBoundary: "eligibleCleanupBoundary",
    trustedResolvedCategoryCount: 0,
    trustedPartiallyReducedCategoryCount: 0,
    fullBrandComplianceScoringAvailable: false,
    futureTaxonomyExcluded: true,
    summaryLine: "Brand score did not show trusted runtime-evidenced improvement; it is not a full brand compliance score."
  });
});
