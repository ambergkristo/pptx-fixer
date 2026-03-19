import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { summarizeAiPostProcessingScope } from "../packages/audit/aiPostProcessingScope.ts";

async function loadAudit(relPath: string) {
  return analyzeSlides(await loadPresentation(path.resolve(relPath)));
}

test("marks only alignment and fontFamily as in-scope for admitted generated-deck post-processing", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeAiPostProcessingScope({
    candidate: {
      deckId: "aptos-template-anchor-inconsistent-font-family-drift",
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
    requestedClasses: ["alignment", "fontFamily", "fontSize"]
  });

  assert.equal(summary.scopeDecision, "aiPostProcessingEligible");
  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor-inconsistent");
  assert.equal(summary.admittedTemplateFamilyId, "aptos-left-inconsistent");
  assert.deepEqual(summary.inScopeClasses, ["alignment", "fontFamily"]);
  assert.deepEqual(summary.blockedClasses, []);
  assert.deepEqual(summary.outOfScopeClasses, ["fontSize"]);
  assert.deepEqual(summary.unsupportedGeneratedDeckFailureModes, []);
  assert.ok(summary.decisionReasons.includes("admittedExternalAnchorPresent"));
  assert.equal(summary.aiPipelineBehaviorImplemented, false);
  assert.equal(summary.defaultCleanupPathAffected, false);
  assert.equal(summary.phase6CoreApprovedByThisHelper, false);
  assert.equal(summary.productTruthChanged, false);
});

test("blocks AI post-processing scope when external template selection is ambiguous", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent.pptx");
  const conflictingAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent-right-conflict.pptx");

  const summary = summarizeAiPostProcessingScope({
    candidate: {
      deckId: "aptos-template-anchor-inconsistent-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor-inconsistent",
        familyId: "aptos-left-inconsistent",
        auditReport: aptosAnchor
      },
      {
        deckId: "aptos-template-anchor-inconsistent-right-conflict",
        familyId: "aptos-right-inconsistent",
        auditReport: conflictingAnchor
      }
    ],
    requestedClasses: ["alignment", "fontFamily"]
  });

  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.equal(summary.templateMatchResult, "ambiguousMatch");
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.deepEqual(summary.inScopeClasses, []);
  assert.deepEqual(summary.blockedClasses, ["alignment", "fontFamily"]);
  assert.ok(summary.decisionReasons.includes("ambiguousTemplateMatchDisallowed"));
  assert.ok(summary.decisionReasons.includes("generatedDeckOutsideProvenEnvelope"));
});

test("blocks AI post-processing scope when no external template anchor is admitted", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent-font-family-drift.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeAiPostProcessingScope({
    candidate: {
      deckId: "aptos-template-anchor-inconsistent-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
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
    requestedClasses: ["alignment", "fontFamily"]
  });

  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.equal(summary.templateMatchResult, "rejectedMatch");
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.deepEqual(summary.inScopeClasses, []);
  assert.deepEqual(summary.blockedClasses, ["alignment", "fontFamily"]);
  assert.ok(summary.decisionReasons.includes("rejectedTemplateMatchDisallowed"));
  assert.ok(summary.decisionReasons.includes("generatedDeckOutsideProvenEnvelope"));
});

test("blocks AI post-processing scope when unsupported generated-deck failure modes are present", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent.pptx");

  const summary = summarizeAiPostProcessingScope({
    candidate: {
      deckId: "aptos-template-anchor-inconsistent-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor-inconsistent",
        familyId: "aptos-left-inconsistent",
        auditReport: aptosAnchor
      }
    ],
    requestedClasses: ["fontFamily"],
    unsupportedGeneratedDeckFailureModes: [
      "unsupportedStructureRepairRequired",
      "layoutRedesignRequired"
    ]
  });

  assert.equal(summary.scopeDecision, "aiPostProcessingBlocked");
  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor-inconsistent");
  assert.deepEqual(summary.inScopeClasses, []);
  assert.deepEqual(summary.blockedClasses, ["fontFamily"]);
  assert.deepEqual(summary.unsupportedGeneratedDeckFailureModes, [
    "layoutRedesignRequired",
    "unsupportedStructureRepairRequired"
  ]);
  assert.ok(summary.decisionReasons.includes("unsupportedGeneratedDeckFailureMode"));
  assert.ok(summary.decisionReasons.includes("generatedDeckOutsideProvenEnvelope"));
});

test("marks narrative and layout rewrite requests as AI post-processing out of scope", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent.pptx");

  const summary = summarizeAiPostProcessingScope({
    candidate: {
      deckId: "aptos-template-anchor-inconsistent-font-family-drift",
      auditReport: candidateAudit
    },
    templates: [
      {
        deckId: "aptos-template-anchor-inconsistent",
        familyId: "aptos-left-inconsistent",
        auditReport: aptosAnchor
      }
    ],
    requestedClasses: ["layoutRedesign", "narrativeRewrite", "slideGeneration"]
  });

  assert.equal(summary.scopeDecision, "aiPostProcessingOutOfScope");
  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor-inconsistent");
  assert.deepEqual(summary.inScopeClasses, []);
  assert.deepEqual(summary.blockedClasses, []);
  assert.deepEqual(summary.outOfScopeClasses, [
    "layoutRedesign",
    "narrativeRewrite",
    "slideGeneration"
  ]);
  assert.ok(summary.decisionReasons.includes("generationOrRewriteBehaviorNotSupported"));
  assert.ok(summary.decisionReasons.includes("classNotInNarrowAiPostProcessingEnvelope"));
});

test("is deterministic for the same generated deck and template set", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent-alignment-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-inconsistent.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor-multislide.pptx");

  const input = {
    candidate: {
      deckId: "aptos-template-anchor-inconsistent-alignment-drift",
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
    requestedClasses: ["alignment", "fontFamily", "fontSize", "layoutRedesign"] as const
  };

  assert.deepEqual(
    summarizeAiPostProcessingScope(input),
    summarizeAiPostProcessingScope(input)
  );
});
