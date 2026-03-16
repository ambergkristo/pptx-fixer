import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeParagraphGroups,
  type SlideStructureParagraphDescriptor
} from "../packages/audit/slideStructureAudit.ts";

test("summarizeParagraphGroups detects simple title and body structure", () => {
  const paragraphs = [
    paragraph({ shape: 1, isTitle: true }),
    paragraph({ shape: 2 }),
    paragraph({ shape: 2 })
  ];

  assert.deepEqual(summarizeParagraphGroups(paragraphs), [
    {
      type: "title",
      paragraphCount: 1
    },
    {
      type: "body",
      paragraphCount: 2
    }
  ]);
});

test("summarizeParagraphGroups detects bullet list groups conservatively", () => {
  const paragraphs = [
    paragraph({ shape: 1, isBullet: true, bulletLevel: 0 }),
    paragraph({ shape: 1, isBullet: true, bulletLevel: 1 }),
    paragraph({ shape: 1, isBullet: true, bulletLevel: 1 })
  ];

  assert.deepEqual(summarizeParagraphGroups(paragraphs), [
    {
      type: "bulletList",
      paragraphCount: 3
    }
  ]);
});

test("summarizeParagraphGroups splits mixed body runs into body and standalone groups", () => {
  const paragraphs = [
    paragraph({ shape: 1, spacingAfter: "12pt" }),
    paragraph({ shape: 1, spacingAfter: "24pt" }),
    paragraph({ shape: 1, spacingAfter: "24pt" }),
    paragraph({ shape: 1, isBullet: true, bulletLevel: 0 }),
    paragraph({ shape: 1, isBullet: true, bulletLevel: 1 }),
    paragraph({ shape: 1, alignment: "center" })
  ];

  assert.deepEqual(summarizeParagraphGroups(paragraphs), [
    {
      type: "standalone",
      paragraphCount: 1
    },
    {
      type: "body",
      paragraphCount: 2
    },
    {
      type: "bulletList",
      paragraphCount: 2
    },
    {
      type: "standalone",
      paragraphCount: 1
    }
  ]);
});

test("summarizeParagraphGroups avoids bullet groups when slides have no bullets", () => {
  const paragraphs = [
    paragraph({ shape: 1 }),
    paragraph({ shape: 1 }),
    paragraph({ shape: 2, spacingAfter: "12pt" })
  ];

  assert.deepEqual(summarizeParagraphGroups(paragraphs), [
    {
      type: "body",
      paragraphCount: 2
    },
    {
      type: "standalone",
      paragraphCount: 1
    }
  ]);
});

test("summarizeParagraphGroups is deterministic for repeated calls", () => {
  const paragraphs = [
    paragraph({ shape: 1, isTitle: true }),
    paragraph({ shape: 2 }),
    paragraph({ shape: 2, isBullet: true, bulletLevel: 0 }),
    paragraph({ shape: 2, isBullet: true, bulletLevel: 0 }),
    paragraph({ shape: 2, alignment: "center" })
  ];

  const first = summarizeParagraphGroups(paragraphs);
  const second = summarizeParagraphGroups(paragraphs);

  assert.deepEqual(second, first);
});

function paragraph(
  overrides: Partial<SlideStructureParagraphDescriptor>
): SlideStructureParagraphDescriptor {
  return {
    shape: overrides.shape ?? 1,
    isTitle: overrides.isTitle ?? false,
    isBullet: overrides.isBullet ?? false,
    bulletLevel: overrides.bulletLevel ?? null,
    spacingBefore: overrides.spacingBefore ?? null,
    spacingAfter: overrides.spacingAfter ?? null,
    lineSpacing: overrides.lineSpacing ?? null,
    alignment: overrides.alignment ?? null
  };
}
