import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../audit/pptxAudit.ts";
import { applyFontFamilyFixToArchive } from "./fontFamilyFix.ts";
import { applyFontSizeFixToArchive } from "./fontSizeFix.ts";

export interface FixStepSummary {
  name: "fontFamilyFix" | "fontSizeFix";
  changedRuns: number;
}

export interface RunAllFixesReport {
  applied: boolean;
  steps: FixStepSummary[];
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

  const steps: FixStepSummary[] = [
    {
      name: "fontFamilyFix",
      changedRuns: countChangedRuns(fontFamilyReport.changedRuns)
    },
    {
      name: "fontSizeFix",
      changedRuns: countChangedRuns(fontSizeReport.changedRuns)
    }
  ];
  const applied = steps.some((step) => step.changedRuns > 0);

  await writeOutput(
    resolvedOutputPath,
    applied ? await archive.generateAsync({ type: "nodebuffer" }) : inputBuffer
  );

  return {
    applied,
    steps
  };
}

function countChangedRuns(changedRuns: Array<{ count: number }>): number {
  return changedRuns.reduce((total, entry) => total + entry.count, 0);
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
