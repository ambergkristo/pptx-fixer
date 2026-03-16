import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeDominantBodyStyle,
  type DominantBodyStyle
} from "../packages/audit/dominantStyleAudit.ts";
import type { ParagraphGroupWithStyleSignature, ParagraphGroupStyleSignature } from "../packages/audit/styleSignatureAudit.ts";

test("summarizeDominantBodyStyle returns a clear dominant body style", () => {
  const result = summarizeDominantBodyStyle([
    bodyGroup({
      fontFamily: "Calibri",
      fontSize: 18,
      spacingAfter: "12pt",
      alignment: "left"
    }),
    bodyGroup({
      fontFamily: "Calibri",
      fontSize: 18,
      spacingAfter: "12pt",
      alignment: "left"
    }),
    bodyGroup({
      fontFamily: "Arial",
      fontSize: 16,
      spacingAfter: "24pt",
      alignment: "center"
    })
  ]);

  assert.deepEqual(result, expectedDominantStyle({
    fontFamily: "Calibri",
    fontSize: 18,
    spacingAfter: 12,
    alignment: "left"
  }));
});

test("summarizeDominantBodyStyle returns null when body styles conflict", () => {
  const result = summarizeDominantBodyStyle([
    bodyGroup({ fontFamily: "Calibri", fontSize: 18 }),
    bodyGroup({ fontFamily: "Arial", fontSize: 18 })
  ]);

  assert.deepEqual(result, expectedDominantStyle({
    fontSize: 18
  }));
});

test("summarizeDominantBodyStyle returns nulls when no body groups exist", () => {
  const result = summarizeDominantBodyStyle([
    group("title", { fontFamily: "Calibri" }),
    group("bulletList", { bulletLevel: 0 })
  ]);

  assert.deepEqual(result, expectedDominantStyle());
});

test("summarizeDominantBodyStyle keeps mixed lineSpacing units unresolved without a majority", () => {
  const result = summarizeDominantBodyStyle([
    bodyGroup({
      lineSpacing: {
        kind: "spcPct",
        value: 120
      }
    }),
    bodyGroup({
      lineSpacing: {
        kind: "spcPts",
        value: 14
      }
    })
  ]);

  assert.deepEqual(result, expectedDominantStyle());
});

test("summarizeDominantBodyStyle is deterministic across repeated calls", () => {
  const groups = [
    bodyGroup({ fontFamily: "Calibri", fontSize: 18 }),
    bodyGroup({ fontFamily: "Calibri", fontSize: 18 }),
    bodyGroup({ fontFamily: null, fontSize: null })
  ];

  const first = summarizeDominantBodyStyle(groups);
  const second = summarizeDominantBodyStyle(groups);

  assert.deepEqual(second, first);
});

function bodyGroup(
  styleSignature: Partial<ParagraphGroupStyleSignature>
): ParagraphGroupWithStyleSignature {
  return group("body", styleSignature);
}

function group(
  type: ParagraphGroupWithStyleSignature["type"],
  styleSignature: Partial<ParagraphGroupStyleSignature>
): ParagraphGroupWithStyleSignature {
  return {
    type,
    paragraphCount: 1,
    styleSignature: {
      fontFamily: styleSignature.fontFamily ?? null,
      fontSize: styleSignature.fontSize ?? null,
      spacingBefore: styleSignature.spacingBefore ?? null,
      spacingAfter: styleSignature.spacingAfter ?? null,
      alignment: styleSignature.alignment ?? null,
      lineSpacing: styleSignature.lineSpacing ?? null,
      bulletLevel: styleSignature.bulletLevel ?? null
    }
  };
}

function expectedDominantStyle(
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
