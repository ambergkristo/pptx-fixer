import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeBrandScoreImprovementSummary } from "../packages/fix/brandScoreImprovementSummary.ts";

test("returns none when score does not change", () => {
  const summary = summarizeBrandScoreImprovementSummary({
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
    },
    deckQaSummary: {
      brandScore: 100,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [],
      fixImpact: {
        changedSlides: 0,
        totalChanges: 0
      }
    }
  });

  assert.deepEqual(summary, {
    brandScoreBefore: 100,
    brandScoreAfter: 100,
    scoreDelta: 0,
    improvementLabel: "none",
    summaryLine: "Cleanup did not improve the overall brand score."
  });
});

test("returns minor for a small score increase", () => {
  const summary = summarizeBrandScoreImprovementSummary({
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 5,
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
    },
    deckQaSummary: {
      brandScore: 100,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 5
      }
    }
  });

  assert.equal(summary.scoreDelta, 5);
  assert.equal(summary.improvementLabel, "minor");
});

test("returns moderate for a medium score increase", () => {
  const summary = summarizeBrandScoreImprovementSummary({
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 10,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 5,
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
    deckQaSummary: {
      brandScore: 100,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 15
      }
    }
  });

  assert.equal(summary.scoreDelta, 15);
  assert.equal(summary.improvementLabel, "moderate");
});

test("returns major for a large score increase", () => {
  const summary = summarizeBrandScoreImprovementSummary({
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 10,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 10,
      fontSizeDriftAfter: 0,
      spacingDriftBefore: 5,
      spacingDriftAfter: 0,
      bulletIndentDriftBefore: 5,
      bulletIndentDriftAfter: 0,
      alignmentDriftBefore: 0,
      alignmentDriftAfter: 0,
      lineSpacingDriftBefore: 0,
      lineSpacingDriftAfter: 0
    },
    deckQaSummary: {
      brandScore: 100,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 30
      }
    }
  });

  assert.equal(summary.scoreDelta, 35);
  assert.equal(summary.improvementLabel, "major");
});

test("brandScoreBefore uses verification before-state only", () => {
  const summary = summarizeBrandScoreImprovementSummary({
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 1,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 2,
      fontSizeDriftAfter: 0,
      spacingDriftBefore: 3,
      spacingDriftAfter: 0,
      bulletIndentDriftBefore: 4,
      bulletIndentDriftAfter: 0,
      alignmentDriftBefore: 5,
      alignmentDriftAfter: 0,
      lineSpacingDriftBefore: 6,
      lineSpacingDriftAfter: 0
    },
    deckQaSummary: {
      brandScore: 100,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 1
      }
    }
  });

  assert.equal(summary.brandScoreBefore, 75);
});

test("brandScoreAfter is deterministic and can fall back to verification after-state", () => {
  const summary = summarizeBrandScoreImprovementSummary({
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 10,
      fontDriftAfter: 2,
      fontSizeDriftBefore: 0,
      fontSizeDriftAfter: 1,
      spacingDriftBefore: 0,
      spacingDriftAfter: 0,
      bulletIndentDriftBefore: 0,
      bulletIndentDriftAfter: 1,
      alignmentDriftBefore: 0,
      alignmentDriftAfter: 0,
      lineSpacingDriftBefore: 0,
      lineSpacingDriftAfter: 0
    }
  });

  assert.equal(summary.brandScoreAfter, 95);
});

test("is deterministic across repeated calls", () => {
  const input = {
    verification: {
      inputSlideCount: 1,
      outputSlideCount: 1,
      fontDriftBefore: 5,
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
    },
    deckQaSummary: {
      brandScore: 100,
      qualityLabel: "good" as const,
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 5
      }
    }
  };

  assert.deepEqual(
    summarizeBrandScoreImprovementSummary(input),
    summarizeBrandScoreImprovementSummary(input)
  );
});
