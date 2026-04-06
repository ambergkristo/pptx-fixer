import type { DeckQaSummary } from "../audit/deckQaSummary.ts";
import type { TopProblemSlideSummary } from "../audit/topProblemSlides.ts";
import type { CleanupOutcomeSummary } from "./cleanupOutcomeSummary.ts";
import type { HierarchyQualitySummary } from "./hierarchyQualitySummary.ts";
import type { FixStepSummary, FixTotalsSummary, SlideChangeSummary } from "./runAllFixes.ts";

export type RecommendedPrimaryAction =
  | "none"
  | "review"
  | "refine"
  | "manual_attention";

export interface RecommendedActionSummary {
  primaryAction: RecommendedPrimaryAction;
  actionReason: string;
  focusAreas: string[];
}

export function summarizeRecommendedActionSummary(input: {
  deckQaSummary: DeckQaSummary;
  cleanupOutcomeSummary: CleanupOutcomeSummary;
  topProblemSlides: TopProblemSlideSummary[];
  changesBySlide: SlideChangeSummary[];
  totals: FixTotalsSummary;
  steps: FixStepSummary[];
  hierarchyQualitySummary?: HierarchyQualitySummary;
}): RecommendedActionSummary {
  const remainingDriftTotal =
    input.cleanupOutcomeSummary.remainingDrift.fontDrift +
    input.cleanupOutcomeSummary.remainingDrift.fontSizeDrift +
    input.cleanupOutcomeSummary.remainingDrift.spacingDriftCount +
    input.cleanupOutcomeSummary.remainingDrift.bulletIndentDriftCount +
    input.cleanupOutcomeSummary.remainingDrift.alignmentDriftCount +
    input.cleanupOutcomeSummary.remainingDrift.lineSpacingDriftCount;
  const hasPoorQuality =
    input.deckQaSummary.qualityLabel === "poor" ||
    input.topProblemSlides.some((slide) => slide.qualityLabel === "poor");
  const cleanupApplied = input.cleanupOutcomeSummary.totalChanges > 0;

  const primaryAction = summarizePrimaryAction({
    cleanupApplied,
    remainingDriftTotal,
    hasPoorQuality,
    hierarchyReviewRequired: input.hierarchyQualitySummary?.modeApplied === true &&
      input.hierarchyQualitySummary.allowsReady === false
  });

  return {
    primaryAction,
    actionReason: summarizeActionReason(primaryAction, input.hierarchyQualitySummary),
    focusAreas: summarizeFocusAreas(input)
  };
}

function summarizePrimaryAction(input: {
  cleanupApplied: boolean;
  remainingDriftTotal: number;
  hasPoorQuality: boolean;
  hierarchyReviewRequired: boolean;
}): RecommendedPrimaryAction {
  if (input.hierarchyReviewRequired && input.cleanupApplied) {
    return "review";
  }

  if (input.remainingDriftTotal === 0) {
    return input.cleanupApplied ? "review" : "none";
  }

  if (!input.cleanupApplied) {
    return input.hasPoorQuality || input.remainingDriftTotal >= 5 ? "manual_attention" : "refine";
  }

  if (input.hasPoorQuality || input.remainingDriftTotal >= 5) {
    return "manual_attention";
  }

  if (input.cleanupApplied && input.remainingDriftTotal <= 1) {
    return "review";
  }

  return "refine";
}

function summarizeActionReason(
  primaryAction: RecommendedPrimaryAction,
  hierarchyQualitySummary?: HierarchyQualitySummary
): string {
  if (hierarchyQualitySummary?.modeApplied && hierarchyQualitySummary.allowsReady === false) {
    return "Automatic repair improved the deck, but heading hierarchy should still be reviewed.";
  }

  if (primaryAction === "none") {
    return "No significant formatting issues remain.";
  }

  if (primaryAction === "review") {
    return "Automatic cleanup resolved most detected drift.";
  }

  if (primaryAction === "refine") {
    return "Some formatting drift remains and should be reviewed.";
  }

  return "Significant formatting inconsistency remains after cleanup.";
}

function summarizeFocusAreas(input: {
  cleanupOutcomeSummary: CleanupOutcomeSummary;
  topProblemSlides: TopProblemSlideSummary[];
  changesBySlide: SlideChangeSummary[];
  totals: FixTotalsSummary;
  steps: FixStepSummary[];
  hierarchyQualitySummary?: HierarchyQualitySummary;
}): string[] {
  const focusAreas: string[] = [];
  const remainingDrift = input.cleanupOutcomeSummary.remainingDrift;

  if (remainingDrift.fontDrift > 0) {
    focusAreas.push("font consistency");
  }

  if (remainingDrift.fontSizeDrift > 0) {
    focusAreas.push("font size consistency");
  }

  if (remainingDrift.spacingDriftCount > 0) {
    focusAreas.push("paragraph spacing");
  }

  if (remainingDrift.bulletIndentDriftCount > 0) {
    focusAreas.push("bullet formatting");
  }

  if (remainingDrift.alignmentDriftCount > 0) {
    focusAreas.push("alignment");
  }

  if (remainingDrift.lineSpacingDriftCount > 0) {
    focusAreas.push("line spacing");
  }

  if (
    input.hierarchyQualitySummary?.modeApplied &&
    input.hierarchyQualitySummary.allowsReady === false &&
    !focusAreas.includes("hierarchy review")
  ) {
    focusAreas.push("hierarchy review");
  }

  if (focusAreas.length < 3) {
    appendAppliedCleanupAreas(focusAreas, input);
  }

  if (focusAreas.length < 3 && input.topProblemSlides.length > 0) {
    focusAreas.push("problem slides review");
  }

  return focusAreas.slice(0, 3);
}

function appendAppliedCleanupAreas(
  focusAreas: string[],
  input: {
    changesBySlide: SlideChangeSummary[];
    totals: FixTotalsSummary;
    steps: FixStepSummary[];
  }
): void {
  const appliedStageNames = new Set(
    input.steps
      .filter((step) => (
        "changedRuns" in step ? step.changedRuns > 0 : step.changedParagraphs > 0
      ))
      .map((step) => step.name)
  );

  if (
    !focusAreas.includes("font consistency") &&
    (appliedStageNames.has("fontFamilyFix") || input.totals.dominantFontFamilyChanges > 0)
  ) {
    focusAreas.push("font consistency");
  }

  if (
    !focusAreas.includes("font size consistency") &&
    (appliedStageNames.has("fontSizeFix") || input.totals.dominantFontSizeChanges > 0)
  ) {
    focusAreas.push("font size consistency");
  }

  if (
    !focusAreas.includes("paragraph spacing") &&
    (
      appliedStageNames.has("spacingFix") ||
      input.changesBySlide.some((slide) =>
        slide.dominantBodyStyleSpacingBeforeChanges > 0 ||
        slide.dominantBodyStyleSpacingAfterChanges > 0
      )
    )
  ) {
    focusAreas.push("paragraph spacing");
  }

  if (
    !focusAreas.includes("bullet formatting") &&
    appliedStageNames.has("bulletFix")
  ) {
    focusAreas.push("bullet formatting");
  }

  if (
    !focusAreas.includes("alignment") &&
    (
      appliedStageNames.has("alignmentFix") ||
      input.changesBySlide.some((slide) => slide.dominantBodyStyleAlignmentChanges > 0)
    )
  ) {
    focusAreas.push("alignment");
  }

  if (
    !focusAreas.includes("line spacing") &&
    (
      appliedStageNames.has("lineSpacingFix") ||
      input.changesBySlide.some((slide) => slide.dominantBodyStyleLineSpacingChanges > 0)
    )
  ) {
    focusAreas.push("line spacing");
  }
}
