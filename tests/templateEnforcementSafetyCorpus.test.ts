import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runTemplateEnforcementCore } from "../packages/fix/runTemplateEnforcementCore.ts";

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
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-enforcement-safety-"));
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

test("safely applies multislide admitted alignment enforcement on template-driven decks", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide-alignment-drift.pptx");
  const outputPath = await createOutputPath("multislide-alignment-enforcement-output.pptx");

  const result = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide.pptx"),
        familyId: "aptos-left-multi"
      },
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx"),
        familyId: "calibri-left-multi"
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
  assert.equal(result.admittedTemplateDeckId, "aptos-template-anchor-multislide.pptx");
  assert.equal(result.admittedTemplateFamilyId, "aptos-left-multi");
  assert.deepEqual(result.appliedClasses, ["alignment"]);
  assert.deepEqual(result.blockedClasses, []);
  assert.deepEqual(result.untouchedOutOfScopeClasses, []);
  assert.deepEqual(result.stageChangeCounts, {
    alignmentChanges: 4,
    fontFamilyChanges: 0
  });
  assert.deepEqual(result.verification, {
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    alignmentDriftBefore: 4,
    alignmentDriftAfter: 0
  });

  const outputAudit = await loadAudit(outputPath);
  assert.equal(outputAudit.alignmentDriftCount, 0);
  assert.equal(outputAudit.fontDrift.driftRuns.length, 0);
  assert.equal(outputAudit.fontSizeDrift.driftRuns.length, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(candidatePath),
    await extractAllSlideTextTokens(outputPath)
  );
});

test("safely applies multislide admitted font-family enforcement and leaves out-of-scope font size untouched", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide-font-family-drift.pptx");
  const outputPath = await createOutputPath("multislide-font-family-enforcement-output.pptx");

  const result = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide.pptx"),
        familyId: "aptos-left-multi"
      },
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx"),
        familyId: "calibri-left-multi"
      },
      {
        inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
        familyId: "placeholder-heavy"
      }
    ],
    requestedClasses: ["fontFamily", "fontSize"]
  });

  assert.equal(result.enforcementStatus, "enforcementApplied");
  assert.equal(result.templateMatchResult, "admittedMatch");
  assert.equal(result.scopeDecision, "enforcementEligible");
  assert.equal(result.admittedTemplateDeckId, "aptos-template-anchor-multislide.pptx");
  assert.equal(result.admittedTemplateFamilyId, "aptos-left-multi");
  assert.deepEqual(result.appliedClasses, ["fontFamily"]);
  assert.deepEqual(result.blockedClasses, []);
  assert.deepEqual(result.untouchedOutOfScopeClasses, ["fontSize"]);
  assert.deepEqual(result.stageChangeCounts, {
    alignmentChanges: 0,
    fontFamilyChanges: 2
  });
  assert.deepEqual(result.verification, {
    fontDriftBefore: 2,
    fontDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0
  });

  const outputAudit = await loadAudit(outputPath);
  assert.equal(outputAudit.fontDrift.driftRuns.length, 0);
  assert.equal(outputAudit.fontSizeDrift.driftRuns.length, 1);
  assert.equal(outputAudit.alignmentDriftCount, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(candidatePath),
    await extractAllSlideTextTokens(outputPath)
  );
});

test("blocks multislide enforcement when external template selection is ambiguous", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide-font-family-drift.pptx");
  const outputPath = await createOutputPath("multislide-ambiguous-enforcement-output.pptx");

  const result = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide.pptx"),
        familyId: "aptos-left-multi"
      },
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide-right-conflict.pptx"),
        familyId: "aptos-right-multi"
      }
    ],
    requestedClasses: ["alignment", "fontFamily"]
  });

  assert.equal(result.enforcementStatus, "enforcementBlocked");
  assert.equal(result.templateMatchResult, "ambiguousMatch");
  assert.equal(result.scopeDecision, "enforcementBlocked");
  assert.deepEqual(result.appliedClasses, []);
  assert.deepEqual(result.blockedClasses, ["alignment", "fontFamily"]);
  assert.deepEqual(await readFile(candidatePath), await readFile(outputPath));
});

test("blocks multislide enforcement when only wrong-template anchors are available", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide-font-family-drift.pptx");
  const outputPath = await createOutputPath("multislide-rejected-enforcement-output.pptx");

  const result = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath,
    templates: [
      {
        inputPath: path.resolve("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx"),
        familyId: "calibri-left-multi"
      },
      {
        inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
        familyId: "placeholder-heavy"
      }
    ],
    requestedClasses: ["fontFamily"]
  });

  assert.equal(result.enforcementStatus, "enforcementBlocked");
  assert.equal(result.templateMatchResult, "rejectedMatch");
  assert.equal(result.scopeDecision, "enforcementBlocked");
  assert.equal(result.admittedTemplateDeckId, null);
  assert.equal(result.admittedTemplateFamilyId, null);
  assert.deepEqual(result.appliedClasses, []);
  assert.deepEqual(result.blockedClasses, ["fontFamily"]);
  assert.deepEqual(await readFile(candidatePath), await readFile(outputPath));
});

test("is deterministic across repeated multislide enforcement safety-corpus runs", async () => {
  const candidatePath = path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide-font-family-drift.pptx");
  const firstOutputPath = await createOutputPath("multislide-font-family-enforcement-first-output.pptx");
  const secondOutputPath = await createOutputPath("multislide-font-family-enforcement-second-output.pptx");

  const templates = [
    {
      inputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-multislide.pptx"),
      familyId: "aptos-left-multi"
    },
    {
      inputPath: path.resolve("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx"),
      familyId: "calibri-left-multi"
    },
    {
      inputPath: path.resolve("testdata/corpus/template-heavy/template-placeholders.pptx"),
      familyId: "placeholder-heavy"
    }
  ];

  const first = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath: firstOutputPath,
    templates,
    requestedClasses: ["fontFamily", "fontSize"]
  });
  const second = await runTemplateEnforcementCore({
    candidateInputPath: candidatePath,
    outputPath: secondOutputPath,
    templates,
    requestedClasses: ["fontFamily", "fontSize"]
  });

  assert.deepEqual(first, second);
  assert.deepEqual(await readFile(firstOutputPath), await readFile(secondOutputPath));
});
