import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeRemainingIssuesSummary } from "../packages/fix/remainingIssuesSummary.ts";
import type { IssueCategorySummaryEntry } from "../packages/fix/issueCategorySummary.ts";

test("returns none with empty categories when no remaining issues exist", () => {
  const summary = summarizeRemainingIssuesSummary([
    buildCategory("font_consistency", 0),
    buildCategory("font_size_consistency", 0),
    buildCategory("paragraph_spacing", 0),
    buildCategory("bullet_indentation", 0),
    buildCategory("alignment", 0),
    buildCategory("line_spacing", 0)
  ]);

  assert.deepEqual(summary, {
    remainingIssueCount: 0,
    remainingSeverityLabel: "none",
    topRemainingIssueCategories: [],
    summaryLine: "No remaining formatting issues were detected after cleanup."
  });
});

test("returns low when one category remains", () => {
  const summary = summarizeRemainingIssuesSummary([
    buildCategory("font_consistency", 0),
    buildCategory("font_size_consistency", 2),
    buildCategory("paragraph_spacing", 0)
  ]);

  assert.equal(summary.remainingIssueCount, 1);
  assert.equal(summary.remainingSeverityLabel, "low");
  assert.deepEqual(summary.topRemainingIssueCategories, ["font_size_consistency"]);
});

test("returns moderate when two or three categories remain", () => {
  const twoCategorySummary = summarizeRemainingIssuesSummary([
    buildCategory("font_consistency", 1),
    buildCategory("font_size_consistency", 1)
  ]);
  const threeCategorySummary = summarizeRemainingIssuesSummary([
    buildCategory("font_consistency", 1),
    buildCategory("font_size_consistency", 1),
    buildCategory("alignment", 1)
  ]);

  assert.equal(twoCategorySummary.remainingSeverityLabel, "moderate");
  assert.equal(threeCategorySummary.remainingSeverityLabel, "moderate");
});

test("returns high when four or more categories remain", () => {
  const summary = summarizeRemainingIssuesSummary([
    buildCategory("font_consistency", 1),
    buildCategory("font_size_consistency", 1),
    buildCategory("paragraph_spacing", 1),
    buildCategory("alignment", 1)
  ]);

  assert.equal(summary.remainingSeverityLabel, "high");
  assert.equal(
    summary.summaryLine,
    "Multiple formatting issues remain after cleanup and manual review is recommended."
  );
});

test("orders remaining categories deterministically by impact, then weight, then name", () => {
  const summary = summarizeRemainingIssuesSummary([
    buildCategory("line_spacing", 3),
    buildCategory("bullet_indentation", 1),
    buildCategory("alignment", 3),
    buildCategory("font_consistency", 3)
  ]);

  assert.deepEqual(summary.topRemainingIssueCategories, [
    "alignment",
    "font_consistency",
    "line_spacing"
  ]);
});

test("caps top remaining issue categories at three entries", () => {
  const summary = summarizeRemainingIssuesSummary([
    buildCategory("font_consistency", 1),
    buildCategory("font_size_consistency", 1),
    buildCategory("paragraph_spacing", 1),
    buildCategory("bullet_indentation", 2),
    buildCategory("alignment", 1),
    buildCategory("line_spacing", 1)
  ]);

  assert.equal(summary.topRemainingIssueCategories.length, 3);
  assert.deepEqual(summary.topRemainingIssueCategories, [
    "bullet_indentation",
    "alignment",
    "font_consistency"
  ]);
});

test("is deterministic across repeated calls", () => {
  const input = [
    buildCategory("font_consistency", 2),
    buildCategory("bullet_indentation", 1),
    buildCategory("alignment", 1)
  ];

  assert.deepEqual(
    summarizeRemainingIssuesSummary(input),
    summarizeRemainingIssuesSummary(input)
  );
});

function buildCategory(
  category: IssueCategorySummaryEntry["category"],
  remaining: number
): IssueCategorySummaryEntry {
  return {
    category,
    detectedBefore: remaining,
    fixed: 0,
    remaining,
    status: remaining === 0 ? "clean" : "unchanged"
  };
}
