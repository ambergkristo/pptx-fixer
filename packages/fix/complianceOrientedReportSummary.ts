import type {
  CategoryReductionDeckBoundary
} from "./categoryReductionReportingSummary.ts";
import type { DeckReadinessLabel } from "./deckReadinessSummary.ts";
import type { IssueCategory, IssueCategorySummaryEntry } from "./issueCategorySummary.ts";

export type ComplianceTruthState =
  | "currentlyRuntimeEvidenced"
  | "currentlyBoundaryEvidencedOnly"
  | "futureTaxonomyOnly";

export type ComplianceRuntimeTaxonomyCategory =
  | "textStyleConsistencyDrift"
  | "textBlockStructureDrift"
  | "rhythmAndSpacingDrift";

export type ComplianceBoundaryTaxonomyCategory =
  | "templateAndSemanticStructureDrift"
  | "boundaryAndSafetyClassification";

export type ComplianceFutureTaxonomyCategory =
  | "brandSystemComplianceDrift";

export type ComplianceRuntimeStatus =
  | "clean"
  | "resolved"
  | "partiallyReduced"
  | "unchanged";

export type ComplianceBoundaryStatus =
  | "activeBoundary"
  | "notTriggered"
  | "runtimeLabelUnavailable"
  | "boundaryOnly";

export type ComplianceFutureStatus = "futureOnly";

export interface ComplianceRuntimeSignal {
  taxonomySubcategory:
    | "fontFamilyDrift"
    | "fontSizeDrift"
    | "paragraphAlignmentDrift"
    | "bulletListMarkerAndIndentDrift"
    | "lineSpacingDrift"
    | "paragraphSpacingDrift";
  sourceIssueCategories: IssueCategory[];
  implementationCoverage:
    | "directCurrentRuntimeSignal"
    | "combinedCurrentRuntimeSignal";
  detectedBefore: number;
  fixed: number;
  remaining: number;
  runtimeStatus: ComplianceRuntimeStatus;
}

export interface ComplianceBoundarySignal {
  taxonomySubcategory:
    | "placeholderMisuse"
    | "masterLayoutDeviation"
    | "groupedShapeStructureRisk"
    | "fieldNodeSensitiveStructure"
    | "eligibleCleanupBoundary"
    | "manualReviewBoundary"
    | "reportOnlyIneligibleBoundary";
  runtimeImplemented: boolean;
  signalStatus: ComplianceBoundaryStatus;
}

export interface ComplianceFutureSignal {
  taxonomySubcategory:
    | "approvedTypographyCompliance"
    | "spacingSystemCompliance"
    | "hierarchyCompliance"
    | "templateConformance";
  runtimeImplemented: false;
  signalStatus: ComplianceFutureStatus;
}

export interface ComplianceRuntimeGroup {
  taxonomyCategory: ComplianceRuntimeTaxonomyCategory;
  truthState: "currentlyRuntimeEvidenced";
  signals: ComplianceRuntimeSignal[];
}

export interface ComplianceBoundaryGroup {
  taxonomyCategory: ComplianceBoundaryTaxonomyCategory;
  truthState: "currentlyBoundaryEvidencedOnly";
  signals: ComplianceBoundarySignal[];
}

export interface ComplianceFutureGroup {
  taxonomyCategory: ComplianceFutureTaxonomyCategory;
  truthState: "futureTaxonomyOnly";
  signals: ComplianceFutureSignal[];
}

export interface ComplianceOrientedReportSummary {
  claimScope: "taxonomyTranslationFromCurrentRuntimeEvidenceOnly";
  hostileEvidenceConstraint: "partialHostileEvidenceOnly";
  fullBrandSystemComplianceScoringAvailable: false;
  runtimeEvidencedGroups: ComplianceRuntimeGroup[];
  boundaryEvidencedGroups: ComplianceBoundaryGroup[];
  futureTaxonomyGroups: ComplianceFutureGroup[];
  deckGovernanceView: {
    deckBoundary: CategoryReductionDeckBoundary;
    readinessLabel: DeckReadinessLabel;
    manualReviewRequired: boolean;
    partiallyReducedCategoryCount: number;
    unchangedCategoryCount: number;
  };
  summaryLine: "Compliance-oriented reporting translates current runtime evidence into governance-friendly brand-drift signals without implying full brand-system compliance scoring.";
}

export function summarizeComplianceOrientedReportSummary(input: {
  issueCategorySummary: IssueCategorySummaryEntry[];
  deckBoundary: CategoryReductionDeckBoundary;
  readinessLabel: DeckReadinessLabel;
}): ComplianceOrientedReportSummary {
  return {
    claimScope: "taxonomyTranslationFromCurrentRuntimeEvidenceOnly",
    hostileEvidenceConstraint: "partialHostileEvidenceOnly",
    fullBrandSystemComplianceScoringAvailable: false,
    runtimeEvidencedGroups: RUNTIME_GROUP_DEFINITIONS.map((definition) => ({
      taxonomyCategory: definition.taxonomyCategory,
      truthState: "currentlyRuntimeEvidenced",
      signals: definition.signalDefinitions.map((signalDefinition) => {
        const sourceEntry = input.issueCategorySummary.find(
          (entry) => entry.category === signalDefinition.sourceIssueCategory
        );

        if (!sourceEntry) {
          throw new Error(`Missing issue category summary for ${signalDefinition.sourceIssueCategory}.`);
        }

        return {
          taxonomySubcategory: signalDefinition.taxonomySubcategory,
          sourceIssueCategories: signalDefinition.sourceIssueCategories,
          implementationCoverage: signalDefinition.implementationCoverage,
          detectedBefore: sourceEntry.detectedBefore,
          fixed: sourceEntry.fixed,
          remaining: sourceEntry.remaining,
          runtimeStatus: summarizeRuntimeStatus(sourceEntry)
        };
      })
    })),
    boundaryEvidencedGroups: [
      {
        taxonomyCategory: "templateAndSemanticStructureDrift",
        truthState: "currentlyBoundaryEvidencedOnly",
        signals: [
          {
            taxonomySubcategory: "placeholderMisuse",
            runtimeImplemented: false,
            signalStatus: "boundaryOnly"
          },
          {
            taxonomySubcategory: "masterLayoutDeviation",
            runtimeImplemented: false,
            signalStatus: "boundaryOnly"
          },
          {
            taxonomySubcategory: "groupedShapeStructureRisk",
            runtimeImplemented: false,
            signalStatus: "boundaryOnly"
          },
          {
            taxonomySubcategory: "fieldNodeSensitiveStructure",
            runtimeImplemented: false,
            signalStatus: "boundaryOnly"
          }
        ]
      },
      {
        taxonomyCategory: "boundaryAndSafetyClassification",
        truthState: "currentlyBoundaryEvidencedOnly",
        signals: [
          {
            taxonomySubcategory: "eligibleCleanupBoundary",
            runtimeImplemented: true,
            signalStatus: input.deckBoundary === "eligibleCleanupBoundary"
              ? "activeBoundary"
              : "notTriggered"
          },
          {
            taxonomySubcategory: "manualReviewBoundary",
            runtimeImplemented: true,
            signalStatus: input.deckBoundary === "manualReviewBoundary"
              ? "activeBoundary"
              : "notTriggered"
          },
          {
            taxonomySubcategory: "reportOnlyIneligibleBoundary",
            runtimeImplemented: false,
            signalStatus: "runtimeLabelUnavailable"
          }
        ]
      }
    ],
    futureTaxonomyGroups: [
      {
        taxonomyCategory: "brandSystemComplianceDrift",
        truthState: "futureTaxonomyOnly",
        signals: [
          {
            taxonomySubcategory: "approvedTypographyCompliance",
            runtimeImplemented: false,
            signalStatus: "futureOnly"
          },
          {
            taxonomySubcategory: "spacingSystemCompliance",
            runtimeImplemented: false,
            signalStatus: "futureOnly"
          },
          {
            taxonomySubcategory: "hierarchyCompliance",
            runtimeImplemented: false,
            signalStatus: "futureOnly"
          },
          {
            taxonomySubcategory: "templateConformance",
            runtimeImplemented: false,
            signalStatus: "futureOnly"
          }
        ]
      }
    ],
    deckGovernanceView: {
      deckBoundary: input.deckBoundary,
      readinessLabel: input.readinessLabel,
      manualReviewRequired: input.readinessLabel === "manualReviewRecommended",
      partiallyReducedCategoryCount: input.issueCategorySummary.filter(
        (entry) => entry.fixed > 0 && entry.remaining > 0
      ).length,
      unchangedCategoryCount: input.issueCategorySummary.filter(
        (entry) => entry.detectedBefore > 0 && entry.fixed === 0
      ).length
    },
    summaryLine: "Compliance-oriented reporting translates current runtime evidence into governance-friendly brand-drift signals without implying full brand-system compliance scoring."
  };
}

function summarizeRuntimeStatus(entry: IssueCategorySummaryEntry): ComplianceRuntimeStatus {
  if (entry.status === "clean") {
    return "clean";
  }

  if (entry.fixed > 0 && entry.remaining === 0) {
    return "resolved";
  }

  if (entry.fixed > 0 && entry.remaining > 0) {
    return "partiallyReduced";
  }

  return "unchanged";
}

const RUNTIME_GROUP_DEFINITIONS: Array<{
  taxonomyCategory: ComplianceRuntimeTaxonomyCategory;
  signalDefinitions: Array<{
    taxonomySubcategory: ComplianceRuntimeSignal["taxonomySubcategory"];
    sourceIssueCategory: IssueCategory;
    sourceIssueCategories: IssueCategory[];
    implementationCoverage: ComplianceRuntimeSignal["implementationCoverage"];
  }>;
}> = [
  {
    taxonomyCategory: "textStyleConsistencyDrift",
    signalDefinitions: [
      {
        taxonomySubcategory: "fontFamilyDrift",
        sourceIssueCategory: "font_consistency",
        sourceIssueCategories: ["font_consistency"],
        implementationCoverage: "directCurrentRuntimeSignal"
      },
      {
        taxonomySubcategory: "fontSizeDrift",
        sourceIssueCategory: "font_size_consistency",
        sourceIssueCategories: ["font_size_consistency"],
        implementationCoverage: "directCurrentRuntimeSignal"
      }
    ]
  },
  {
    taxonomyCategory: "textBlockStructureDrift",
    signalDefinitions: [
      {
        taxonomySubcategory: "paragraphAlignmentDrift",
        sourceIssueCategory: "alignment",
        sourceIssueCategories: ["alignment"],
        implementationCoverage: "directCurrentRuntimeSignal"
      },
      {
        taxonomySubcategory: "bulletListMarkerAndIndentDrift",
        sourceIssueCategory: "bullet_indentation",
        sourceIssueCategories: ["bullet_indentation"],
        implementationCoverage: "combinedCurrentRuntimeSignal"
      }
    ]
  },
  {
    taxonomyCategory: "rhythmAndSpacingDrift",
    signalDefinitions: [
      {
        taxonomySubcategory: "lineSpacingDrift",
        sourceIssueCategory: "line_spacing",
        sourceIssueCategories: ["line_spacing"],
        implementationCoverage: "directCurrentRuntimeSignal"
      },
      {
        taxonomySubcategory: "paragraphSpacingDrift",
        sourceIssueCategory: "paragraph_spacing",
        sourceIssueCategories: ["paragraph_spacing"],
        implementationCoverage: "directCurrentRuntimeSignal"
      }
    ]
  }
];
