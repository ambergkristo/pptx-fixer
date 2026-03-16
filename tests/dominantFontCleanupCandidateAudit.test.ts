import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeDominantFontFamilyCleanupCandidate,
  summarizeDominantFontSizeCleanupCandidate,
  attachDominantFontCleanupCandidates,
  type BodyParagraphGroupWithDominantFontCleanupCandidates
} from "../packages/audit/dominantFontCleanupCandidateAudit.ts";
import type { CleanupCandidateSummary } from "../packages/audit/cleanupCandidateAudit.ts";
import type { DominantBodyStyle } from "../packages/audit/dominantStyleAudit.ts";
import type { ParagraphGroupStyleSignature } from "../packages/audit/styleSignatureAudit.ts";

test("font family candidacy marks safely differing body group as eligible", () => {
  const result = summarizeDominantFontFamilyCleanupCandidate("Arial", "Calibri");

  assert.deepEqual(result, expectedCandidate({
    eligible: true,
    reasons: ["group_differs_from_dominant_font_family"]
  }));
});

test("font size candidacy marks safely differing body group as eligible", () => {
  const result = summarizeDominantFontSizeCleanupCandidate(20, 18);

  assert.deepEqual(result, expectedCandidate({
    eligible: true,
    reasons: ["group_differs_from_dominant_font_size"]
  }));
});

test("font family and size candidacy mark matching dominant values as not eligible", () => {
  assert.deepEqual(
    summarizeDominantFontFamilyCleanupCandidate("Calibri", "Calibri"),
    expectedCandidate({
      eligible: false,
      reasons: ["matches_dominant_font_family"]
    })
  );
  assert.deepEqual(
    summarizeDominantFontSizeCleanupCandidate(18, 18),
    expectedCandidate({
      eligible: false,
      reasons: ["matches_dominant_font_size"]
    })
  );
});

test("mixed run styling resolves to ineligible font candidacy", () => {
  const groups = attachDominantFontCleanupCandidates(
    [bodyGroup({ fontFamily: null, fontSize: null })],
    dominantBodyStyle({
      fontFamily: "Calibri",
      fontSize: 18
    })
  );

  assert.deepEqual(groups[0].dominantFontFamilyCleanupCandidate, expectedCandidate({
    eligible: false,
    reasons: ["no_group_font_family"]
  }));
  assert.deepEqual(groups[0].dominantFontSizeCleanupCandidate, expectedCandidate({
    eligible: false,
    reasons: ["no_group_font_size"]
  }));
});

test("missing dominant or inherited values resolve to ineligible candidacy", () => {
  const groups = attachDominantFontCleanupCandidates(
    [bodyGroup({ fontFamily: null, fontSize: null })],
    dominantBodyStyle()
  );

  assert.deepEqual(groups[0].dominantFontFamilyCleanupCandidate, expectedCandidate({
    eligible: false,
    reasons: ["no_dominant_font_family", "no_group_font_family"]
  }));
  assert.deepEqual(groups[0].dominantFontSizeCleanupCandidate, expectedCandidate({
    eligible: false,
    reasons: ["no_dominant_font_size", "no_group_font_size"]
  }));
});

test("dominant font cleanup candidacy is deterministic across repeated calls", () => {
  const groups = [bodyGroup({ fontFamily: "Arial", fontSize: 20 })];
  const dominant = dominantBodyStyle({
    fontFamily: "Calibri",
    fontSize: 18
  });

  const first = attachDominantFontCleanupCandidates(groups, dominant);
  const second = attachDominantFontCleanupCandidates(groups, dominant);

  assert.deepEqual(second, first);
});

function bodyGroup(
  styleSignature: Partial<ParagraphGroupStyleSignature>
): BodyParagraphGroupWithDominantFontCleanupCandidates {
  return {
    type: "body",
    paragraphCount: 2,
    startParagraphIndex: 0,
    endParagraphIndex: 1,
    styleSignature: {
      fontFamily: styleSignature.fontFamily ?? null,
      fontSize: styleSignature.fontSize ?? null,
      spacingBefore: styleSignature.spacingBefore ?? null,
      spacingAfter: styleSignature.spacingAfter ?? null,
      alignment: styleSignature.alignment ?? null,
      lineSpacing: styleSignature.lineSpacing ?? null,
      bulletLevel: styleSignature.bulletLevel ?? null
    },
    cleanupCandidate: expectedCandidate({
      eligible: false,
      reasons: ["matches_dominant_style"]
    })
  };
}

function dominantBodyStyle(
  overrides: Partial<DominantBodyStyle> = {}
): DominantBodyStyle {
  return {
    fontFamily: overrides.fontFamily ?? null,
    fontSize: overrides.fontSize ?? null,
    spacingBefore: overrides.spacingBefore ?? null,
    spacingAfter: overrides.spacingAfter ?? null,
    alignment: overrides.alignment ?? null,
    lineSpacing: overrides.lineSpacing ?? null
  };
}

function expectedCandidate(
  overrides: Partial<CleanupCandidateSummary>
): CleanupCandidateSummary {
  return {
    eligible: overrides.eligible ?? false,
    reasons: overrides.reasons ?? []
  };
}
