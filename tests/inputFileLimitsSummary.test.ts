import { mkdtemp, open, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import {
  INPUT_FILE_SIZE_LIMIT_BYTES,
  INPUT_FILE_WARNING_THRESHOLD_BYTES,
  summarizeInputFileLimits
} from "../packages/fix/inputFileLimitsSummary.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("missing input file returns missingInput with size 0", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-input-limits-missing-"));
  tempPaths.push(workDir);

  assert.deepEqual(
    await summarizeInputFileLimits(path.join(workDir, "missing.pptx")),
    {
      inputFilePresent: false,
      inputFileSizeBytes: 0,
      sizeLimitBytes: INPUT_FILE_SIZE_LIMIT_BYTES,
      warningThresholdBytes: INPUT_FILE_WARNING_THRESHOLD_BYTES,
      limitsLabel: "missingInput",
      summaryLine: "Input file limits could not be assessed because the input file is missing."
    }
  );
});

test("small file below warning threshold returns withinLimit", async () => {
  const inputPath = await createFileWithSize(1024);

  assert.deepEqual(
    await summarizeInputFileLimits(inputPath),
    buildExpectedSummary(1024, "withinLimit")
  );
});

test("file exactly at warning threshold returns nearLimit", async () => {
  const inputPath = await createFileWithSize(INPUT_FILE_WARNING_THRESHOLD_BYTES);

  assert.deepEqual(
    await summarizeInputFileLimits(inputPath),
    buildExpectedSummary(INPUT_FILE_WARNING_THRESHOLD_BYTES, "nearLimit")
  );
});

test("file between warning threshold and hard limit returns nearLimit", async () => {
  const inputPath = await createFileWithSize(INPUT_FILE_WARNING_THRESHOLD_BYTES + 1);

  assert.deepEqual(
    await summarizeInputFileLimits(inputPath),
    buildExpectedSummary(INPUT_FILE_WARNING_THRESHOLD_BYTES + 1, "nearLimit")
  );
});

test("file exactly at hard limit returns nearLimit", async () => {
  const inputPath = await createFileWithSize(INPUT_FILE_SIZE_LIMIT_BYTES);

  assert.deepEqual(
    await summarizeInputFileLimits(inputPath),
    buildExpectedSummary(INPUT_FILE_SIZE_LIMIT_BYTES, "nearLimit")
  );
});

test("file above hard limit returns overLimit", async () => {
  const inputPath = await createFileWithSize(INPUT_FILE_SIZE_LIMIT_BYTES + 1);

  assert.deepEqual(
    await summarizeInputFileLimits(inputPath),
    buildExpectedSummary(INPUT_FILE_SIZE_LIMIT_BYTES + 1, "overLimit")
  );
});

test("repeated calls are identical", async () => {
  const inputPath = await createFileWithSize(INPUT_FILE_WARNING_THRESHOLD_BYTES);

  assert.deepEqual(
    await summarizeInputFileLimits(inputPath),
    await summarizeInputFileLimits(inputPath)
  );
});

async function createFileWithSize(sizeBytes: number): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-input-limits-"));
  tempPaths.push(workDir);

  const inputPath = path.join(workDir, "sample.pptx");
  const fileHandle = await open(inputPath, "w");
  await fileHandle.truncate(sizeBytes);
  await fileHandle.close();
  return inputPath;
}

function buildExpectedSummary(
  inputFileSizeBytes: number,
  limitsLabel: "withinLimit" | "nearLimit" | "overLimit"
) {
  return {
    inputFilePresent: true,
    inputFileSizeBytes,
    sizeLimitBytes: INPUT_FILE_SIZE_LIMIT_BYTES,
    warningThresholdBytes: INPUT_FILE_WARNING_THRESHOLD_BYTES,
    limitsLabel,
    summaryLine: limitsLabel === "withinLimit"
      ? "Input file size is within the configured basic limit."
      : limitsLabel === "nearLimit"
      ? "Input file size is near the configured basic limit."
      : "Input file size exceeds the configured basic limit."
  };
}
