import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeMultiDeckComplianceReviewSummary } from "../packages/fix/multiDeckComplianceReviewSummary.ts";

interface RuntimeSignalSeed {
  detectedBefore: number;
  fixed: number;
  remaining: number;
  runtimeStatus: "clean" | "resolved" | "partiallyReduced" | "unchanged";
}

function buildDeckReport(options: {
  deckId: string;
  readinessLabel: "ready" | "mostlyReady" | "manualReviewRecommended";
  deckBoundary: "eligibleCleanupBoundary" | "manualReviewBoundary";
  cleanCategories: Array<
    "font_consistency" |
    "font_size_consistency" |
    "paragraph_spacing" |
    "bullet_indentation" |
    "alignment" |
    "line_spacing"
  >;
  resolvedCategories: Array<
    "font_consistency" |
    "font_size_consistency" |
    "paragraph_spacing" |
    "bullet_indentation" |
    "alignment" |
    "line_spacing"
  >;
  partiallyReducedCategories: Array<
    "font_consistency" |
    "font_size_consistency" |
    "paragraph_spacing" |
    "bullet_indentation" |
    "alignment" |
    "line_spacing"
  >;
  unchangedCategories: Array<
    "font_consistency" |
    "font_size_consistency" |
    "paragraph_spacing" |
    "bullet_indentation" |
    "alignment" |
    "line_spacing"
  >;
  scoreInterpretationLabel:
    | "noTrustedRuntimeImprovement"
    | "deckSpecificRuntimeImprovement"
    | "manualReviewConstrainedImprovement";
  runtimeSignals: {
    fontFamilyDrift: RuntimeSignalSeed;
    fontSizeDrift: RuntimeSignalSeed;
    paragraphAlignmentDrift: RuntimeSignalSeed;
    bulletListMarkerAndIndentDrift: RuntimeSignalSeed;
    lineSpacingDrift: RuntimeSignalSeed;
    paragraphSpacingDrift: RuntimeSignalSeed;
  };
}) {
  return {
    deckId: options.deckId,
    deckReadinessSummary: {
      readinessLabel: options.readinessLabel
    },
    categoryReductionReportingSummary: {
      cleanCategories: options.cleanCategories,
      resolvedCategories: options.resolvedCategories,
      partiallyReducedCategories: options.partiallyReducedCategories,
      unchangedCategories: options.unchangedCategories,
      deckBoundary: options.deckBoundary
    },
    complianceOrientedReportSummary: {
      runtimeEvidencedGroups: [
        {
          taxonomyCategory: "textStyleConsistencyDrift",
          truthState: "currentlyRuntimeEvidenced" as const,
          signals: [
            {
              taxonomySubcategory: "fontFamilyDrift" as const,
              sourceIssueCategories: ["font_consistency"],
              implementationCoverage: "directCurrentRuntimeSignal" as const,
              ...options.runtimeSignals.fontFamilyDrift
            },
            {
              taxonomySubcategory: "fontSizeDrift" as const,
              sourceIssueCategories: ["font_size_consistency"],
              implementationCoverage: "directCurrentRuntimeSignal" as const,
              ...options.runtimeSignals.fontSizeDrift
            }
          ]
        },
        {
          taxonomyCategory: "textBlockStructureDrift",
          truthState: "currentlyRuntimeEvidenced" as const,
          signals: [
            {
              taxonomySubcategory: "paragraphAlignmentDrift" as const,
              sourceIssueCategories: ["alignment"],
              implementationCoverage: "directCurrentRuntimeSignal" as const,
              ...options.runtimeSignals.paragraphAlignmentDrift
            },
            {
              taxonomySubcategory: "bulletListMarkerAndIndentDrift" as const,
              sourceIssueCategories: ["bullet_indentation"],
              implementationCoverage: "combinedCurrentRuntimeSignal" as const,
              ...options.runtimeSignals.bulletListMarkerAndIndentDrift
            }
          ]
        },
        {
          taxonomyCategory: "rhythmAndSpacingDrift",
          truthState: "currentlyRuntimeEvidenced" as const,
          signals: [
            {
              taxonomySubcategory: "lineSpacingDrift" as const,
              sourceIssueCategories: ["line_spacing"],
              implementationCoverage: "directCurrentRuntimeSignal" as const,
              ...options.runtimeSignals.lineSpacingDrift
            },
            {
              taxonomySubcategory: "paragraphSpacingDrift" as const,
              sourceIssueCategories: ["paragraph_spacing"],
              implementationCoverage: "directCurrentRuntimeSignal" as const,
              ...options.runtimeSignals.paragraphSpacingDrift
            }
          ]
        }
      ],
      boundaryEvidencedGroups: [
        {
          taxonomyCategory: "templateAndSemanticStructureDrift",
          truthState: "currentlyBoundaryEvidencedOnly" as const,
          signals: [
            { taxonomySubcategory: "placeholderMisuse", runtimeImplemented: false, signalStatus: "boundaryOnly" as const },
            { taxonomySubcategory: "masterLayoutDeviation", runtimeImplemented: false, signalStatus: "boundaryOnly" as const },
            { taxonomySubcategory: "groupedShapeStructureRisk", runtimeImplemented: false, signalStatus: "boundaryOnly" as const },
            { taxonomySubcategory: "fieldNodeSensitiveStructure", runtimeImplemented: false, signalStatus: "boundaryOnly" as const }
          ]
        },
        {
          taxonomyCategory: "boundaryAndSafetyClassification",
          truthState: "currentlyBoundaryEvidencedOnly" as const,
          signals: [
            {
              taxonomySubcategory: "eligibleCleanupBoundary",
              runtimeImplemented: true,
              signalStatus: options.deckBoundary === "eligibleCleanupBoundary" ? "activeBoundary" as const : "notTriggered" as const
            },
            {
              taxonomySubcategory: "manualReviewBoundary",
              runtimeImplemented: true,
              signalStatus: options.deckBoundary === "manualReviewBoundary" ? "activeBoundary" as const : "notTriggered" as const
            },
            {
              taxonomySubcategory: "reportOnlyIneligibleBoundary",
              runtimeImplemented: false,
              signalStatus: "runtimeLabelUnavailable" as const
            }
          ]
        }
      ],
      futureTaxonomyGroups: [
        {
          taxonomyCategory: "brandSystemComplianceDrift",
          truthState: "futureTaxonomyOnly" as const,
          signals: [
            { taxonomySubcategory: "approvedTypographyCompliance", runtimeImplemented: false, signalStatus: "futureOnly" as const },
            { taxonomySubcategory: "spacingSystemCompliance", runtimeImplemented: false, signalStatus: "futureOnly" as const },
            { taxonomySubcategory: "hierarchyCompliance", runtimeImplemented: false, signalStatus: "futureOnly" as const },
            { taxonomySubcategory: "templateConformance", runtimeImplemented: false, signalStatus: "futureOnly" as const }
          ]
        }
      ]
    },
    brandScoreImprovementSummary: {
      scoreInterpretationLabel: options.scoreInterpretationLabel,
      scoreInterpretationScope: "currentRuntimeEvidencedCategoriesOnly" as const,
      fullBrandComplianceScoringAvailable: false as const,
      futureTaxonomyExcluded: true as const
    }
  };
}

test("summarizes eligible and manual-review decks together without hiding deck-level truth", () => {
  const summary = summarizeMultiDeckComplianceReviewSummary([
    buildDeckReport({
      deckId: "eligible-a",
      readinessLabel: "ready",
      deckBoundary: "eligibleCleanupBoundary",
      resolvedCategories: ["font_consistency", "alignment"],
      partiallyReducedCategories: [],
      unchangedCategories: [],
      cleanCategories: [
        "font_size_consistency",
        "paragraph_spacing",
        "bullet_indentation",
        "line_spacing"
      ],
      scoreInterpretationLabel: "deckSpecificRuntimeImprovement",
      runtimeSignals: {
        fontFamilyDrift: { detectedBefore: 2, fixed: 2, remaining: 0, runtimeStatus: "resolved" },
        fontSizeDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        paragraphAlignmentDrift: { detectedBefore: 1, fixed: 1, remaining: 0, runtimeStatus: "resolved" },
        bulletListMarkerAndIndentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        lineSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        paragraphSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" }
      }
    }),
    buildDeckReport({
      deckId: "manual-b",
      readinessLabel: "manualReviewRecommended",
      deckBoundary: "manualReviewBoundary",
      resolvedCategories: ["bullet_indentation"],
      partiallyReducedCategories: ["line_spacing"],
      unchangedCategories: ["paragraph_spacing"],
      cleanCategories: [
        "font_consistency",
        "font_size_consistency",
        "alignment"
      ],
      scoreInterpretationLabel: "manualReviewConstrainedImprovement",
      runtimeSignals: {
        fontFamilyDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        fontSizeDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        paragraphAlignmentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        bulletListMarkerAndIndentDrift: { detectedBefore: 2, fixed: 2, remaining: 0, runtimeStatus: "resolved" },
        lineSpacingDrift: { detectedBefore: 3, fixed: 1, remaining: 2, runtimeStatus: "partiallyReduced" },
        paragraphSpacingDrift: { detectedBefore: 2, fixed: 0, remaining: 2, runtimeStatus: "unchanged" }
      }
    })
  ]);

  assert.deepEqual(summary, {
    claimScope: "multiDeckReviewFromCurrentRuntimeEvidenceOnly",
    aggregateTrustLabel: "manualReviewConstrainedRuntimeReview",
    hostileEvidenceConstraint: "partialHostileEvidenceOnly",
    fullEnterpriseComplianceScoringAvailable: false,
    futureTaxonomyExcluded: true,
    deckCount: 2,
    deckViews: [
      {
        deckId: "eligible-a",
        readinessLabel: "ready",
        deckBoundary: "eligibleCleanupBoundary",
        cleanCategories: [
          "font_size_consistency",
          "paragraph_spacing",
          "bullet_indentation",
          "line_spacing"
        ],
        resolvedCategories: ["font_consistency", "alignment"],
        partiallyReducedCategories: [],
        unchangedCategories: [],
        scoreInterpretationLabel: "deckSpecificRuntimeImprovement"
      },
      {
        deckId: "manual-b",
        readinessLabel: "manualReviewRecommended",
        deckBoundary: "manualReviewBoundary",
        cleanCategories: [
          "font_consistency",
          "font_size_consistency",
          "alignment"
        ],
        resolvedCategories: ["bullet_indentation"],
        partiallyReducedCategories: ["line_spacing"],
        unchangedCategories: ["paragraph_spacing"],
        scoreInterpretationLabel: "manualReviewConstrainedImprovement"
      }
    ],
    readinessDistribution: {
      ready: 1,
      mostlyReady: 0,
      manualReviewRecommended: 1
    },
    runtimeEvidencedAggregateGroups: [
      {
        taxonomyCategory: "textStyleConsistencyDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "fontFamilyDrift",
            implementationCoverage: "directCurrentRuntimeSignal",
            totalDetectedBefore: 2,
            totalFixed: 2,
            totalRemaining: 0,
            decksResolved: 1,
            decksPartiallyReduced: 0,
            decksUnchanged: 0,
            decksClean: 1
          },
          {
            taxonomySubcategory: "fontSizeDrift",
            implementationCoverage: "directCurrentRuntimeSignal",
            totalDetectedBefore: 0,
            totalFixed: 0,
            totalRemaining: 0,
            decksResolved: 0,
            decksPartiallyReduced: 0,
            decksUnchanged: 0,
            decksClean: 2
          }
        ]
      },
      {
        taxonomyCategory: "textBlockStructureDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "paragraphAlignmentDrift",
            implementationCoverage: "directCurrentRuntimeSignal",
            totalDetectedBefore: 1,
            totalFixed: 1,
            totalRemaining: 0,
            decksResolved: 1,
            decksPartiallyReduced: 0,
            decksUnchanged: 0,
            decksClean: 1
          },
          {
            taxonomySubcategory: "bulletListMarkerAndIndentDrift",
            implementationCoverage: "combinedCurrentRuntimeSignal",
            totalDetectedBefore: 2,
            totalFixed: 2,
            totalRemaining: 0,
            decksResolved: 1,
            decksPartiallyReduced: 0,
            decksUnchanged: 0,
            decksClean: 1
          }
        ]
      },
      {
        taxonomyCategory: "rhythmAndSpacingDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "lineSpacingDrift",
            implementationCoverage: "directCurrentRuntimeSignal",
            totalDetectedBefore: 3,
            totalFixed: 1,
            totalRemaining: 2,
            decksResolved: 0,
            decksPartiallyReduced: 1,
            decksUnchanged: 0,
            decksClean: 1
          },
          {
            taxonomySubcategory: "paragraphSpacingDrift",
            implementationCoverage: "directCurrentRuntimeSignal",
            totalDetectedBefore: 2,
            totalFixed: 0,
            totalRemaining: 2,
            decksResolved: 0,
            decksPartiallyReduced: 0,
            decksUnchanged: 1,
            decksClean: 1
          }
        ]
      }
    ],
    boundaryGovernanceView: {
      truthState: "currentlyBoundaryEvidencedOnly",
      templateAndSemanticStructureDrift: {
        taxonomyCategory: "templateAndSemanticStructureDrift",
        reviewMode: "boundaryEvidenceOnly",
        runtimeImplementedSignalCount: 0
      },
      boundaryAndSafetyClassification: {
        taxonomyCategory: "boundaryAndSafetyClassification",
        eligibleCleanupBoundaryDeckCount: 1,
        manualReviewBoundaryDeckCount: 1,
        reportOnlyIneligibleRuntimeLabelAvailable: false
      }
    },
    futureTaxonomyGroups: [
      {
        taxonomyCategory: "brandSystemComplianceDrift",
        truthState: "futureTaxonomyOnly",
        runtimeImplemented: false,
        trustedAggregateRuntimeSignalCount: 0,
        signalCount: 4
      }
    ],
    brandScoreReview: {
      aggregateBrandScoreAvailable: false,
      fullBrandComplianceScoringAvailable: false,
      deckSpecificRuntimeImprovementDeckCount: 1,
      manualReviewConstrainedImprovementDeckCount: 1,
      noTrustedRuntimeImprovementDeckCount: 0,
      summaryLine: "Aggregate brand-score interpretation is limited by manual-review-boundary decks and current runtime-evidenced reduction only; it is not a full enterprise compliance score."
    },
    summaryLine: "Multi-deck compliance review aggregates current runtime-evidenced deck results but remains constrained by manual-review-boundary decks; it does not imply full enterprise compliance scoring."
  });
});

test("keeps eligible-only aggregate interpretation narrow and runtime-only", () => {
  const summary = summarizeMultiDeckComplianceReviewSummary([
    buildDeckReport({
      deckId: "eligible-a",
      readinessLabel: "ready",
      deckBoundary: "eligibleCleanupBoundary",
      resolvedCategories: ["font_consistency"],
      partiallyReducedCategories: [],
      unchangedCategories: [],
      cleanCategories: [
        "font_size_consistency",
        "paragraph_spacing",
        "bullet_indentation",
        "alignment",
        "line_spacing"
      ],
      scoreInterpretationLabel: "deckSpecificRuntimeImprovement",
      runtimeSignals: {
        fontFamilyDrift: { detectedBefore: 1, fixed: 1, remaining: 0, runtimeStatus: "resolved" },
        fontSizeDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        paragraphAlignmentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        bulletListMarkerAndIndentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        lineSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        paragraphSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" }
      }
    }),
    buildDeckReport({
      deckId: "eligible-b",
      readinessLabel: "mostlyReady",
      deckBoundary: "eligibleCleanupBoundary",
      resolvedCategories: [],
      partiallyReducedCategories: ["font_size_consistency"],
      unchangedCategories: [],
      cleanCategories: [
        "font_consistency",
        "paragraph_spacing",
        "bullet_indentation",
        "alignment",
        "line_spacing"
      ],
      scoreInterpretationLabel: "deckSpecificRuntimeImprovement",
      runtimeSignals: {
        fontFamilyDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        fontSizeDrift: { detectedBefore: 3, fixed: 2, remaining: 1, runtimeStatus: "partiallyReduced" },
        paragraphAlignmentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        bulletListMarkerAndIndentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        lineSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        paragraphSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" }
      }
    })
  ]);

  assert.equal(summary.aggregateTrustLabel, "eligibleOnlyRuntimeReview");
  assert.deepEqual(summary.readinessDistribution, {
    ready: 1,
    mostlyReady: 1,
    manualReviewRecommended: 0
  });
  assert.equal(
    summary.boundaryGovernanceView.boundaryAndSafetyClassification.eligibleCleanupBoundaryDeckCount,
    2
  );
  assert.equal(
    summary.boundaryGovernanceView.boundaryAndSafetyClassification.manualReviewBoundaryDeckCount,
    0
  );
  assert.deepEqual(summary.brandScoreReview, {
    aggregateBrandScoreAvailable: false,
    fullBrandComplianceScoringAvailable: false,
    deckSpecificRuntimeImprovementDeckCount: 2,
    manualReviewConstrainedImprovementDeckCount: 0,
    noTrustedRuntimeImprovementDeckCount: 0,
    summaryLine: "Aggregate brand-score interpretation is limited to deck-specific runtime-evidenced reduction across eligible-boundary decks; it is not a full enterprise compliance score."
  });
  assert.equal(
    summary.summaryLine,
    "Multi-deck compliance review aggregates current runtime-evidenced deck results across eligible-boundary decks only; it does not imply full enterprise compliance scoring."
  );
});

test("is deterministic across repeated calls", () => {
  const input = [
    buildDeckReport({
      deckId: "eligible-a",
      readinessLabel: "ready",
      deckBoundary: "eligibleCleanupBoundary",
      resolvedCategories: ["font_consistency"],
      partiallyReducedCategories: [],
      unchangedCategories: [],
      cleanCategories: [
        "font_size_consistency",
        "paragraph_spacing",
        "bullet_indentation",
        "alignment",
        "line_spacing"
      ],
      scoreInterpretationLabel: "deckSpecificRuntimeImprovement",
      runtimeSignals: {
        fontFamilyDrift: { detectedBefore: 1, fixed: 1, remaining: 0, runtimeStatus: "resolved" },
        fontSizeDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        paragraphAlignmentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        bulletListMarkerAndIndentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        lineSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
        paragraphSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" }
      }
    })
  ];

  assert.deepEqual(
    summarizeMultiDeckComplianceReviewSummary(input),
    summarizeMultiDeckComplianceReviewSummary(input)
  );
});

test("rejects deck reports whose brand-score interpretation is not already trust-hardened", () => {
  const input = buildDeckReport({
    deckId: "invalid-a",
    readinessLabel: "ready",
    deckBoundary: "eligibleCleanupBoundary",
    resolvedCategories: ["font_consistency"],
    partiallyReducedCategories: [],
    unchangedCategories: [],
    cleanCategories: [
      "font_size_consistency",
      "paragraph_spacing",
      "bullet_indentation",
      "alignment",
      "line_spacing"
    ],
    scoreInterpretationLabel: "deckSpecificRuntimeImprovement",
    runtimeSignals: {
      fontFamilyDrift: { detectedBefore: 1, fixed: 1, remaining: 0, runtimeStatus: "resolved" },
      fontSizeDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      paragraphAlignmentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      bulletListMarkerAndIndentDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      lineSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      paragraphSpacingDrift: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" }
    }
  });

  assert.throws(
    () => summarizeMultiDeckComplianceReviewSummary([
      {
        ...input,
        brandScoreImprovementSummary: {
          ...input.brandScoreImprovementSummary,
          futureTaxonomyExcluded: false
        }
      }
    ]),
    /Future taxonomy concepts must remain excluded/
  );
});
