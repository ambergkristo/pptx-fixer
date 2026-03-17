import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeRecommendedActionSummary } from "../packages/fix/recommendedActionSummary.ts";

test("returns none for a clean no-op report", () => {
  const summary = summarizeRecommendedActionSummary({
    deckQaSummary: {
      brandScore: 100,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [],
      fixImpact: {
        changedSlides: 0,
        totalChanges: 0
      }
    },
    cleanupOutcomeSummary: {
      changedSlides: 0,
      totalChanges: 0,
      appliedStages: [],
      remainingDrift: {
        fontDrift: 0,
        fontSizeDrift: 0,
        spacingDriftCount: 0,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 0,
        lineSpacingDriftCount: 0
      },
      summaryLine: "No cleanup changes were applied."
    },
    topProblemSlides: [],
    changesBySlide: [],
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
    steps: []
  });

  assert.deepEqual(summary, {
    primaryAction: "none",
    actionReason: "No significant formatting issues remain.",
    focusAreas: []
  });
});

test("returns review when cleanup applied and no remaining drift remains", () => {
  const summary = summarizeRecommendedActionSummary({
    deckQaSummary: {
      brandScore: 98,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: ["Font family drift detected"],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 2
      }
    },
    cleanupOutcomeSummary: {
      changedSlides: 1,
      totalChanges: 2,
      appliedStages: ["fontFamilyFix", "fontSizeFix"],
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
    topProblemSlides: [
      {
        slideIndex: 1,
        brandScore: 98,
        qualityLabel: "good",
        summaryLine: "Slide is mostly consistent with minor formatting drift.",
        keyIssues: ["Font family drift detected"]
      }
    ],
    changesBySlide: [],
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
    steps: [
      { name: "fontFamilyFix", changedRuns: 1 },
      { name: "fontSizeFix", changedRuns: 1 }
    ]
  });

  assert.deepEqual(summary, {
    primaryAction: "review",
    actionReason: "Automatic cleanup resolved most detected drift.",
    focusAreas: ["font consistency", "font size consistency", "problem slides review"]
  });
});

test("returns refine when cleanup applied and minor drift remains", () => {
  const summary = summarizeRecommendedActionSummary({
    deckQaSummary: {
      brandScore: 80,
      qualityLabel: "warning",
      summaryLine: "Deck has moderate brand/style inconsistency.",
      keyIssues: ["Paragraph spacing drift detected"],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 1
      }
    },
    cleanupOutcomeSummary: {
      changedSlides: 1,
      totalChanges: 1,
      appliedStages: ["spacingFix"],
      remainingDrift: {
        fontDrift: 0,
        fontSizeDrift: 0,
        spacingDriftCount: 2,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 0,
        lineSpacingDriftCount: 0
      },
      summaryLine: "Cleanup applied successfully with minor remaining drift."
    },
    topProblemSlides: [],
    changesBySlide: [],
    totals: {
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 1,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    steps: [
      { name: "spacingFix", changedParagraphs: 1 }
    ]
  });

  assert.deepEqual(summary, {
    primaryAction: "refine",
    actionReason: "Some formatting drift remains and should be reviewed.",
    focusAreas: ["paragraph spacing"]
  });
});

test("returns manual attention when significant drift remains after cleanup", () => {
  const summary = summarizeRecommendedActionSummary({
    deckQaSummary: {
      brandScore: 45,
      qualityLabel: "poor",
      summaryLine: "Deck has significant formatting inconsistency and needs cleanup.",
      keyIssues: ["Bullet indentation inconsistency detected"],
      fixImpact: {
        changedSlides: 2,
        totalChanges: 3
      }
    },
    cleanupOutcomeSummary: {
      changedSlides: 2,
      totalChanges: 3,
      appliedStages: ["bulletFix"],
      remainingDrift: {
        fontDrift: 1,
        fontSizeDrift: 0,
        spacingDriftCount: 0,
        bulletIndentDriftCount: 3,
        alignmentDriftCount: 1,
        lineSpacingDriftCount: 0
      },
      summaryLine: "Cleanup applied successfully, but some formatting drift remains."
    },
    topProblemSlides: [
      {
        slideIndex: 2,
        brandScore: 45,
        qualityLabel: "poor",
        summaryLine: "Slide has significant formatting inconsistency and needs cleanup.",
        keyIssues: ["Bullet indentation inconsistency detected"]
      }
    ],
    changesBySlide: [],
    totals: {
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 3,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    steps: [
      { name: "bulletFix", changedParagraphs: 3 }
    ]
  });

  assert.deepEqual(summary, {
    primaryAction: "manual_attention",
    actionReason: "Significant formatting inconsistency remains after cleanup.",
    focusAreas: ["font consistency", "bullet indentation", "alignment"]
  });
});

test("focus areas include only real remaining or applied problem areas", () => {
  const summary = summarizeRecommendedActionSummary({
    deckQaSummary: {
      brandScore: 88,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: ["Alignment inconsistency detected"],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 1
      }
    },
    cleanupOutcomeSummary: {
      changedSlides: 1,
      totalChanges: 1,
      appliedStages: ["alignmentFix"],
      remainingDrift: {
        fontDrift: 0,
        fontSizeDrift: 0,
        spacingDriftCount: 0,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 1,
        lineSpacingDriftCount: 0
      },
      summaryLine: "Cleanup applied successfully with minor remaining drift."
    },
    topProblemSlides: [],
    changesBySlide: [],
    totals: {
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 1,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    steps: [
      { name: "alignmentFix", changedParagraphs: 1 }
    ]
  });

  assert.deepEqual(summary.focusAreas, ["alignment"]);
});

test("is deterministic across repeated calls", () => {
  const input = {
    deckQaSummary: {
      brandScore: 80,
      qualityLabel: "warning" as const,
      summaryLine: "Deck has moderate brand/style inconsistency.",
      keyIssues: ["Paragraph spacing drift detected"],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 1
      }
    },
    cleanupOutcomeSummary: {
      changedSlides: 1,
      totalChanges: 1,
      appliedStages: ["spacingFix"],
      remainingDrift: {
        fontDrift: 0,
        fontSizeDrift: 0,
        spacingDriftCount: 2,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 0,
        lineSpacingDriftCount: 0
      },
      summaryLine: "Cleanup applied successfully with minor remaining drift."
    },
    topProblemSlides: [],
    changesBySlide: [],
    totals: {
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 1,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    steps: [
      { name: "spacingFix", changedParagraphs: 1 }
    ]
  };

  assert.deepEqual(
    summarizeRecommendedActionSummary(input),
    summarizeRecommendedActionSummary(input)
  );
});
