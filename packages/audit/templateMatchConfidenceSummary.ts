import type { AuditReport, DeckStyleFingerprint } from "./pptxAudit.ts";
import type {
  FingerprintDimensionSummary,
  FingerprintExtractionReliabilitySummary,
  FingerprintOutputState
} from "./fingerprintExtractionReliabilitySummary.ts";
import { summarizeFingerprintExtractionReliabilitySummary } from "./fingerprintExtractionReliabilitySummary.ts";

export type TemplateMatchConfidenceLabel = "unavailable" | "blocked" | "weak" | "moderate";

export type TemplateConfidenceDimension =
  | "usageDistributionEvidence"
  | "deckLevelDominantStyleSnapshot"
  | "dominantBodyStyleConsensus"
  | "paragraphGroupStyleSignatures";

export type TemplateConfidencePolicy =
  | "trustedPositiveEligible"
  | "corroboratingOnly"
  | "excludedFromTrustedConfidence";

export type TemplateConfidenceComparisonLabel =
  | "trustedPositiveMatch"
  | "noTrustedPositiveMatch"
  | "partialCorroboration"
  | "partialConflictBlocked"
  | "nullCapped"
  | "excludedFromTrustedConfidence";

export type TemplateConfidenceCapReason =
  | "trustedUsageDistributionMatchRequired"
  | "corroboratingDimensionsRemainPartial"
  | "deterministicNullDimensionsBlockStrongerConfidence"
  | "conflictingPartialDimensionsBlockedConfidence"
  | "paragraphGroupSignatureSetComparisonExcluded"
  | "futureOnlyDimensionsExcluded"
  | "templateIdentificationNotImplemented";

export interface TemplateMatchDimensionEvidence {
  dimension: TemplateConfidenceDimension;
  confidencePolicy: TemplateConfidencePolicy;
  comparisonLabel: TemplateConfidenceComparisonLabel;
  candidateOutputState: FingerprintOutputState;
  templateOutputState: FingerprintOutputState;
  comparedFieldCount: number;
  matchingFieldCount: number;
  conflictingFieldCount: number;
}

export interface TemplateMatchConfidenceSummary {
  claimScope: "conservativeConfidenceFromCurrentReliableFingerprintDimensionsOnly";
  templateIdentificationSolved: false;
  templateTargetedNormalizationAvailable: false;
  maximumAllowedConfidenceLabel: "moderate";
  candidateDeckId: string;
  templateDeckId: string;
  confidenceLabel: TemplateMatchConfidenceLabel;
  trustedPositiveDimensions: Array<"usageDistributionEvidence">;
  corroboratingDimensions: Array<
    "deckLevelDominantStyleSnapshot" | "dominantBodyStyleConsensus"
  >;
  blockedDimensions: Array<
    "deckLevelDominantStyleSnapshot" | "dominantBodyStyleConsensus"
  >;
  excludedDimensions: Array<"paragraphGroupStyleSignatures">;
  confidenceCapReasons: TemplateConfidenceCapReason[];
  dimensionEvidence: TemplateMatchDimensionEvidence[];
  futureOnlyDimensionsExcluded: FingerprintExtractionReliabilitySummary["futureOnlyDimensions"];
  outOfScopeDimensionsExcluded: FingerprintExtractionReliabilitySummary["outOfScopeDimensions"];
  summaryLine:
    | "Template match confidence is unavailable because current runtime evidence does not show a trusted usage-distribution match; template identification is not implemented."
    | "Template match confidence is blocked because trusted usage-distribution evidence exists but corroborating partial dimensions conflict; template identification is not implemented."
    | "Template match confidence is weak because only usage-distribution evidence is fully trusted while corroborating dimensions remain partial or null-capped; template identification is not implemented."
    | "Template match confidence is capped at moderate because current runtime evidence shows trusted usage-distribution agreement plus non-conflicting partial corroboration; template identification is not implemented.";
}

interface ComparableFingerprintSnapshot {
  fontFamily: string | null;
  fontSize: number | null;
  alignment: string | null;
  lineSpacing: number | null;
  spacingBefore: number | null;
  spacingAfter: number | null;
}

interface HistogramLeaders {
  fontFamily: string | null;
  fontSize: string | null;
}

export function summarizeTemplateMatchConfidenceSummary(input: {
  candidate: {
    deckId: string;
    auditReport: AuditReport;
  };
  template: {
    deckId: string;
    auditReport: AuditReport;
  };
}): TemplateMatchConfidenceSummary {
  const reliabilitySummary = summarizeFingerprintExtractionReliabilitySummary({
    deckReports: [input.candidate, input.template]
  });
  const [candidateReliability, templateReliability] = reliabilitySummary.deckSummaries;
  const candidateBodyConsensus = summarizeDominantBodyConsensusSnapshot(input.candidate.auditReport);
  const templateBodyConsensus = summarizeDominantBodyConsensusSnapshot(input.template.auditReport);

  const usageDistributionEvidence = summarizeUsageDistributionEvidence({
    candidateAuditReport: input.candidate.auditReport,
    candidateDimension: candidateReliability.usageDistributionEvidence,
    templateAuditReport: input.template.auditReport,
    templateDimension: templateReliability.usageDistributionEvidence
  });
  const deckLevelDominantStyleSnapshot = summarizeComparableDimensionEvidence({
    dimension: "deckLevelDominantStyleSnapshot",
    confidencePolicy: "corroboratingOnly",
    candidateDimension: candidateReliability.deckLevelDominantStyleSnapshot,
    candidateSnapshot: input.candidate.auditReport.deckStyleFingerprint,
    templateDimension: templateReliability.deckLevelDominantStyleSnapshot,
    templateSnapshot: input.template.auditReport.deckStyleFingerprint
  });
  const dominantBodyStyleConsensus = summarizeComparableDimensionEvidence({
    dimension: "dominantBodyStyleConsensus",
    confidencePolicy: "corroboratingOnly",
    candidateDimension: candidateReliability.dominantBodyStyleConsensus,
    candidateSnapshot: candidateBodyConsensus,
    templateDimension: templateReliability.dominantBodyStyleConsensus,
    templateSnapshot: templateBodyConsensus
  });
  const paragraphGroupStyleSignatures: TemplateMatchDimensionEvidence = {
    dimension: "paragraphGroupStyleSignatures",
    confidencePolicy: "excludedFromTrustedConfidence",
    comparisonLabel: "excludedFromTrustedConfidence",
    candidateOutputState: candidateReliability.paragraphGroupStyleSignatures.outputState,
    templateOutputState: templateReliability.paragraphGroupStyleSignatures.outputState,
    comparedFieldCount: 0,
    matchingFieldCount: 0,
    conflictingFieldCount: 0
  };

  const dimensionEvidence = [
    usageDistributionEvidence,
    deckLevelDominantStyleSnapshot,
    dominantBodyStyleConsensus,
    paragraphGroupStyleSignatures
  ];

  const trustedPositiveDimensions = dimensionEvidence
    .filter(
      (dimension): dimension is typeof usageDistributionEvidence =>
        dimension.dimension === "usageDistributionEvidence" &&
        dimension.comparisonLabel === "trustedPositiveMatch"
    )
    .map((dimension) => dimension.dimension);
  const corroboratingDimensions = dimensionEvidence
    .filter(
      (
        dimension
      ): dimension is typeof deckLevelDominantStyleSnapshot | typeof dominantBodyStyleConsensus =>
        (dimension.dimension === "deckLevelDominantStyleSnapshot" ||
          dimension.dimension === "dominantBodyStyleConsensus") &&
        dimension.comparisonLabel === "partialCorroboration"
    )
    .map((dimension) => dimension.dimension);
  const blockedDimensions = dimensionEvidence
    .filter(
      (
        dimension
      ): dimension is typeof deckLevelDominantStyleSnapshot | typeof dominantBodyStyleConsensus =>
        (dimension.dimension === "deckLevelDominantStyleSnapshot" ||
          dimension.dimension === "dominantBodyStyleConsensus") &&
        dimension.comparisonLabel === "partialConflictBlocked"
    )
    .map((dimension) => dimension.dimension);

  const hasTrustedPositiveEvidence = trustedPositiveDimensions.length > 0;
  const corroboratingFieldCount = dimensionEvidence
    .filter((dimension) => dimension.comparisonLabel === "partialCorroboration")
    .reduce((total, dimension) => total + dimension.matchingFieldCount, 0);
  const strongCorroboratingDimensionCount = dimensionEvidence.filter(
    (dimension) =>
      dimension.comparisonLabel === "partialCorroboration" && dimension.matchingFieldCount >= 3
  ).length;
  const hasNullCappedDimension = dimensionEvidence.some(
    (dimension) => dimension.comparisonLabel === "nullCapped"
  );

  const confidenceLabel = summarizeConfidenceLabel({
    hasTrustedPositiveEvidence,
    blockedDimensions,
    corroboratingFieldCount,
    strongCorroboratingDimensionCount,
    hasNullCappedDimension
  });

  return {
    claimScope: "conservativeConfidenceFromCurrentReliableFingerprintDimensionsOnly",
    templateIdentificationSolved: false,
    templateTargetedNormalizationAvailable: false,
    maximumAllowedConfidenceLabel: "moderate",
    candidateDeckId: input.candidate.deckId,
    templateDeckId: input.template.deckId,
    confidenceLabel,
    trustedPositiveDimensions,
    corroboratingDimensions,
    blockedDimensions,
    excludedDimensions: ["paragraphGroupStyleSignatures"],
    confidenceCapReasons: summarizeConfidenceCapReasons({
      confidenceLabel,
      hasTrustedPositiveEvidence,
      hasNullCappedDimension
    }),
    dimensionEvidence,
    futureOnlyDimensionsExcluded: reliabilitySummary.futureOnlyDimensions,
    outOfScopeDimensionsExcluded: reliabilitySummary.outOfScopeDimensions,
    summaryLine: summarizeSummaryLine(confidenceLabel)
  };
}

function summarizeUsageDistributionEvidence(input: {
  candidateAuditReport: AuditReport;
  candidateDimension: FingerprintDimensionSummary;
  templateAuditReport: AuditReport;
  templateDimension: FingerprintDimensionSummary;
}): TemplateMatchDimensionEvidence {
  const candidateLeaders = summarizeHistogramLeaders(input.candidateAuditReport);
  const templateLeaders = summarizeHistogramLeaders(input.templateAuditReport);
  const comparedFieldCount =
    Number(candidateLeaders.fontFamily !== null && templateLeaders.fontFamily !== null) +
    Number(candidateLeaders.fontSize !== null && templateLeaders.fontSize !== null);
  const matchingFieldCount =
    Number(
      candidateLeaders.fontFamily !== null &&
      candidateLeaders.fontFamily === templateLeaders.fontFamily
    ) +
    Number(
      candidateLeaders.fontSize !== null &&
      candidateLeaders.fontSize === templateLeaders.fontSize
    );
  const conflictingFieldCount =
    Number(
      candidateLeaders.fontFamily !== null &&
      templateLeaders.fontFamily !== null &&
      candidateLeaders.fontFamily !== templateLeaders.fontFamily
    ) +
    Number(
      candidateLeaders.fontSize !== null &&
      templateLeaders.fontSize !== null &&
      candidateLeaders.fontSize !== templateLeaders.fontSize
    );

  const comparisonLabel =
    input.candidateDimension.outputState === "deterministicFull" &&
      input.templateDimension.outputState === "deterministicFull" &&
      comparedFieldCount === 2 &&
      matchingFieldCount === 2 &&
      conflictingFieldCount === 0
      ? "trustedPositiveMatch"
      : "noTrustedPositiveMatch";

  return {
    dimension: "usageDistributionEvidence",
    confidencePolicy: "trustedPositiveEligible",
    comparisonLabel,
    candidateOutputState: input.candidateDimension.outputState,
    templateOutputState: input.templateDimension.outputState,
    comparedFieldCount,
    matchingFieldCount,
    conflictingFieldCount
  };
}

function summarizeComparableDimensionEvidence(input: {
  dimension: "deckLevelDominantStyleSnapshot" | "dominantBodyStyleConsensus";
  confidencePolicy: "corroboratingOnly";
  candidateDimension: FingerprintDimensionSummary;
  candidateSnapshot: ComparableFingerprintSnapshot;
  templateDimension: FingerprintDimensionSummary;
  templateSnapshot: ComparableFingerprintSnapshot;
}): TemplateMatchDimensionEvidence {
  const fieldComparisons = [
    compareField(input.candidateSnapshot.fontFamily, input.templateSnapshot.fontFamily),
    compareField(input.candidateSnapshot.fontSize, input.templateSnapshot.fontSize),
    compareField(input.candidateSnapshot.alignment, input.templateSnapshot.alignment),
    compareField(input.candidateSnapshot.lineSpacing, input.templateSnapshot.lineSpacing),
    compareField(input.candidateSnapshot.spacingBefore, input.templateSnapshot.spacingBefore),
    compareField(input.candidateSnapshot.spacingAfter, input.templateSnapshot.spacingAfter)
  ];
  const comparedFieldCount = fieldComparisons.filter((comparison) => comparison.compared).length;
  const matchingFieldCount = fieldComparisons.filter((comparison) => comparison.matching).length;
  const conflictingFieldCount = fieldComparisons.filter((comparison) => comparison.conflicting).length;

  let comparisonLabel: TemplateConfidenceComparisonLabel = "nullCapped";
  if (conflictingFieldCount > 0) {
    comparisonLabel = "partialConflictBlocked";
  } else if (
    input.candidateDimension.outputState !== "deterministicNull" &&
    input.templateDimension.outputState !== "deterministicNull" &&
    matchingFieldCount > 0
  ) {
    comparisonLabel = "partialCorroboration";
  }

  return {
    dimension: input.dimension,
    confidencePolicy: input.confidencePolicy,
    comparisonLabel,
    candidateOutputState: input.candidateDimension.outputState,
    templateOutputState: input.templateDimension.outputState,
    comparedFieldCount,
    matchingFieldCount,
    conflictingFieldCount
  };
}

function summarizeConfidenceLabel(input: {
  hasTrustedPositiveEvidence: boolean;
  blockedDimensions: Array<"deckLevelDominantStyleSnapshot" | "dominantBodyStyleConsensus">;
  corroboratingFieldCount: number;
  strongCorroboratingDimensionCount: number;
  hasNullCappedDimension: boolean;
}): TemplateMatchConfidenceLabel {
  if (!input.hasTrustedPositiveEvidence) {
    return "unavailable";
  }

  if (input.blockedDimensions.length > 0) {
    return "blocked";
  }

  if (input.hasNullCappedDimension || input.corroboratingFieldCount < 3) {
    return "weak";
  }

  if (input.strongCorroboratingDimensionCount < 2) {
    return "weak";
  }

  return "moderate";
}

function summarizeConfidenceCapReasons(input: {
  confidenceLabel: TemplateMatchConfidenceLabel;
  hasTrustedPositiveEvidence: boolean;
  hasNullCappedDimension: boolean;
}): TemplateConfidenceCapReason[] {
  const reasons: TemplateConfidenceCapReason[] = [
    "paragraphGroupSignatureSetComparisonExcluded",
    "futureOnlyDimensionsExcluded",
    "templateIdentificationNotImplemented"
  ];

  if (!input.hasTrustedPositiveEvidence) {
    reasons.unshift("trustedUsageDistributionMatchRequired");
  }

  if (input.confidenceLabel === "weak") {
    reasons.unshift("corroboratingDimensionsRemainPartial");
  }

  if (input.hasNullCappedDimension) {
    reasons.unshift("deterministicNullDimensionsBlockStrongerConfidence");
  }

  if (input.confidenceLabel === "blocked") {
    reasons.unshift("conflictingPartialDimensionsBlockedConfidence");
  }

  return dedupeReasons(reasons);
}

function summarizeSummaryLine(
  confidenceLabel: TemplateMatchConfidenceLabel
): TemplateMatchConfidenceSummary["summaryLine"] {
  if (confidenceLabel === "unavailable") {
    return "Template match confidence is unavailable because current runtime evidence does not show a trusted usage-distribution match; template identification is not implemented.";
  }

  if (confidenceLabel === "blocked") {
    return "Template match confidence is blocked because trusted usage-distribution evidence exists but corroborating partial dimensions conflict; template identification is not implemented.";
  }

  if (confidenceLabel === "weak") {
    return "Template match confidence is weak because only usage-distribution evidence is fully trusted while corroborating dimensions remain partial or null-capped; template identification is not implemented.";
  }

  return "Template match confidence is capped at moderate because current runtime evidence shows trusted usage-distribution agreement plus non-conflicting partial corroboration; template identification is not implemented.";
}

function summarizeHistogramLeaders(auditReport: AuditReport): HistogramLeaders {
  return {
    fontFamily: summarizeUniqueHistogramLeader(auditReport.deckFontUsage.fontFamilyHistogram),
    fontSize: summarizeUniqueHistogramLeader(auditReport.deckFontUsage.fontSizeHistogram)
  };
}

function summarizeDominantBodyConsensusSnapshot(
  auditReport: AuditReport
): ComparableFingerprintSnapshot {
  return {
    fontFamily: summarizeUniqueMetric(
      auditReport.slides.map((slide) => slide.dominantBodyStyle.fontFamily)
    ),
    fontSize: summarizeUniqueMetric(
      auditReport.slides.map((slide) => slide.dominantBodyStyle.fontSize)
    ),
    alignment: summarizeUniqueMetric(
      auditReport.slides.map((slide) => slide.dominantBodyStyle.alignment)
    ),
    lineSpacing: summarizeUniqueLineSpacing(
      auditReport.slides.map((slide) => slide.dominantBodyStyle.lineSpacing)
    ),
    spacingBefore: summarizeUniqueMetric(
      auditReport.slides.map((slide) => slide.dominantBodyStyle.spacingBefore)
    ),
    spacingAfter: summarizeUniqueMetric(
      auditReport.slides.map((slide) => slide.dominantBodyStyle.spacingAfter)
    )
  };
}

function summarizeUniqueHistogramLeader(histogram: Record<string, number>): string | null {
  const entries = Object.entries(histogram);
  if (entries.length === 0) {
    return null;
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const dominantEntries = entries.filter(([, count]) => count === maxCount);
  if (dominantEntries.length !== 1) {
    return null;
  }

  return dominantEntries[0][0];
}

function summarizeUniqueMetric<T extends string | number>(values: Array<T | null>): T | null {
  const counts = new Map<T, number>();

  for (const value of values) {
    if (value === null) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const entries = [...counts.entries()];
  if (entries.length === 0) {
    return null;
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const dominantEntries = entries.filter(([, count]) => count === maxCount);
  if (dominantEntries.length !== 1) {
    return null;
  }

  return dominantEntries[0][0];
}

function summarizeUniqueLineSpacing(
  values: Array<AuditReport["slides"][number]["dominantBodyStyle"]["lineSpacing"]>
): number | null {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value || value.kind === null || value.value === null) {
      continue;
    }

    const key = `${value.kind}::${value.value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const entries = [...counts.entries()];
  if (entries.length === 0) {
    return null;
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const dominantEntries = entries.filter(([, count]) => count === maxCount);
  if (dominantEntries.length !== 1) {
    return null;
  }

  const [, rawValue] = dominantEntries[0][0].split("::");
  const parsedValue = Number.parseFloat(rawValue);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function compareField(left: string | number | null, right: string | number | null): {
  compared: boolean;
  matching: boolean;
  conflicting: boolean;
} {
  if (left === null || right === null) {
    return {
      compared: false,
      matching: false,
      conflicting: false
    };
  }

  return {
    compared: true,
    matching: left === right,
    conflicting: left !== right
  };
}

function dedupeReasons(reasons: TemplateConfidenceCapReason[]): TemplateConfidenceCapReason[] {
  return [...new Set(reasons)];
}
