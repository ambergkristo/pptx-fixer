import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("exact paragraph-spacing stress repro remains a deterministic worsening surface on the current engine", async () => {
  const inputPath = path.join(repoRoot, "testdata", "corpus", "hostile", "formatting-drift-stress-repro-v1.pptx");
  const outputDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-paragraph-spacing-stress-repro-"));
  tempPaths.push(outputDir);
  const outputPath = path.join(outputDir, "formatting-drift-stress-repro-v1-fixed.pptx");
  const secondOutputPath = path.join(outputDir, "formatting-drift-stress-repro-v1-fixed-second-pass.pptx");

  const beforeAudit = analyzeSlides(await loadPresentation(inputPath));
  assert.equal(beforeAudit.slideCount, 10);
  assert.equal(
    beforeAudit.spacingDrift.driftParagraphs.filter((entry) => entry.spacingBefore !== null || entry.spacingAfter !== null).length,
    44
  );
  assert.equal(
    beforeAudit.spacingDrift.driftParagraphs.filter((entry) => entry.spacingBefore === null && entry.spacingAfter === null).length,
    4
  );

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.verification.fontDriftBefore, 17);
  assert.equal(report.verification.fontDriftAfter, 0);
  assert.equal(report.verification.fontSizeDriftBefore, 11);
  assert.equal(report.verification.fontSizeDriftAfter, 0);
  assert.equal(report.verification.spacingDriftBefore, 48);
  assert.equal(report.verification.spacingDriftAfter, 55);
  assert.equal(report.verification.lineSpacingDriftBefore, 11);
  assert.equal(report.verification.lineSpacingDriftAfter, 11);
  assert.equal(report.verification.bulletIndentDriftBefore, 13);
  assert.equal(report.verification.bulletIndentDriftAfter, 13);
  assert.equal(report.totals.fontFamilyChanges, 41);
  assert.equal(report.totals.fontSizeChanges, 67);
  assert.equal(report.totals.spacingChanges, 9);
  assert.equal(report.totals.lineSpacingChanges, 0);
  assert.equal(report.totals.bulletChanges, 0);
  assert.equal(report.changesBySlide.length, 10);

  const afterAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.equal(
    afterAudit.spacingDrift.driftParagraphs.filter((entry) => entry.spacingBefore !== null || entry.spacingAfter !== null).length,
    55
  );
  assert.equal(
    afterAudit.spacingDrift.driftParagraphs.filter((entry) => entry.spacingBefore === null && entry.spacingAfter === null).length,
    0
  );

  const secondReport = await runAllFixes(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});
