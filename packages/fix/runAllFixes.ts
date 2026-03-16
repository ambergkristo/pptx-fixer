import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type AuditReport } from "../audit/pptxAudit.ts";
import { validateFixedPptx, type FixedPptxValidationReport } from "../export/validateFixedPptx.ts";
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
      name: "spacingFix" | "bulletFix" | "alignmentFix" | "lineSpacingFix" | "dominantBodyStyleFix" | "dominantFontFamilyFix";
      changedParagraphs: number;
    };

export interface RunAllFixesReport {
  applied: boolean;
  noOp: boolean;
  steps: FixStepSummary[];
  totals: FixTotalsSummary;
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
}

export interface SlideChangeSummary {
  slide: number;
  fontFamilyChanges: number;
  fontSizeChanges: number;
  spacingChanges: number;
  bulletChanges: number;
  alignmentChanges: number;
  lineSpacingChanges: number;
  dominantBodyStyleChanges: number;
  dominantFontFamilyChanges: number;
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
    }
  ];
  const applied = steps.some((step) =>
    step.name === "spacingFix" || step.name === "bulletFix" || step.name === "alignmentFix" || step.name === "lineSpacingFix" || step.name === "dominantBodyStyleFix" || step.name === "dominantFontFamilyFix"
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
    dominantFontFamilyChanges: countChangedParagraphs(dominantFontFamilyReport.changedParagraphs)
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
    dominantBodyStyleReport.telemetryBySlide
  );

  await writeOutput(
    resolvedOutputPath,
    applied ? await archive.generateAsync({ type: "nodebuffer" }) : inputBuffer
  );

  const validationResult = await validateFixedPptx(
    resolvedOutputPath,
    auditReport.slideCount
  );
  const outputAudit = validationResult.presentation
    ? analyzeSlides(validationResult.presentation)
    : null;

  return {
    applied,
    noOp: !applied,
    steps,
    totals,
    changesBySlide,
    validation: validationResult.validation,
    verification: summarizeVerification(auditReport, outputAudit)
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
  dominantBodyStyleTelemetry: DominantBodyStyleSlideTelemetry[]
): SlideChangeSummary[] {
  const changesBySlide = new Map<number, SlideChangeSummary>();

  for (const change of fontFamilyChanges) {
    const existing = changesBySlide.get(change.slide) ?? {
      slide: change.slide,
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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

  for (const telemetry of dominantBodyStyleTelemetry) {
    const existing = changesBySlide.get(telemetry.slide) ?? {
      slide: telemetry.slide,
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
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

  return [...changesBySlide.values()].sort((left, right) => left.slide - right.slide);
}
