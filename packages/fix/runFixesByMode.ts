import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type AuditReport } from "../audit/pptxAudit.ts";
import { summarizeDeckQaFixImpact, summarizeDeckQaSummary } from "../audit/deckQaSummary.ts";
import { validateFixedPptx, type FixedPptxValidationReport } from "../export/validateFixedPptx.ts";
import { validateOutputPackage } from "../export/outputPackageValidation.ts";
import { summarizeOutputFileMetadata } from "../export/outputFileMetadataSummary.ts";
import { applyFontFamilyFixToArchive, type ChangedFontRunSummary } from "./fontFamilyFix.ts";
import { summarizeCleanupOutcomeSummary } from "./cleanupOutcomeSummary.ts";
import { summarizeBrandScoreImprovementSummary } from "./brandScoreImprovementSummary.ts";
import { summarizeDeckReadinessSummary } from "./deckReadinessSummary.ts";
import { summarizeIssueCategorySummary } from "./issueCategorySummary.ts";
import { summarizeRemainingIssuesSummary } from "./remainingIssuesSummary.ts";
import { summarizeReportConsistencySummary } from "./reportConsistencySummary.ts";
import { summarizeReportShapeParity } from "./reportShapeParitySummary.ts";
import { summarizeRecommendedActionSummary } from "./recommendedActionSummary.ts";
import { runAllFixes, type FixTotalsSummary, type FixVerificationSummary, type RunAllFixesReport, type SlideChangeSummary } from "./runAllFixes.ts";

export type CleanupMode = "minimal" | "standard";

export interface RunFixesByModeReport extends Omit<RunAllFixesReport, "steps"> {
  mode: CleanupMode;
  steps: RunAllFixesReport["steps"];
}

export async function runFixesByMode(
  mode: CleanupMode,
  inputPath: string,
  outputPath: string
): Promise<RunFixesByModeReport> {
  if (mode === "standard") {
    const report = await runAllFixes(inputPath, outputPath);
    return {
      mode,
      ...report
    };
  }

  return runMinimalFixes(inputPath, outputPath);
}

async function runMinimalFixes(
  inputPath: string,
  outputPath: string
): Promise<RunFixesByModeReport> {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }

  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);

  const fontFamilyReport = await applyFontFamilyFixToArchive(
    archive,
    presentation,
    auditReport.fontDrift.dominantFont
  );

  const totals: FixTotalsSummary = {
    fontFamilyChanges: countChangedRuns(fontFamilyReport.changedRuns),
    fontSizeChanges: 0,
    spacingChanges: 0,
    bulletChanges: 0,
    alignmentChanges: 0,
    lineSpacingChanges: 0,
    dominantBodyStyleChanges: 0,
    dominantFontFamilyChanges: 0,
    dominantFontSizeChanges: 0
  };
  const steps = [
    {
      name: "fontFamilyFix" as const,
      changedRuns: totals.fontFamilyChanges
    }
  ];
  const applied = totals.fontFamilyChanges > 0;
  const changesBySlide = summarizeChangesBySlide(fontFamilyReport.changedRuns, auditReport);
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
  const reportConsistencySummary = summarizeReportConsistencySummary({
    cleanupOutcomeSummary,
    recommendedActionSummary,
    brandScoreImprovementSummary,
    remainingIssuesSummary,
    deckReadinessSummary,
    deckQaSummary
  });
  const baseReport = {
    mode: "minimal" as const,
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
    brandScoreImprovementSummary,
    remainingIssuesSummary,
    deckReadinessSummary,
    reportConsistencySummary,
    outputPackageValidation,
    outputFileMetadataSummary,
    changesBySlide,
    validation: validationResult.validation,
    verification
  };
  const reportShapeParitySummary = summarizeReportShapeParity({
    cliVisibleReportPayload: baseReport,
    apiVisibleReportPayload: baseReport
  });

  return {
    ...baseReport,
    reportShapeParitySummary
  };
}

function countChangedRuns(changedRuns: Array<{ count: number }>): number {
  return changedRuns.reduce((total, entry) => total + entry.count, 0);
}

function summarizeChangesBySlide(
  fontFamilyChanges: ChangedFontRunSummary[],
  auditReport: AuditReport
): SlideChangeSummary[] {
  const changesBySlide = new Map<number, SlideChangeSummary>();

  for (const change of fontFamilyChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      slideFontUsage: auditReport.slides.find((slide) => slide.index === change.slide)?.slideFontUsage ?? {
        fontFamilyHistogram: {},
        fontSizeHistogram: {}
      },
      slideQaSummary: auditReport.slides.find((slide) => slide.index === change.slide)?.slideQaSummary ?? {
        brandScore: 100,
        qualityLabel: "good",
        summaryLine: "Slide is mostly consistent with minor formatting drift.",
        keyIssues: []
      },
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

  return [...changesBySlide.values()].sort((left, right) => left.slide - right.slide);
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

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
