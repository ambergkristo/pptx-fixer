import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeOutputOverwriteSafetySummary } from "../packages/fix/outputOverwriteSafetySummary.ts";

test("returns missingOutput when output is missing after write", () => {
  assert.deepEqual(
    summarizeOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputFileMetadataSummary: buildOutputFileMetadataSummary(false)
    }),
    {
      overwriteSafetyLabel: "missingOutput",
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: false,
      summaryLine: "Output overwrite status could not be determined because the output file is missing."
    }
  );
});

test("returns overwroteExistingFile when output existed before write and is present after write", () => {
  assert.deepEqual(
    summarizeOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: true,
      outputFileMetadataSummary: buildOutputFileMetadataSummary(true)
    }),
    {
      overwriteSafetyLabel: "overwroteExistingFile",
      outputExistedBeforeWrite: true,
      outputPresentAfterWrite: true,
      summaryLine: "Output file path existed before write and was overwritten."
    }
  );
});

test("returns newFile when output did not exist before write and is present after write", () => {
  assert.deepEqual(
    summarizeOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputFileMetadataSummary: buildOutputFileMetadataSummary(true)
    }),
    {
      overwriteSafetyLabel: "newFile",
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: true,
      summaryLine: "Output file path did not exist before write and a new file was produced."
    }
  );
});

test("returns unknown when pre-write existence is unavailable and output is present after write", () => {
  assert.deepEqual(
    summarizeOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: null,
      outputFileMetadataSummary: buildOutputFileMetadataSummary(true)
    }),
    {
      overwriteSafetyLabel: "unknown",
      outputExistedBeforeWrite: null,
      outputPresentAfterWrite: true,
      summaryLine: "Output overwrite status could not be determined from the available machine-readable signals."
    }
  );
});

test("is deterministic across repeated calls", () => {
  const input = {
    outputExistedBeforeWrite: false as const,
    outputFileMetadataSummary: buildOutputFileMetadataSummary(true)
  };

  assert.deepEqual(
    summarizeOutputOverwriteSafetySummary(input),
    summarizeOutputOverwriteSafetySummary(input)
  );
});

function buildOutputFileMetadataSummary(outputFilePresent: boolean) {
  return {
    outputFileName: "deck-fixed.pptx",
    outputExtension: ".pptx",
    outputFileSizeBytes: outputFilePresent ? 2048 : 0,
    outputFilePresent,
    summaryLine: outputFilePresent
      ? "Output file metadata captured successfully."
      : "Output file metadata could not be captured because the output file is missing."
  };
}
