import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeDeckQaFixImpact,
  summarizeDeckQaSummary
} from "../packages/audit/deckQaSummary.ts";

test("deck QA summary marks a low-drift deck as good with a high brand score", () => {
  const summary = summarizeDeckQaSummary({
    slideCount: 4,
    fontDriftCount: 1,
    fontSizeDriftCount: 1,
    spacingDriftCount: 0,
    bulletIndentDriftCount: 0,
    alignmentDriftCount: 0,
    lineSpacingDriftCount: 0
  });

  assert.deepEqual(summary, {
    brandScore: 98,
    qualityLabel: "good",
    summaryLine: "Deck is mostly consistent with minor formatting drift.",
    keyIssues: [
      "Font family drift detected",
      "Font size drift detected"
    ],
    fixImpact: {
      changedSlides: 0,
      totalChanges: 0
    }
  });
});

test("deck QA summary marks a medium-drift deck as warning", () => {
  const summary = summarizeDeckQaSummary({
    slideCount: 6,
    fontDriftCount: 4,
    fontSizeDriftCount: 3,
    spacingDriftCount: 5,
    bulletIndentDriftCount: 2,
    alignmentDriftCount: 2,
    lineSpacingDriftCount: 2
  });

  assert.equal(summary.brandScore, 80);
  assert.equal(summary.qualityLabel, "warning");
  assert.equal(summary.summaryLine, "Deck has moderate brand/style inconsistency.");
});

test("deck QA summary marks a high-drift deck as poor", () => {
  const summary = summarizeDeckQaSummary({
    slideCount: 8,
    fontDriftCount: 12,
    fontSizeDriftCount: 10,
    spacingDriftCount: 8,
    bulletIndentDriftCount: 6,
    alignmentDriftCount: 7,
    lineSpacingDriftCount: 5
  });

  assert.equal(summary.brandScore, 46);
  assert.equal(summary.qualityLabel, "poor");
  assert.equal(summary.summaryLine, "Deck has significant formatting inconsistency and needs cleanup.");
});

test("deck QA summary key issues include only real detected issues in deterministic order", () => {
  const summary = summarizeDeckQaSummary({
    slideCount: 3,
    fontDriftCount: 0,
    fontSizeDriftCount: 1,
    spacingDriftCount: 2,
    bulletIndentDriftCount: 1,
    alignmentDriftCount: 4,
    lineSpacingDriftCount: 0
  });

  assert.deepEqual(summary.keyIssues, [
    "Font size drift detected",
    "Paragraph spacing drift detected",
    "Bullet indentation inconsistency detected"
  ]);
});

test("deck QA fix impact uses existing report totals and slide changes only", () => {
  const fixImpact = summarizeDeckQaFixImpact({
    totals: {
      fontFamilyChanges: 2,
      fontSizeChanges: 1,
      spacingChanges: 3,
      bulletChanges: 0,
      alignmentChanges: 1,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 2,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 1
    },
    changesBySlide: [
      {
        fontFamilyChanges: 2,
        fontSizeChanges: 1,
        spacingChanges: 0,
        bulletChanges: 0,
        alignmentChanges: 0,
        lineSpacingChanges: 0,
        dominantBodyStyleChanges: 0,
        dominantFontFamilyChanges: 0,
        dominantFontSizeChanges: 0
      },
      {
        fontFamilyChanges: 0,
        fontSizeChanges: 0,
        spacingChanges: 3,
        bulletChanges: 0,
        alignmentChanges: 1,
        lineSpacingChanges: 0,
        dominantBodyStyleChanges: 2,
        dominantFontFamilyChanges: 0,
        dominantFontSizeChanges: 1
      },
      {
        fontFamilyChanges: 0,
        fontSizeChanges: 0,
        spacingChanges: 0,
        bulletChanges: 0,
        alignmentChanges: 0,
        lineSpacingChanges: 0,
        dominantBodyStyleChanges: 0,
        dominantFontFamilyChanges: 0,
        dominantFontSizeChanges: 0
      }
    ]
  });

  assert.deepEqual(fixImpact, {
    changedSlides: 2,
    totalChanges: 10
  });
});

test("deck QA summary output is deterministic across repeated calls", () => {
  const inputs = {
    slideCount: 5,
    fontDriftCount: 2,
    fontSizeDriftCount: 2,
    spacingDriftCount: 1,
    bulletIndentDriftCount: 1,
    alignmentDriftCount: 0,
    lineSpacingDriftCount: 1
  };

  const first = summarizeDeckQaSummary(inputs, {
    changedSlides: 2,
    totalChanges: 7
  });
  const second = summarizeDeckQaSummary(inputs, {
    changedSlides: 2,
    totalChanges: 7
  });

  assert.deepEqual(first, second);
});
