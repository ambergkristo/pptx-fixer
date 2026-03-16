import path from "node:path";
import { writeFile } from "node:fs/promises";

import { analyzeSlides, loadPresentation } from "../../packages/audit/pptxAudit.ts";
import { runFixesByMode, type CleanupMode, type RunFixesByModeReport } from "../../packages/fix/runFixesByMode.ts";
import {
  buildBatchOutputPath,
  formatDriftValue,
  getAuditReportPath,
  getReportPath,
  isOutputWriteError,
  listInputPptxFiles,
  prepareOutputDirectory,
  resolveInputTarget,
  validateOutputPath,
  validationPassed
} from "./cliUtils.ts";

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command === "audit") {
    const inputPath = process.argv[3];
    if (!inputPath) {
      console.error("Usage: node pptx-fixer audit <input.pptx>");
      process.exitCode = 1;
      return;
    }

    try {
      const inputTarget = await resolveInputTarget(inputPath);
      if (inputTarget.type !== "file") {
        throw new Error("file must be .pptx");
      }

      await runAuditOnlyMode(inputPath);
    } catch (error: unknown) {
      const message = normalizeCliError(error);
      console.error(`Error: ${message}`);
      process.exitCode = 1;
    }
    return;
  }

  if (command === "fix") {
    const mode = process.argv[3];
    const inputPath = process.argv[4];
    const outputPath = process.argv[5];

    if (!isCleanupMode(mode) || !inputPath || !outputPath) {
      console.error("Usage: node pptx-fixer fix <minimal|standard> <input.pptx|input-folder> <output.pptx|output-folder>");
      process.exitCode = 1;
      return;
    }

    try {
      const inputTarget = await resolveInputTarget(inputPath);

      if (inputTarget.type === "directory") {
        await runBatchMode(mode, inputPath, outputPath);
        return;
      }

      validateOutputPath(outputPath);
      await runSingleFileMode(mode, inputPath, outputPath);
    } catch (error: unknown) {
      const message = normalizeCliError(error);
      console.error(`Error: ${message}`);
      process.exitCode = 1;
    }
    return;
  }

  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error("Usage: node pptx-fixer fix <minimal|standard> <input.pptx|input-folder> <output.pptx|output-folder>");
    process.exitCode = 1;
    return;
  }

  try {
    const inputTarget = await resolveInputTarget(inputPath);

    if (inputTarget.type === "directory") {
      await runBatchMode("standard", inputPath, outputPath);
      return;
    }

    validateOutputPath(outputPath);
    await runSingleFileMode("standard", inputPath, outputPath);
  } catch (error: unknown) {
    const message = normalizeCliError(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

function normalizeCliError(error: unknown): string {
  if (isOutputWriteError(error)) {
    return "output write failure";
  }

  return error instanceof Error ? error.message : String(error);
}

async function runSingleFileMode(mode: CleanupMode, inputPath: string, outputPath: string): Promise<void> {
  const result = await processSingleFile(mode, inputPath, outputPath);

  console.log("PPTX Fixer");
  console.log("");
  console.log(`Mode: ${mode}`);
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log("");
  console.log(`Slides: ${result.inputAudit.slideCount}`);
  console.log(
    `Font drift: ${result.report.verification.fontDriftBefore} -> ${formatDriftValue(result.report.verification.fontDriftAfter)}`
  );
  console.log(
    `Font size drift: ${result.report.verification.fontSizeDriftBefore} -> ${formatDriftValue(result.report.verification.fontSizeDriftAfter)}`
  );
  console.log(
    `Spacing drift: ${result.report.verification.spacingDriftBefore} -> ${formatDriftValue(result.report.verification.spacingDriftAfter)}`
  );
  console.log(
    `Bullet drift: ${result.report.verification.bulletIndentDriftBefore} -> ${formatDriftValue(result.report.verification.bulletIndentDriftAfter)}`
  );
  console.log(
    `Alignment drift: ${result.report.verification.alignmentDriftBefore} -> ${formatDriftValue(result.report.verification.alignmentDriftAfter)}`
  );
  console.log(`Changed slides: ${result.report.changesBySlide.length}`);
  console.log("Output validation: passed");
  console.log("");
  console.log(`Report written to ${result.reportPath}`);
  console.log("");
  console.log("Done");
}

async function runAuditOnlyMode(inputPath: string): Promise<void> {
  const inputPresentation = await loadPresentation(inputPath);
  const auditReport = analyzeSlides(inputPresentation);
  const reportPath = getAuditReportPath(inputPath);

  try {
    await writeFile(reportPath, JSON.stringify(auditReport, null, 2), "utf8");
  } catch (error: unknown) {
    if (isOutputWriteError(error)) {
      throw new Error("output write failure");
    }

    throw error;
  }

  const totalFontUsage = auditReport.fontsUsed.reduce((total, font) => total + font.usageCount, 0);

  console.log("PPTX Fixer Audit");
  console.log("");
  console.log(`Input: ${inputPath}`);
  console.log("");
  console.log(`Slides: ${auditReport.slideCount}`);
  console.log("");
  console.log("Fonts detected:");
  if (auditReport.fontsUsed.length === 0 || totalFontUsage === 0) {
    console.log("none");
  } else {
    for (const font of auditReport.fontsUsed) {
      const percentage = Math.round((font.usageCount / totalFontUsage) * 100);
      console.log(`${font.fontFamily} (${percentage}%)`);
    }
  }
  console.log("");
  console.log(`Font drift: ${countDriftSlides(auditReport.fontDrift.driftRuns)} slides`);
  console.log(`Font size drift: ${countDriftSlides(auditReport.fontSizeDrift.driftRuns)} slides`);
  console.log("");
  console.log(`Audit report written to ${reportPath}`);
}

async function runBatchMode(
  mode: CleanupMode,
  inputDirectory: string,
  outputDirectory: string
): Promise<void> {
  await prepareOutputDirectory(outputDirectory);
  const inputFiles = await listInputPptxFiles(inputDirectory);

  console.log(`Mode: ${mode}`);
  console.log(`Processing ${inputFiles.length} files`);
  console.log("");

  let succeeded = 0;
  let failed = 0;

  for (const [index, inputFilePath] of inputFiles.entries()) {
    const fileName = path.basename(inputFilePath);
    console.log(`[${index + 1}/${inputFiles.length}] ${fileName}`);

    try {
      const outputFilePath = buildBatchOutputPath(outputDirectory, inputFilePath);
      await processSingleFile(mode, inputFilePath, outputFilePath);
      succeeded += 1;
    } catch (error: unknown) {
      failed += 1;
      console.error(`Error: ${fileName}: ${normalizeCliError(error)}`);
    }
  }

  console.log("");
  console.log(`Processed: ${inputFiles.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function processSingleFile(
  mode: CleanupMode,
  inputPath: string,
  outputPath: string
): Promise<{ inputAudit: ReturnType<typeof analyzeSlides>; report: RunFixesByModeReport; reportPath: string }> {
  const inputPresentation = await loadPresentation(inputPath);
  const inputAudit = analyzeSlides(inputPresentation);
  const report = await runFixesByMode(mode, inputPath, outputPath);

  if (!validationPassed(report.validation)) {
    throw new Error("export validation failed");
  }

  const reportPath = getReportPath(outputPath);

  try {
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  } catch (error: unknown) {
    if (isOutputWriteError(error)) {
      throw new Error("output write failure");
    }

    throw error;
  }

  return {
    inputAudit,
    report,
    reportPath
  };
}

function countDriftSlides(driftRuns: Array<{ slide: number }>): number {
  return new Set(driftRuns.map((driftRun) => driftRun.slide)).size;
}

function isCleanupMode(value: string | undefined): value is CleanupMode {
  return value === "minimal" || value === "standard";
}

main().catch((error: unknown) => {
  const message = normalizeCliError(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
