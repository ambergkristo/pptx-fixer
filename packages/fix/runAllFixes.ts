import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import {
  analyzeSlides,
  loadPresentation,
  type AuditReport,
  type DeckStyleFingerprint,
  type DeckFontUsageSummary,
  type FontDriftSeverity,
  type SlideQaSummary,
  type SlideAuditSummary,
  type SlideFontUsageSummary,
  type TopProblemSlideSummary
} from "../audit/pptxAudit.ts";
import {
  summarizeDeckQaFixImpact,
  summarizeDeckQaSummary,
  type DeckQaSummary
} from "../audit/deckQaSummary.ts";
import { validateFixedPptx, type FixedPptxValidationReport } from "../export/validateFixedPptx.ts";
import {
  validateOutputPackage,
  type OutputPackageValidationSummary
} from "../export/outputPackageValidation.ts";
import {
  summarizeOutputFileMetadata,
  type OutputFileMetadataSummary
} from "../export/outputFileMetadataSummary.ts";
import {
  summarizeCleanupOutcomeSummary,
  type CleanupOutcomeSummary
} from "./cleanupOutcomeSummary.ts";
import {
  summarizeRecommendedActionSummary,
  type RecommendedActionSummary
} from "./recommendedActionSummary.ts";
import {
  summarizeIssueCategorySummary,
  type IssueCategorySummaryEntry
} from "./issueCategorySummary.ts";
import {
  summarizeCategoryReductionReportingSummary,
  type CategoryReductionReportingSummary
} from "./categoryReductionReportingSummary.ts";
import {
  summarizeBrandScoreImprovementSummary,
  type BrandScoreImprovementSummary
} from "./brandScoreImprovementSummary.ts";
import {
  summarizeRemainingIssuesSummary,
  type RemainingIssuesSummary
} from "./remainingIssuesSummary.ts";
import {
  summarizeDeckReadinessSummary,
  type DeckReadinessSummary
} from "./deckReadinessSummary.ts";
import {
  summarizeReportConsistencySummary,
  type ReportConsistencySummary
} from "./reportConsistencySummary.ts";
import {
  summarizeReportShapeParity,
  type ReportShapeParitySummary
} from "./reportShapeParitySummary.ts";
import {
  summarizePipelineFailureSummary,
  type PipelineFailureSummary
} from "./pipelineFailureSummary.ts";
import {
  summarizeEndToEndRunSummary,
  type EndToEndRunSummary
} from "./endToEndRunSummary.ts";
import {
  summarizeInputFileLimits,
  type InputFileLimitsSummary
} from "./inputFileLimitsSummary.ts";
import {
  summarizeOutputOverwriteSafetySummary,
  type OutputOverwriteSafetySummary
} from "./outputOverwriteSafetySummary.ts";
import {
  summarizeInputOutputPathRelationship,
  type InputOutputPathRelationshipSummary
} from "./inputOutputPathRelationshipSummary.ts";
import {
  summarizeProcessingModeSummary,
  type ProcessingModeSummary
} from "./processingModeSummary.ts";
import {
  summarizeReportCoverage,
  type ReportCoverageSummary
} from "./reportCoverageSummary.ts";
import type { ChangedFontRunSummary } from "./fontFamilyFix.ts";
import { applyFontFamilyFixToArchive } from "./fontFamilyFix.ts";
import type { ChangedFontSizeRunSummary } from "./fontSizeFix.ts";
import { applyFontSizeFixToArchive } from "./fontSizeFix.ts";
import type { ChangedAlignmentSummary } from "./alignmentFix.ts";
import { applyAlignmentFixToArchive } from "./alignmentFix.ts";
import type { ChangedBulletIndentSummary } from "./bulletFix.ts";
import { applyBulletIndentFixToArchive } from "./bulletFix.ts";
import type { ChangedDominantBodyStyleSummary, DominantBodyStyleSlideTelemetry } from "./dominantBodyStyleFix.ts";
import { applyDominantBodyStyleFixToArchive } from "./dominantBodyStyleFix.ts";
import type { ChangedDominantFontFamilySummary } from "./dominantFontFamilyFix.ts";
import { applyDominantFontFamilyFixToArchive } from "./dominantFontFamilyFix.ts";
import type { ChangedDominantFontSizeSummary } from "./dominantFontSizeFix.ts";
import { applyDominantFontSizeFixToArchive } from "./dominantFontSizeFix.ts";
import type { ChangedLineSpacingSummary } from "./lineSpacingFix.ts";
import { applyLineSpacingFixToArchive } from "./lineSpacingFix.ts";
import type { ChangedParagraphSpacingSummary } from "./spacingFix.ts";
import { applyParagraphSpacingFixToArchive } from "./spacingFix.ts";

export type FixStepSummary =
  | {
      name: "fontFamilyFix" | "fontSizeFix";
      changedRuns: number;
    }
  | {
      name: "spacingFix" | "bulletFix" | "alignmentFix" | "lineSpacingFix" | "dominantBodyStyleFix" | "dominantFontFamilyFix" | "dominantFontSizeFix";
      changedParagraphs: number;
    };

export interface RunAllFixesReport {
  applied: boolean;
  noOp: boolean;
  steps: FixStepSummary[];
  totals: FixTotalsSummary;
  deckFontUsage: DeckFontUsageSummary;
  deckStyleFingerprint: DeckStyleFingerprint;
  fontDriftSeverity: FontDriftSeverity;
  deckQaSummary: DeckQaSummary;
  topProblemSlides: TopProblemSlideSummary[];
  cleanupOutcomeSummary: CleanupOutcomeSummary;
  recommendedActionSummary: RecommendedActionSummary;
  issueCategorySummary: IssueCategorySummaryEntry[];
  categoryReductionReportingSummary: CategoryReductionReportingSummary;
  brandScoreImprovementSummary: BrandScoreImprovementSummary;
  remainingIssuesSummary: RemainingIssuesSummary;
  deckReadinessSummary: DeckReadinessSummary;
  reportConsistencySummary: ReportConsistencySummary;
  reportShapeParitySummary: ReportShapeParitySummary;
  pipelineFailureSummary: PipelineFailureSummary;
  endToEndRunSummary: EndToEndRunSummary;
  inputFileLimitsSummary: InputFileLimitsSummary;
  outputOverwriteSafetySummary: OutputOverwriteSafetySummary;
  inputOutputPathRelationshipSummary: InputOutputPathRelationshipSummary;
  processingModeSummary: ProcessingModeSummary;
  reportCoverageSummary: ReportCoverageSummary;
  outputPackageValidation: OutputPackageValidationSummary;
  outputFileMetadataSummary: OutputFileMetadataSummary;
  changesBySlide: SlideChangeSummary[];
  validation: FixedPptxValidationReport;
  verification: FixVerificationSummary;
}

export interface FixTotalsSummary {
  fontFamilyChanges: number;
  fontSizeChanges: number;
  spacingChanges: number;
  bulletChanges: number;
  alignmentChanges: number;
  lineSpacingChanges: number;
  dominantBodyStyleChanges: number;
  dominantFontFamilyChanges: number;
  dominantFontSizeChanges: number;
}

export interface SlideChangeSummary {
  slide: number;
  slideFontUsage: SlideFontUsageSummary;
  slideQaSummary: SlideQaSummary;
  fontFamilyChanges: number;
  fontSizeChanges: number;
  spacingChanges: number;
  bulletChanges: number;
  alignmentChanges: number;
  lineSpacingChanges: number;
  dominantBodyStyleChanges: number;
  dominantFontFamilyChanges: number;
  dominantFontSizeChanges: number;
  dominantBodyStyleEligibleGroups: number;
  dominantBodyStyleTouchedGroups: number;
  dominantBodyStyleSkippedGroups: number;
  dominantBodyStyleAlignmentChanges: number;
  dominantBodyStyleSpacingBeforeChanges: number;
  dominantBodyStyleSpacingAfterChanges: number;
  dominantBodyStyleLineSpacingChanges: number;
}

export interface FixVerificationSummary {
  inputSlideCount: number;
  outputSlideCount: number | null;
  fontDriftBefore: number;
  fontDriftAfter: number | null;
  fontSizeDriftBefore: number;
  fontSizeDriftAfter: number | null;
  spacingDriftBefore: number;
  spacingDriftAfter: number | null;
  bulletIndentDriftBefore: number;
  bulletIndentDriftAfter: number | null;
  alignmentDriftBefore: number;
  alignmentDriftAfter: number | null;
  lineSpacingDriftBefore: number;
  lineSpacingDriftAfter: number | null;
}

export async function runAllFixes(
  inputPath: string,
  outputPath: string
): Promise<RunAllFixesReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const inputFileLimitsSummary = await summarizeInputFileLimits(resolvedInputPath);
  const outputExistedBeforeWrite = await readOutputExistenceSignal(resolvedOutputPath);
  const inputOutputPathRelationshipSummary = summarizeInputOutputPathRelationship({
    inputPath: resolvedInputPath,
    outputPath: resolvedOutputPath
  });
  const processingModeSummary = summarizeProcessingModeSummary({
    mode: "standard"
  });
  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);

  const fontFamilyReport = await applyFontFamilyFixToArchive(
    archive,
    presentation,
    auditReport.fontDrift.dominantFont
  );
  const fontSizeReport = await applyFontSizeFixToArchive(
    archive,
    presentation,
    auditReport.fontSizeDrift.dominantSizePt
  );
  const spacingReport = await applyParagraphSpacingFixToArchive(
    archive,
    presentation,
    auditReport
  );
  const bulletReport = await applyBulletIndentFixToArchive(
    archive,
    presentation,
    auditReport
  );
  const alignmentReport = await applyAlignmentFixToArchive(
    archive,
    presentation,
    auditReport
  );
  const lineSpacingReport = await applyLineSpacingFixToArchive(
    archive,
    presentation,
    auditReport
  );
  const dominantBodyStyleReport = await applyDominantBodyStyleFixToArchive(
    archive,
    presentation,
    auditReport
  );
  const dominantFontFamilyReport = await applyDominantFontFamilyFixToArchive(
    archive,
    presentation,
    auditReport
  );
  const dominantFontSizeReport = await applyDominantFontSizeFixToArchive(
    archive,
    presentation,
    auditReport
  );

  const steps: FixStepSummary[] = [
    {
      name: "fontFamilyFix",
      changedRuns: countChangedRuns(fontFamilyReport.changedRuns)
    },
    {
      name: "fontSizeFix",
      changedRuns: countChangedRuns(fontSizeReport.changedRuns)
    },
    {
      name: "spacingFix",
      changedParagraphs: countChangedParagraphs(spacingReport.changedParagraphs)
    },
    {
      name: "bulletFix",
      changedParagraphs: countChangedParagraphs(bulletReport.changedParagraphs)
    },
    {
      name: "alignmentFix",
      changedParagraphs: countChangedParagraphs(alignmentReport.changedParagraphs)
    },
    {
      name: "lineSpacingFix",
      changedParagraphs: countChangedParagraphs(lineSpacingReport.changedParagraphs)
    },
    {
      name: "dominantBodyStyleFix",
      changedParagraphs: countChangedParagraphs(dominantBodyStyleReport.changedParagraphs)
    },
    {
      name: "dominantFontFamilyFix",
      changedParagraphs: countChangedParagraphs(dominantFontFamilyReport.changedParagraphs)
    },
    {
      name: "dominantFontSizeFix",
      changedParagraphs: countChangedParagraphs(dominantFontSizeReport.changedParagraphs)
    }
  ];
  const applied = steps.some((step) =>
    step.name === "spacingFix" || step.name === "bulletFix" || step.name === "alignmentFix" || step.name === "lineSpacingFix" || step.name === "dominantBodyStyleFix" || step.name === "dominantFontFamilyFix" || step.name === "dominantFontSizeFix"
      ? step.changedParagraphs > 0
      : step.changedRuns > 0
  );
  const totals: FixTotalsSummary = {
    fontFamilyChanges: countChangedRuns(fontFamilyReport.changedRuns),
    fontSizeChanges: countChangedRuns(fontSizeReport.changedRuns),
    spacingChanges: countChangedParagraphs(spacingReport.changedParagraphs),
    bulletChanges: countChangedParagraphs(bulletReport.changedParagraphs),
    alignmentChanges: countChangedParagraphs(alignmentReport.changedParagraphs),
    lineSpacingChanges: countChangedParagraphs(lineSpacingReport.changedParagraphs),
    dominantBodyStyleChanges: countChangedParagraphs(dominantBodyStyleReport.changedParagraphs),
    dominantFontFamilyChanges: countChangedParagraphs(dominantFontFamilyReport.changedParagraphs),
    dominantFontSizeChanges: countChangedParagraphs(dominantFontSizeReport.changedParagraphs)
  };
  const changesBySlide = summarizeChangesBySlide(
    fontFamilyReport.changedRuns,
    fontSizeReport.changedRuns,
    spacingReport.changedParagraphs,
    bulletReport.changedParagraphs,
    alignmentReport.changedParagraphs,
    lineSpacingReport.changedParagraphs,
    dominantBodyStyleReport.changedParagraphs,
    dominantFontFamilyReport.changedParagraphs,
    dominantFontSizeReport.changedParagraphs,
    dominantBodyStyleReport.telemetryBySlide,
    auditReport.slides
  );
  const deckQaSummary = summarizeDeckQaSummary(
    {
      slideCount: auditReport.slideCount,
      fontDriftCount: countChangedRuns(auditReport.fontDrift.driftRuns),
      fontSizeDriftCount: countChangedRuns(auditReport.fontSizeDrift.driftRuns),
      spacingDriftCount: auditReport.spacingDriftCount,
      bulletIndentDriftCount: auditReport.bulletIndentDriftCount,
      alignmentDriftCount: auditReport.alignmentDriftCount,
      lineSpacingDriftCount: auditReport.lineSpacingDriftCount
    },
    summarizeDeckQaFixImpact({
      totals,
      changesBySlide
    })
  );

  await writeOutput(
    resolvedOutputPath,
    applied ? await archive.generateAsync({ type: "nodebuffer" }) : inputBuffer
  );

  const validationResult = await validateFixedPptx(
    resolvedOutputPath,
    auditReport.slideCount
  );
  const outputPackageValidation = await validateOutputPackage(resolvedOutputPath);
  const outputFileMetadataSummary = await summarizeOutputFileMetadata(resolvedOutputPath);
  const outputOverwriteSafetySummary = summarizeOutputOverwriteSafetySummary({
    outputExistedBeforeWrite,
    outputFileMetadataSummary
  });
  const outputAudit = validationResult.presentation
    ? analyzeSlides(validationResult.presentation)
    : null;
  const verification = summarizeVerification(auditReport, outputAudit);
  const cleanupOutcomeSummary = summarizeCleanupOutcomeSummary({
    steps,
    totals,
    changesBySlide,
    verification
  });
  const recommendedActionSummary = summarizeRecommendedActionSummary({
    deckQaSummary,
    cleanupOutcomeSummary,
    topProblemSlides: auditReport.topProblemSlides,
    changesBySlide,
    totals,
    steps
  });
  const issueCategorySummary = summarizeIssueCategorySummary(verification);
  const brandScoreImprovementSummary = summarizeBrandScoreImprovementSummary({
    verification,
    deckQaSummary
  });
  const remainingIssuesSummary = summarizeRemainingIssuesSummary(issueCategorySummary);
  const deckReadinessSummary = summarizeDeckReadinessSummary({
    cleanupOutcomeSummary,
    recommendedActionSummary,
    brandScoreImprovementSummary,
    remainingIssuesSummary,
    deckQaSummary
  });
  const categoryReductionReportingSummary = summarizeCategoryReductionReportingSummary({
    issueCategorySummary,
    deckReadinessSummary
  });
  const reportConsistencySummary = summarizeReportConsistencySummary({
    cleanupOutcomeSummary,
    recommendedActionSummary,
    brandScoreImprovementSummary,
    remainingIssuesSummary,
    deckReadinessSummary,
    deckQaSummary
  });
  const baseReport = {
    applied,
    noOp: !applied,
    steps,
    totals,
    deckFontUsage: auditReport.deckFontUsage,
    deckStyleFingerprint: auditReport.deckStyleFingerprint,
    fontDriftSeverity: auditReport.fontDriftSeverity,
    deckQaSummary,
    topProblemSlides: auditReport.topProblemSlides,
    cleanupOutcomeSummary,
    recommendedActionSummary,
    issueCategorySummary,
    categoryReductionReportingSummary,
    brandScoreImprovementSummary,
    remainingIssuesSummary,
    deckReadinessSummary,
    reportConsistencySummary,
    outputPackageValidation,
    outputFileMetadataSummary,
    inputFileLimitsSummary,
    outputOverwriteSafetySummary,
    inputOutputPathRelationshipSummary,
    processingModeSummary,
    changesBySlide,
    validation: validationResult.validation,
    verification
  };
  const reportShapeParitySummary = summarizeReportShapeParity({
    cliVisibleReportPayload: baseReport,
    apiVisibleReportPayload: baseReport
  });
  const pipelineFailureSummary = summarizePipelineFailureSummary({
    outputPackageValidation,
    outputFileMetadataSummary,
    reportConsistencySummary,
    reportShapeParitySummary
  });
  const endToEndRunSummary = summarizeEndToEndRunSummary({
    pipelineFailureSummary,
    outputPackageValidation,
    reportConsistencySummary,
    reportShapeParitySummary,
    deckReadinessSummary
  });

  const reportWithoutCoverage = {
    ...baseReport,
    reportShapeParitySummary,
    pipelineFailureSummary,
    endToEndRunSummary
  };
  const reportCoverageSummary = summarizeReportCoverage(reportWithoutCoverage);

  return {
    ...reportWithoutCoverage,
    reportCoverageSummary
  };
}

function countChangedRuns(changedRuns: Array<{ count: number }>): number {
  return changedRuns.reduce((total, entry) => total + entry.count, 0);
}

function countChangedParagraphs(changedParagraphs: Array<{ count: number }>): number {
  return changedParagraphs.reduce((total, entry) => total + entry.count, 0);
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}

async function readOutputExistenceSignal(outputPath: string): Promise<boolean | null> {
  try {
    return (await stat(outputPath)).isFile();
  } catch (error) {
    if (isErrorWithCode(error) && error.code === "ENOENT") {
      return false;
    }

    return null;
  }
}

function isErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function summarizeVerification(
  inputAudit: AuditReport,
  outputAudit: AuditReport | null
): FixVerificationSummary {
  return {
    inputSlideCount: inputAudit.slideCount,
    outputSlideCount: outputAudit?.slideCount ?? null,
    fontDriftBefore: countChangedRuns(inputAudit.fontDrift.driftRuns),
    fontDriftAfter: outputAudit ? countChangedRuns(outputAudit.fontDrift.driftRuns) : null,
    fontSizeDriftBefore: countChangedRuns(inputAudit.fontSizeDrift.driftRuns),
    fontSizeDriftAfter: outputAudit
      ? countChangedRuns(outputAudit.fontSizeDrift.driftRuns)
      : null,
    spacingDriftBefore: inputAudit.spacingDriftCount,
    spacingDriftAfter: outputAudit ? outputAudit.spacingDriftCount : null,
    bulletIndentDriftBefore: inputAudit.bulletIndentDriftCount,
    bulletIndentDriftAfter: outputAudit ? outputAudit.bulletIndentDriftCount : null,
    alignmentDriftBefore: inputAudit.alignmentDriftCount,
    alignmentDriftAfter: outputAudit ? outputAudit.alignmentDriftCount : null,
    lineSpacingDriftBefore: inputAudit.lineSpacingDriftCount,
    lineSpacingDriftAfter: outputAudit ? outputAudit.lineSpacingDriftCount : null
  };
}

function summarizeChangesBySlide(
  fontFamilyChanges: ChangedFontRunSummary[],
  fontSizeChanges: ChangedFontSizeRunSummary[],
  spacingChanges: ChangedParagraphSpacingSummary[],
  bulletChanges: ChangedBulletIndentSummary[],
  alignmentChanges: ChangedAlignmentSummary[],
  lineSpacingChanges: ChangedLineSpacingSummary[],
  dominantBodyStyleChanges: ChangedDominantBodyStyleSummary[],
  dominantFontFamilyChanges: ChangedDominantFontFamilySummary[],
  dominantFontSizeChanges: ChangedDominantFontSizeSummary[],
  dominantBodyStyleTelemetry: DominantBodyStyleSlideTelemetry[],
  slideAudits: SlideAuditSummary[]
): SlideChangeSummary[] {
  const changesBySlide = new Map<number, SlideChangeSummary>();

  for (const change of fontFamilyChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.fontFamilyChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const change of fontSizeChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.fontSizeChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const change of spacingChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.spacingChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const change of bulletChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.bulletChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const change of alignmentChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.alignmentChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const change of lineSpacingChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.lineSpacingChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const change of dominantBodyStyleChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.dominantBodyStyleChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const change of dominantFontFamilyChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.dominantFontFamilyChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const change of dominantFontSizeChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.dominantFontSizeChanges += change.count;
    changesBySlide.set(change.slide, existing);
  }

  for (const telemetry of dominantBodyStyleTelemetry) {
    const existing = changesBySlide.get(telemetry.slide) ?? {
      slide: telemetry.slide,
      slideFontUsage: emptySlideFontUsage(),
      slideQaSummary: emptySlideQaSummary(),
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    };
    existing.dominantBodyStyleEligibleGroups = telemetry.dominantBodyStyleEligibleGroups;
    existing.dominantBodyStyleTouchedGroups = telemetry.dominantBodyStyleTouchedGroups;
    existing.dominantBodyStyleSkippedGroups = telemetry.dominantBodyStyleSkippedGroups;
    existing.dominantBodyStyleAlignmentChanges = telemetry.dominantBodyStyleAlignmentChanges;
    existing.dominantBodyStyleSpacingBeforeChanges = telemetry.dominantBodyStyleSpacingBeforeChanges;
    existing.dominantBodyStyleSpacingAfterChanges = telemetry.dominantBodyStyleSpacingAfterChanges;
    existing.dominantBodyStyleLineSpacingChanges = telemetry.dominantBodyStyleLineSpacingChanges;
    changesBySlide.set(telemetry.slide, existing);
  }

  for (const slideAudit of slideAudits) {
    const existing = changesBySlide.get(slideAudit.index);
    if (!existing) {
      continue;
    }

    existing.slideFontUsage = slideAudit.slideFontUsage;
    existing.slideQaSummary = slideAudit.slideQaSummary;
    changesBySlide.set(slideAudit.index, existing);
  }

  return [...changesBySlide.values()].sort((left, right) => left.slide - right.slide);
}

function emptySlideFontUsage(): SlideFontUsageSummary {
  return {
    fontFamilyHistogram: {},
    fontSizeHistogram: {}
  };
}

function emptySlideQaSummary(): SlideQaSummary {
  return {
    brandScore: 100,
    qualityLabel: "good",
    summaryLine: "Slide is mostly consistent with minor formatting drift.",
    keyIssues: []
  };
}
