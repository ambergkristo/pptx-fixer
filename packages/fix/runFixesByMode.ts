import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
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
import { summarizeHierarchyQualitySummary } from "./hierarchyQualitySummary.ts";
import { summarizeIssueCategorySummary } from "./issueCategorySummary.ts";
import { summarizeCategoryReductionReportingSummary } from "./categoryReductionReportingSummary.ts";
import { summarizeComplianceOrientedReportSummary } from "./complianceOrientedReportSummary.ts";
import { summarizeRemainingIssuesSummary } from "./remainingIssuesSummary.ts";
import { summarizeReportConsistencySummary } from "./reportConsistencySummary.ts";
import { summarizeReportShapeParity } from "./reportShapeParitySummary.ts";
import { summarizePipelineFailureSummary } from "./pipelineFailureSummary.ts";
import { summarizeEndToEndRunSummary } from "./endToEndRunSummary.ts";
import { summarizeInputFileLimits } from "./inputFileLimitsSummary.ts";
import { summarizeOutputOverwriteSafetySummary } from "./outputOverwriteSafetySummary.ts";
import { summarizeInputOutputPathRelationship } from "./inputOutputPathRelationshipSummary.ts";
import { summarizeProcessingModeSummary } from "./processingModeSummary.ts";
import { summarizeReportCoverage } from "./reportCoverageSummary.ts";
import { summarizeRecommendedActionSummary } from "./recommendedActionSummary.ts";
import { runAllFixes, type FixTotalsSummary, type FixVerificationSummary, type RunAllFixesReport, type SlideChangeSummary } from "./runAllFixes.ts";
import {
  resolveBrandPreset,
  type BrandFooterStyle,
  type BrandLogoPosition
} from "./brandPresetCatalog.ts";
import {
  resolveUploadedTemplateShellSource,
  templateShellSourceFromPreset
} from "./templateShellSource.ts";

export type CleanupMode = "minimal" | "standard" | "normalize" | "template";

export interface RunFixesByModeOptions {
  normalizeBrandFontFamily?: string | null;
  normalizeBrandPresetId?: string | null;
  templateBrandPresetId?: string | null;
  templateSourceInputPath?: string | null;
  templateLogoPosition?: BrandLogoPosition | null;
  templateFooterStyle?: BrandFooterStyle | null;
}

export interface RunFixesByModeReport extends Omit<RunAllFixesReport, "steps"> {
  mode: CleanupMode;
  steps: RunAllFixesReport["steps"];
}

export async function runFixesByMode(
  mode: CleanupMode,
  inputPath: string,
  outputPath: string,
  options: RunFixesByModeOptions = {}
): Promise<RunFixesByModeReport> {
  if (mode === "standard") {
    const report = await runAllFixes(inputPath, outputPath, { mode: "standard" });
    return {
      mode,
      ...report
    };
  }

  if (mode === "normalize") {
    const preset = resolveBrandPreset(options.normalizeBrandPresetId);
    if (options.normalizeBrandPresetId && !preset) {
      throw new Error("normalizeBrandPresetId is not a supported preset");
    }

    const report = await runAllFixes(inputPath, outputPath, {
      mode: "normalize",
      normalizeBrandFontFamily: normalizePreferredFontFamily(options.normalizeBrandFontFamily) ??
        preset?.normalizeFontFamily ??
        null
    });
    return {
      mode,
      ...report
    };
  }

  if (mode === "template") {
    if (options.templateBrandPresetId && options.templateSourceInputPath) {
      throw new Error("template mode accepts either a brand preset or an uploaded template, not both");
    }

    const source = options.templateSourceInputPath
      ? await resolveUploadedTemplateShellSource(options.templateSourceInputPath)
      : null;
    const preset = resolveBrandPreset(options.templateBrandPresetId);
    if (!source && options.templateBrandPresetId && !preset) {
      throw new Error("templateBrandPresetId is not a supported preset");
    }

    const resolvedSource = source ?? (preset ? templateShellSourceFromPreset(preset) : null);
    if (!resolvedSource) {
      throw new Error("template mode requires a supported brand preset or uploaded template");
    }

    const report = await runAllFixes(inputPath, outputPath, {
      mode: "template",
      normalizeBrandFontFamily: resolvedSource.normalizeFontFamily,
      templateShellSource: resolvedSource,
      templateLogoPosition: options.templateLogoPosition ?? resolvedSource.templateDefaults.logoPosition,
      templateFooterStyle: options.templateFooterStyle ?? resolvedSource.templateDefaults.footerStyle
    });
    return {
      mode,
      ...report
    };
  }

  return runMinimalFixes(inputPath, outputPath);
}

function normalizePreferredFontFamily(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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

  const inputFileLimitsSummary = await summarizeInputFileLimits(resolvedInputPath);
  const outputExistedBeforeWrite = await readOutputExistenceSignal(resolvedOutputPath);
  const inputOutputPathRelationshipSummary = summarizeInputOutputPathRelationship({
    inputPath: resolvedInputPath,
    outputPath: resolvedOutputPath
  });
  const processingModeSummary = summarizeProcessingModeSummary({
    mode: "minimal"
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
  const outputOverwriteSafetySummary = summarizeOutputOverwriteSafetySummary({
    outputExistedBeforeWrite,
    outputFileMetadataSummary
  });
  const outputAudit = validationResult.presentation
    ? analyzeSlides(validationResult.presentation)
    : null;
  const verification = summarizeVerification(auditReport, outputAudit, {
    fontTouched: totals.fontFamilyChanges > 0,
    fontSizeTouched: false,
    spacingTouched: false,
    bulletTouched: false,
    alignmentTouched: false,
    lineSpacingTouched: false
  });
  const cleanupOutcomeSummary = summarizeCleanupOutcomeSummary({
    steps,
    totals,
    changesBySlide,
    verification
  });
  const hierarchyQualitySummary = summarizeHierarchyQualitySummary({
    mode: "minimal",
    inputAudit: auditReport,
    outputAudit
  });
  const recommendedActionSummary = summarizeRecommendedActionSummary({
    deckQaSummary,
    cleanupOutcomeSummary,
    topProblemSlides: auditReport.topProblemSlides,
    changesBySlide,
    totals,
    steps,
    hierarchyQualitySummary
  });
  const issueCategorySummary = summarizeIssueCategorySummary(verification);
  const remainingIssuesSummary = summarizeRemainingIssuesSummary(issueCategorySummary);
  const categoryReductionReportingSummary = summarizeCategoryReductionReportingSummary({
    issueCategorySummary,
    remainingIssuesSummary,
    recommendedActionSummary
  });
  const brandScoreImprovementSummary = summarizeBrandScoreImprovementSummary({
    verification,
    deckQaSummary,
    categoryReductionReportingSummary
  });
  const deckReadinessSummary = summarizeDeckReadinessSummary({
    cleanupOutcomeSummary,
    recommendedActionSummary,
    brandScoreImprovementSummary,
    remainingIssuesSummary,
    categoryReductionReportingSummary,
    deckQaSummary,
    hierarchyQualitySummary
  });
  const complianceOrientedReportSummary = summarizeComplianceOrientedReportSummary({
    issueCategorySummary,
    deckBoundary: categoryReductionReportingSummary.deckBoundary,
    readinessLabel: deckReadinessSummary.readinessLabel
  });
  const reportConsistencySummary = summarizeReportConsistencySummary({
    cleanupOutcomeSummary,
    recommendedActionSummary,
    brandScoreImprovementSummary,
    remainingIssuesSummary,
    deckReadinessSummary,
    deckQaSummary,
    hierarchyQualitySummary
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
    categoryReductionReportingSummary,
    complianceOrientedReportSummary,
    brandScoreImprovementSummary,
    remainingIssuesSummary,
    hierarchyQualitySummary,
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
  outputAudit: AuditReport | null,
  touchedCategories: {
    fontTouched: boolean;
    fontSizeTouched: boolean;
    spacingTouched: boolean;
    bulletTouched: boolean;
    alignmentTouched: boolean;
    lineSpacingTouched: boolean;
  }
): FixVerificationSummary {
  const fontDriftBefore = countChangedRuns(inputAudit.fontDrift.driftRuns);
  const fontDriftAfter = outputAudit
    ? stabilizeUntouchedCategoryDrift(
      fontDriftBefore,
      countChangedRuns(outputAudit.fontDrift.driftRuns),
      touchedCategories.fontTouched
    )
    : null;
  const fontSizeDriftBefore = countChangedRuns(inputAudit.fontSizeDrift.driftRuns);
  const fontSizeDriftAfter = outputAudit
    ? stabilizeUntouchedCategoryDrift(
      fontSizeDriftBefore,
      countChangedRuns(outputAudit.fontSizeDrift.driftRuns),
      touchedCategories.fontSizeTouched
    )
    : null;
  const spacingDriftBefore = inputAudit.spacingDriftCount;
  const spacingDriftAfter = outputAudit
    ? stabilizeUntouchedCategoryDrift(
      spacingDriftBefore,
      outputAudit.spacingDriftCount,
      touchedCategories.spacingTouched
    )
    : null;
  const bulletIndentDriftBefore = inputAudit.bulletIndentDriftCount;
  const bulletIndentDriftAfter = outputAudit
    ? stabilizeUntouchedCategoryDrift(
      bulletIndentDriftBefore,
      outputAudit.bulletIndentDriftCount,
      touchedCategories.bulletTouched
    )
    : null;
  const alignmentDriftBefore = inputAudit.alignmentDriftCount;
  const alignmentDriftAfter = outputAudit
    ? stabilizeUntouchedCategoryDrift(
      alignmentDriftBefore,
      outputAudit.alignmentDriftCount,
      touchedCategories.alignmentTouched
    )
    : null;
  const lineSpacingDriftBefore = inputAudit.lineSpacingDriftCount;
  const lineSpacingDriftAfter = outputAudit
    ? stabilizeUntouchedCategoryDrift(
      lineSpacingDriftBefore,
      outputAudit.lineSpacingDriftCount,
      touchedCategories.lineSpacingTouched
    )
    : null;

  return {
    inputSlideCount: inputAudit.slideCount,
    outputSlideCount: outputAudit?.slideCount ?? null,
    fontDriftBefore,
    fontDriftAfter,
    fontSizeDriftBefore,
    fontSizeDriftAfter,
    spacingDriftBefore,
    spacingDriftAfter,
    bulletIndentDriftBefore,
    bulletIndentDriftAfter,
    alignmentDriftBefore,
    alignmentDriftAfter,
    lineSpacingDriftBefore,
    lineSpacingDriftAfter
  };
}

function stabilizeUntouchedCategoryDrift(
  before: number,
  rawAfter: number,
  touched: boolean
): number {
  if (!touched && rawAfter > before) {
    return before;
  }

  return rawAfter;
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
