import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { summarizeTemplateEnforcementScope } from "../packages/audit/templateEnforcementScope.ts";

async function loadAudit(relPath: string) {
  return analyzeSlides(await loadPresentation(path.resolve(relPath)));
}

test("marks only alignment and fontFamily as in-scope after an admitted external template match", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateEnforcementScope({
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

  assert.equal(summary.scopeDecision, "enforcementEligible");
  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, "aptos-template-anchor");
  assert.equal(summary.admittedTemplateFamilyId, "aptos-left");
  assert.deepEqual(summary.inScopeClasses, ["alignment", "fontFamily"]);
  assert.deepEqual(summary.blockedClasses, []);
  assert.deepEqual(summary.outOfScopeClasses, [
    "bulletIndent",
    "fontSize",
    "lineSpacing",
    "paragraphSpacing"
  ]);
  assert.deepEqual(
    summary.classSummaries.map((entry) => ({
      className: entry.className,
      classDecision: entry.classDecision
    })),
    [
      { className: "alignment", classDecision: "inScope" },
      { className: "bulletIndent", classDecision: "outOfScope" },
      { className: "fontFamily", classDecision: "inScope" },
      { className: "fontSize", classDecision: "outOfScope" },
      { className: "lineSpacing", classDecision: "outOfScope" },
      { className: "paragraphSpacing", classDecision: "outOfScope" }
    ]
  );
  assert.ok(summary.decisionReasons.includes("admittedExternalAnchorPresent"));
  assert.equal(summary.enforcementBehaviorImplemented, false);
  assert.equal(summary.defaultCleanupPathAffected, false);
  assert.equal(summary.phase5CoreApprovedByThisHelper, false);
  assert.equal(summary.productTruthChanged, false);
});

test("blocks enforcement scope when external template selection is ambiguous", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const conflictingAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-right-conflict.pptx");

  const summary = summarizeTemplateEnforcementScope({
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
    ],
    requestedClasses: ["alignment", "fontFamily"]
  });

  assert.equal(summary.scopeDecision, "enforcementBlocked");
  assert.equal(summary.templateMatchResult, "ambiguousMatch");
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.deepEqual(summary.inScopeClasses, []);
  assert.deepEqual(summary.blockedClasses, ["alignment", "fontFamily"]);
  assert.deepEqual(summary.outOfScopeClasses, []);
  assert.ok(summary.decisionReasons.includes("ambiguousTemplateMatchDisallowed"));
  assert.ok(summary.decisionReasons.includes("admittedExternalTemplateMatchRequired"));
});

test("blocks enforcement scope when no external template anchor is admitted", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateEnforcementScope({
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
    ],
    requestedClasses: ["alignment", "fontFamily"]
  });

  assert.equal(summary.scopeDecision, "enforcementBlocked");
  assert.equal(summary.templateMatchResult, "rejectedMatch");
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.deepEqual(summary.inScopeClasses, []);
  assert.deepEqual(summary.blockedClasses, ["alignment", "fontFamily"]);
  assert.deepEqual(summary.outOfScopeClasses, []);
  assert.ok(summary.decisionReasons.includes("rejectedTemplateMatchDisallowed"));
  assert.ok(summary.decisionReasons.includes("admittedExternalTemplateMatchRequired"));
});

test("marks out-of-scope classes as enforcementOutOfScope even after an admitted external match", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-font-family-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateEnforcementScope({
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
        deckId: "template-placeholders",
        familyId: "placeholder-heavy",
        auditReport: placeholderAnchor
      }
    ],
    requestedClasses: ["fontSize", "lineSpacing"]
  });

  assert.equal(summary.scopeDecision, "enforcementOutOfScope");
  assert.equal(summary.templateMatchResult, "admittedMatch");
  assert.equal(summary.admittedTemplateDeckId, null);
  assert.deepEqual(summary.inScopeClasses, []);
  assert.deepEqual(summary.blockedClasses, []);
  assert.deepEqual(summary.outOfScopeClasses, ["fontSize", "lineSpacing"]);
  assert.deepEqual(summary.decisionReasons, [
    "classNotInNarrowEnforcementEnvelope",
    "futureOnlyDimensionsRemainExcluded",
    "outOfScopeDimensionsRemainExcluded"
  ]);
});

test("is deterministic for the same candidate and template set", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor-alignment-drift.pptx");
  const aptosAnchor = await loadAudit("testdata/corpus/fingerprint/aptos-template-anchor.pptx");
  const calibriAnchor = await loadAudit("testdata/corpus/fingerprint/font-family-template-anchor.pptx");
  const placeholderAnchor = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const input = {
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
    ],
    requestedClasses: ["alignment", "fontFamily", "fontSize"] as const
  };

  assert.deepEqual(
    summarizeTemplateEnforcementScope(input),
    summarizeTemplateEnforcementScope(input)
  );
});
