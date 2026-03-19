import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeComplianceOrientedReportSummary } from "../packages/fix/complianceOrientedReportSummary.ts";

test("maps current runtime categories into taxonomy-aligned compliance groups conservatively", () => {
  const summary = summarizeComplianceOrientedReportSummary({
    issueCategorySummary: [
      { category: "font_consistency", detectedBefore: 2, fixed: 2, remaining: 0, status: "improved" },
      { category: "font_size_consistency", detectedBefore: 4, fixed: 2, remaining: 2, status: "improved" },
      { category: "paragraph_spacing", detectedBefore: 3, fixed: 0, remaining: 3, status: "unchanged" },
      { category: "bullet_indentation", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "alignment", detectedBefore: 1, fixed: 1, remaining: 0, status: "improved" },
      { category: "line_spacing", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" }
    ],
    deckBoundary: "eligibleCleanupBoundary",
    readinessLabel: "mostlyReady"
  });

  assert.deepEqual(summary, {
    claimScope: "taxonomyTranslationFromCurrentRuntimeEvidenceOnly",
    hostileEvidenceConstraint: "partialHostileEvidenceOnly",
    fullBrandSystemComplianceScoringAvailable: false,
    runtimeEvidencedGroups: [
      {
        taxonomyCategory: "textStyleConsistencyDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "fontFamilyDrift",
            sourceIssueCategories: ["font_consistency"],
            implementationCoverage: "directCurrentRuntimeSignal",
            detectedBefore: 2,
            fixed: 2,
            remaining: 0,
            runtimeStatus: "resolved"
          },
          {
            taxonomySubcategory: "fontSizeDrift",
            sourceIssueCategories: ["font_size_consistency"],
            implementationCoverage: "directCurrentRuntimeSignal",
            detectedBefore: 4,
            fixed: 2,
            remaining: 2,
            runtimeStatus: "partiallyReduced"
          }
        ]
      },
      {
        taxonomyCategory: "textBlockStructureDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "paragraphAlignmentDrift",
            sourceIssueCategories: ["alignment"],
            implementationCoverage: "directCurrentRuntimeSignal",
            detectedBefore: 1,
            fixed: 1,
            remaining: 0,
            runtimeStatus: "resolved"
          },
          {
            taxonomySubcategory: "bulletListMarkerAndIndentDrift",
            sourceIssueCategories: ["bullet_indentation"],
            implementationCoverage: "combinedCurrentRuntimeSignal",
            detectedBefore: 0,
            fixed: 0,
            remaining: 0,
            runtimeStatus: "clean"
          }
        ]
      },
      {
        taxonomyCategory: "rhythmAndSpacingDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "lineSpacingDrift",
            sourceIssueCategories: ["line_spacing"],
            implementationCoverage: "directCurrentRuntimeSignal",
            detectedBefore: 0,
            fixed: 0,
            remaining: 0,
            runtimeStatus: "clean"
          },
          {
            taxonomySubcategory: "paragraphSpacingDrift",
            sourceIssueCategories: ["paragraph_spacing"],
            implementationCoverage: "directCurrentRuntimeSignal",
            detectedBefore: 3,
            fixed: 0,
            remaining: 3,
            runtimeStatus: "unchanged"
          }
        ]
      }
    ],
    boundaryEvidencedGroups: [
      {
        taxonomyCategory: "templateAndSemanticStructureDrift",
        truthState: "currentlyBoundaryEvidencedOnly",
        signals: [
          { taxonomySubcategory: "placeholderMisuse", runtimeImplemented: false, signalStatus: "boundaryOnly" },
          { taxonomySubcategory: "masterLayoutDeviation", runtimeImplemented: false, signalStatus: "boundaryOnly" },
          { taxonomySubcategory: "groupedShapeStructureRisk", runtimeImplemented: false, signalStatus: "boundaryOnly" },
          { taxonomySubcategory: "fieldNodeSensitiveStructure", runtimeImplemented: false, signalStatus: "boundaryOnly" }
        ]
      },
      {
        taxonomyCategory: "boundaryAndSafetyClassification",
        truthState: "currentlyBoundaryEvidencedOnly",
        signals: [
          { taxonomySubcategory: "eligibleCleanupBoundary", runtimeImplemented: true, signalStatus: "activeBoundary" },
          { taxonomySubcategory: "manualReviewBoundary", runtimeImplemented: true, signalStatus: "notTriggered" },
          { taxonomySubcategory: "reportOnlyIneligibleBoundary", runtimeImplemented: false, signalStatus: "runtimeLabelUnavailable" }
        ]
      }
    ],
    futureTaxonomyGroups: [
      {
        taxonomyCategory: "brandSystemComplianceDrift",
        truthState: "futureTaxonomyOnly",
        signals: [
          { taxonomySubcategory: "approvedTypographyCompliance", runtimeImplemented: false, signalStatus: "futureOnly" },
          { taxonomySubcategory: "spacingSystemCompliance", runtimeImplemented: false, signalStatus: "futureOnly" },
          { taxonomySubcategory: "hierarchyCompliance", runtimeImplemented: false, signalStatus: "futureOnly" },
          { taxonomySubcategory: "templateConformance", runtimeImplemented: false, signalStatus: "futureOnly" }
        ]
      }
    ],
    deckGovernanceView: {
      deckBoundary: "eligibleCleanupBoundary",
      readinessLabel: "mostlyReady",
      manualReviewRequired: false,
      partiallyReducedCategoryCount: 1,
      unchangedCategoryCount: 1
    },
    summaryLine: "Compliance-oriented reporting translates current runtime evidence into governance-friendly brand-drift signals without implying full brand-system compliance scoring."
  });
});

test("keeps manual-review and runtime-unavailable boundary truth conservative", () => {
  const summary = summarizeComplianceOrientedReportSummary({
    issueCategorySummary: [
      { category: "font_consistency", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "font_size_consistency", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" },
      { category: "paragraph_spacing", detectedBefore: 2, fixed: 1, remaining: 1, status: "improved" },
      { category: "bullet_indentation", detectedBefore: 1, fixed: 0, remaining: 1, status: "unchanged" },
      { category: "alignment", detectedBefore: 2, fixed: 1, remaining: 1, status: "improved" },
      { category: "line_spacing", detectedBefore: 1, fixed: 0, remaining: 1, status: "unchanged" }
    ],
    deckBoundary: "manualReviewBoundary",
    readinessLabel: "manualReviewRecommended"
  });

  assert.equal(summary.deckGovernanceView.deckBoundary, "manualReviewBoundary");
  assert.equal(summary.deckGovernanceView.readinessLabel, "manualReviewRecommended");
  assert.equal(summary.deckGovernanceView.manualReviewRequired, true);
  assert.equal(summary.deckGovernanceView.partiallyReducedCategoryCount, 2);
  assert.equal(summary.deckGovernanceView.unchangedCategoryCount, 2);
  assert.equal(
    summary.boundaryEvidencedGroups[1]?.signals[0]?.signalStatus,
    "notTriggered"
  );
  assert.equal(
    summary.boundaryEvidencedGroups[1]?.signals[1]?.signalStatus,
    "activeBoundary"
  );
  assert.equal(
    summary.boundaryEvidencedGroups[1]?.signals[2]?.signalStatus,
    "runtimeLabelUnavailable"
  );
});

test("is deterministic across repeated calls", () => {
  const input = {
    issueCategorySummary: [
      { category: "font_consistency", detectedBefore: 1, fixed: 1, remaining: 0, status: "improved" as const },
      { category: "font_size_consistency", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
      { category: "paragraph_spacing", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
      { category: "bullet_indentation", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
      { category: "alignment", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
      { category: "line_spacing", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const }
    ],
    deckBoundary: "eligibleCleanupBoundary" as const,
    readinessLabel: "ready" as const
  };

  assert.deepEqual(
    summarizeComplianceOrientedReportSummary(input),
    summarizeComplianceOrientedReportSummary(input)
  );
});
