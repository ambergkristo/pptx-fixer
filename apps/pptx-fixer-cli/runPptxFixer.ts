import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { analyzeSlides, loadPresentation } from "../../packages/audit/pptxAudit.ts";
import { runFixesByMode, type CleanupMode, type RunFixesByModeOptions, type RunFixesByModeReport } from "../../packages/fix/runFixesByMode.ts";
import {
  renderProductImprovementMarkdown,
  runMasterAcceptanceValidation
} from "../../packages/validation/masterAcceptanceValidation.ts";
import {
  resolveMasterAcceptanceDeckPath,
  resolveRepoRoot
} from "../../packages/validation/masterAcceptance.ts";
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

  if (command === "validate-master") {
    try {
      await runValidateMasterMode();
    } catch (error: unknown) {
      const message = normalizeCliError(error);
      console.error(`Error: ${message}`);
      process.exitCode = 1;
    }
    return;
  }

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
    const extraArgs = process.argv.slice(6);

    if (!isCleanupMode(mode) || !inputPath || !outputPath) {
      console.error("Usage: node pptx-fixer fix <minimal|standard|normalize|template> <input.pptx|input-folder> <output.pptx|output-folder> [--brand-font <font family>] [--brand-preset <preset id>] [--logo-position <top_left|top_right|bottom_left|bottom_right>] [--footer-style <none|minimal|brand_footer>]");
      process.exitCode = 1;
      return;
    }

    try {
      const fixOptions = parseFixOptions(extraArgs, mode);
      const inputTarget = await resolveInputTarget(inputPath);

      if (inputTarget.type === "directory") {
        await runBatchMode(mode, inputPath, outputPath, fixOptions);
        return;
      }

      validateOutputPath(outputPath);
      await runSingleFileMode(mode, inputPath, outputPath, fixOptions);
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
    console.error("Usage: node pptx-fixer fix <minimal|standard|normalize|template> <input.pptx|input-folder> <output.pptx|output-folder> [--brand-font <font family>] [--brand-preset <preset id>] [--logo-position <top_left|top_right|bottom_left|bottom_right>] [--footer-style <none|minimal|brand_footer>]");
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

async function runValidateMasterMode(): Promise<void> {
  const repoRoot = resolveRepoRoot();
  const artifactDirectory = path.join(repoRoot, ".tmp", "master_acceptance_validation");
  await mkdir(artifactDirectory, { recursive: true });

  const masterDeckPath = await resolveMasterAcceptanceDeckPath();
  const report = await runMasterAcceptanceValidation(artifactDirectory);

  console.log("PPTX Fixer Master Validation");
  console.log("");
  console.log(`Master deck: ${masterDeckPath}`);
  console.log(`Artifacts: ${artifactDirectory}`);
  console.log("");
  console.log(renderProductImprovementMarkdown(report));
}

function normalizeCliError(error: unknown): string {
  if (isOutputWriteError(error)) {
    return "output write failure";
  }

  return error instanceof Error ? error.message : String(error);
}

async function runSingleFileMode(
  mode: CleanupMode,
  inputPath: string,
  outputPath: string,
  options: RunFixesByModeOptions = {}
): Promise<void> {
  const result = await processSingleFile(mode, inputPath, outputPath, options);

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
  console.log(
    `Line spacing drift: ${result.report.verification.lineSpacingDriftBefore} -> ${formatDriftValue(result.report.verification.lineSpacingDriftAfter)}`
  );
  console.log(`Changed slides: ${result.report.changesBySlide.length}`);
  console.log("Output validation: passed");
  console.log(`Cleanup outcome: ${result.report.cleanupOutcomeSummary.summaryLine}`);
  console.log(
    `Recommended action: ${result.report.recommendedActionSummary.primaryAction} - ${result.report.recommendedActionSummary.actionReason}`
  );
  console.log(
    `Brand score: ${result.report.brandScoreImprovementSummary.brandScoreBefore} -> ${result.report.brandScoreImprovementSummary.brandScoreAfter} (${result.report.brandScoreImprovementSummary.improvementLabel})`
  );
  console.log(`Remaining issues: ${result.report.remainingIssuesSummary.summaryLine}`);
  console.log(`Deck readiness: ${result.report.deckReadinessSummary.summaryLine}`);
  console.log(`Report consistency: ${result.report.reportConsistencySummary.summaryLine}`);
  console.log(`Pipeline outcome: ${result.report.pipelineFailureSummary.summaryLine}`);
  console.log(`Package validation: ${result.report.outputPackageValidation.summaryLine}`);
  console.log(`Output file metadata: ${result.report.outputFileMetadataSummary.summaryLine}`);
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
  outputDirectory: string,
  options: RunFixesByModeOptions = {}
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
      await processSingleFile(mode, inputFilePath, outputFilePath, options);
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
  outputPath: string,
  options: RunFixesByModeOptions = {}
): Promise<{ inputAudit: ReturnType<typeof analyzeSlides>; report: RunFixesByModeReport; reportPath: string }> {
  const inputPresentation = await loadPresentation(inputPath);
  const inputAudit = analyzeSlides(inputPresentation);
  const report = await runFixesByMode(mode, inputPath, outputPath, options);

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
  return value === "minimal" || value === "standard" || value === "normalize" || value === "template";
}

function parseFixOptions(args: string[], mode: CleanupMode): RunFixesByModeOptions {
  const options: RunFixesByModeOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--brand-font") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error("missing value for --brand-font");
      }

      options.normalizeBrandFontFamily = nextValue;
      index += 1;
      continue;
    }

    if (argument.startsWith("--brand-font=")) {
      options.normalizeBrandFontFamily = argument.slice("--brand-font=".length);
      continue;
    }

    if (argument === "--brand-preset") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error("missing value for --brand-preset");
      }

      options.normalizeBrandPresetId = nextValue;
      if (mode === "template") {
        options.templateBrandPresetId = nextValue;
      }
      index += 1;
      continue;
    }

    if (argument.startsWith("--brand-preset=")) {
      options.normalizeBrandPresetId = argument.slice("--brand-preset=".length);
      if (mode === "template") {
        options.templateBrandPresetId = argument.slice("--brand-preset=".length);
      }
      continue;
    }

    if (argument === "--logo-position") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error("missing value for --logo-position");
      }

      options.templateLogoPosition = nextValue as RunFixesByModeOptions["templateLogoPosition"];
      index += 1;
      continue;
    }

    if (argument.startsWith("--logo-position=")) {
      options.templateLogoPosition = argument.slice("--logo-position=".length) as RunFixesByModeOptions["templateLogoPosition"];
      continue;
    }

    if (argument === "--footer-style") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error("missing value for --footer-style");
      }

      options.templateFooterStyle = nextValue as RunFixesByModeOptions["templateFooterStyle"];
      index += 1;
      continue;
    }

    if (argument.startsWith("--footer-style=")) {
      options.templateFooterStyle = argument.slice("--footer-style=".length) as RunFixesByModeOptions["templateFooterStyle"];
      continue;
    }

    throw new Error(`unknown option: ${argument}`);
  }

  if (mode !== "normalize" && mode !== "template" && (options.normalizeBrandFontFamily?.trim() || options.normalizeBrandPresetId?.trim())) {
    throw new Error("--brand-font and --brand-preset are only supported with normalize or template mode");
  }

  if (mode === "template" && options.normalizeBrandFontFamily?.trim()) {
    throw new Error("--brand-font is not supported with template mode");
  }

  if (mode !== "template" && (options.templateLogoPosition?.trim() || options.templateFooterStyle?.trim() || options.templateBrandPresetId?.trim())) {
    throw new Error("--logo-position, --footer-style, and template preset selection are only supported with template mode");
  }

  if (mode === "template") {
    options.templateBrandPresetId = options.templateBrandPresetId ?? options.normalizeBrandPresetId ?? null;
    if (!options.templateBrandPresetId?.trim()) {
      throw new Error("template mode requires --brand-preset");
    }
  }

  return options;
}

main().catch((error: unknown) => {
  const message = normalizeCliError(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
