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

test("hostile chaos gate reduces line-spacing drift without regressing the mixed hard boundary deck", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-hostile-line-spacing-"));
  tempPaths.push(workDir);

  const hostileInputPath = path.join(repoRoot, "testdata", "corpus", "hostile", "cleandeck-chaos-gate-v1.pptx");
  const hostileOutputPath = path.join(workDir, "chaos-gate-fixed.pptx");
  const boundaryInputPath = path.join(repoRoot, "testdata", "corpus", "boundary", "mixed-hard-boundary-v1.pptx");
  const boundaryOutputPath = path.join(workDir, "mixed-hard-boundary-fixed.pptx");

  const hostileReport = await runAllFixes(hostileInputPath, hostileOutputPath);
  const boundaryReport = await runAllFixes(boundaryInputPath, boundaryOutputPath);

  assert.equal(hostileReport.verification.lineSpacingDriftBefore, 5);
  assert.equal(hostileReport.verification.lineSpacingDriftAfter, 3);
  assert.equal(hostileReport.totals.lineSpacingChanges, 3);
  assert.equal(boundaryReport.totals.lineSpacingChanges, 0);

  const hostileSlide4 = await readSlideXml(hostileOutputPath, 4);
  const hostileSlide6 = await readSlideXml(hostileOutputPath, 6);

  assert.doesNotMatch(hostileSlide4, /<a:spcPct val="90000"\/>/);
  assert.doesNotMatch(hostileSlide4, /<a:spcPct val="160000"\/>/);
  assert.match(hostileSlide4, /<a:spcPct val="120000"/);
  assert.doesNotMatch(
    hostileSlide6,
    /<a:spcPct val="145000"[\s\S]*?This paragraph mixes/
  );
});

async function readSlideXml(filePath: string, slideNumber: number): Promise<string> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const entry = archive.file(`ppt/slides/slide${slideNumber}.xml`);
  assert.ok(entry, `Missing slide ${slideNumber}`);
  return entry.async("string");
}
