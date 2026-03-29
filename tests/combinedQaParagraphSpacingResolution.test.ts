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

test("combined QA paragraph-spacing residual closes without regressing boundary, hostile, or master proof", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-combined-paragraph-spacing-"));
  tempPaths.push(workDir);

  const combinedInputPath = path.join(repoRoot, "testdata", "corpus", "mixed-formatting", "combined-qa-test-deck-v1.pptx");
  const combinedOutputPath = path.join(workDir, "combined-fixed.pptx");
  const boundaryInputPath = path.join(repoRoot, "testdata", "corpus", "boundary", "mixed-hard-boundary-v1.pptx");
  const boundaryOutputPath = path.join(workDir, "boundary-fixed.pptx");
  const hostileInputPath = path.join(repoRoot, "testdata", "corpus", "hostile", "cleandeck-chaos-gate-v1.pptx");
  const hostileOutputPath = path.join(workDir, "hostile-fixed.pptx");
  const masterInputPath = path.join(repoRoot, "testdata", "corpus", "master", "cleandeck-master-acceptance-v1.pptx");
  const masterOutputPath = path.join(workDir, "master-fixed.pptx");

  const combinedBefore = analyzeSlides(await loadPresentation(combinedInputPath));
  const combinedReport = await runAllFixes(combinedInputPath, combinedOutputPath);
  const combinedAfter = analyzeSlides(await loadPresentation(combinedOutputPath));
  const boundaryReport = await runAllFixes(boundaryInputPath, boundaryOutputPath);
  await runAllFixes(hostileInputPath, hostileOutputPath);
  await runAllFixes(masterInputPath, masterOutputPath);
  const hostileAfter = analyzeSlides(await loadPresentation(hostileOutputPath));
  const masterAfter = analyzeSlides(await loadPresentation(masterOutputPath));

  assert.equal(combinedBefore.spacingDriftCount, 8);
  assert.equal(combinedReport.verification.spacingDriftBefore, 8);
  assert.equal(combinedAfter.spacingDriftCount, 0);
  assert.equal(combinedReport.verification.spacingDriftAfter, 0);
  assert.ok(combinedReport.totals.spacingChanges > 0);
  assert.equal(boundaryReport.totals.spacingChanges, 0);
  assert.equal(hostileAfter.alignmentDriftCount, 0);
  assert.equal(countLineSpacingValueDrift(hostileAfter), 0);
  assert.equal(countParagraphSpacingValueDrift(hostileAfter), 0);
  assert.equal(masterAfter.alignmentDriftCount, 0);
  assert.equal(countLineSpacingValueDrift(masterAfter), 0);
  assert.equal(countParagraphSpacingValueDrift(masterAfter), 0);

  const combinedSlide4 = await readSlideXml(combinedOutputPath, 4);
  const introParagraph = Array.from(combinedSlide4.matchAll(/<a:p>[\s\S]*?<\/a:p>/g))
    .find((match) => match[0].includes("The list below contains one symbol mismatch and one indent jump."));
  assert.ok(introParagraph);
  assert.doesNotMatch(introParagraph[0], /<a:spcAft>/);
});

function countParagraphSpacingValueDrift(audit: ReturnType<typeof analyzeSlides>): number {
  return audit.spacingDrift.driftParagraphs.filter(
    (entry) => entry.spacingBefore !== null || entry.spacingAfter !== null
  ).length;
}

function countLineSpacingValueDrift(audit: ReturnType<typeof analyzeSlides>): number {
  return audit.lineSpacingDrift.driftParagraphs.filter((entry) => entry.lineSpacing !== null).length;
}

async function readSlideXml(filePath: string, slideNumber: number): Promise<string> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const entry = archive.file(`ppt/slides/slide${slideNumber}.xml`);
  assert.ok(entry, `Missing slide ${slideNumber}`);
  return entry.async("string");
}
