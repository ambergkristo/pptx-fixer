import type { AuditReport, DeckStyleFingerprint, SlideAuditSummary } from "./pptxAudit.ts";
import type { ParagraphGroupStyleSignature } from "./styleSignatureAudit.ts";

export type FingerprintOutputState =
  | "deterministicFull"
  | "deterministicPartial"
  | "deterministicNull";

export interface FingerprintDimensionSummary {
  outputState: FingerprintOutputState;
  resolvedFieldCount: number;
  unresolvedFieldCount: number;
}

export interface FingerprintParagraphGroupSummary extends FingerprintDimensionSummary {
  totalParagraphGroups: number;
  groupsWithAnyResolvedStyleFieldCount: number;
  groupsWithOnlyNullStyleFieldsCount: number;
}

export interface FingerprintDominantBodyStyleSummary extends FingerprintDimensionSummary {
  slideCount: number;
  slidesWithAnyResolvedConsensusCount: number;
  slidesWithOnlyNullConsensusCount: number;
}

export interface FingerprintUsageDistributionSummary extends FingerprintDimensionSummary {
  slideCount: number;
  dominantCoverageAvailable: true;
  deckHistogramAvailable: true;
  slidesWithFontUsageHistogramCount: number;
}

export interface FingerprintExtractionDeckSummary {
  deckId: string;
  deckLevelDominantStyleSnapshot: FingerprintDimensionSummary;
  paragraphGroupStyleSignatures: FingerprintParagraphGroupSummary;
  dominantBodyStyleConsensus: FingerprintDominantBodyStyleSummary;
  usageDistributionEvidence: FingerprintUsageDistributionSummary;
}

export interface FingerprintOutputStateCounts {
  deterministicFull: number;
  deterministicPartial: number;
  deterministicNull: number;
}

export interface FingerprintExtractionReliabilitySummary {
  claimScope: "currentEvidenceBackedFingerprintDimensionsOnly";
  templateIntelligenceRuntimeAvailable: false;
  deckCount: number;
  deckSummaries: FingerprintExtractionDeckSummary[];
  aggregateDimensionCounts: {
    deckLevelDominantStyleSnapshot: FingerprintOutputStateCounts;
    paragraphGroupStyleSignatures: FingerprintOutputStateCounts;
    dominantBodyStyleConsensus: FingerprintOutputStateCounts;
    usageDistributionEvidence: FingerprintOutputStateCounts;
  };
  futureOnlyDimensions: Array<
    | "repeatedLayoutModuleSignatures"
    | "placeholderRolePatterns"
    | "templateSlotSimilarity"
    | "slideFamilyClustering"
    | "templateMatchConfidenceTraits"
  >;
  outOfScopeDimensions: Array<
    | "semanticNarrativeIntent"
    | "contentMeaning"
    | "aiStyleSimilarity"
    | "orgPolicyComplianceScoring"
    | "fullTemplateEnforcementSignals"
  >;
  summaryLine:
    | "Fingerprint extraction reliability is currently limited to evidence-backed style snapshot, group-signature, dominant-body-style, and usage-distribution dimensions; template intelligence remains unimplemented."
    | "Fingerprint extraction reliability currently shows only partial or null-safe evidence-backed dimensions; template intelligence remains unimplemented.";
}

export function summarizeFingerprintExtractionReliabilitySummary(input: {
  deckReports: Array<{
    deckId: string;
    auditReport: AuditReport;
  }>;
}): FingerprintExtractionReliabilitySummary {
  if (input.deckReports.length === 0) {
    throw new Error("Fingerprint extraction reliability requires at least one deck report.");
  }

  const deckSummaries = input.deckReports.map(({ deckId, auditReport }) => ({
    deckId,
    deckLevelDominantStyleSnapshot: summarizeDeckLevelDominantStyleSnapshot(auditReport.deckStyleFingerprint),
    paragraphGroupStyleSignatures: summarizeParagraphGroupStyleSignatures(auditReport.slides),
    dominantBodyStyleConsensus: summarizeDominantBodyStyleConsensus(auditReport.slides),
    usageDistributionEvidence: summarizeUsageDistributionEvidence(auditReport)
  }));

  const aggregateDimensionCounts = {
    deckLevelDominantStyleSnapshot: summarizeOutputStateCounts(deckSummaries, "deckLevelDominantStyleSnapshot"),
    paragraphGroupStyleSignatures: summarizeOutputStateCounts(deckSummaries, "paragraphGroupStyleSignatures"),
    dominantBodyStyleConsensus: summarizeOutputStateCounts(deckSummaries, "dominantBodyStyleConsensus"),
    usageDistributionEvidence: summarizeOutputStateCounts(deckSummaries, "usageDistributionEvidence")
  };

  const hasAnyFullExtraction =
    aggregateDimensionCounts.deckLevelDominantStyleSnapshot.deterministicFull > 0 ||
    aggregateDimensionCounts.paragraphGroupStyleSignatures.deterministicFull > 0 ||
    aggregateDimensionCounts.dominantBodyStyleConsensus.deterministicFull > 0 ||
    aggregateDimensionCounts.usageDistributionEvidence.deterministicFull > 0;

  return {
    claimScope: "currentEvidenceBackedFingerprintDimensionsOnly",
    templateIntelligenceRuntimeAvailable: false,
    deckCount: deckSummaries.length,
    deckSummaries,
    aggregateDimensionCounts,
    futureOnlyDimensions: [
      "repeatedLayoutModuleSignatures",
      "placeholderRolePatterns",
      "templateSlotSimilarity",
      "slideFamilyClustering",
      "templateMatchConfidenceTraits"
    ],
    outOfScopeDimensions: [
      "semanticNarrativeIntent",
      "contentMeaning",
      "aiStyleSimilarity",
      "orgPolicyComplianceScoring",
      "fullTemplateEnforcementSignals"
    ],
    summaryLine: hasAnyFullExtraction
      ? "Fingerprint extraction reliability is currently limited to evidence-backed style snapshot, group-signature, dominant-body-style, and usage-distribution dimensions; template intelligence remains unimplemented."
      : "Fingerprint extraction reliability currently shows only partial or null-safe evidence-backed dimensions; template intelligence remains unimplemented."
  };
}

function summarizeDeckLevelDominantStyleSnapshot(
  fingerprint: DeckStyleFingerprint
): FingerprintDimensionSummary {
  const resolvedFieldCount = countNonNullValues([
    fingerprint.fontFamily,
    fingerprint.fontSize,
    fingerprint.alignment,
    fingerprint.lineSpacing,
    fingerprint.spacingBefore,
    fingerprint.spacingAfter
  ]);

  return {
    outputState: summarizeOutputState(resolvedFieldCount, 6),
    resolvedFieldCount,
    unresolvedFieldCount: 6 - resolvedFieldCount
  };
}

function summarizeParagraphGroupStyleSignatures(
  slides: SlideAuditSummary[]
): FingerprintParagraphGroupSummary {
  const groups = slides.flatMap((slide) => slide.paragraphGroups);
  const groupsWithResolvedFieldCounts = groups.map((group) =>
    countStyleSignatureFields(group.styleSignature)
  );
  const groupsWithAnyResolvedStyleFieldCount = groupsWithResolvedFieldCounts.filter(
    (count) => count > 0
  ).length;
  const groupsWithOnlyNullStyleFieldsCount = groups.length - groupsWithAnyResolvedStyleFieldCount;
  const resolvedFieldCount = groupsWithResolvedFieldCounts.reduce((total, count) => total + count, 0);
  const unresolvedFieldCount = (groups.length * 7) - resolvedFieldCount;

  return {
    outputState: summarizeOutputState(resolvedFieldCount, groups.length * 7),
    resolvedFieldCount,
    unresolvedFieldCount,
    totalParagraphGroups: groups.length,
    groupsWithAnyResolvedStyleFieldCount,
    groupsWithOnlyNullStyleFieldsCount
  };
}

function summarizeDominantBodyStyleConsensus(
  slides: SlideAuditSummary[]
): FingerprintDominantBodyStyleSummary {
  const resolvedFieldCounts = slides.map((slide) =>
    countNonNullValues([
      slide.dominantBodyStyle.fontFamily,
      slide.dominantBodyStyle.fontSize,
      slide.dominantBodyStyle.spacingBefore,
      slide.dominantBodyStyle.spacingAfter,
      slide.dominantBodyStyle.alignment,
      slide.dominantBodyStyle.lineSpacing
    ])
  );
  const resolvedFieldCount = resolvedFieldCounts.reduce((total, count) => total + count, 0);
  const slidesWithAnyResolvedConsensusCount = resolvedFieldCounts.filter((count) => count > 0).length;
  const slidesWithOnlyNullConsensusCount = slides.length - slidesWithAnyResolvedConsensusCount;

  return {
    outputState: summarizeOutputState(resolvedFieldCount, slides.length * 6),
    resolvedFieldCount,
    unresolvedFieldCount: (slides.length * 6) - resolvedFieldCount,
    slideCount: slides.length,
    slidesWithAnyResolvedConsensusCount,
    slidesWithOnlyNullConsensusCount
  };
}

function summarizeUsageDistributionEvidence(
  auditReport: AuditReport
): FingerprintUsageDistributionSummary {
  const deckResolvedFieldCount = countNonEmptyHistograms([
    auditReport.deckFontUsage.fontFamilyHistogram,
    auditReport.deckFontUsage.fontSizeHistogram
  ]) + 2;
  const slideHistogramCount = auditReport.slides.filter((slide) =>
    hasAnyHistogramEntries(slide.slideFontUsage.fontFamilyHistogram) ||
    hasAnyHistogramEntries(slide.slideFontUsage.fontSizeHistogram)
  ).length;
  const totalFieldCount = 4;

  return {
    outputState: summarizeOutputState(deckResolvedFieldCount, totalFieldCount),
    resolvedFieldCount: deckResolvedFieldCount,
    unresolvedFieldCount: totalFieldCount - deckResolvedFieldCount,
    slideCount: auditReport.slideCount,
    dominantCoverageAvailable: true,
    deckHistogramAvailable: true,
    slidesWithFontUsageHistogramCount: slideHistogramCount
  };
}

function summarizeOutputState(
  resolvedFieldCount: number,
  totalFieldCount: number
): FingerprintOutputState {
  if (resolvedFieldCount === 0) {
    return "deterministicNull";
  }

  if (resolvedFieldCount === totalFieldCount) {
    return "deterministicFull";
  }

  return "deterministicPartial";
}

function countStyleSignatureFields(signature: ParagraphGroupStyleSignature): number {
  return countNonNullValues([
    signature.fontFamily,
    signature.fontSize,
    signature.spacingBefore,
    signature.spacingAfter,
    signature.alignment,
    signature.lineSpacing,
    signature.bulletLevel
  ]);
}

function countNonNullValues(values: unknown[]): number {
  return values.filter((value) => value !== null).length;
}

function countNonEmptyHistograms(histograms: Array<Record<string, number>>): number {
  return histograms.filter(hasAnyHistogramEntries).length;
}

function hasAnyHistogramEntries(histogram: Record<string, number>): boolean {
  return Object.keys(histogram).length > 0;
}

function summarizeOutputStateCounts(
  deckSummaries: FingerprintExtractionDeckSummary[],
  key:
    | "deckLevelDominantStyleSnapshot"
    | "paragraphGroupStyleSignatures"
    | "dominantBodyStyleConsensus"
    | "usageDistributionEvidence"
): FingerprintOutputStateCounts {
  return deckSummaries.reduce(
    (counts, deckSummary) => {
      counts[deckSummary[key].outputState] += 1;
      return counts;
    },
    {
      deterministicFull: 0,
      deterministicPartial: 0,
      deterministicNull: 0
    }
  );
}
