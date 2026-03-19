import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type AuditReport } from "../audit/pptxAudit.ts";
import {
  summarizeTemplateMatchConfidenceSummary,
  type TemplateMatchConfidenceLabel
} from "../audit/templateMatchConfidenceSummary.ts";
import { applyFontFamilyFixToArchive } from "../fix/fontFamilyFix.ts";
import { applyFontSizeFixToArchive } from "../fix/fontSizeFix.ts";
import { applyDominantBodyStyleFixToArchive } from "../fix/dominantBodyStyleFix.ts";

export type FingerprintExperimentStage =
  | "fontFamilyFix"
  | "fontSizeFix"
  | "dominantBodyStyleFix";

export type FingerprintBasedNormalizationPlanStatus =
  | "notEligible"
  | "blocked"
  | "candidateOnly"
  | "candidateReady";

export type FingerprintBasedNormalizationExperimentStatus =
  | "notEligible"
  | "blocked"
  | "candidateOnly"
  | "experimentApplied";

export interface FingerprintBasedNormalizationSharedTargets {
  fontFamily: string | null;
  fontSize: number | null;
  alignment: string | null;
}

export interface FingerprintBasedNormalizationExperimentPlan {
  experimentName: "fingerprintBasedNormalizationExperiment";
  claimScope: "experimentalOptInFingerprintDerivedTargetsOnly";
  explicitExperimentInvocationRequired: true;
  defaultCleanupPathAffected: false;
  templateEnforcementSolved: false;
  templateMatchConfidenceLabel: TemplateMatchConfidenceLabel;
  planStatus: FingerprintBasedNormalizationPlanStatus;
  candidateDeckId: string;
  templateDeckId: string;
  sharedTargets: FingerprintBasedNormalizationSharedTargets;
  selectedExperimentStages: FingerprintExperimentStage[];
  excludedNormalizationDimensions: Array<
    "paragraphGroupStyleSignatures"
    | "lineSpacing"
    | "paragraphSpacing"
    | "bulletIndentation"
  >;
  futureOnlyDimensionsExcluded: Array<
    | "repeatedLayoutModuleSignatures"
    | "placeholderRolePatterns"
    | "templateSlotSimilarity"
    | "slideFamilyClustering"
    | "templateMatchConfidenceTraits"
  >;
  outOfScopeDimensionsExcluded: Array<
    | "semanticNarrativeIntent"
    | "contentMeaning"
    | "aiStyleSimilarity"
    | "orgPolicyComplianceScoring"
    | "fullTemplateEnforcementSignals"
  >;
  blockingReasons: string[];
  summaryLine:
    | "Fingerprint-based normalization experiment is not eligible because template confidence did not reach the moderate experimental gate."
    | "Fingerprint-based normalization experiment is blocked because template confidence reported conflicting corroborating evidence."
    | "Fingerprint-based normalization experiment found a moderate-confidence candidate but no allowed safe experiment stages."
    | "Fingerprint-based normalization experiment found a moderate-confidence candidate and limited safe experiment stages."
}

export interface FingerprintBasedNormalizationExperimentResult {
  experimentName: "fingerprintBasedNormalizationExperiment";
  claimScope: "experimentalOptInFingerprintDerivedTargetsOnly";
  explicitExperimentInvocationRequired: true;
  defaultCleanupPathAffected: false;
  templateEnforcementSolved: false;
  experimentStatus: FingerprintBasedNormalizationExperimentStatus;
  templateMatchConfidenceLabel: TemplateMatchConfidenceLabel;
  candidateDeckId: string;
  templateDeckId: string;
  sharedTargets: FingerprintBasedNormalizationSharedTargets;
  selectedExperimentStages: FingerprintExperimentStage[];
  stageChangeCounts: {
    fontFamilyChanges: number;
    fontSizeChanges: number;
    alignmentChanges: number;
  };
  verification: {
    fontDriftBefore: number;
    fontDriftAfter: number;
    fontSizeDriftBefore: number;
    fontSizeDriftAfter: number;
    alignmentDriftBefore: number;
    alignmentDriftAfter: number;
  };
  plan: FingerprintBasedNormalizationExperimentPlan;
  summaryLine:
    | "Fingerprint-based normalization experiment was not eligible and produced a no-op output."
    | "Fingerprint-based normalization experiment was blocked and produced a no-op output."
    | "Fingerprint-based normalization experiment stayed candidate-only and produced a no-op output."
    | "Fingerprint-based normalization experiment applied a limited safe pass under moderate template-match confidence."
}

export function summarizeFingerprintBasedNormalizationExperimentPlan(input: {
  candidate: {
    deckId: string;
    auditReport: AuditReport;
  };
  template: {
    deckId: string;
    auditReport: AuditReport;
  };
}): FingerprintBasedNormalizationExperimentPlan {
  const confidenceSummary = summarizeTemplateMatchConfidenceSummary({
    candidate: input.candidate,
    template: input.template
  });
  const sharedTargets = summarizeSharedTargets({
    candidateAuditReport: input.candidate.auditReport,
    templateAuditReport: input.template.auditReport
  });
  const excludedNormalizationDimensions: FingerprintBasedNormalizationExperimentPlan["excludedNormalizationDimensions"] = [
    "paragraphGroupStyleSignatures",
    "lineSpacing",
    "paragraphSpacing",
    "bulletIndentation"
  ];

  if (confidenceSummary.confidenceLabel === "blocked") {
    return {
      experimentName: "fingerprintBasedNormalizationExperiment",
      claimScope: "experimentalOptInFingerprintDerivedTargetsOnly",
      explicitExperimentInvocationRequired: true,
      defaultCleanupPathAffected: false,
      templateEnforcementSolved: false,
      templateMatchConfidenceLabel: confidenceSummary.confidenceLabel,
      planStatus: "blocked",
      candidateDeckId: input.candidate.deckId,
      templateDeckId: input.template.deckId,
      sharedTargets,
      selectedExperimentStages: [],
      excludedNormalizationDimensions,
      futureOnlyDimensionsExcluded: confidenceSummary.futureOnlyDimensionsExcluded,
      outOfScopeDimensionsExcluded: confidenceSummary.outOfScopeDimensionsExcluded,
      blockingReasons: [
        "templateMatchConfidenceBlocked",
        ...confidenceSummary.confidenceCapReasons
      ],
      summaryLine: "Fingerprint-based normalization experiment is blocked because template confidence reported conflicting corroborating evidence."
    };
  }

  if (confidenceSummary.confidenceLabel !== "moderate") {
    return {
      experimentName: "fingerprintBasedNormalizationExperiment",
      claimScope: "experimentalOptInFingerprintDerivedTargetsOnly",
      explicitExperimentInvocationRequired: true,
      defaultCleanupPathAffected: false,
      templateEnforcementSolved: false,
      templateMatchConfidenceLabel: confidenceSummary.confidenceLabel,
      planStatus: "notEligible",
      candidateDeckId: input.candidate.deckId,
      templateDeckId: input.template.deckId,
      sharedTargets,
      selectedExperimentStages: [],
      excludedNormalizationDimensions,
      futureOnlyDimensionsExcluded: confidenceSummary.futureOnlyDimensionsExcluded,
      outOfScopeDimensionsExcluded: confidenceSummary.outOfScopeDimensionsExcluded,
      blockingReasons: [
        "moderateConfidenceRequired",
        ...confidenceSummary.confidenceCapReasons
      ],
      summaryLine: "Fingerprint-based normalization experiment is not eligible because template confidence did not reach the moderate experimental gate."
    };
  }

  const selectedExperimentStages: FingerprintExperimentStage[] = [];

  if (
    sharedTargets.fontFamily !== null &&
    input.candidate.auditReport.fontDrift.dominantFont === sharedTargets.fontFamily &&
    input.candidate.auditReport.fontDrift.driftRuns.length > 0
  ) {
    selectedExperimentStages.push("fontFamilyFix");
  }

  if (
    sharedTargets.fontSize !== null &&
    input.candidate.auditReport.fontSizeDrift.dominantSizePt === sharedTargets.fontSize &&
    input.candidate.auditReport.fontSizeDrift.driftRuns.length > 0
  ) {
    selectedExperimentStages.push("fontSizeFix");
  }

  if (
    sharedTargets.alignment !== null &&
    input.candidate.auditReport.alignmentDriftCount > 0
  ) {
    selectedExperimentStages.push("dominantBodyStyleFix");
  }

  return {
    experimentName: "fingerprintBasedNormalizationExperiment",
    claimScope: "experimentalOptInFingerprintDerivedTargetsOnly",
    explicitExperimentInvocationRequired: true,
    defaultCleanupPathAffected: false,
    templateEnforcementSolved: false,
    templateMatchConfidenceLabel: confidenceSummary.confidenceLabel,
    planStatus: selectedExperimentStages.length > 0 ? "candidateReady" : "candidateOnly",
    candidateDeckId: input.candidate.deckId,
    templateDeckId: input.template.deckId,
    sharedTargets,
    selectedExperimentStages,
    excludedNormalizationDimensions,
    futureOnlyDimensionsExcluded: confidenceSummary.futureOnlyDimensionsExcluded,
    outOfScopeDimensionsExcluded: confidenceSummary.outOfScopeDimensionsExcluded,
    blockingReasons: selectedExperimentStages.length > 0
      ? [
        "futureOnlyAndExcludedDimensionsRemainOutOfScope",
        "defaultCleanupPathUnaffected"
      ]
      : [
        "noAllowedSafeExperimentStages"
      ],
    summaryLine: selectedExperimentStages.length > 0
      ? "Fingerprint-based normalization experiment found a moderate-confidence candidate and limited safe experiment stages."
      : "Fingerprint-based normalization experiment found a moderate-confidence candidate but no allowed safe experiment stages."
  };
}

export async function runFingerprintBasedNormalizationExperiment(input: {
  candidateInputPath: string;
  outputPath: string;
  templateInputPath: string;
}): Promise<FingerprintBasedNormalizationExperimentResult> {
  const resolvedInputPath = path.resolve(input.candidateInputPath);
  const resolvedOutputPath = path.resolve(input.outputPath);
  const resolvedTemplatePath = path.resolve(input.templateInputPath);

  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const candidatePresentation = await loadPresentation(resolvedInputPath);
  const templatePresentation = await loadPresentation(resolvedTemplatePath);
  const candidateAuditReport = analyzeSlides(candidatePresentation);
  const templateAuditReport = analyzeSlides(templatePresentation);
  const plan = summarizeFingerprintBasedNormalizationExperimentPlan({
    candidate: {
      deckId: path.basename(resolvedInputPath),
      auditReport: candidateAuditReport
    },
    template: {
      deckId: path.basename(resolvedTemplatePath),
      auditReport: templateAuditReport
    }
  });

  const inputBuffer = await readFile(resolvedInputPath);

  if (plan.planStatus === "notEligible" || plan.planStatus === "blocked" || plan.planStatus === "candidateOnly") {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return {
      experimentName: "fingerprintBasedNormalizationExperiment",
      claimScope: "experimentalOptInFingerprintDerivedTargetsOnly",
      explicitExperimentInvocationRequired: true,
      defaultCleanupPathAffected: false,
      templateEnforcementSolved: false,
      experimentStatus: plan.planStatus,
      templateMatchConfidenceLabel: plan.templateMatchConfidenceLabel,
      candidateDeckId: plan.candidateDeckId,
      templateDeckId: plan.templateDeckId,
      sharedTargets: plan.sharedTargets,
      selectedExperimentStages: [],
      stageChangeCounts: {
        fontFamilyChanges: 0,
        fontSizeChanges: 0,
        alignmentChanges: 0
      },
      verification: {
        fontDriftBefore: candidateAuditReport.fontDrift.driftRuns.length,
        fontDriftAfter: candidateAuditReport.fontDrift.driftRuns.length,
        fontSizeDriftBefore: candidateAuditReport.fontSizeDrift.driftRuns.length,
        fontSizeDriftAfter: candidateAuditReport.fontSizeDrift.driftRuns.length,
        alignmentDriftBefore: candidateAuditReport.alignmentDriftCount,
        alignmentDriftAfter: candidateAuditReport.alignmentDriftCount
      },
      plan,
      summaryLine: plan.planStatus === "blocked"
        ? "Fingerprint-based normalization experiment was blocked and produced a no-op output."
        : plan.planStatus === "candidateOnly"
          ? "Fingerprint-based normalization experiment stayed candidate-only and produced a no-op output."
          : "Fingerprint-based normalization experiment was not eligible and produced a no-op output."
    };
  }

  const archive = await JSZip.loadAsync(inputBuffer);
  const fontFamilyReport = plan.selectedExperimentStages.includes("fontFamilyFix")
    ? await applyFontFamilyFixToArchive(archive, candidatePresentation, plan.sharedTargets.fontFamily)
    : {
      applied: false,
      dominantFont: plan.sharedTargets.fontFamily,
      changedRuns: [],
      skipped: [{ reason: "experiment stage not selected" }]
    };
  const fontSizeReport = plan.selectedExperimentStages.includes("fontSizeFix")
    ? await applyFontSizeFixToArchive(archive, candidatePresentation, plan.sharedTargets.fontSize)
    : {
      applied: false,
      dominantSizePt: plan.sharedTargets.fontSize,
      changedRuns: [],
      skipped: [{ reason: "experiment stage not selected" }]
    };
  const dominantBodyStyleReport = plan.selectedExperimentStages.includes("dominantBodyStyleFix")
    ? await applyDominantBodyStyleFixToArchive(archive, candidatePresentation, candidateAuditReport)
    : {
      applied: false,
      changedParagraphs: [],
      telemetryBySlide: [],
      skipped: [{ reason: "experiment stage not selected" }]
    };
  const dominantBodyStyleChangedProperties = dominantBodyStyleReport.changedParagraphs.map(
    (change) => change.property
  );
  const dominantBodyStyleAlignmentOnly =
    dominantBodyStyleChangedProperties.length > 0 &&
    dominantBodyStyleChangedProperties.every((property) => property === "alignment");

  const stageChangeCounts = {
    fontFamilyChanges: countChangedEntries(fontFamilyReport.changedRuns),
    fontSizeChanges: countChangedEntries(fontSizeReport.changedRuns),
    alignmentChanges: dominantBodyStyleAlignmentOnly
      ? countChangedEntries(dominantBodyStyleReport.changedParagraphs)
      : 0
  };

  const experimentApplied =
    stageChangeCounts.fontFamilyChanges > 0 ||
    stageChangeCounts.fontSizeChanges > 0 ||
    stageChangeCounts.alignmentChanges > 0;

  await writeOutput(
    resolvedOutputPath,
    experimentApplied ? await archive.generateAsync({ type: "nodebuffer" }) : inputBuffer
  );

  if (!experimentApplied) {
    return {
      experimentName: "fingerprintBasedNormalizationExperiment",
      claimScope: "experimentalOptInFingerprintDerivedTargetsOnly",
      explicitExperimentInvocationRequired: true,
      defaultCleanupPathAffected: false,
      templateEnforcementSolved: false,
      experimentStatus: "candidateOnly",
      templateMatchConfidenceLabel: plan.templateMatchConfidenceLabel,
      candidateDeckId: plan.candidateDeckId,
      templateDeckId: plan.templateDeckId,
      sharedTargets: plan.sharedTargets,
      selectedExperimentStages: plan.selectedExperimentStages,
      stageChangeCounts,
      verification: {
        fontDriftBefore: candidateAuditReport.fontDrift.driftRuns.length,
        fontDriftAfter: candidateAuditReport.fontDrift.driftRuns.length,
        fontSizeDriftBefore: candidateAuditReport.fontSizeDrift.driftRuns.length,
        fontSizeDriftAfter: candidateAuditReport.fontSizeDrift.driftRuns.length,
        alignmentDriftBefore: candidateAuditReport.alignmentDriftCount,
        alignmentDriftAfter: candidateAuditReport.alignmentDriftCount
      },
      plan,
      summaryLine: "Fingerprint-based normalization experiment stayed candidate-only and produced a no-op output."
    };
  }

  const outputAuditReport = analyzeSlides(await loadPresentation(resolvedOutputPath));

  return {
    experimentName: "fingerprintBasedNormalizationExperiment",
    claimScope: "experimentalOptInFingerprintDerivedTargetsOnly",
    explicitExperimentInvocationRequired: true,
    defaultCleanupPathAffected: false,
    templateEnforcementSolved: false,
    experimentStatus: "experimentApplied",
    templateMatchConfidenceLabel: plan.templateMatchConfidenceLabel,
    candidateDeckId: plan.candidateDeckId,
    templateDeckId: plan.templateDeckId,
    sharedTargets: plan.sharedTargets,
    selectedExperimentStages: plan.selectedExperimentStages,
    stageChangeCounts,
    verification: {
      fontDriftBefore: candidateAuditReport.fontDrift.driftRuns.length,
      fontDriftAfter: outputAuditReport.fontDrift.driftRuns.length,
      fontSizeDriftBefore: candidateAuditReport.fontSizeDrift.driftRuns.length,
      fontSizeDriftAfter: outputAuditReport.fontSizeDrift.driftRuns.length,
      alignmentDriftBefore: candidateAuditReport.alignmentDriftCount,
      alignmentDriftAfter: outputAuditReport.alignmentDriftCount
    },
    plan,
    summaryLine: "Fingerprint-based normalization experiment applied a limited safe pass under moderate template-match confidence."
  };
}

function summarizeSharedTargets(input: {
  candidateAuditReport: AuditReport;
  templateAuditReport: AuditReport;
}): FingerprintBasedNormalizationSharedTargets {
  const candidateAlignmentConsensus = summarizeUniqueMetric(
    input.candidateAuditReport.slides.map((slide) => slide.dominantBodyStyle.alignment)
  );
  const templateAlignmentConsensus = summarizeUniqueMetric(
    input.templateAuditReport.slides.map((slide) => slide.dominantBodyStyle.alignment)
  );

  return {
    fontFamily: summarizeSharedValue(
      input.candidateAuditReport.deckStyleFingerprint.fontFamily,
      input.templateAuditReport.deckStyleFingerprint.fontFamily
    ),
    fontSize: summarizeSharedValue(
      input.candidateAuditReport.deckStyleFingerprint.fontSize,
      input.templateAuditReport.deckStyleFingerprint.fontSize
    ),
    alignment:
      input.candidateAuditReport.deckStyleFingerprint.alignment !== null &&
      input.candidateAuditReport.deckStyleFingerprint.alignment === input.templateAuditReport.deckStyleFingerprint.alignment &&
      input.candidateAuditReport.deckStyleFingerprint.alignment === candidateAlignmentConsensus &&
      candidateAlignmentConsensus === templateAlignmentConsensus
        ? input.candidateAuditReport.deckStyleFingerprint.alignment
        : null
  };
}

function summarizeSharedValue<T extends string | number>(
  candidateValue: T | null,
  templateValue: T | null
): T | null {
  if (candidateValue === null || templateValue === null) {
    return null;
  }

  return candidateValue === templateValue ? candidateValue : null;
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

function countChangedEntries(entries: Array<{ count: number }>): number {
  return entries.reduce((total, entry) => total + entry.count, 0);
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
