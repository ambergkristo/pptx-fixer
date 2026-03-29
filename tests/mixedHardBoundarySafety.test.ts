import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) => rm(entry, { recursive: true, force: true }))
  );
});

test("mixed hard boundary deck stays untouched by spacing and font-size cleanup", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-boundary-safety-"));
  tempPaths.push(workDir);

  const inputPath = path.join(repoRoot, "testdata", "corpus", "boundary", "mixed-hard-boundary-v1.pptx");
  const outputPath = path.join(workDir, "mixed-hard-boundary-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.totals.fontFamilyChanges, 0);
  assert.equal(report.totals.fontSizeChanges, 0);
  assert.equal(report.totals.spacingChanges, 0);
  assert.equal(report.totals.alignmentChanges, 0);
  assert.equal(report.totals.bulletChanges, 0);
  assert.equal(report.totals.lineSpacingChanges, 0);

  const slide1 = await readSlideXml(outputPath, 1);
  const slide2 = await readSlideXml(outputPath, 2);
  const slide4 = await readSlideXml(outputPath, 4);

  assert.doesNotMatch(
    slide1,
    /This slide is boundary-only and should stay untouched\.[\s\S]*?<a:spcAft><a:spcPts val="1800"/
  );
  assert.doesNotMatch(
    slide2,
    /The visual role is intentional and must not be forced left\.[\s\S]*?<a:spcAft><a:spcPts val="1800"/
  );
  assert.match(
    slide4,
    /<a:rPr sz="2400"><a:latin typeface="Aptos"(?:\/>|><\/a:latin>)<\/a:rPr>[\s\S]*?Intentional centered quote must stay centered\./
  );
});

async function readSlideXml(filePath: string, slideNumber: number): Promise<string> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const entry = archive.file(`ppt/slides/slide${slideNumber}.xml`);
  assert.ok(entry, `Missing slide ${slideNumber}`);
  return entry.async("string");
}
