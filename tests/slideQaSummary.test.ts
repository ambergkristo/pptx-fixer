import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeSlideQaSummary } from "../packages/audit/slideQaSummary.ts";

test("slide QA summary marks a low-drift slide as good with a high brand score", () => {
  const summary = summarizeSlideQaSummary({
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
    summaryLine: "Slide is mostly consistent with minor formatting drift.",
    keyIssues: [
      "Font family drift detected",
      "Font size drift detected"
    ]
  });
});

test("slide QA summary marks a medium-drift slide as warning", () => {
  const summary = summarizeSlideQaSummary({
    fontDriftCount: 8,
    fontSizeDriftCount: 6,
    spacingDriftCount: 4,
    bulletIndentDriftCount: 2,
    alignmentDriftCount: 1,
    lineSpacingDriftCount: 1
  });

  assert.equal(summary.brandScore, 76);
  assert.equal(summary.qualityLabel, "warning");
  assert.equal(summary.summaryLine, "Slide has moderate formatting inconsistency.");
});

test("slide QA summary marks a high-drift slide as poor", () => {
  const summary = summarizeSlideQaSummary({
    fontDriftCount: 15,
    fontSizeDriftCount: 10,
    spacingDriftCount: 8,
    bulletIndentDriftCount: 6,
    alignmentDriftCount: 4,
    lineSpacingDriftCount: 3
  });

  assert.equal(summary.brandScore, 48);
  assert.equal(summary.qualityLabel, "poor");
  assert.equal(summary.summaryLine, "Slide has significant formatting inconsistency and needs cleanup.");
});

test("slide QA summary key issues include only real detected issues in deterministic order", () => {
  const summary = summarizeSlideQaSummary({
    fontDriftCount: 0,
    fontSizeDriftCount: 1,
    spacingDriftCount: 0,
    bulletIndentDriftCount: 1,
    alignmentDriftCount: 1,
    lineSpacingDriftCount: 3
  });

  assert.deepEqual(summary.keyIssues, [
    "Font size drift detected",
    "Bullet formatting inconsistency detected",
    "Alignment inconsistency detected"
  ]);
});

test("slide QA summary output is deterministic across repeated calls", () => {
  const inputs = {
    fontDriftCount: 2,
    fontSizeDriftCount: 2,
    spacingDriftCount: 1,
    bulletIndentDriftCount: 0,
    alignmentDriftCount: 1,
    lineSpacingDriftCount: 1
  };

  const first = summarizeSlideQaSummary(inputs);
  const second = summarizeSlideQaSummary(inputs);

  assert.deepEqual(first, second);
});
