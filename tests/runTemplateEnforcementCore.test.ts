import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runTemplateEnforcementCore } from "../packages/fix/runTemplateEnforcementCore.ts";
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

async function createOutputPath(fileName: string): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-template-enforcement-"));
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

test("applies alignment enforcement only after an admitted external template match", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-alignment-drift.pptx");
  const outputPath = await createOutputPath("alignment-enforcement-output.pptx");

  const result = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor.pptx"),
        familyId: "aptos-left"
      },
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/font-family-template-anchor.pptx"),
        familyId: "calibri-left"
      },
      {
        inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
        familyId: "placeholder-heavy"
      }
    ],
    requestedClasses: ["alignment"]
  });

  assert.equal(result.enforcementStatus, "enforcementApplied");
  assert.equal(result.templateMatchResult, "admittedMatch");
  assert.equal(result.scopeDecision, "enforcementEligible");
  assert.equal(result.admittedTemplateDeckId, "aptos-template-anchor.pptx");
  assert.equal(result.admittedTemplateFamilyId, "aptos-left");
  assert.deepEqual(result.requestedClasses, ["alignment"]);
  assert.deepEqual(result.appliedClasses, ["alignment"]);
  assert.deepEqual(result.blockedClasses, []);
  assert.deepEqual(result.untouchedOutOfScopeClasses, []);
  assert.deepEqual(result.stageChangeCounts, {
    alignmentChanges: 2,
    fontFamilyChanges: 0
  });
  assert.deepEqual(result.verification, {
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    alignmentDriftBefore: 2,
    alignmentDriftAfter: 0
  });

  const outputAudit = await loadAudit(outputPath);
  assert.equal(outputAudit.alignmentDriftCount, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(candidatePath),
    await extractAllSlideTextTokens(outputPath)
  );
});

test("applies font-family enforcement only after an admitted external template match", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const outputPath = await createOutputPath("font-family-enforcement-output.pptx");

  const result = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor.pptx"),
        familyId: "aptos-left"
      },
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/font-family-template-anchor.pptx"),
        familyId: "calibri-left"
      },
      {
        inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
        familyId: "placeholder-heavy"
      }
    ],
    requestedClasses: ["fontFamily"]
  });

  assert.equal(result.enforcementStatus, "enforcementApplied");
  assert.equal(result.templateMatchResult, "admittedMatch");
  assert.equal(result.scopeDecision, "enforcementEligible");
  assert.equal(result.admittedTemplateDeckId, "aptos-template-anchor.pptx");
  assert.equal(result.admittedTemplateFamilyId, "aptos-left");
  assert.deepEqual(result.requestedClasses, ["fontFamily"]);
  assert.deepEqual(result.appliedClasses, ["fontFamily"]);
  assert.deepEqual(result.blockedClasses, []);
  assert.deepEqual(result.untouchedOutOfScopeClasses, []);
  assert.deepEqual(result.stageChangeCounts, {
    alignmentChanges: 0,
    fontFamilyChanges: 1
  });
  assert.deepEqual(result.verification, {
    fontDriftBefore: 1,
    fontDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0
  });

  const outputAudit = await loadAudit(outputPath);
  assert.equal(outputAudit.fontDrift.driftRuns.length, 0);
  assert.equal(outputAudit.alignmentDriftCount, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(candidatePath),
    await extractAllSlideTextTokens(outputPath)
  );
});

test("keeps out-of-scope requests untouched even when an in-scope enforcement class is applied", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const outputPath = await createOutputPath("font-family-enforcement-with-out-of-scope-request-output.pptx");

  const result = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor.pptx"),
        familyId: "aptos-left"
      },
      {
        inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
        familyId: "placeholder-heavy"
      }
    ],
    requestedClasses: ["fontFamily", "fontSize"]
  });

  assert.equal(result.enforcementStatus, "enforcementApplied");
  assert.deepEqual(result.appliedClasses, ["fontFamily"]);
  assert.deepEqual(result.blockedClasses, []);
  assert.deepEqual(result.untouchedOutOfScopeClasses, ["fontSize"]);
  assert.deepEqual(result.requestedClasses, ["fontFamily", "fontSize"]);
  assert.deepEqual(result.stageChangeCounts, {
    alignmentChanges: 0,
    fontFamilyChanges: 1
  });
});

test("blocks enforcement when external template selection is ambiguous", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const outputPath = await createOutputPath("ambiguous-enforcement-output.pptx");

  const result = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor.pptx"),
        familyId: "aptos-left"
      },
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-right-conflict.pptx"),
        familyId: "aptos-right-conflict"
      },
      {
        inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
        familyId: "placeholder-heavy"
      }
    ],
    requestedClasses: ["alignment", "fontFamily"]
  });

  assert.equal(result.enforcementStatus, "enforcementBlocked");
  assert.equal(result.templateMatchResult, "ambiguousMatch");
  assert.equal(result.scopeDecision, "enforcementBlocked");
  assert.deepEqual(result.appliedClasses, []);
  assert.deepEqual(result.blockedClasses, ["alignment", "fontFamily"]);
  assert.ok(result.decisionReasons.includes("ambiguousTemplateMatchBlocked"));
  assert.deepEqual(await readFile(candidatePath), await readFile(outputPath));
});

test("is deterministic for repeated external-template enforcement runs", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const firstOutputPath = await createOutputPath("font-family-enforcement-first-output.pptx");
  const secondOutputPath = await createOutputPath("font-family-enforcement-second-output.pptx");

  const first = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath: firstOutputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor.pptx"),
        familyId: "aptos-left"
      },
      {
        inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
        familyId: "placeholder-heavy"
      }
    ],
    requestedClasses: ["fontFamily"]
  });
  const second = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath: secondOutputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor.pptx"),
        familyId: "aptos-left"
      },
      {
        inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
        familyId: "placeholder-heavy"
      }
    ],
    requestedClasses: ["fontFamily"]
  });

  assert.deepEqual(first, second);
  assert.deepEqual(await readFile(firstOutputPath), await readFile(secondOutputPath));
});

test("normal non-template cleanup path remains unchanged", async () => {
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
});
