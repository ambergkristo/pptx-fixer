import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeSlideSeverity,
  type SlideSeverityInput,
  type SlideSeveritySummary
} from "../packages/audit/severityAudit.ts";

test("summarizeSlideSeverity marks a clean slide as low severity", () => {
  const result = summarizeSlideSeverity(input());

  assert.deepEqual(result, expectedSeverity({
    severityScore: 0,
    severityLabel: "low"
  }));
});

test("summarizeSlideSeverity marks a few minor drifts as medium severity", () => {
  const result = summarizeSlideSeverity(input({
    fontDriftCount: 1,
    spacingDriftCount: 1,
    alignmentDriftCount: 1
  }));

  assert.deepEqual(result, expectedSeverity({
    severityScore: 3,
    severityLabel: "medium"
  }));
});

test("summarizeSlideSeverity marks many weighted drifts as high severity", () => {
  const result = summarizeSlideSeverity(input({
    fontDriftCount: 1,
    fontSizeDriftCount: 1,
    spacingDriftCount: 2,
    bulletIndentDriftCount: 2,
    alignmentDriftCount: 1
  }));

  assert.deepEqual(result, expectedSeverity({
    severityScore: 9,
    severityLabel: "high"
  }));
});

test("summarizeSlideSeverity is deterministic across repeated calls", () => {
  const target = input({
    fontDriftCount: 1,
    lineSpacingDriftCount: 2
  });

  const first = summarizeSlideSeverity(target);
  const second = summarizeSlideSeverity(target);

  assert.deepEqual(second, first);
});

test("summarizeSlideSeverity depends only on audit summary inputs", () => {
  const result = summarizeSlideSeverity(input({
    fontSizeDriftCount: 2,
    bulletIndentDriftCount: 1
  }));

  assert.deepEqual(result, expectedSeverity({
    severityScore: 4,
    severityLabel: "medium"
  }));
});

function input(overrides: Partial<SlideSeverityInput> = {}): SlideSeverityInput {
  return {
    fontDriftCount: overrides.fontDriftCount ?? 0,
    fontSizeDriftCount: overrides.fontSizeDriftCount ?? 0,
    spacingDriftCount: overrides.spacingDriftCount ?? 0,
    bulletIndentDriftCount: overrides.bulletIndentDriftCount ?? 0,
    alignmentDriftCount: overrides.alignmentDriftCount ?? 0,
    lineSpacingDriftCount: overrides.lineSpacingDriftCount ?? 0,
    paragraphGroups: overrides.paragraphGroups ?? [],
    dominantBodyStyle: overrides.dominantBodyStyle ?? {
      fontFamily: null,
      fontSize: null,
      spacingBefore: null,
      spacingAfter: null,
      alignment: null,
      lineSpacing: null
    }
  };
}

function expectedSeverity(
  overrides: Partial<SlideSeveritySummary>
): SlideSeveritySummary {
  return {
    severityScore: overrides.severityScore ?? 0,
    severityLabel: overrides.severityLabel ?? "low"
  };
}
