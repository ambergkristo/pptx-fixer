import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeInputOutputPathRelationship } from "../packages/fix/inputOutputPathRelationshipSummary.ts";

test("returns unknown when both paths are unavailable", () => {
  assert.deepEqual(
    summarizeInputOutputPathRelationship({
      inputPath: null,
      outputPath: null
    }),
    {
      pathRelationshipLabel: "unknown",
      inputPathAvailable: false,
      outputPathAvailable: false,
      samePath: null,
      summaryLine: "Input and output path relationship could not be determined from the available machine-readable signals."
    }
  );
});

test("returns unknown when only one path is available", () => {
  assert.deepEqual(
    summarizeInputOutputPathRelationship({
      inputPath: "input.pptx",
      outputPath: null
    }),
    {
      pathRelationshipLabel: "unknown",
      inputPathAvailable: true,
      outputPathAvailable: false,
      samePath: null,
      summaryLine: "Input and output path relationship could not be determined from the available machine-readable signals."
    }
  );
});

test("returns samePath when both paths resolve to the same path", () => {
  assert.deepEqual(
    summarizeInputOutputPathRelationship({
      inputPath: path.join("tmp", "..", "deck.pptx"),
      outputPath: "deck.pptx"
    }),
    {
      pathRelationshipLabel: "samePath",
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: true,
      summaryLine: "Input and output paths resolve to the same file path."
    }
  );
});

test("returns differentPath when both paths resolve to different paths", () => {
  assert.deepEqual(
    summarizeInputOutputPathRelationship({
      inputPath: "deck.pptx",
      outputPath: "deck-fixed.pptx"
    }),
    {
      pathRelationshipLabel: "differentPath",
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: false,
      summaryLine: "Input and output paths resolve to different file paths."
    }
  );
});

test("is deterministic across repeated calls", () => {
  const input = {
    inputPath: "deck.pptx",
    outputPath: "deck-fixed.pptx"
  };

  assert.deepEqual(
    summarizeInputOutputPathRelationship(input),
    summarizeInputOutputPathRelationship(input)
  );
});
