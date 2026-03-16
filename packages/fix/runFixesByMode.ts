import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type AuditReport } from "../audit/pptxAudit.ts";
import { validateFixedPptx, type FixedPptxValidationReport } from "../export/validateFixedPptx.ts";
import { applyFontFamilyFixToArchive, type ChangedFontRunSummary } from "./fontFamilyFix.ts";
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
    dominantBodyStyleChanges: 0
  };
  const steps = [
    {
      name: "fontFamilyFix" as const,
      changedRuns: totals.fontFamilyChanges
    }
  ];
  const applied = totals.fontFamilyChanges > 0;
  const changesBySlide = summarizeChangesBySlide(fontFamilyReport.changedRuns);

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
    mode: "minimal",
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

function summarizeChangesBySlide(
  fontFamilyChanges: ChangedFontRunSummary[]
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
      dominantBodyStyleChanges: 0
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
