import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { summarizeAiDeckFailureMode } from "../packages/audit/aiDeckFailureModeSummary.ts";

async function loadAudit(relPath: string) {
  return analyzeSlides(await loadPresentation(path.resolve(relPath)));
}

test("classifies an admitted generated-deck-like case as supported narrow normalization only", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeAiDeckFailureMode({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-font-family-drift",
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
    ],
    requestedClasses: ["alignment", "fontFamily"]
  });

  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.scopeDecision, "aiPostProcessingEligible");
  assert.equal(summary.generatedDeckInsideProvenEnvelope, true);
  assert.deepEqual(summary.failureModes, [
    "supportedNarrowNormalizationOnly",
    "templateMatchAdmissible"
  ]);
  assert.deepEqual(summary.outOfScopeRequestedClasses, []);
  assert.deepEqual(summary.activeDriftSignals, {
    alignment: false,
    fontFamily: true,
    fontSize: false,
    lineSpacing: false,
    paragraphSpacing: false,
    bulletIndent: false
  });
});

test("classifies ambiguous generated-deck overlap conservatively", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const conflictingAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-right-conflict.pptx");

  const summary = summarizeAiDeckFailureMode({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-font-family-drift",
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
    ],
    requestedClasses: ["fontFamily"]
  });

  assert.equal(summary.templateMatchResult, "ambiguousMatch");
  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.equal(summary.generatedDeckInsideProvenEnvelope, false);
  assert.deepEqual(summary.failureModes, ["templateMatchAmbiguous"]);
});

test("classifies wrong-template generated decks as rejected", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-calibri-product-plan-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeAiDeckFailureMode({
    candidate: {
      deckId: "ai-generated-calibri-product-plan-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
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
    ],
    requestedClasses: ["fontFamily"]
  });

  assert.equal(summary.templateMatchResult, "rejectedMatch");
  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.deepEqual(summary.failureModes, ["templateMatchRejected"]);
});

test("classifies unsupported layout redesign expectations as mixed issues outside the current narrow envelope", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-layout-redesign-needed.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-multislide.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx");

  const summary = summarizeAiDeckFailureMode({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-layout-redesign-needed",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor-multislide",
        familyId: "aptos-left-multi",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor-multislide",
        familyId: "calibri-left-multi",
        auditReport: calibriAnchor
      }
    ],
    requestedClasses: ["alignment"],
    observedUnsupportedFailureModes: ["layoutRedesignRequired"]
  });

  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.equal(summary.generatedDeckInsideProvenEnvelope, false);
  assert.deepEqual(summary.failureModes, [
    "mixedSupportedAndUnsupportedIssues",
    "templateMatchAdmissible",
    "unsupportedLayoutDrift"
  ]);
});

test("classifies unsupported narrative rewrite expectations explicitly", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-narrative-rewrite-needed.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");

  const summary = summarizeAiDeckFailureMode({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-narrative-rewrite-needed",
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
      }
    ],
    requestedClasses: ["fontFamily"],
    observedUnsupportedFailureModes: ["narrativeRewriteRequired"]
  });

  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.ok(summary.failureModes.includes("unsupportedNarrativeRewriteExpectation"));
  assert.ok(summary.failureModes.includes("mixedSupportedAndUnsupportedIssues"));
});

test("classifies highly inconsistent generated decks with mixed supported and unsupported issues", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-inconsistent-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeAiDeckFailureMode({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-inconsistent-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor-inconsistent",
        familyId: "aptos-left-inconsistent",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor-multislide",
        familyId: "calibri-left-multi",
        auditReport: calibriAnchor
      },
      {
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ],
    requestedClasses: ["fontFamily", "fontSize"]
  });

  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.scopeDecision, "aiPostProcessingEligible");
  assert.equal(summary.generatedDeckInsideProvenEnvelope, false);
  assert.deepEqual(summary.failureModes, [
    "highlyInconsistentGeneratedDeck",
    "mixedSupportedAndUnsupportedIssues",
    "templateMatchAdmissible"
  ]);
  assert.deepEqual(summary.outOfScopeRequestedClasses, ["fontSize"]);
  assert.deepEqual(summary.activeDriftSignals, {
    alignment: false,
    fontFamily: true,
    fontSize: true,
    lineSpacing: false,
    paragraphSpacing: false,
    bulletIndent: false
  });
});

test("classifies unsupported structure-repair needs explicitly", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/ai-generated/ai-generated-aptos-quarterly-structure-repair-needed.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx");

  const summary = summarizeAiDeckFailureMode({
    candidate: {
      deckId: "ai-generated-aptos-quarterly-structure-repair-needed",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor-inconsistent",
        familyId: "aptos-left-inconsistent",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor-multislide",
        familyId: "calibri-left-multi",
        auditReport: calibriAnchor
      }
    ],
    requestedClasses: ["alignment"],
    observedUnsupportedFailureModes: ["unsupportedStructureRepairRequired"]
  });

  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.ok(summary.failureModes.includes("unsupportedStructureRepairNeed"));
  assert.ok(summary.failureModes.includes("highlyInconsistentGeneratedDeck"));
  assert.ok(summary.failureModes.includes("mixedSupportedAndUnsupportedIssues"));
});

test("is deterministic for the same generated deck corpus input", async () => {
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
        deckId: "aptos-template-anchor-inconsistent",
        familyId: "aptos-left-inconsistent",
        auditReport: aptosAnchor
      },
      {
        deckId: "font-family-template-anchor-multislide",
        familyId: "calibri-left-multi",
        auditReport: calibriAnchor
      }
    ],
    requestedClasses: ["fontFamily", "fontSize", "layoutRedesign"] as const
  };

  assert.deepEqual(
    summarizeAiDeckFailureMode(input),
    summarizeAiDeckFailureMode(input)
  );
});
