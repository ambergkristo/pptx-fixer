import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type AuditReport } from "../packages/audit/pptxAudit.ts";
import { summarizeFingerprintBasedNormalizationExperimentPlan, runFingerprintBasedNormalizationExperiment } from "../packages/experiment/fingerprintBasedNormalizationExperiment.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

async function loadAudit(relPath: string) {
  return analyzeSlides(await loadPresentation(path.resolve(relPath)));
}

function cloneAuditReport(auditReport: AuditReport): AuditReport {
  return structuredClone(auditReport);
}

async function createOutputPath(fileName: string): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-fingerprint-experiment-"));
  tempPaths.push(workDir);
  return path.join(workDir, fileName);
}

async function extractAllSlideTextTokens(filePath: string): Promise<string[][]> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const slideEntries = Object.keys(archive.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    .sort((left, right) => {
      const leftIndex = Number.parseInt(left.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      const rightIndex = Number.parseInt(right.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      return leftIndex - rightIndex;
    });

  return Promise.all(
    slideEntries.map(async (entryPath) => {
      const xml = await archive.file(entryPath)?.async("string");
      assert.ok(xml, `Missing archive entry ${entryPath}`);
      return [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((match) => match[1]);
    })
  );
}

test("moderate-confidence corpus case applies a limited experimental alignment pass", async () => {
  const inputPath = path.resolve("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const outputPath = await createOutputPath("alignment-experiment-output.pptx");

  const result = await runFingerprintBasedNormalizationExperiment({
    candidateInputPath: inputPath,
    outputPath,
    templateInputPath: inputPath
  });

  assert.equal(result.experimentStatus, "experimentApplied");
  assert.equal(result.templateMatchConfidenceLabel, "moderate");
  assert.deepEqual(result.sharedTargets, {
    fontFamily: "Calibri",
    fontSize: 24,
    alignment: "left"
  });
  assert.deepEqual(result.selectedExperimentStages, ["dominantBodyStyleFix"]);
  assert.deepEqual(result.stageChangeCounts, {
    fontFamilyChanges: 0,
    fontSizeChanges: 0,
    alignmentChanges: 2
  });
  assert.deepEqual(result.verification, {
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 0,
    fontSizeDriftAfter: 0,
    alignmentDriftBefore: 2,
    alignmentDriftAfter: 0
  });
  assert.equal(result.defaultCleanupPathAffected, false);
  assert.equal(result.explicitExperimentInvocationRequired, true);
  assert.equal(result.templateEnforcementSolved, false);

  const outputAudit = await loadAudit(outputPath);
  assert.equal(outputAudit.alignmentDriftCount, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(inputPath),
    await extractAllSlideTextTokens(outputPath)
  );
});

test("weak confidence degrades to notEligible and produces a no-op output", async () => {
  const inputPath = path.resolve("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const templatePath = path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx");
  const outputPath = await createOutputPath("alignment-experiment-not-eligible.pptx");

  const result = await runFingerprintBasedNormalizationExperiment({
    candidateInputPath: inputPath,
    outputPath,
    templateInputPath: templatePath
  });

  assert.equal(result.experimentStatus, "notEligible");
  assert.equal(result.templateMatchConfidenceLabel, "weak");
  assert.deepEqual(result.selectedExperimentStages, []);
  assert.equal(result.plan.planStatus, "notEligible");
  assert.ok(result.plan.blockingReasons.includes("moderateConfidenceRequired"));
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("blocked confidence stays blocked in the experiment plan", async () => {
  const alignmentAudit = await loadAudit("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const conflictingTemplateAudit = cloneAuditReport(alignmentAudit);

  conflictingTemplateAudit.deckStyleFingerprint.alignment = "right";
  conflictingTemplateAudit.slides = conflictingTemplateAudit.slides.map((slide) => ({
    ...slide,
    dominantBodyStyle: {
      ...slide.dominantBodyStyle,
      alignment: "right"
    }
  }));

  const plan = summarizeFingerprintBasedNormalizationExperimentPlan({
    candidate: {
      deckId: "alignment-body-style-drift",
      auditReport: alignmentAudit
    },
    template: {
      deckId: "synthetic-conflicting-template",
      auditReport: conflictingTemplateAudit
    }
  });

  assert.equal(plan.planStatus, "blocked");
  assert.equal(plan.templateMatchConfidenceLabel, "blocked");
  assert.deepEqual(plan.selectedExperimentStages, []);
  assert.ok(plan.blockingReasons.includes("templateMatchConfidenceBlocked"));
});

test("null-capped and future-only dimensions do not produce experiment actions", async () => {
  const alignmentAudit = await loadAudit("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const templateAudit = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const plan = summarizeFingerprintBasedNormalizationExperimentPlan({
    candidate: {
      deckId: "alignment-body-style-drift",
      auditReport: alignmentAudit
    },
    template: {
      deckId: "template-placeholders",
      auditReport: templateAudit
    }
  });

  assert.equal(plan.planStatus, "notEligible");
  assert.deepEqual(plan.selectedExperimentStages, []);
  assert.deepEqual(plan.excludedNormalizationDimensions, [
    "paragraphGroupStyleSignatures",
    "lineSpacing",
    "paragraphSpacing",
    "bulletIndentation"
  ]);
  assert.deepEqual(plan.futureOnlyDimensionsExcluded, [
    "repeatedLayoutModuleSignatures",
    "placeholderRolePatterns",
    "templateSlotSimilarity",
    "slideFamilyClustering",
    "templateMatchConfidenceTraits"
  ]);
  assert.deepEqual(plan.outOfScopeDimensionsExcluded, [
    "semanticNarrativeIntent",
    "contentMeaning",
    "aiStyleSimilarity",
    "orgPolicyComplianceScoring",
    "fullTemplateEnforcementSignals"
  ]);
  assert.equal(plan.sharedTargets.alignment, null);
});

test("repeated experimental runs are deterministic", async () => {
  const inputPath = path.resolve("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const firstOutputPath = await createOutputPath("alignment-experiment-first.pptx");
  const secondOutputPath = await createOutputPath("alignment-experiment-second.pptx");

  const first = await runFingerprintBasedNormalizationExperiment({
    candidateInputPath: inputPath,
    outputPath: firstOutputPath,
    templateInputPath: inputPath
  });
  const second = await runFingerprintBasedNormalizationExperiment({
    candidateInputPath: inputPath,
    outputPath: secondOutputPath,
    templateInputPath: inputPath
  });

  assert.deepEqual(first, second);
  assert.deepEqual(await readFile(firstOutputPath), await readFile(secondOutputPath));
});

test("normal non-experimental cleanup path remains unchanged", async () => {
  const inputPath = path.resolve("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const outputPath = await createOutputPath("alignment-normal-runAllFixes-output.pptx");

  const report = await runAllFixes(inputPath, outputPath);
  const stageNames = report.steps.map((step) => step.name);

  assert.equal(report.applied, true);
  assert.ok(stageNames.includes("alignmentFix"));
  assert.equal(stageNames.includes("fontFamilyFix"), true);
  assert.equal(stageNames.includes("fontSizeFix"), true);
  assert.equal(stageNames.includes("dominantBodyStyleFix"), true);
  assert.equal(stageNames.includes("lineSpacingFix"), true);
  assert.equal(stageNames.includes("spacingFix"), true);
  assert.equal(stageNames.includes("bulletFix"), true);
  assert.equal(stageNames.includes("dominantFontFamilyFix"), true);
  assert.equal(stageNames.includes("dominantFontSizeFix"), true);
  assert.equal(report.verification.alignmentDriftAfter, 0);
});
