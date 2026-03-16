import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeCleanupCandidate,
  type CleanupCandidateSummary
} from "../packages/audit/cleanupCandidateAudit.ts";
import type { DominantBodyStyle } from "../packages/audit/dominantStyleAudit.ts";
import type { ParagraphGroupStyleSignature } from "../packages/audit/styleSignatureAudit.ts";

test("summarizeCleanupCandidate marks matching dominant style as not eligible", () => {
  const result = summarizeCleanupCandidate(
    styleSignature({
      fontFamily: "Calibri",
      fontSize: 18
    }),
    dominantBodyStyle({
      fontFamily: "Calibri",
      fontSize: 18
    })
  );

  assert.deepEqual(result, expectedCandidate({
    eligible: false,
    reasons: ["matches_dominant_style"]
  }));
});

test("summarizeCleanupCandidate marks safely differing body style as eligible", () => {
  const result = summarizeCleanupCandidate(
    styleSignature({
      fontFamily: "Arial",
      fontSize: 18
    }),
    dominantBodyStyle({
      fontFamily: "Calibri",
      fontSize: 18
    })
  );

  assert.deepEqual(result, expectedCandidate({
    eligible: true,
    reasons: ["body_group_differs_from_dominant"]
  }));
});

test("summarizeCleanupCandidate marks ambiguous signature as not eligible", () => {
  const result = summarizeCleanupCandidate(
    styleSignature(),
    dominantBodyStyle({
      fontFamily: "Calibri"
    })
  );

  assert.deepEqual(result, expectedCandidate({
    eligible: false,
    reasons: ["mixed_or_ambiguous_signature", "no_comparable_properties"]
  }));
});

test("summarizeCleanupCandidate marks missing dominant style as not eligible", () => {
  const result = summarizeCleanupCandidate(
    styleSignature({
      fontFamily: "Arial"
    }),
    dominantBodyStyle()
  );

  assert.deepEqual(result, expectedCandidate({
    eligible: false,
    reasons: ["no_dominant_style", "no_comparable_properties"]
  }));
});

test("summarizeCleanupCandidate marks incompatible line spacing kinds as not eligible", () => {
  const result = summarizeCleanupCandidate(
    styleSignature({
      lineSpacing: {
        kind: "spcPct",
        value: 120
      }
    }),
    dominantBodyStyle({
      lineSpacing: {
        kind: "spcPts",
        value: 14
      }
    })
  );

  assert.deepEqual(result, expectedCandidate({
    eligible: false,
    reasons: ["line_spacing_kind_mismatch", "no_comparable_properties"]
  }));
});

test("summarizeCleanupCandidate is deterministic across repeated calls", () => {
  const signature = styleSignature({
    alignment: "right"
  });
  const dominant = dominantBodyStyle({
    alignment: "left"
  });

  const first = summarizeCleanupCandidate(signature, dominant);
  const second = summarizeCleanupCandidate(signature, dominant);

  assert.deepEqual(second, first);
});

function styleSignature(
  overrides: Partial<ParagraphGroupStyleSignature> = {}
): ParagraphGroupStyleSignature {
  return {
    fontFamily: overrides.fontFamily ?? null,
    fontSize: overrides.fontSize ?? null,
    spacingBefore: overrides.spacingBefore ?? null,
    spacingAfter: overrides.spacingAfter ?? null,
    alignment: overrides.alignment ?? null,
    lineSpacing: overrides.lineSpacing ?? null,
    bulletLevel: overrides.bulletLevel ?? null
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
