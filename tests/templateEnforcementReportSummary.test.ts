import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import { runTemplateEnforcementCore } from "../packages/fix/runTemplateEnforcementCore.ts";
import { summarizeTemplateEnforcementReportSummary } from "../packages/audit/templateEnforcementReportSummary.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

async function createOutputPath(fileName: string): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-template-enforcement-report-"));
  tempPaths.push(workDir);
  return path.join(workDir, fileName);
}

test("reports admitted alignment enforcement honestly", async () => {
  const result = await runTemplateEnforcementCore({
    candidateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-alignment-drift.pptx"),
    outputPath: await createOutputPath("alignment-report-output.pptx"),
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
    requestedClasses: ["alignment"]
  });

  const summary = result.reportSummary;

  assert.equal(summary.enforcementStatus, "enforcementApplied");
  assert.equal(summary.enforcementAllowed, true);
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor.pptx");
  assert.equal(summary.admittedTemplateFamilyId, "aptos-left");
  assert.deepEqual(summary.requestedClasses, ["alignment"]);
  assert.deepEqual(summary.appliedClasses, ["alignment"]);
  assert.deepEqual(summary.blockedClasses, []);
  assert.deepEqual(summary.untouchedOutOfScopeClasses, []);
  assert.deepEqual(summary.unchangedRequestedClasses, []);
  assert.equal(summary.normalNonTemplateCleanupPathSeparate, true);
  assert.equal(
    summary.summaryLine,
    "Template enforcement reporting records a narrow admitted-template enforcement pass for currently in-scope classes only."
  );
});

test("reports admitted font-family enforcement with out-of-scope request left untouched", async () => {
  const result = await runTemplateEnforcementCore({
    candidateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx"),
    outputPath: await createOutputPath("font-family-report-output.pptx"),
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

  const summary = result.reportSummary;

  assert.equal(summary.enforcementStatus, "enforcementApplied");
  assert.equal(summary.enforcementAllowed, true);
  assert.deepEqual(summary.requestedClasses, ["fontFamily", "fontSize"]);
  assert.deepEqual(summary.appliedClasses, ["fontFamily"]);
  assert.deepEqual(summary.blockedClasses, []);
  assert.deepEqual(summary.untouchedOutOfScopeClasses, ["fontSize"]);
  assert.deepEqual(summary.unchangedRequestedClasses, ["fontSize"]);
});

test("reports ambiguous enforcement as blocked without hiding the failure", async () => {
  const result = await runTemplateEnforcementCore({
    candidateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx"),
    outputPath: await createOutputPath("ambiguous-report-output.pptx"),
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

  const summary = result.reportSummary;

  assert.equal(summary.enforcementStatus, "enforcementBlocked");
  assert.equal(summary.enforcementAllowed, false);
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.equal(summary.admittedTemplateFamilyId, null);
  assert.deepEqual(summary.appliedClasses, []);
  assert.deepEqual(summary.blockedClasses, ["alignment", "fontFamily"]);
  assert.deepEqual(summary.unchangedRequestedClasses, ["alignment", "fontFamily"]);
  assert.ok(summary.decisionReasons.includes("ambiguousTemplateMatchBlocked"));
  assert.equal(
    summary.summaryLine,
    "Template enforcement reporting records a blocked outcome because admitted external-template preconditions were not satisfied."
  );
});

test("reports out-of-scope request as noop with admitted anchor still visible", async () => {
  const result = await runTemplateEnforcementCore({
    candidateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx"),
    outputPath: await createOutputPath("out-of-scope-report-output.pptx"),
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
    requestedClasses: ["fontSize"]
  });

  const summary = result.reportSummary;

  assert.equal(summary.enforcementStatus, "enforcementNoop");
  assert.equal(summary.enforcementAllowed, false);
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor.pptx");
  assert.equal(summary.admittedTemplateFamilyId, "aptos-left");
  assert.deepEqual(summary.requestedClasses, ["fontSize"]);
  assert.deepEqual(summary.appliedClasses, []);
  assert.deepEqual(summary.blockedClasses, []);
  assert.deepEqual(summary.untouchedOutOfScopeClasses, ["fontSize"]);
  assert.deepEqual(summary.unchangedRequestedClasses, ["fontSize"]);
  assert.ok(summary.decisionReasons.includes("requestedClassesOutsideCurrentScope"));
  assert.equal(
    summary.summaryLine,
    "Template enforcement reporting records a no-op because requested classes were outside the current narrow enforcement envelope."
  );
});

test("is deterministic for repeated report summary generation", async () => {
  const result = await runTemplateEnforcementCore({
    candidateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx"),
    outputPath: await createOutputPath("deterministic-report-output.pptx"),
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

  assert.deepEqual(
    summarizeTemplateEnforcementReportSummary(result),
    summarizeTemplateEnforcementReportSummary(result)
  );
  assert.deepEqual(result.reportSummary, summarizeTemplateEnforcementReportSummary(result));
});
