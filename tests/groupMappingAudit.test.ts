import { test } from "node:test";
import assert from "node:assert/strict";

import { attachParagraphGroupMappings } from "../packages/audit/groupMappingAudit.ts";
import {
  groupParagraphs,
  type SlideStructureParagraphDescriptor
} from "../packages/audit/slideStructureAudit.ts";

test("attachParagraphGroupMappings assigns correct start and end indexes for title and body groups", () => {
  const groups = attachParagraphGroupMappings(groupParagraphs([
    paragraph({ shape: 1, shapeParagraphIndex: 0, isTitle: true }),
    paragraph({ shape: 2, shapeParagraphIndex: 0 }),
    paragraph({ shape: 2, shapeParagraphIndex: 1 })
  ]));

  assert.deepEqual(groups, [
    {
      type: "title",
      paragraphCount: 1,
      startParagraphIndex: 0,
      endParagraphIndex: 0
    },
    {
      type: "body",
      paragraphCount: 2,
      startParagraphIndex: 0,
      endParagraphIndex: 1
    }
  ]);
});

test("attachParagraphGroupMappings assigns correct local range for bullet lists", () => {
  const groups = attachParagraphGroupMappings(groupParagraphs([
    paragraph({ shape: 1, shapeParagraphIndex: 0, isBullet: true, bulletLevel: 0 }),
    paragraph({ shape: 1, shapeParagraphIndex: 1, isBullet: true, bulletLevel: 1 }),
    paragraph({ shape: 1, shapeParagraphIndex: 2, isBullet: true, bulletLevel: 1 })
  ]));

  assert.deepEqual(groups, [
    {
      type: "bulletList",
      paragraphCount: 3,
      startParagraphIndex: 0,
      endParagraphIndex: 2
    }
  ]);
});

test("attachParagraphGroupMappings keeps standalone range on a single index", () => {
  const groups = attachParagraphGroupMappings(groupParagraphs([
    paragraph({ shape: 1, shapeParagraphIndex: 0, spacingAfter: "12pt" }),
    paragraph({ shape: 1, shapeParagraphIndex: 1, spacingAfter: "24pt" }),
    paragraph({ shape: 1, shapeParagraphIndex: 2, spacingAfter: "24pt" })
  ]));

  assert.deepEqual(groups, [
    {
      type: "standalone",
      paragraphCount: 1,
      startParagraphIndex: 0,
      endParagraphIndex: 0
    },
    {
      type: "body",
      paragraphCount: 2,
      startParagraphIndex: 1,
      endParagraphIndex: 2
    }
  ]);
});

test("attachParagraphGroupMappings is deterministic for repeated calls", () => {
  const paragraphs = [
    paragraph({ shape: 1, shapeParagraphIndex: 0, isTitle: true }),
    paragraph({ shape: 2, shapeParagraphIndex: 0 }),
    paragraph({ shape: 2, shapeParagraphIndex: 1, isBullet: true, bulletLevel: 0 }),
    paragraph({ shape: 2, shapeParagraphIndex: 2, isBullet: true, bulletLevel: 0 }),
    paragraph({ shape: 2, shapeParagraphIndex: 3, alignment: "center" })
  ];

  const first = attachParagraphGroupMappings(groupParagraphs(paragraphs));
  const second = attachParagraphGroupMappings(groupParagraphs(paragraphs));

  assert.deepEqual(second, first);
});

test("attachParagraphGroupMappings keeps paragraphCount aligned with index range", () => {
  const groups = attachParagraphGroupMappings(groupParagraphs([
    paragraph({ shape: 1, shapeParagraphIndex: 0 }),
    paragraph({ shape: 1, shapeParagraphIndex: 1 }),
    paragraph({ shape: 1, shapeParagraphIndex: 2, alignment: "center" })
  ]));

  for (const group of groups) {
    assert.equal(group.paragraphCount, group.endParagraphIndex - group.startParagraphIndex + 1);
  }
});

function paragraph(
  overrides: Partial<SlideStructureParagraphDescriptor>
): SlideStructureParagraphDescriptor {
  return {
    shape: overrides.shape ?? 1,
    shapeParagraphIndex: overrides.shapeParagraphIndex ?? 0,
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
