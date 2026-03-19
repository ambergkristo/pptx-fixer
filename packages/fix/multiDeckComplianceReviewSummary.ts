import type {
  BrandScoreImprovementSummary,
  BrandScoreInterpretationLabel
} from "./brandScoreImprovementSummary.ts";
import type {
  CategoryReductionDeckBoundary,
  CategoryReductionReportingSummary
} from "./categoryReductionReportingSummary.ts";
import type {
  ComplianceFutureTaxonomyCategory,
  ComplianceOrientedReportSummary,
  ComplianceRuntimeSignal,
  ComplianceRuntimeTaxonomyCategory
} from "./complianceOrientedReportSummary.ts";
import type { DeckReadinessLabel, DeckReadinessSummary } from "./deckReadinessSummary.ts";
import type { IssueCategory } from "./issueCategorySummary.ts";

export interface MultiDeckComplianceReviewDeckInput {
  deckId: string;
  deckReadinessSummary: Pick<DeckReadinessSummary, "readinessLabel">;
  categoryReductionReportingSummary: Pick<
    CategoryReductionReportingSummary,
    "cleanCategories" | "resolvedCategories" | "partiallyReducedCategories" | "unchangedCategories" | "deckBoundary"
  >;
  complianceOrientedReportSummary: Pick<
    ComplianceOrientedReportSummary,
    "runtimeEvidencedGroups" | "boundaryEvidencedGroups" | "futureTaxonomyGroups"
  >;
  brandScoreImprovementSummary: Pick<
    BrandScoreImprovementSummary,
    | "scoreInterpretationLabel"
    | "scoreInterpretationScope"
    | "fullBrandComplianceScoringAvailable"
    | "futureTaxonomyExcluded"
  >;
}

export interface MultiDeckComplianceReviewDeckView {
  deckId: string;
  readinessLabel: DeckReadinessLabel;
  deckBoundary: CategoryReductionDeckBoundary;
  cleanCategories: IssueCategory[];
  resolvedCategories: IssueCategory[];
  partiallyReducedCategories: IssueCategory[];
  unchangedCategories: IssueCategory[];
  scoreInterpretationLabel: BrandScoreInterpretationLabel;
}

export interface MultiDeckComplianceRuntimeAggregateSignal {
  taxonomySubcategory: ComplianceRuntimeSignal["taxonomySubcategory"];
  implementationCoverage: ComplianceRuntimeSignal["implementationCoverage"];
  totalDetectedBefore: number;
  totalFixed: number;
  totalRemaining: number;
  decksResolved: number;
  decksPartiallyReduced: number;
  decksUnchanged: number;
  decksClean: number;
}

export interface MultiDeckComplianceRuntimeAggregateGroup {
  taxonomyCategory: ComplianceRuntimeTaxonomyCategory;
  truthState: "currentlyRuntimeEvidenced";
  signals: MultiDeckComplianceRuntimeAggregateSignal[];
}

export interface MultiDeckComplianceBoundaryGovernanceView {
  truthState: "currentlyBoundaryEvidencedOnly";
  templateAndSemanticStructureDrift: {
    taxonomyCategory: "templateAndSemanticStructureDrift";
    reviewMode: "boundaryEvidenceOnly";
    runtimeImplementedSignalCount: 0;
  };
  boundaryAndSafetyClassification: {
    taxonomyCategory: "boundaryAndSafetyClassification";
    eligibleCleanupBoundaryDeckCount: number;
    manualReviewBoundaryDeckCount: number;
    reportOnlyIneligibleRuntimeLabelAvailable: false;
  };
}

export interface MultiDeckComplianceFutureTaxonomyGroup {
  taxonomyCategory: ComplianceFutureTaxonomyCategory;
  truthState: "futureTaxonomyOnly";
  runtimeImplemented: false;
  trustedAggregateRuntimeSignalCount: 0;
  signalCount: number;
}

export interface MultiDeckComplianceBrandScoreReview {
  aggregateBrandScoreAvailable: false;
  fullBrandComplianceScoringAvailable: false;
  deckSpecificRuntimeImprovementDeckCount: number;
  manualReviewConstrainedImprovementDeckCount: number;
  noTrustedRuntimeImprovementDeckCount: number;
  summaryLine:
    | "Aggregate brand-score interpretation is limited to deck-specific runtime-evidenced reduction across eligible-boundary decks; it is not a full enterprise compliance score."
    | "Aggregate brand-score interpretation is limited by manual-review-boundary decks and current runtime-evidenced reduction only; it is not a full enterprise compliance score.";
}

export interface MultiDeckComplianceReviewSummary {
  claimScope: "multiDeckReviewFromCurrentRuntimeEvidenceOnly";
  aggregateTrustLabel:
    | "eligibleOnlyRuntimeReview"
    | "manualReviewConstrainedRuntimeReview";
  hostileEvidenceConstraint: "partialHostileEvidenceOnly";
  fullEnterpriseComplianceScoringAvailable: false;
  futureTaxonomyExcluded: true;
  deckCount: number;
  deckViews: MultiDeckComplianceReviewDeckView[];
  readinessDistribution: {
    ready: number;
    mostlyReady: number;
    manualReviewRecommended: number;
  };
  runtimeEvidencedAggregateGroups: MultiDeckComplianceRuntimeAggregateGroup[];
  boundaryGovernanceView: MultiDeckComplianceBoundaryGovernanceView;
  futureTaxonomyGroups: MultiDeckComplianceFutureTaxonomyGroup[];
  brandScoreReview: MultiDeckComplianceBrandScoreReview;
  summaryLine:
    | "Multi-deck compliance review aggregates current runtime-evidenced deck results across eligible-boundary decks only; it does not imply full enterprise compliance scoring."
    | "Multi-deck compliance review aggregates current runtime-evidenced deck results but remains constrained by manual-review-boundary decks; it does not imply full enterprise compliance scoring.";
}

export function summarizeMultiDeckComplianceReviewSummary(
  deckReports: MultiDeckComplianceReviewDeckInput[]
): MultiDeckComplianceReviewSummary {
  if (deckReports.length === 0) {
    throw new Error("Multi-deck compliance review requires at least one deck report.");
  }

  for (const deckReport of deckReports) {
    validateDeckReport(deckReport);
  }

  const deckViews = deckReports.map((deckReport) => ({
    deckId: deckReport.deckId,
    readinessLabel: deckReport.deckReadinessSummary.readinessLabel,
    deckBoundary: deckReport.categoryReductionReportingSummary.deckBoundary,
    cleanCategories: deckReport.categoryReductionReportingSummary.cleanCategories,
    resolvedCategories: deckReport.categoryReductionReportingSummary.resolvedCategories,
    partiallyReducedCategories: deckReport.categoryReductionReportingSummary.partiallyReducedCategories,
    unchangedCategories: deckReport.categoryReductionReportingSummary.unchangedCategories,
    scoreInterpretationLabel: deckReport.brandScoreImprovementSummary.scoreInterpretationLabel
  }));
  const aggregateTrustLabel = deckViews.some((deckView) =>
    deckView.deckBoundary === "manualReviewBoundary" ||
    deckView.readinessLabel === "manualReviewRecommended"
  )
    ? "manualReviewConstrainedRuntimeReview"
    : "eligibleOnlyRuntimeReview";

  return {
    claimScope: "multiDeckReviewFromCurrentRuntimeEvidenceOnly",
    aggregateTrustLabel,
    hostileEvidenceConstraint: "partialHostileEvidenceOnly",
    fullEnterpriseComplianceScoringAvailable: false,
    futureTaxonomyExcluded: true,
    deckCount: deckViews.length,
    deckViews,
    readinessDistribution: summarizeReadinessDistribution(deckViews),
    runtimeEvidencedAggregateGroups: summarizeRuntimeEvidencedAggregateGroups(deckReports),
    boundaryGovernanceView: summarizeBoundaryGovernanceView(deckViews),
    futureTaxonomyGroups: summarizeFutureTaxonomyGroups(
      deckReports[0].complianceOrientedReportSummary.futureTaxonomyGroups
    ),
    brandScoreReview: summarizeBrandScoreReview(deckViews, aggregateTrustLabel),
    summaryLine: aggregateTrustLabel === "eligibleOnlyRuntimeReview"
      ? "Multi-deck compliance review aggregates current runtime-evidenced deck results across eligible-boundary decks only; it does not imply full enterprise compliance scoring."
      : "Multi-deck compliance review aggregates current runtime-evidenced deck results but remains constrained by manual-review-boundary decks; it does not imply full enterprise compliance scoring."
  };
}

function validateDeckReport(deckReport: MultiDeckComplianceReviewDeckInput): void {
  if (
    deckReport.brandScoreImprovementSummary.scoreInterpretationScope !==
    "currentRuntimeEvidencedCategoriesOnly"
  ) {
    throw new Error(`Brand score interpretation scope is not hardened for ${deckReport.deckId}.`);
  }

  if (deckReport.brandScoreImprovementSummary.fullBrandComplianceScoringAvailable !== false) {
    throw new Error(`Full brand compliance scoring must remain unavailable for ${deckReport.deckId}.`);
  }

  if (deckReport.brandScoreImprovementSummary.futureTaxonomyExcluded !== true) {
    throw new Error(`Future taxonomy concepts must remain excluded for ${deckReport.deckId}.`);
  }
}

function summarizeReadinessDistribution(
  deckViews: MultiDeckComplianceReviewDeckView[]
): MultiDeckComplianceReviewSummary["readinessDistribution"] {
  return deckViews.reduce(
    (distribution, deckView) => {
      distribution[deckView.readinessLabel] += 1;
      return distribution;
    },
    {
      ready: 0,
      mostlyReady: 0,
      manualReviewRecommended: 0
    }
  );
}

function summarizeRuntimeEvidencedAggregateGroups(
  deckReports: MultiDeckComplianceReviewDeckInput[]
): MultiDeckComplianceRuntimeAggregateGroup[] {
  const templateGroups = deckReports[0].complianceOrientedReportSummary.runtimeEvidencedGroups;

  return templateGroups.map((templateGroup) => ({
    taxonomyCategory: templateGroup.taxonomyCategory,
    truthState: "currentlyRuntimeEvidenced",
    signals: templateGroup.signals.map((templateSignal) => {
      const matchingSignals = deckReports.map((deckReport) => findRuntimeSignal(deckReport, templateGroup.taxonomyCategory, templateSignal.taxonomySubcategory));

      return {
        taxonomySubcategory: templateSignal.taxonomySubcategory,
        implementationCoverage: templateSignal.implementationCoverage,
        totalDetectedBefore: matchingSignals.reduce((total, signal) => total + signal.detectedBefore, 0),
        totalFixed: matchingSignals.reduce((total, signal) => total + signal.fixed, 0),
        totalRemaining: matchingSignals.reduce((total, signal) => total + signal.remaining, 0),
        decksResolved: matchingSignals.filter((signal) => signal.runtimeStatus === "resolved").length,
        decksPartiallyReduced: matchingSignals.filter((signal) => signal.runtimeStatus === "partiallyReduced").length,
        decksUnchanged: matchingSignals.filter((signal) => signal.runtimeStatus === "unchanged").length,
        decksClean: matchingSignals.filter((signal) => signal.runtimeStatus === "clean").length
      };
    })
  }));
}

function findRuntimeSignal(
  deckReport: MultiDeckComplianceReviewDeckInput,
  taxonomyCategory: ComplianceRuntimeTaxonomyCategory,
  taxonomySubcategory: ComplianceRuntimeSignal["taxonomySubcategory"]
): ComplianceRuntimeSignal {
  const group = deckReport.complianceOrientedReportSummary.runtimeEvidencedGroups.find(
    (candidate) => candidate.taxonomyCategory === taxonomyCategory
  );

  if (!group) {
    throw new Error(`Missing runtime taxonomy group ${taxonomyCategory} for ${deckReport.deckId}.`);
  }

  const signal = group.signals.find(
    (candidate) => candidate.taxonomySubcategory === taxonomySubcategory
  );

  if (!signal) {
    throw new Error(
      `Missing runtime taxonomy signal ${taxonomySubcategory} for ${deckReport.deckId}.`
    );
  }

  return signal;
}

function summarizeBoundaryGovernanceView(
  deckViews: MultiDeckComplianceReviewDeckView[]
): MultiDeckComplianceBoundaryGovernanceView {
  return {
    truthState: "currentlyBoundaryEvidencedOnly",
    templateAndSemanticStructureDrift: {
      taxonomyCategory: "templateAndSemanticStructureDrift",
      reviewMode: "boundaryEvidenceOnly",
      runtimeImplementedSignalCount: 0
    },
    boundaryAndSafetyClassification: {
      taxonomyCategory: "boundaryAndSafetyClassification",
      eligibleCleanupBoundaryDeckCount: deckViews.filter(
        (deckView) => deckView.deckBoundary === "eligibleCleanupBoundary"
      ).length,
      manualReviewBoundaryDeckCount: deckViews.filter(
        (deckView) => deckView.deckBoundary === "manualReviewBoundary"
      ).length,
      reportOnlyIneligibleRuntimeLabelAvailable: false
    }
  };
}

function summarizeFutureTaxonomyGroups(
  futureTaxonomyGroups: MultiDeckComplianceReviewDeckInput["complianceOrientedReportSummary"]["futureTaxonomyGroups"]
): MultiDeckComplianceFutureTaxonomyGroup[] {
  return futureTaxonomyGroups.map((group) => ({
    taxonomyCategory: group.taxonomyCategory,
    truthState: "futureTaxonomyOnly",
    runtimeImplemented: false,
    trustedAggregateRuntimeSignalCount: 0,
    signalCount: group.signals.length
  }));
}

function summarizeBrandScoreReview(
  deckViews: MultiDeckComplianceReviewDeckView[],
  aggregateTrustLabel: MultiDeckComplianceReviewSummary["aggregateTrustLabel"]
): MultiDeckComplianceBrandScoreReview {
  const deckSpecificRuntimeImprovementDeckCount = deckViews.filter(
    (deckView) => deckView.scoreInterpretationLabel === "deckSpecificRuntimeImprovement"
  ).length;
  const manualReviewConstrainedImprovementDeckCount = deckViews.filter(
    (deckView) => deckView.scoreInterpretationLabel === "manualReviewConstrainedImprovement"
  ).length;
  const noTrustedRuntimeImprovementDeckCount = deckViews.filter(
    (deckView) => deckView.scoreInterpretationLabel === "noTrustedRuntimeImprovement"
  ).length;

  return {
    aggregateBrandScoreAvailable: false,
    fullBrandComplianceScoringAvailable: false,
    deckSpecificRuntimeImprovementDeckCount,
    manualReviewConstrainedImprovementDeckCount,
    noTrustedRuntimeImprovementDeckCount,
    summaryLine: aggregateTrustLabel === "eligibleOnlyRuntimeReview"
      ? "Aggregate brand-score interpretation is limited to deck-specific runtime-evidenced reduction across eligible-boundary decks; it is not a full enterprise compliance score."
      : "Aggregate brand-score interpretation is limited by manual-review-boundary decks and current runtime-evidenced reduction only; it is not a full enterprise compliance score."
  };
}
