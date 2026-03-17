import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import { summarizeOutputFileMetadata } from "../packages/export/outputFileMetadataSummary.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("reports existing output file metadata correctly", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-file-meta-existing-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "Deck-Fixed.PPTX");
  const buffer = Buffer.from("hello", "utf8");
  await writeFile(outputPath, buffer);

  const summary = await summarizeOutputFileMetadata(outputPath);

  assert.deepEqual(summary, {
    outputFileName: "Deck-Fixed.PPTX",
    outputExtension: ".pptx",
    outputFileSizeBytes: buffer.length,
    outputFilePresent: true,
    summaryLine: "Output file metadata captured successfully."
  });
});

test("reports missing file metadata with empty values", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-file-meta-missing-"));
  tempPaths.push(workDir);

  const summary = await summarizeOutputFileMetadata(path.join(workDir, "missing.pptx"));

  assert.deepEqual(summary, {
    outputFileName: "",
    outputExtension: "",
    outputFileSizeBytes: 0,
    outputFilePresent: false,
    summaryLine: "Output file metadata could not be captured because the output file is missing."
  });
});

test("reports present zero-byte files with size zero", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-file-meta-zero-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "zero.pptx");
  await writeFile(outputPath, Buffer.alloc(0));

  const summary = await summarizeOutputFileMetadata(outputPath);

  assert.deepEqual(summary, {
    outputFileName: "zero.pptx",
    outputExtension: ".pptx",
    outputFileSizeBytes: 0,
    outputFilePresent: true,
    summaryLine: "Output file metadata captured successfully."
  });
});

test("is deterministic across repeated calls", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-file-meta-repeat-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "repeatable.PPTX");
  await writeFile(outputPath, Buffer.from("repeat", "utf8"));

  assert.deepEqual(
    await summarizeOutputFileMetadata(outputPath),
    await summarizeOutputFileMetadata(outputPath)
  );
});
