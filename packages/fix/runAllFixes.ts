import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

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
  summarizeComplianceOrientedReportSummary,
  type ComplianceOrientedReportSummary
} from "./complianceOrientedReportSummary.ts";
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
import {
  applyRoleBasedTypographyFixToArchive,
  summarizeRoleBasedTypographyResidual,
  type RoleBasedTypographyFixReport
} from "./roleBasedTypographyFix.ts";
import {
  applyRoleBasedLineSpacingFixToArchive,
  applyRoleBasedParagraphSpacingFixToArchive,
  summarizeRoleBasedSpacingResidual,
  type RoleBasedLineSpacingFixReport,
  type RoleBasedParagraphSpacingFixReport
} from "./roleBasedSpacingFix.ts";
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
  complianceOrientedReportSummary: ComplianceOrientedReportSummary;
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

export interface RunAllFixesOptions {
  mode?: "standard" | "normalize";
  normalizeBrandFontFamily?: string | null;
}

export async function runAllFixes(
  inputPath: string,
  outputPath: string,
  options: RunAllFixesOptions = {}
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
  const mode = options.mode ?? "standard";
  const normalizeBrandFontFamily = normalizePreferredFontFamily(options.normalizeBrandFontFamily);
  const processingModeSummary = summarizeProcessingModeSummary({
    mode
  });
  const presentation = await loadPresentation(resolvedInputPath);
  const auditReport = analyzeSlides(presentation);
  const normalizeTypographyBaseline = mode === "normalize"
    ? summarizeRoleBasedTypographyResidual(auditReport, {
      preferredFontFamily: normalizeBrandFontFamily
    })
    : null;
  const normalizeSpacingBaseline = mode === "normalize"
    ? summarizeRoleBasedSpacingResidual(auditReport)
    : null;
  const inputBuffer = await readFile(resolvedInputPath);
  const archive = await JSZip.loadAsync(inputBuffer);
  const auditRefreshWorkDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-run-all-fixes-"));
  let currentAuditReport = auditReport;

  const refreshAuditReport = async (): Promise<AuditReport> => {
    const checkpointPath = path.join(auditRefreshWorkDir, "checkpoint.pptx");
    const checkpointBuffer = await archive.generateAsync({ type: "nodebuffer" });
    await writeFile(checkpointPath, checkpointBuffer);
    return analyzeSlides(await loadPresentation(checkpointPath));
  };

  let fontFamilyReport;
  let fontSizeReport;
  let spacingReport;
  let bulletReport;
  let alignmentReport;
  let lineSpacingReport;
  let dominantBodyStyleReport;
  let dominantFontFamilyReport;
  let dominantFontSizeReport;
  let roleBasedTypographyReport: RoleBasedTypographyFixReport = emptyRoleBasedTypographyReport("role normalization disabled");
  let roleBasedParagraphSpacingReport: RoleBasedParagraphSpacingFixReport = emptyRoleBasedParagraphSpacingReport("role spacing normalization disabled");
  let roleBasedLineSpacingReport: RoleBasedLineSpacingFixReport = emptyRoleBasedLineSpacingReport("role spacing normalization disabled");

  try {
    fontFamilyReport = await applyFontFamilyFixToArchive(
      archive,
      presentation,
      currentAuditReport.fontDrift.dominantFont
    );
    if (countChangedRuns(fontFamilyReport.changedRuns) > 0) {
      currentAuditReport = await refreshAuditReport();
    }

    fontSizeReport = await applyFontSizeFixToArchive(
      archive,
      presentation,
      currentAuditReport.fontSizeDrift.dominantSizePt
    );
    if (countChangedRuns(fontSizeReport.changedRuns) > 0) {
      currentAuditReport = await refreshAuditReport();
    }

    spacingReport = await applyParagraphSpacingFixToArchive(
      archive,
      presentation,
      currentAuditReport
    );
    if (countChangedParagraphs(spacingReport.changedParagraphs) > 0) {
      currentAuditReport = await refreshAuditReport();
      if (currentAuditReport.spacingDriftCount > 0) {
        const secondSpacingReport = await applyParagraphSpacingFixToArchive(
          archive,
          presentation,
          currentAuditReport
        );
        if (countChangedParagraphs(secondSpacingReport.changedParagraphs) > 0) {
          spacingReport = {
            applied: true,
            changedParagraphs: [
              ...spacingReport.changedParagraphs,
              ...secondSpacingReport.changedParagraphs
            ],
            skipped: []
          };
          currentAuditReport = await refreshAuditReport();
        }
      }
    }

    bulletReport = await applyBulletIndentFixToArchive(
      archive,
      presentation,
      currentAuditReport
    );
    if (countChangedParagraphs(bulletReport.changedParagraphs) > 0) {
      currentAuditReport = await refreshAuditReport();
    }

    alignmentReport = await applyAlignmentFixToArchive(
      archive,
      presentation,
      currentAuditReport
    );
    if (countChangedParagraphs(alignmentReport.changedParagraphs) > 0) {
      currentAuditReport = await refreshAuditReport();
    }

    lineSpacingReport = await applyLineSpacingFixToArchive(
      archive,
      presentation,
      currentAuditReport
    );
    if (countChangedParagraphs(lineSpacingReport.changedParagraphs) > 0) {
      currentAuditReport = await refreshAuditReport();
    }

    dominantBodyStyleReport = await applyDominantBodyStyleFixToArchive(
      archive,
      presentation,
      currentAuditReport
    );
    if (countChangedParagraphs(dominantBodyStyleReport.changedParagraphs) > 0) {
      currentAuditReport = await refreshAuditReport();
    }

    dominantFontFamilyReport = await applyDominantFontFamilyFixToArchive(
      archive,
      presentation,
      currentAuditReport
    );
    if (countChangedParagraphs(dominantFontFamilyReport.changedParagraphs) > 0) {
      currentAuditReport = await refreshAuditReport();
    }

    dominantFontSizeReport = await applyDominantFontSizeFixToArchive(
      archive,
      presentation,
      currentAuditReport
    );
    if (countChangedParagraphs(dominantFontSizeReport.changedParagraphs) > 0) {
      currentAuditReport = await refreshAuditReport();
    }

    if (currentAuditReport.spacingDriftCount > 0) {
      const lateSpacingReport = await applyParagraphSpacingFixToArchive(
        archive,
        presentation,
        currentAuditReport
      );
      if (countChangedParagraphs(lateSpacingReport.changedParagraphs) > 0) {
        spacingReport = {
          applied: true,
          changedParagraphs: [
            ...spacingReport.changedParagraphs,
            ...lateSpacingReport.changedParagraphs
          ],
          skipped: []
        };
        currentAuditReport = await refreshAuditReport();
      }
    }

    if (mode === "normalize") {
      roleBasedTypographyReport = await applyRoleBasedTypographyFixToArchive(
        archive,
        presentation,
        currentAuditReport,
        {
          preferredFontFamily: normalizeBrandFontFamily
        }
      );
      if (
        countChangedRuns(roleBasedTypographyReport.fontFamilyChangedRuns) +
        countChangedRuns(roleBasedTypographyReport.fontSizeChangedRuns) > 0
      ) {
        currentAuditReport = await refreshAuditReport();
      }

      roleBasedParagraphSpacingReport = await applyRoleBasedParagraphSpacingFixToArchive(
        archive,
        presentation,
        currentAuditReport
      );
      if (countChangedParagraphs(roleBasedParagraphSpacingReport.changedParagraphs) > 0) {
        currentAuditReport = await refreshAuditReport();
      }

      roleBasedLineSpacingReport = await applyRoleBasedLineSpacingFixToArchive(
        archive,
        presentation,
        currentAuditReport
      );
      if (countChangedParagraphs(roleBasedLineSpacingReport.changedParagraphs) > 0) {
        currentAuditReport = await refreshAuditReport();
      }
    }
  } finally {
    await rm(auditRefreshWorkDir, { recursive: true, force: true });
  }

  const stabilizationTypographyReport = await applyPostLayoutTypographyStabilization(
    archive,
    presentation,
    {
      spacingChanges: countChangedParagraphs(spacingReport.changedParagraphs),
      bulletChanges: countChangedParagraphs(bulletReport.changedParagraphs),
      alignmentChanges: countChangedParagraphs(alignmentReport.changedParagraphs),
      lineSpacingChanges: countChangedParagraphs(lineSpacingReport.changedParagraphs),
      dominantBodyStyleChanges: countChangedParagraphs(dominantBodyStyleReport.changedParagraphs)
    },
    {
      mode,
      normalizeBrandFontFamily
    }
  );

  const steps: FixStepSummary[] = [
    {
      name: "fontFamilyFix",
      changedRuns: countChangedRuns(fontFamilyReport.changedRuns) +
        countChangedRuns(roleBasedTypographyReport.fontFamilyChangedRuns) +
        countChangedRuns(stabilizationTypographyReport.fontFamilyReport.changedRuns)
    },
    {
      name: "fontSizeFix",
      changedRuns: countChangedRuns(fontSizeReport.changedRuns) +
        countChangedRuns(roleBasedTypographyReport.fontSizeChangedRuns) +
        countChangedRuns(stabilizationTypographyReport.fontSizeReport.changedRuns)
    },
    {
      name: "spacingFix",
      changedParagraphs: countChangedParagraphs(spacingReport.changedParagraphs) +
        countChangedParagraphs(roleBasedParagraphSpacingReport.changedParagraphs)
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
      changedParagraphs: countChangedParagraphs(lineSpacingReport.changedParagraphs) +
        countChangedParagraphs(roleBasedLineSpacingReport.changedParagraphs)
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
    fontFamilyChanges: countChangedRuns(fontFamilyReport.changedRuns) +
      countChangedRuns(roleBasedTypographyReport.fontFamilyChangedRuns) +
      countChangedRuns(stabilizationTypographyReport.fontFamilyReport.changedRuns),
    fontSizeChanges: countChangedRuns(fontSizeReport.changedRuns) +
      countChangedRuns(roleBasedTypographyReport.fontSizeChangedRuns) +
      countChangedRuns(stabilizationTypographyReport.fontSizeReport.changedRuns),
    spacingChanges: countChangedParagraphs(spacingReport.changedParagraphs) +
      countChangedParagraphs(roleBasedParagraphSpacingReport.changedParagraphs),
    bulletChanges: countChangedParagraphs(bulletReport.changedParagraphs),
    alignmentChanges: countChangedParagraphs(alignmentReport.changedParagraphs),
    lineSpacingChanges: countChangedParagraphs(lineSpacingReport.changedParagraphs) +
      countChangedParagraphs(roleBasedLineSpacingReport.changedParagraphs),
    dominantBodyStyleChanges: countChangedParagraphs(dominantBodyStyleReport.changedParagraphs),
    dominantFontFamilyChanges: countChangedParagraphs(dominantFontFamilyReport.changedParagraphs),
    dominantFontSizeChanges: countChangedParagraphs(dominantFontSizeReport.changedParagraphs)
  };
  const changesBySlide = summarizeChangesBySlide(
    mergeChangedRunSummaries(
      mergeChangedRunSummaries(fontFamilyReport.changedRuns, roleBasedTypographyReport.fontFamilyChangedRuns),
      stabilizationTypographyReport.fontFamilyReport.changedRuns
    ),
    mergeChangedRunSummaries(
      mergeChangedRunSummaries(fontSizeReport.changedRuns, roleBasedTypographyReport.fontSizeChangedRuns),
      stabilizationTypographyReport.fontSizeReport.changedRuns
    ),
    [
      ...spacingReport.changedParagraphs,
      ...roleBasedParagraphSpacingReport.changedParagraphs
    ],
    bulletReport.changedParagraphs,
    alignmentReport.changedParagraphs,
    [
      ...lineSpacingReport.changedParagraphs,
      ...roleBasedLineSpacingReport.changedParagraphs
    ],
    dominantBodyStyleReport.changedParagraphs,
    dominantFontFamilyReport.changedParagraphs,
    dominantFontSizeReport.changedParagraphs,
    dominantBodyStyleReport.telemetryBySlide,
    auditReport.slides
  );
  const deckQaSummary = summarizeDeckQaSummary(
    {
      slideCount: auditReport.slideCount,
      fontDriftCount: normalizeTypographyBaseline?.fontFamilyDriftCount ?? countChangedRuns(auditReport.fontDrift.driftRuns),
      fontSizeDriftCount: normalizeTypographyBaseline?.fontSizeDriftCount ?? countChangedRuns(auditReport.fontSizeDrift.driftRuns),
      spacingDriftCount: normalizeSpacingBaseline?.spacingDriftCount ?? auditReport.spacingDriftCount,
      bulletIndentDriftCount: auditReport.bulletIndentDriftCount,
      alignmentDriftCount: auditReport.alignmentDriftCount,
      lineSpacingDriftCount: normalizeSpacingBaseline?.lineSpacingDriftCount ?? auditReport.lineSpacingDriftCount
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
  let verification = summarizeVerification(auditReport, outputAudit, {
    fontTouched: totals.fontFamilyChanges + totals.dominantFontFamilyChanges > 0,
    fontSizeTouched: totals.fontSizeChanges + totals.dominantFontSizeChanges > 0,
    spacingTouched: totals.spacingChanges +
      changesBySlide.reduce(
        (total, slide) => total + slide.dominantBodyStyleSpacingBeforeChanges + slide.dominantBodyStyleSpacingAfterChanges,
        0
      ) > 0,
    bulletTouched: totals.bulletChanges > 0,
    alignmentTouched: totals.alignmentChanges +
      changesBySlide.reduce((total, slide) => total + slide.dominantBodyStyleAlignmentChanges, 0) > 0,
    lineSpacingTouched: totals.lineSpacingChanges +
      changesBySlide.reduce((total, slide) => total + slide.dominantBodyStyleLineSpacingChanges, 0) > 0
  });
  if (mode === "normalize") {
    const afterResidual = outputAudit
      ? summarizeRoleBasedTypographyResidual(outputAudit, {
        preferredFontFamily: normalizeBrandFontFamily
      })
      : null;
    const afterSpacingResidual = outputAudit ? summarizeRoleBasedSpacingResidual(outputAudit) : null;
    verification = {
      ...verification,
      fontDriftBefore: normalizeTypographyBaseline?.fontFamilyDriftCount ?? verification.fontDriftBefore,
      fontDriftAfter: afterResidual?.fontFamilyDriftCount ?? null,
      fontSizeDriftBefore: normalizeTypographyBaseline?.fontSizeDriftCount ?? verification.fontSizeDriftBefore,
      fontSizeDriftAfter: afterResidual?.fontSizeDriftCount ?? null,
      spacingDriftBefore: normalizeSpacingBaseline?.spacingDriftCount ?? verification.spacingDriftBefore,
      spacingDriftAfter: afterSpacingResidual?.spacingDriftCount ?? null,
      lineSpacingDriftBefore: normalizeSpacingBaseline?.lineSpacingDriftCount ?? verification.lineSpacingDriftBefore,
      lineSpacingDriftAfter: afterSpacingResidual?.lineSpacingDriftCount ?? null
    };
  }
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
    deckQaSummary
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
    complianceOrientedReportSummary,
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

async function applyPostLayoutTypographyStabilization(
  archive: JSZip,
  sourcePresentation: LoadedPresentation,
  paragraphLevelChanges: {
    spacingChanges: number;
    bulletChanges: number;
    alignmentChanges: number;
    lineSpacingChanges: number;
    dominantBodyStyleChanges: number;
  },
  options: {
    mode: "standard" | "normalize";
    normalizeBrandFontFamily: string | null;
  }
): Promise<{
  fontFamilyReport: Awaited<ReturnType<typeof applyFontFamilyFixToArchive>>;
  fontSizeReport: Awaited<ReturnType<typeof applyFontSizeFixToArchive>>;
}> {
  const totalParagraphLevelChanges =
    paragraphLevelChanges.spacingChanges +
    paragraphLevelChanges.bulletChanges +
    paragraphLevelChanges.alignmentChanges +
    paragraphLevelChanges.lineSpacingChanges +
    paragraphLevelChanges.dominantBodyStyleChanges;

  if (totalParagraphLevelChanges === 0) {
    return {
      fontFamilyReport: {
        applied: false,
        changedRuns: [],
        skipped: [{ reason: "no post-layout typography stabilization needed" }]
      },
      fontSizeReport: {
        applied: false,
        changedRuns: [],
        skipped: [{ reason: "no post-layout typography stabilization needed" }]
      }
    };
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-stabilize-"));
  const intermediatePath = path.join(workDir, "intermediate.pptx");

  try {
    const intermediateBuffer = await archive.generateAsync({ type: "nodebuffer" });
    await writeFile(intermediatePath, intermediateBuffer);
    const stabilizationPresentation = await loadPresentation(intermediatePath);
    const stabilizationAudit = analyzeSlides(stabilizationPresentation);

    if (options.mode === "normalize") {
      const normalizeReport = await applyRoleBasedTypographyFixToArchive(
        archive,
        sourcePresentation,
        stabilizationAudit,
        {
          preferredFontFamily: options.normalizeBrandFontFamily
        }
      );

      return {
        fontFamilyReport: {
          applied: normalizeReport.fontFamilyChangedRuns.length > 0,
          changedRuns: normalizeReport.fontFamilyChangedRuns,
          skipped: normalizeReport.fontFamilyChangedRuns.length > 0 ? [] : normalizeReport.skipped
        },
        fontSizeReport: {
          applied: normalizeReport.fontSizeChangedRuns.length > 0,
          changedRuns: normalizeReport.fontSizeChangedRuns,
          skipped: normalizeReport.fontSizeChangedRuns.length > 0 ? [] : normalizeReport.skipped
        }
      };
    }

    return {
      fontFamilyReport: await applyFontFamilyFixToArchive(
        archive,
        stabilizationPresentation,
        stabilizationAudit.fontDrift.dominantFont
      ),
      fontSizeReport: await applyFontSizeFixToArchive(
        archive,
        stabilizationPresentation,
        stabilizationAudit.fontSizeDrift.dominantSizePt
      )
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function emptyRoleBasedTypographyReport(reason: string): RoleBasedTypographyFixReport {
  return {
    applied: false,
    fontFamilyChangedRuns: [],
    fontSizeChangedRuns: [],
    skipped: [{ reason }]
  };
}

function emptyRoleBasedParagraphSpacingReport(reason: string): RoleBasedParagraphSpacingFixReport {
  return {
    applied: false,
    changedParagraphs: [],
    skipped: [{ reason }]
  };
}

function emptyRoleBasedLineSpacingReport(reason: string): RoleBasedLineSpacingFixReport {
  return {
    applied: false,
    changedParagraphs: [],
    skipped: [{ reason }]
  };
}

function normalizePreferredFontFamily(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function countChangedRuns(changedRuns: Array<{ count: number }>): number {
  return changedRuns.reduce((total, entry) => total + entry.count, 0);
}

function countChangedParagraphs(changedParagraphs: Array<{ count: number }>): number {
  return changedParagraphs.reduce((total, entry) => total + entry.count, 0);
}

function mergeChangedRunSummaries<T extends { slide: number; count: number }>(
  left: T[],
  right: T[]
): T[] {
  const merged = new Map<string, T>();

  for (const entry of [...left, ...right]) {
    const key = JSON.stringify({ ...entry, count: undefined });
    const existing = merged.get(key);
    if (existing) {
      existing.count += entry.count;
      continue;
    }

    merged.set(key, { ...entry });
  }

  return [...merged.values()].sort((first, second) => first.slide - second.slide);
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
