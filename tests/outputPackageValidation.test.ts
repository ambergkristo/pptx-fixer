import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { validateOutputPackage } from "../packages/export/outputPackageValidation.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("returns valid when an output package contains all required entries", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-package-valid-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "valid.pptx");
  await writeFile(outputPath, await buildZipBuffer([
    "[Content_Types].xml",
    "_rels/.rels",
    "ppt/presentation.xml"
  ]));

  const summary = await validateOutputPackage(outputPath);

  assert.deepEqual(summary, {
    validationLabel: "valid",
    checks: {
      fileExists: true,
      nonEmptyFile: true,
      readableZip: true,
      hasContentTypes: true,
      hasRootRels: true,
      hasPresentationPart: true
    },
    summaryLine: "Output PPTX package validation passed."
  });
});

test("returns invalid when the output file is missing", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-package-missing-"));
  tempPaths.push(workDir);

  const summary = await validateOutputPackage(path.join(workDir, "missing.pptx"));

  assert.deepEqual(summary, {
    validationLabel: "invalid",
    checks: {
      fileExists: false,
      nonEmptyFile: false,
      readableZip: false,
      hasContentTypes: false,
      hasRootRels: false,
      hasPresentationPart: false
    },
    summaryLine: "Output PPTX package validation failed."
  });
});

test("returns invalid for a zero-byte file", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-package-zero-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "empty.pptx");
  await writeFile(outputPath, Buffer.alloc(0));

  const summary = await validateOutputPackage(outputPath);

  assert.deepEqual(summary, {
    validationLabel: "invalid",
    checks: {
      fileExists: true,
      nonEmptyFile: false,
      readableZip: false,
      hasContentTypes: false,
      hasRootRels: false,
      hasPresentationPart: false
    },
    summaryLine: "Output PPTX package validation failed."
  });
});

test("returns invalid for a non-zip file", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-package-notzip-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "notzip.pptx");
  await writeFile(outputPath, Buffer.from("not a zip", "utf8"));

  const summary = await validateOutputPackage(outputPath);

  assert.deepEqual(summary, {
    validationLabel: "invalid",
    checks: {
      fileExists: true,
      nonEmptyFile: true,
      readableZip: false,
      hasContentTypes: false,
      hasRootRels: false,
      hasPresentationPart: false
    },
    summaryLine: "Output PPTX package validation failed."
  });
});

test("returns invalid when required entries are missing", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-package-missing-entries-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "partial.pptx");
  await writeFile(outputPath, await buildZipBuffer([
    "[Content_Types].xml"
  ]));

  const summary = await validateOutputPackage(outputPath);

  assert.deepEqual(summary, {
    validationLabel: "invalid",
    checks: {
      fileExists: true,
      nonEmptyFile: true,
      readableZip: true,
      hasContentTypes: true,
      hasRootRels: false,
      hasPresentationPart: false
    },
    summaryLine: "Output PPTX package validation failed."
  });
});

test("is deterministic across repeated calls", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-output-package-repeat-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "repeatable.pptx");
  await writeFile(outputPath, await buildZipBuffer([
    "[Content_Types].xml",
    "_rels/.rels",
    "ppt/presentation.xml"
  ]));

  assert.deepEqual(
    await validateOutputPackage(outputPath),
    await validateOutputPackage(outputPath)
  );
});

async function buildZipBuffer(entryPaths: string[]): Promise<Buffer> {
  const archive = new JSZip();

  for (const entryPath of entryPaths) {
    archive.file(entryPath, "<xml/>");
  }

  return archive.generateAsync({ type: "nodebuffer" });
}
