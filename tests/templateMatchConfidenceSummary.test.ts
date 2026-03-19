import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import type { AuditReport } from "../packages/audit/pptxAudit.ts";
import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { summarizeTemplateMatchConfidenceSummary } from "../packages/audit/templateMatchConfidenceSummary.ts";

async function loadAudit(relPath: string) {
  return analyzeSlides(await loadPresentation(path.resolve(relPath)));
}

function cloneAuditReport(auditReport: AuditReport): AuditReport {
  return structuredClone(auditReport);
}

test("caps same-deck template confidence at moderate when trusted usage evidence and non-conflicting partial corroboration exist", async () => {
  const auditReport = await loadAudit("testdata/corpus/alignment/alignment-body-style-drift.pptx");

  const summary = summarizeTemplateMatchConfidenceSummary({
    candidate: {
      deckId: "alignment-body-style-drift",
      auditReport
    },
    template: {
      deckId: "alignment-body-style-drift-template",
      auditReport
    }
  });

  assert.equal(summary.confidenceLabel, "moderate");
  assert.deepEqual(summary.trustedPositiveDimensions, ["usageDistributionEvidence"]);
  assert.deepEqual(summary.corroboratingDimensions, [
    "deckLevelDominantStyleSnapshot",
    "dominantBodyStyleConsensus"
  ]);
  assert.deepEqual(summary.blockedDimensions, []);
  assert.deepEqual(summary.excludedDimensions, ["paragraphGroupStyleSignatures"]);
  assert.equal(summary.maximumAllowedConfidenceLabel, "moderate");
  assert.equal(summary.templateIdentificationSolved, false);
  assert.equal(summary.templateTargetedNormalizationAvailable, false);
  assert.equal(
    summary.summaryLine,
    "Template match confidence is capped at moderate because current runtime evidence shows trusted usage-distribution agreement plus non-conflicting partial corroboration; template identification is not implemented."
  );
});

test("degrades to weak when only usage-distribution evidence is trusted and dominant-body consensus is null-capped", async () => {
  const alignmentAudit = await loadAudit("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const templateAudit = await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx");

  const summary = summarizeTemplateMatchConfidenceSummary({
    candidate: {
      deckId: "alignment-body-style-drift",
      auditReport: alignmentAudit
    },
    template: {
      deckId: "template-placeholders",
      auditReport: templateAudit
    }
  });

  assert.equal(summary.confidenceLabel, "weak");
  assert.deepEqual(summary.trustedPositiveDimensions, ["usageDistributionEvidence"]);
  assert.deepEqual(summary.corroboratingDimensions, ["deckLevelDominantStyleSnapshot"]);
  assert.deepEqual(summary.blockedDimensions, []);
  assert.ok(
    summary.confidenceCapReasons.includes("deterministicNullDimensionsBlockStrongerConfidence")
  );
  assert.ok(summary.confidenceCapReasons.includes("corroboratingDimensionsRemainPartial"));
  assert.equal(
    summary.dimensionEvidence.find((dimension) => dimension.dimension === "dominantBodyStyleConsensus")
      ?.comparisonLabel,
    "nullCapped"
  );
});

test("keeps confidence weak when usage evidence matches but corroboration only overlaps on a narrow typography core", async () => {
  const alignmentAudit = await loadAudit("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const paragraphAudit = await loadAudit("testdata/corpus/spacing/paragraph-spacing-combined-drift.pptx");

  const summary = summarizeTemplateMatchConfidenceSummary({
    candidate: {
      deckId: "alignment-body-style-drift",
      auditReport: alignmentAudit
    },
    template: {
      deckId: "paragraph-spacing-combined-drift",
      auditReport: paragraphAudit
    }
  });

  assert.equal(summary.confidenceLabel, "weak");
  assert.deepEqual(summary.trustedPositiveDimensions, ["usageDistributionEvidence"]);
  assert.deepEqual(summary.corroboratingDimensions, [
    "deckLevelDominantStyleSnapshot",
    "dominantBodyStyleConsensus"
  ]);
  assert.ok(summary.confidenceCapReasons.includes("corroboratingDimensionsRemainPartial"));
});

test("blocks confidence when trusted usage evidence exists but corroborating partial dimensions conflict", async () => {
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

  const summary = summarizeTemplateMatchConfidenceSummary({
    candidate: {
      deckId: "alignment-body-style-drift",
      auditReport: alignmentAudit
    },
    template: {
      deckId: "synthetic-conflicting-template",
      auditReport: conflictingTemplateAudit
    }
  });

  assert.equal(summary.confidenceLabel, "blocked");
  assert.deepEqual(summary.trustedPositiveDimensions, ["usageDistributionEvidence"]);
  assert.deepEqual(summary.blockedDimensions, [
    "deckLevelDominantStyleSnapshot",
    "dominantBodyStyleConsensus"
  ]);
  assert.ok(
    summary.confidenceCapReasons.includes("conflictingPartialDimensionsBlockedConfidence")
  );
  assert.equal(
    summary.dimensionEvidence.find((dimension) => dimension.dimension === "deckLevelDominantStyleSnapshot")
      ?.comparisonLabel,
    "partialConflictBlocked"
  );
});

test("keeps confidence unavailable when trusted usage-distribution match is missing", async () => {
  const alignmentAudit = await loadAudit("testdata/corpus/alignment/alignment-body-style-drift.pptx");
  const unmatchedTemplateAudit = cloneAuditReport(alignmentAudit);

  unmatchedTemplateAudit.deckFontUsage = {
    fontFamilyHistogram: {
      Aptos: 6
    },
    fontSizeHistogram: {
      "18": 6
    },
    dominantFontFamilyCoverage: 100,
    dominantFontSizeCoverage: 100
  };

  const summary = summarizeTemplateMatchConfidenceSummary({
    candidate: {
      deckId: "alignment-body-style-drift",
      auditReport: alignmentAudit
    },
    template: {
      deckId: "synthetic-unmatched-template",
      auditReport: unmatchedTemplateAudit
    }
  });

  assert.equal(summary.confidenceLabel, "unavailable");
  assert.deepEqual(summary.trustedPositiveDimensions, []);
  assert.ok(summary.confidenceCapReasons.includes("trustedUsageDistributionMatchRequired"));
  assert.equal(
    summary.dimensionEvidence.find((dimension) => dimension.dimension === "usageDistributionEvidence")
      ?.comparisonLabel,
    "noTrustedPositiveMatch"
  );
});

test("is deterministic and keeps future-only concepts excluded from current confidence", async () => {
  const candidateAudit = await loadAudit("testdata/corpus/spacing/paragraph-spacing-combined-drift.pptx");
  const templateAudit = await loadAudit("testdata/corpus/spacing/paragraph-spacing-combined-drift.pptx");

  const input = {
    candidate: {
      deckId: "paragraph-spacing-combined-drift",
      auditReport: candidateAudit
    },
    template: {
      deckId: "paragraph-spacing-template",
      auditReport: templateAudit
    }
  };

  assert.deepEqual(
    summarizeTemplateMatchConfidenceSummary(input),
    summarizeTemplateMatchConfidenceSummary(input)
  );

  const summary = summarizeTemplateMatchConfidenceSummary(input);
  assert.deepEqual(summary.futureOnlyDimensionsExcluded, [
    "repeatedLayoutModuleSignatures",
    "placeholderRolePatterns",
    "templateSlotSimilarity",
    "slideFamilyClustering",
    "templateMatchConfidenceTraits"
  ]);
  assert.deepEqual(summary.outOfScopeDimensionsExcluded, [
    "semanticNarrativeIntent",
    "contentMeaning",
    "aiStyleSimilarity",
    "orgPolicyComplianceScoring",
    "fullTemplateEnforcementSignals"
  ]);
  assert.equal(summary.maximumAllowedConfidenceLabel, "moderate");
});
