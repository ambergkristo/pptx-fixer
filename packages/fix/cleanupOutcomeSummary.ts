import type {
  FixStepSummary,
  FixTotalsSummary,
  FixVerificationSummary,
  SlideChangeSummary
} from "./runAllFixes.ts";

export interface CleanupOutcomeRemainingDrift {
  fontDrift: number;
  fontSizeDrift: number;
  spacingDriftCount: number;
  bulletIndentDriftCount: number;
  alignmentDriftCount: number;
  lineSpacingDriftCount: number;
}

export interface CleanupOutcomeSummary {
  changedSlides: number;
  totalChanges: number;
  appliedStages: string[];
  remainingDrift: CleanupOutcomeRemainingDrift;
  summaryLine: string;
}

export function summarizeCleanupOutcomeSummary(input: {
  steps: FixStepSummary[];
  totals: FixTotalsSummary;
  changesBySlide: SlideChangeSummary[];
  verification: FixVerificationSummary;
}): CleanupOutcomeSummary {
  const changedSlides = input.changesBySlide.length;
  const totalChanges = summarizeTotalChanges(input.totals);
  const appliedStages = input.steps
    .filter((step) => (
      "changedRuns" in step ? step.changedRuns > 0 : step.changedParagraphs > 0
    ))
    .map((step) => step.name);
  const remainingDrift = {
    fontDrift: input.verification.fontDriftAfter ?? 0,
    fontSizeDrift: input.verification.fontSizeDriftAfter ?? 0,
    spacingDriftCount: input.verification.spacingDriftAfter ?? 0,
    bulletIndentDriftCount: input.verification.bulletIndentDriftAfter ?? 0,
    alignmentDriftCount: input.verification.alignmentDriftAfter ?? 0,
    lineSpacingDriftCount: input.verification.lineSpacingDriftAfter ?? 0
  };

  return {
    changedSlides,
    totalChanges,
    appliedStages,
    remainingDrift,
    summaryLine: summarizeSummaryLine(totalChanges, remainingDrift)
  };
}

function summarizeTotalChanges(totals: FixTotalsSummary): number {
  return (
    totals.fontFamilyChanges +
    totals.fontSizeChanges +
    totals.spacingChanges +
    totals.bulletChanges +
    totals.alignmentChanges +
    totals.lineSpacingChanges +
    totals.dominantBodyStyleChanges +
    totals.dominantFontFamilyChanges +
    totals.dominantFontSizeChanges +
    (totals.templateShellChanges ?? 0)
  );
}

function summarizeSummaryLine(
  totalChanges: number,
  remainingDrift: CleanupOutcomeRemainingDrift
): string {
  if (totalChanges === 0) {
    return "No cleanup changes were applied.";
  }

  const remainingDriftTotal =
    remainingDrift.fontDrift +
    remainingDrift.fontSizeDrift +
    remainingDrift.spacingDriftCount +
    remainingDrift.bulletIndentDriftCount +
    remainingDrift.alignmentDriftCount +
    remainingDrift.lineSpacingDriftCount;

  if (remainingDriftTotal === 0) {
    return "Cleanup applied successfully with no remaining detected drift.";
  }

  if (remainingDriftTotal <= 3) {
    return "Cleanup applied successfully with minor remaining drift.";
  }

  return "Cleanup applied successfully, but some formatting drift remains.";
}
