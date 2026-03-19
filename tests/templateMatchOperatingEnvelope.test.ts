import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { summarizeTemplateMatchOperatingEnvelope } from "../packages/audit/templateMatchOperatingEnvelope.ts";
import { runFingerprintBasedNormalizationExperiment } from "../packages/experiment/fingerprintBasedNormalizationExperiment.ts";

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
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-template-envelope-"));
  tempPaths.push(workDir);
  return path.join(workDir, fileName);
}

test("admits an external alignment anchor and rejects wrong-family anchors", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-alignment-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-alignment-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "font-family-template-anchor",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      },
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      }
    ]
  });

  assert.equal(summary.matchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor");
  assert.equal(summary.admittedTemplateFamilyId, "aptos-left");
  assert.equal(summary.admittedTemplateCount, 1);
  assert.equal(summary.blockedTemplateCount, 0);
  assert.equal(summary.rejectedTemplateCount, 2);
  assert.deepEqual(summary.decisionReasons, ["exactlyOneModerateExternalAnchor"]);
  assert.deepEqual(
    summary.evaluations.map((evaluation) => ({
      templateDeckId: evaluation.templateDeckId,
      decisionRole: evaluation.decisionRole,
      confidenceLabel: evaluation.confidenceLabel
    })),
    [
      {
        templateDeckId: "aptos-template-anchor",
        decisionRole: "admittedCandidate",
        confidenceLabel: "moderate"
      },
      {
        templateDeckId: "font-family-template-anchor",
        decisionRole: "rejectedCandidate",
        confidenceLabel: "unavailable"
      },
      {
        templateDeckId: "template-placeholders",
        decisionRole: "rejectedCandidate",
        confidenceLabel: "unavailable"
      }
    ]
  );
});

test("admits external font-family anchors across more than one family", async () => {
  const calibriCandidate = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-drift.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const aptosCandidate = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const calibriSummary = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "font-family-template-anchor-drift",
      auditReport: calibriCandidate
    },
    templates: [
      {
        deckId: "font-family-template-anchor",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ]
  });

  const aptosSummary = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-font-family-drift",
      auditReport: aptosCandidate
    },
    templates: [
      {
        deckId: "font-family-template-anchor",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ]
  });

  assert.equal(calibriSummary.matchResult, "admittedMatch");
  assert.equal(calibriSummary.admittedTemplateDeckId, "font-family-template-anchor");
  assert.equal(calibriSummary.admittedTemplateFamilyId, "calibri-left");

  assert.equal(aptosSummary.matchResult, "admittedMatch");
  assert.equal(aptosSummary.admittedTemplateDeckId, "aptos-template-anchor");
  assert.equal(aptosSummary.admittedTemplateFamilyId, "aptos-left");
});

test("rejects wrong external template sets when no anchor reaches moderate", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "font-family-template-anchor",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ]
  });

  assert.equal(summary.matchResult, "rejectedMatch");
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.equal(summary.admittedTemplateCount, 0);
  assert.equal(summary.blockedTemplateCount, 0);
  assert.equal(summary.rejectedTemplateCount, 2);
  assert.deepEqual(summary.decisionReasons, ["noModerateExternalAnchor"]);
});

test("marks external template selection ambiguous when a conflicting blocked anchor remains viable", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const conflictingAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-right-conflict.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "aptos-template-anchor-right-conflict",
        familyId: "aptos-right-conflict",
        auditReport: conflictingAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ]
  });

  assert.equal(summary.matchResult, "ambiguousMatch");
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.equal(summary.admittedTemplateCount, 1);
  assert.equal(summary.blockedTemplateCount, 1);
  assert.equal(summary.rejectedTemplateCount, 1);
  assert.ok(summary.decisionReasons.includes("conflictingBlockedAnchorPresent"));
  assert.deepEqual(
    summary.evaluations.map((evaluation) => ({
      templateDeckId: evaluation.templateDeckId,
      decisionRole: evaluation.decisionRole,
      confidenceLabel: evaluation.confidenceLabel
    })),
    [
      {
        templateDeckId: "aptos-template-anchor",
        decisionRole: "admittedCandidate",
        confidenceLabel: "moderate"
      },
      {
        templateDeckId: "aptos-template-anchor-right-conflict",
        decisionRole: "ambiguousCandidate",
        confidenceLabel: "blocked"
      },
      {
        templateDeckId: "template-placeholders",
        decisionRole: "rejectedCandidate",
        confidenceLabel: "unavailable"
      }
    ]
  );
});

test("is deterministic regardless of template input order", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const leftToRight = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ]
  });

  const rightToLeft = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      },
      {
        deckId: "font-family-template-anchor",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      }
    ]
  });

  assert.deepEqual(leftToRight, rightToLeft);
});

test("admitted external-template alignment match can drive isolated normalization only through the selected anchor", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-alignment-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-alignment-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ]
  });

  assert.equal(summary.matchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor");

  const outputPath = await createOutputPath("external-alignment-envelope-output.pptx");
  const result = await runFingerprintBasedNormalizationExperiment({
    candidateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-alignment-drift.pptx"),
    outputPath,
    templateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor.pptx")
  });

  assert.equal(result.experimentStatus, "experimentApplied");
  assert.equal(result.templateMatchConfidenceLabel, "moderate");
  assert.deepEqual(result.selectedExperimentStages, ["dominantBodyStyleFix"]);
  assert.deepEqual(result.stageChangeCounts, {
    fontFamilyChanges: 0,
    fontSizeChanges: 0,
    alignmentChanges: 2
  });
});

test("admitted external-template font-family match can drive isolated normalization only through the selected anchor", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor",
        familyId: "calibri-left",
        auditReport: calibriAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ]
  });

  assert.equal(summary.matchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor");

  const outputPath = await createOutputPath("external-font-family-envelope-output.pptx");
  const result = await runFingerprintBasedNormalizationExperiment({
    candidateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx"),
    outputPath,
    templateInputPath: path.resolve("testdata/corpus/fingerprint/aptos-template-anchor.pptx"),
    targetClass: "fontFamily"
  });

  assert.equal(result.experimentStatus, "experimentApplied");
  assert.equal(result.templateMatchConfidenceLabel, "moderate");
  assert.deepEqual(result.selectedExperimentStages, ["fontFamilyFix"]);
  assert.deepEqual(result.stageChangeCounts, {
    fontFamilyChanges: 1,
    fontSizeChanges: 0,
    alignmentChanges: 0
  });
});

test("ambiguous external-template match exposes no admitted anchor for experiment use", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const conflictingAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-right-conflict.pptx");

  const summary = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: "aptos-template-anchor-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor",
        familyId: "aptos-left",
        auditReport: aptosAnchor
      },
      {
        deckId: "aptos-template-anchor-right-conflict",
        familyId: "aptos-right-conflict",
        auditReport: conflictingAnchor
      }
    ]
  });

  assert.equal(summary.matchResult, "ambiguousMatch");
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.equal(summary.admittedTemplateFamilyId, null);
  assert.equal(summary.admittedConfidenceLabel, null);
});
