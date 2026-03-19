import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { summarizeAiPostProcessingReportSummary } from "../packages/audit/aiPostProcessingReportSummary.ts";
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
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-ai-post-report-"));
  tempPaths.push(workDir);
  return path.join(workDir, fileName);
}

test("reports an admitted generated-deck narrow-envelope case with actual applied classes", async () => {
  const candidatePath = path.resolve("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-font-family-drift.pptx");
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");
  const outputPath = await createOutputPath("ai-post-processing-applied.pptx");

  const enforcement = await runTemplateEnforcementCore({
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

  const summary = summarizeAiPostProcessingReportSummary({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor.pptx",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor.pptx",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "template-placeholders.pptx",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ],
    requestedClasses: ["fontFamily"],
    templateEnforcementReport: enforcement.reportSummary
  });

  assert.equal(summary.aiPostProcessingAttempted, true);
  assert.equal(summary.scopeDecision, "aiPostProcessingEligible");
  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor.pptx");
  assert.equal(summary.admittedTemplateFamilyId, "aptos-left");
  assert.deepEqual(summary.eligibleSupportedClasses, ["fontFamily"]);
  assert.deepEqual(summary.appliedClasses, ["fontFamily"]);
  assert.deepEqual(summary.blockedClasses, []);
  assert.deepEqual(summary.untouchedUnsupportedFailureModes, []);
  assert.equal(summary.enforcementStatus, "enforcementApplied");
  assert.ok(summary.decisionReasons.includes("templateEnforcementApplied"));
  assert.ok(summary.decisionReasons.includes("postProcessingNormalizationLayerOnly"));
});

test("reports an ambiguous generated-deck case without softening the blocked outcome", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const conflictingAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-right-conflict.pptx");

  const summary = summarizeAiPostProcessingReportSummary({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor.pptx",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "aptos-template-anchor-right-conflict.pptx",
        familyId: "aptos-right-conflict",
        auditReport: conflictingAnchor
      }
    ],
    requestedClasses: ["fontFamily"]
  });

  assert.equal(summary.aiPostProcessingAttempted, false);
  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.equal(summary.templateMatchResult, "ambiguousMatch");
  assert.deepEqual(summary.appliedClasses, []);
  assert.deepEqual(summary.blockedClasses, ["fontFamily"]);
  assert.equal(summary.enforcementStatus, null);
  assert.ok(summary.decisionReasons.includes("ambiguousTemplateMatchDisallowed"));
  assert.ok(summary.decisionReasons.includes("aiPostProcessingNotAttempted"));
});

test("reports a rejected generated-deck case honestly", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-calibri-product-plan-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeAiPostProcessingReportSummary({
    candidate: {
      deckId: "ai-generated-calibri-product-plan-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor.pptx",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "template-placeholders.pptx",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ],
    requestedClasses: ["fontFamily"]
  });

  assert.equal(summary.aiPostProcessingAttempted, false);
  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.equal(summary.templateMatchResult, "rejectedMatch");
  assert.deepEqual(summary.appliedClasses, []);
  assert.deepEqual(summary.blockedClasses, ["fontFamily"]);
  assert.ok(summary.decisionReasons.includes("rejectedTemplateMatchDisallowed"));
});

test("reports unsupported generated-deck failure modes and out-of-scope requests honestly", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-layout-redesign-needed.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-multislide.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx");

  const summary = summarizeAiPostProcessingReportSummary({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-layout-redesign-needed",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor-multislide.pptx",
        familyId: "aptos-left-multi",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor-multislide.pptx",
        familyId: "calibri-left-multi",
        auditReport: calibriAnchor
      }
    ],
    requestedClasses: ["alignment", "layoutRedesign"],
    observedUnsupportedFailureModes: ["layoutRedesignRequired"]
  });

  assert.equal(summary.aiPostProcessingAttempted, false);
  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.deepEqual(summary.eligibleSupportedClasses, []);
  assert.deepEqual(summary.appliedClasses, []);
  assert.deepEqual(summary.blockedClasses, ["alignment"]);
  assert.deepEqual(summary.untouchedOutOfScopeClasses, ["layoutRedesign"]);
  assert.deepEqual(summary.untouchedUnsupportedFailureModes, ["layoutRedesignRequired"]);
  assert.ok(summary.failureModes.includes("unsupportedLayoutDrift"));
  assert.ok(summary.decisionReasons.includes("unsupportedFailureModesRemainUntouched"));
});

test("is deterministic for the same generated-deck reporting input", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-inconsistent-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx");
  const input = {
    candidate: {
      deckId: "ai-generated-aptos-quarterly-inconsistent-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor-inconsistent.pptx",
        familyId: "aptos-left-inconsistent",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor-multislide.pptx",
        familyId: "calibri-left-multi",
        auditReport: calibriAnchor
      }
    ],
    requestedClasses: ["fontFamily", "fontSize", "layoutRedesign"] as const
  };

  assert.deepEqual(
    summarizeAiPostProcessingReportSummary(input),
    summarizeAiPostProcessingReportSummary(input)
  );
});
