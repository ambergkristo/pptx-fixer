import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeStyleSignature,
  type ParagraphGroupStyleSignature
} from "../packages/audit/styleSignatureAudit.ts";
import type { ParagraphGroupDescriptor, SlideStructureParagraphDescriptor } from "../packages/audit/slideStructureAudit.ts";

test("summarizeStyleSignature returns a clear consistent body signature", () => {
  const signature = summarizeStyleSignature(group("body", [
    paragraph({
      fontFamily: "Calibri",
      fontSize: 18,
      spacingAfter: "12pt",
      alignment: "left"
    }),
    paragraph({
      fontFamily: "Calibri",
      fontSize: 18,
      spacingAfter: "12pt",
      alignment: "left"
    })
  ]));

  assert.deepEqual(signature, expectedSignature({
    fontFamily: "Calibri",
    fontSize: 18,
    spacingAfter: "12pt",
    alignment: "left"
  }));
});

test("summarizeStyleSignature returns a bullet level only when a bullet list is structurally consistent", () => {
  const signature = summarizeStyleSignature(group("bulletList", [
    paragraph({
      isBullet: true,
      bulletLevel: 1,
      alignment: "left"
    }),
    paragraph({
      isBullet: true,
      bulletLevel: 1,
      alignment: "left"
    })
  ]));

  assert.deepEqual(signature, expectedSignature({
    alignment: "left",
    bulletLevel: 1
  }));
});

test("summarizeStyleSignature resolves mixed properties to null instead of guessing", () => {
  const signature = summarizeStyleSignature(group("body", [
    paragraph({
      fontFamily: "Calibri",
      fontSize: 18,
      spacingAfter: "12pt"
    }),
    paragraph({
      fontFamily: "Arial",
      fontSize: 18,
      spacingAfter: "12pt"
    })
  ]));

  assert.deepEqual(signature, expectedSignature({
    fontSize: 18,
    spacingAfter: "12pt"
  }));
});

test("summarizeStyleSignature preserves explicit spcPct line spacing form", () => {
  const signature = summarizeStyleSignature(group("standalone", [
    paragraph({
      lineSpacing: "120%",
      lineSpacingKind: "spcPct",
      lineSpacingValue: 120
    })
  ]));

  assert.deepEqual(signature, expectedSignature({
    lineSpacing: {
      kind: "spcPct",
      value: 120
    }
  }));
});

test("summarizeStyleSignature preserves explicit spcPts line spacing form", () => {
  const signature = summarizeStyleSignature(group("standalone", [
    paragraph({
      lineSpacing: "14pt",
      lineSpacingKind: "spcPts",
      lineSpacingValue: 14
    })
  ]));

  assert.deepEqual(signature, expectedSignature({
    lineSpacing: {
      kind: "spcPts",
      value: 14
    }
  }));
});

test("summarizeStyleSignature does not invent inherited values", () => {
  const signature = summarizeStyleSignature(group("body", [
    paragraph({
      fontFamily: "Calibri",
      spacingAfter: "12pt"
    }),
    paragraph({})
  ]));

  assert.deepEqual(signature, expectedSignature());
});

test("summarizeStyleSignature is deterministic across repeated calls", () => {
  const targetGroup = group("bulletList", [
    paragraph({
      isBullet: true,
      bulletLevel: 0,
      lineSpacing: "120%",
      lineSpacingKind: "spcPct",
      lineSpacingValue: 120
    })
  ]);

  const first = summarizeStyleSignature(targetGroup);
  const second = summarizeStyleSignature(targetGroup);

  assert.deepEqual(second, first);
});

function group(
  type: ParagraphGroupDescriptor["type"],
  paragraphs: SlideStructureParagraphDescriptor[]
): ParagraphGroupDescriptor {
  return { type, paragraphs };
}

function paragraph(
  overrides: Partial<SlideStructureParagraphDescriptor>
): SlideStructureParagraphDescriptor {
  return {
    shape: overrides.shape ?? 1,
    isTitle: overrides.isTitle ?? false,
    isBullet: overrides.isBullet ?? false,
    bulletLevel: overrides.bulletLevel ?? null,
    fontFamily: overrides.fontFamily ?? null,
    fontSize: overrides.fontSize ?? null,
    spacingBefore: overrides.spacingBefore ?? null,
    spacingAfter: overrides.spacingAfter ?? null,
    lineSpacing: overrides.lineSpacing ?? null,
    lineSpacingKind: overrides.lineSpacingKind ?? null,
    lineSpacingValue: overrides.lineSpacingValue ?? null,
    alignment: overrides.alignment ?? null
  };
}

function expectedSignature(
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
