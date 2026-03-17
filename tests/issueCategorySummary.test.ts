import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeIssueCategorySummary } from "../packages/fix/issueCategorySummary.ts";

test("uses verification before and after values correctly", () => {
  const summary = summarizeIssueCategorySummary({
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 3,
    fontDriftAfter: 1,
    fontSizeDriftBefore: 4,
    fontSizeDriftAfter: 2,
    spacingDriftBefore: 5,
    spacingDriftAfter: 3,
    bulletIndentDriftBefore: 6,
    bulletIndentDriftAfter: 4,
    alignmentDriftBefore: 7,
    alignmentDriftAfter: 5,
    lineSpacingDriftBefore: 8,
    lineSpacingDriftAfter: 6
  });

  assert.deepEqual(summary, [
    { category: "font_consistency", detectedBefore: 3, fixed: 2, remaining: 1, status: "improved" },
    { category: "font_size_consistency", detectedBefore: 4, fixed: 2, remaining: 2, status: "improved" },
    { category: "paragraph_spacing", detectedBefore: 5, fixed: 2, remaining: 3, status: "improved" },
    { category: "bullet_indentation", detectedBefore: 6, fixed: 2, remaining: 4, status: "improved" },
    { category: "alignment", detectedBefore: 7, fixed: 2, remaining: 5, status: "improved" },
    { category: "line_spacing", detectedBefore: 8, fixed: 2, remaining: 6, status: "improved" }
  ]);
});

test("clamps fixed counts at zero", () => {
  const summary = summarizeIssueCategorySummary({
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 1,
    fontDriftAfter: 3,
    fontSizeDriftBefore: 0,
    fontSizeDriftAfter: 2,
    spacingDriftBefore: 0,
    spacingDriftAfter: 0,
    bulletIndentDriftBefore: 0,
    bulletIndentDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });

  assert.equal(summary[0].fixed, 0);
  assert.equal(summary[1].fixed, 0);
});

test("assigns clean improved and unchanged statuses deterministically", () => {
  const summary = summarizeIssueCategorySummary({
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 3,
    fontSizeDriftAfter: 1,
    spacingDriftBefore: 2,
    spacingDriftAfter: 2,
    bulletIndentDriftBefore: 0,
    bulletIndentDriftAfter: 0,
    alignmentDriftBefore: 4,
    alignmentDriftAfter: 4,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });

  assert.equal(summary[0].status, "clean");
  assert.equal(summary[1].status, "improved");
  assert.equal(summary[2].status, "unchanged");
  assert.equal(summary[4].status, "unchanged");
});

test("uses a fixed category order", () => {
  const summary = summarizeIssueCategorySummary({
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
  });

  assert.deepEqual(summary.map((entry) => entry.category), [
    "font_consistency",
    "font_size_consistency",
    "paragraph_spacing",
    "bullet_indentation",
    "alignment",
    "line_spacing"
  ]);
});

test("no-op verification produces clean or unchanged categories appropriately", () => {
  const summary = summarizeIssueCategorySummary({
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 1,
    fontSizeDriftAfter: 1,
    spacingDriftBefore: 0,
    spacingDriftAfter: 0,
    bulletIndentDriftBefore: 2,
    bulletIndentDriftAfter: 2,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });

  assert.equal(summary[0].status, "clean");
  assert.equal(summary[1].status, "unchanged");
  assert.equal(summary[3].status, "unchanged");
});

test("is deterministic across repeated calls", () => {
  const input = {
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 1,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 2,
    fontSizeDriftAfter: 1,
    spacingDriftBefore: 3,
    spacingDriftAfter: 1,
    bulletIndentDriftBefore: 0,
    bulletIndentDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  };

  assert.deepEqual(
    summarizeIssueCategorySummary(input),
    summarizeIssueCategorySummary(input)
  );
});
