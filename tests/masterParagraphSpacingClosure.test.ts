import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) => rm(entry, { recursive: true, force: true }))
  );
});

test("master paragraph-spacing drift improves without regressing mixed hard boundary safety or hostile closed categories", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-master-paragraph-spacing-"));
  tempPaths.push(workDir);

  const masterInputPath = path.join(repoRoot, "testdata", "corpus", "master", "cleandeck-master-acceptance-v1.pptx");
  const masterOutputPath = path.join(workDir, "master-fixed.pptx");
  const boundaryInputPath = path.join(repoRoot, "testdata", "corpus", "boundary", "mixed-hard-boundary-v1.pptx");
  const boundaryOutputPath = path.join(workDir, "boundary-fixed.pptx");
  const hostileInputPath = path.join(repoRoot, "testdata", "corpus", "hostile", "cleandeck-chaos-gate-v1.pptx");
  const hostileOutputPath = path.join(workDir, "hostile-fixed.pptx");

  const masterBefore = analyzeSlides(await loadPresentation(masterInputPath));
  const boundaryBefore = analyzeSlides(await loadPresentation(boundaryInputPath));
  const hostileBefore = analyzeSlides(await loadPresentation(hostileInputPath));

  const masterReport = await runAllFixes(masterInputPath, masterOutputPath);
  const boundaryReport = await runAllFixes(boundaryInputPath, boundaryOutputPath);
  const hostileReport = await runAllFixes(hostileInputPath, hostileOutputPath);

  const masterAfter = analyzeSlides(await loadPresentation(masterOutputPath));
  const boundaryAfter = analyzeSlides(await loadPresentation(boundaryOutputPath));
  const hostileAfter = analyzeSlides(await loadPresentation(hostileOutputPath));

  assert.equal(countParagraphSpacingValueDrift(masterBefore), 5);
  assert.ok(
    countParagraphSpacingValueDrift(masterAfter) < countParagraphSpacingValueDrift(masterBefore),
    "master paragraph-spacing value drift should improve"
  );

  assert.equal(boundaryReport.totals.spacingChanges, 0);
  assert.equal(countParagraphSpacingValueDrift(boundaryAfter), countParagraphSpacingValueDrift(boundaryBefore));

  assert.equal(hostileAfter.fontDrift.driftRuns.reduce((total, run) => total + run.count, 0), 0);
  assert.equal(hostileAfter.fontSizeDrift.driftRuns.reduce((total, run) => total + run.count, 0), 0);
  assert.equal(hostileAfter.alignmentDriftCount, 0);
  assert.equal(hostileAfter.bulletIndentDrift.driftParagraphs.length, 0);
  assert.ok(
    countLineSpacingValueDrift(hostileAfter) <= countLineSpacingValueDrift(hostileBefore),
    "hostile line-spacing value drift must not regress"
  );

  assert.ok(masterReport.totals.spacingChanges > 0);
});

function countParagraphSpacingValueDrift(audit: ReturnType<typeof analyzeSlides>): number {
  return audit.spacingDrift.driftParagraphs.filter(
    (entry) => entry.spacingBefore !== null || entry.spacingAfter !== null
  ).length;
}

function countLineSpacingValueDrift(audit: ReturnType<typeof analyzeSlides>): number {
  return audit.lineSpacingDrift.driftParagraphs.filter((entry) => entry.lineSpacing !== null).length;
}
