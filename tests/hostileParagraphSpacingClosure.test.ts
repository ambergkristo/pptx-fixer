import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) => rm(entry, { recursive: true, force: true }))
  );
});

test("hostile paragraph-spacing drift closes without regressing the mixed hard boundary deck", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-hostile-paragraph-spacing-"));
  tempPaths.push(workDir);

  const hostileInputPath = path.join(repoRoot, "testdata", "corpus", "hostile", "cleandeck-chaos-gate-v1.pptx");
  const hostileOutputPath = path.join(workDir, "chaos-gate-fixed.pptx");
  const boundaryInputPath = path.join(repoRoot, "testdata", "corpus", "boundary", "mixed-hard-boundary-v1.pptx");
  const boundaryOutputPath = path.join(workDir, "mixed-hard-boundary-fixed.pptx");

  const hostileBefore = analyzeSlides(await loadPresentation(hostileInputPath));
  const hostileReport = await runAllFixes(hostileInputPath, hostileOutputPath);
  const hostileAfter = analyzeSlides(await loadPresentation(hostileOutputPath));
  const boundaryReport = await runAllFixes(boundaryInputPath, boundaryOutputPath);

  assert.ok(countParagraphSpacingValueDrift(hostileBefore) > 0);
  assert.equal(countParagraphSpacingValueDrift(hostileAfter), 0);
  assert.ok(hostileReport.totals.spacingChanges >= 3);
  assert.equal(boundaryReport.totals.spacingChanges, 0);

  const hostileSlide6 = await readSlideXml(hostileOutputPath, 6);
  assert.doesNotMatch(
    hostileSlide6,
    /This paragraph mixes[\s\S]*?<a:spcPts val="3000"/
  );
  assert.match(
    hostileSlide6,
    /This paragraph mixes[\s\S]*?<a:spcPts val="1200"/
  );
});

function countParagraphSpacingValueDrift(audit: ReturnType<typeof analyzeSlides>): number {
  return audit.spacingDrift.driftParagraphs.filter(
    (entry) => entry.spacingBefore !== null || entry.spacingAfter !== null
  ).length;
}

async function readSlideXml(filePath: string, slideNumber: number): Promise<string> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const entry = archive.file(`ppt/slides/slide${slideNumber}.xml`);
  assert.ok(entry, `Missing slide ${slideNumber}`);
  return entry.async("string");
}
