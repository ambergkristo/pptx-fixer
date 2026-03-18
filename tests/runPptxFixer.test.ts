import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

import { loadPresentation } from "../packages/audit/pptxAudit.ts";

const tempPaths: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = path.join(repoRoot, "pptx-fixer");

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("successful full CLI run writes fixed pptx and json report", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [
            { text: "Change both", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Body 2",
          runs: [
            { text: "Body 2", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "sales-fixed.pptx");
  const reportPath = path.join(path.dirname(inputPath), "sales-fixed.report.json");

  const result = await runNodeProcess([cliEntry, "fix", "standard", inputPath, outputPath], path.dirname(inputPath));

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /PPTX Fixer/);
  assert.match(result.stdout, /Mode: standard/);
  assert.match(result.stdout, /Input: .*sample\.pptx/);
  assert.match(result.stdout, /Output: .*sales-fixed\.pptx/);
  assert.match(result.stdout, /Slides: 2/);
  assert.match(result.stdout, /Font drift: 1 -> 0/);
  assert.match(result.stdout, /Font size drift: 1 -> 0/);
  assert.match(result.stdout, /Spacing drift: 0 -> 0/);
  assert.match(result.stdout, /Bullet drift: 0 -> 0/);
  assert.match(result.stdout, /Alignment drift: 0 -> 0/);
  assert.match(result.stdout, /Line spacing drift: 0 -> 0/);
  assert.match(result.stdout, /Changed slides: 1/);
  assert.match(result.stdout, /Output validation: passed/);
  assert.match(result.stdout, /Cleanup outcome: Cleanup applied successfully with no remaining detected drift\./);
  assert.match(result.stdout, /Recommended action: review - Automatic cleanup resolved most detected drift\./);
  assert.match(result.stdout, /Brand score: 98 -> 100 \(minor\)/);
  assert.match(result.stdout, /Remaining issues: No remaining formatting issues were detected after cleanup\./);
  assert.match(result.stdout, /Deck readiness: This deck appears ready after cleanup with no remaining formatting issues detected\./);
  assert.match(result.stdout, /Report consistency: Report outputs are internally consistent\./);
  assert.match(result.stdout, /Pipeline outcome: Pipeline completed successfully and produced a validated output package\./);
  assert.match(result.stdout, /Package validation: Output PPTX package validation passed\./);
  assert.match(result.stdout, /Output file metadata: Output file metadata captured successfully\./);
  assert.match(result.stdout, /Report written to .*sales-fixed\.report\.json/);
  assert.match(result.stdout, /Done/);

  await loadPresentation(outputPath);

  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const inputStats = await stat(inputPath);
  const outputStats = await stat(outputPath);
  assert.equal(report.mode, "standard");
  assert.equal(report.applied, true);
  assert.equal(report.noOp, false);
  assert.deepEqual(report.totals, {
    fontFamilyChanges: 1,
    fontSizeChanges: 1,
    spacingChanges: 0,
    bulletChanges: 0,
    alignmentChanges: 0,
    lineSpacingChanges: 0,
    dominantBodyStyleChanges: 0,
    dominantFontFamilyChanges: 0,
    dominantFontSizeChanges: 0
  });
  assert.deepEqual(report.cleanupOutcomeSummary, {
    changedSlides: 1,
    totalChanges: 2,
    appliedStages: [
      "fontFamilyFix",
      "fontSizeFix"
    ],
    remainingDrift: {
      fontDrift: 0,
      fontSizeDrift: 0,
      spacingDriftCount: 0,
      bulletIndentDriftCount: 0,
      alignmentDriftCount: 0,
      lineSpacingDriftCount: 0
    },
    summaryLine: "Cleanup applied successfully with no remaining detected drift."
  });
  assert.deepEqual(report.recommendedActionSummary, {
    primaryAction: "review",
    actionReason: "Automatic cleanup resolved most detected drift.",
    focusAreas: [
      "font consistency",
      "font size consistency",
      "problem slides review"
    ]
  });
  assert.deepEqual(report.issueCategorySummary, [
    {
      category: "font_consistency",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    },
    {
      category: "font_size_consistency",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    },
    {
      category: "paragraph_spacing",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "bullet_indentation",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "alignment",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "line_spacing",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    }
  ]);
  assert.deepEqual(report.brandScoreImprovementSummary, {
    brandScoreBefore: 98,
    brandScoreAfter: 100,
    scoreDelta: 2,
    improvementLabel: "minor",
    summaryLine: "Cleanup produced a small brand consistency improvement."
  });
  assert.deepEqual(report.remainingIssuesSummary, {
    remainingIssueCount: 0,
    remainingSeverityLabel: "none",
    topRemainingIssueCategories: [],
    summaryLine: "No remaining formatting issues were detected after cleanup."
  });
  assert.deepEqual(report.deckReadinessSummary, {
    readinessLabel: "ready",
    readinessReason: "noRemainingIssues",
    summaryLine: "This deck appears ready after cleanup with no remaining formatting issues detected."
  });
  assert.deepEqual(report.reportConsistencySummary, {
    consistencyLabel: "consistent",
    consistencyFlags: [],
    summaryLine: "Report outputs are internally consistent."
  });
  assert.deepEqual(report.reportShapeParitySummary, buildExpectedReportShapeParitySummary());
  assert.deepEqual(report.pipelineFailureSummary, buildExpectedPipelineFailureSummary());
  assert.deepEqual(
    report.endToEndRunSummary,
    buildExpectedEndToEndRunSummary({
      runStatus: "success",
      outputStatus: "valid",
      reportStatus: "consistent",
      deckStatus: "ready"
    })
  );
  assert.deepEqual(report.outputPackageValidation, {
    validationLabel: "valid",
    checks: {
      fileExists: true,
      nonEmptyFile: true,
      readableZip: true,
      hasContentTypes: true,
      hasRootRels: true,
      hasPresentationPart: true
    },
    summaryLine: "Output PPTX package validation passed."
  });
  assert.deepEqual(
    report.outputFileMetadataSummary,
    buildExpectedOutputFileMetadataSummary(outputPath, outputStats.size)
  );
  assert.deepEqual(
    report.inputFileLimitsSummary,
    buildExpectedInputFileLimitsSummary(inputPath, inputStats.size)
  );
  assert.deepEqual(
    report.outputOverwriteSafetySummary,
    buildExpectedOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: true
    })
  );
  assert.deepEqual(
    report.inputOutputPathRelationshipSummary,
    buildExpectedInputOutputPathRelationshipSummary({
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: false
    })
  );
  assert.deepEqual(
    report.processingModeSummary,
    buildExpectedProcessingModeSummary("all")
  );
  assert.deepEqual(
    report.reportCoverageSummary,
    buildExpectedReportCoverageSummary()
  );
});

test("minimal mode runs only font family cleanup", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "Change both", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "sales-fixed.pptx");
  const reportPath = path.join(path.dirname(inputPath), "sales-fixed.report.json");

  const result = await runNodeProcess([cliEntry, "fix", "minimal", inputPath, outputPath], path.dirname(inputPath));

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Mode: minimal/);
  assert.match(result.stdout, /Font drift: 1 -> 0/);
  assert.match(result.stdout, /Font size drift: 1 -> 1/);
  assert.match(result.stdout, /Spacing drift: 0 -> 0/);
  assert.match(result.stdout, /Bullet drift: 0 -> 0/);
  assert.match(result.stdout, /Alignment drift: 0 -> 0/);
  assert.match(result.stdout, /Line spacing drift: 0 -> 0/);
  assert.match(result.stdout, /Pipeline outcome: Pipeline completed successfully and produced a validated output package\./);

  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const inputStats = await stat(inputPath);
  const outputStats = await stat(outputPath);
  assert.equal(report.mode, "minimal");
  assert.deepEqual(report.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 1
    }
  ]);
  assert.deepEqual(report.totals, {
    fontFamilyChanges: 1,
    fontSizeChanges: 0,
    spacingChanges: 0,
    bulletChanges: 0,
    alignmentChanges: 0,
    lineSpacingChanges: 0,
    dominantBodyStyleChanges: 0,
    dominantFontFamilyChanges: 0,
    dominantFontSizeChanges: 0
  });
  assert.equal(report.verification.fontDriftAfter, 0);
  assert.equal(report.verification.fontSizeDriftAfter, 1);
  assert.equal(report.verification.spacingDriftAfter, 0);
  assert.equal(report.verification.bulletIndentDriftAfter, 0);
  assert.equal(report.verification.alignmentDriftAfter, 0);
  assert.equal(report.verification.lineSpacingDriftAfter, 0);
  assert.deepEqual(report.cleanupOutcomeSummary, {
    changedSlides: 1,
    totalChanges: 1,
    appliedStages: [
      "fontFamilyFix"
    ],
    remainingDrift: {
      fontDrift: 0,
      fontSizeDrift: 1,
      spacingDriftCount: 0,
      bulletIndentDriftCount: 0,
      alignmentDriftCount: 0,
      lineSpacingDriftCount: 0
    },
    summaryLine: "Cleanup applied successfully with minor remaining drift."
  });
  assert.deepEqual(report.recommendedActionSummary, {
    primaryAction: "review",
    actionReason: "Automatic cleanup resolved most detected drift.",
    focusAreas: [
      "font size consistency",
      "font consistency",
      "problem slides review"
    ]
  });
  assert.deepEqual(report.issueCategorySummary, [
    {
      category: "font_consistency",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    },
    {
      category: "font_size_consistency",
      detectedBefore: 1,
      fixed: 0,
      remaining: 1,
      status: "unchanged"
    },
    {
      category: "paragraph_spacing",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "bullet_indentation",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "alignment",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "line_spacing",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    }
  ]);
  assert.deepEqual(report.brandScoreImprovementSummary, {
    brandScoreBefore: 98,
    brandScoreAfter: 99,
    scoreDelta: 1,
    improvementLabel: "minor",
    summaryLine: "Cleanup produced a small brand consistency improvement."
  });
  assert.deepEqual(report.remainingIssuesSummary, {
    remainingIssueCount: 1,
    remainingSeverityLabel: "low",
    topRemainingIssueCategories: [
      "font_size_consistency"
    ],
    summaryLine: "A small number of formatting issues remain after cleanup."
  });
  assert.deepEqual(report.deckReadinessSummary, {
    readinessLabel: "mostlyReady",
    readinessReason: "minorRemainingIssues",
    summaryLine: "This deck appears mostly ready after cleanup, with only minor remaining formatting issues."
  });
  assert.deepEqual(report.reportConsistencySummary, {
    consistencyLabel: "consistent",
    consistencyFlags: [],
    summaryLine: "Report outputs are internally consistent."
  });
  assert.deepEqual(report.reportShapeParitySummary, buildExpectedReportShapeParitySummary());
  assert.deepEqual(report.pipelineFailureSummary, buildExpectedPipelineFailureSummary());
  assert.deepEqual(
    report.endToEndRunSummary,
    buildExpectedEndToEndRunSummary({
      runStatus: "success",
      outputStatus: "valid",
      reportStatus: "consistent",
      deckStatus: "mostlyReady"
    })
  );
  assert.deepEqual(report.outputPackageValidation, {
    validationLabel: "valid",
    checks: {
      fileExists: true,
      nonEmptyFile: true,
      readableZip: true,
      hasContentTypes: true,
      hasRootRels: true,
      hasPresentationPart: true
    },
    summaryLine: "Output PPTX package validation passed."
  });
  assert.deepEqual(
    report.outputFileMetadataSummary,
    buildExpectedOutputFileMetadataSummary(outputPath, outputStats.size)
  );
  assert.deepEqual(
    report.inputFileLimitsSummary,
    buildExpectedInputFileLimitsSummary(inputPath, inputStats.size)
  );
  assert.deepEqual(
    report.outputOverwriteSafetySummary,
    buildExpectedOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: true
    })
  );
  assert.deepEqual(
    report.inputOutputPathRelationshipSummary,
    buildExpectedInputOutputPathRelationshipSummary({
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: false
    })
  );
  assert.deepEqual(
    report.processingModeSummary,
    buildExpectedProcessingModeSummary("fix")
  );
  assert.deepEqual(
    report.reportCoverageSummary,
    buildExpectedReportCoverageSummary()
  );
});

test("no-op run still works in standard mode", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "No explicit font", fontSize: 1800 },
            { text: "No explicit size", fontFamily: "Calibri" }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "sales-fixed.pptx");
  const reportPath = path.join(path.dirname(inputPath), "sales-fixed.report.json");

  const result = await runNodeProcess([cliEntry, "fix", "standard", inputPath, outputPath], path.dirname(inputPath));

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Mode: standard/);
  assert.match(result.stdout, /Changed slides: 0/);
  assert.match(result.stdout, /Output validation: passed/);
  assert.match(result.stdout, /Pipeline outcome: Pipeline completed and produced an output file, but report consistency concerns were detected\./);

  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.mode, "standard");
  assert.equal(report.applied, false);
  assert.equal(report.noOp, true);
  assert.equal(report.cleanupOutcomeSummary.summaryLine, "No cleanup changes were applied.");
  assert.equal(report.recommendedActionSummary.primaryAction, "none");
  assert.equal(report.issueCategorySummary[0].status, "clean");
  assert.equal(report.brandScoreImprovementSummary.improvementLabel, "none");
  assert.equal(report.remainingIssuesSummary.remainingSeverityLabel, "none");
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "minorMismatch");
  assert.equal(report.reportShapeParitySummary.parityLabel, "parityOk");
  assert.equal(report.pipelineFailureSummary.pipelineOutcomeLabel, "degradedSuccess");
  assert.deepEqual(
    report.endToEndRunSummary,
    buildExpectedEndToEndRunSummary({
      runStatus: "warning",
      outputStatus: "valid",
      reportStatus: "inconsistent",
      deckStatus: "ready"
    })
  );
  assert.equal(report.outputPackageValidation.validationLabel, "valid");
  assert.equal(report.outputFileMetadataSummary.outputFilePresent, true);
  assert.equal(report.inputFileLimitsSummary.inputFilePresent, true);
  assert.equal(report.inputFileLimitsSummary.limitsLabel, "withinLimit");
  assert.deepEqual(
    report.outputOverwriteSafetySummary,
    buildExpectedOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: true
    })
  );
  assert.deepEqual(
    report.inputOutputPathRelationshipSummary,
    buildExpectedInputOutputPathRelationshipSummary({
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: false
    })
  );
  assert.deepEqual(
    report.processingModeSummary,
    buildExpectedProcessingModeSummary("all")
  );
  assert.deepEqual(
    report.reportCoverageSummary,
    buildExpectedReportCoverageSummary()
  );
  assert.deepEqual(report.changesBySlide, []);
});

test("no-op still works in minimal mode", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "No explicit font", fontSize: 1800 },
            { text: "No explicit size", fontFamily: "Calibri" }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "sales-fixed-minimal.pptx");
  const reportPath = path.join(path.dirname(inputPath), "sales-fixed-minimal.report.json");

  const result = await runNodeProcess([cliEntry, "fix", "minimal", inputPath, outputPath], path.dirname(inputPath));

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Mode: minimal/);
  assert.match(result.stdout, /Changed slides: 0/);
  assert.match(result.stdout, /Pipeline outcome: Pipeline completed and produced an output file, but report consistency concerns were detected\./);

  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.mode, "minimal");
  assert.equal(report.noOp, true);
  assert.equal(report.cleanupOutcomeSummary.summaryLine, "No cleanup changes were applied.");
  assert.equal(report.recommendedActionSummary.primaryAction, "none");
  assert.equal(report.issueCategorySummary[0].status, "clean");
  assert.equal(report.brandScoreImprovementSummary.improvementLabel, "none");
  assert.equal(report.remainingIssuesSummary.remainingSeverityLabel, "none");
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "minorMismatch");
  assert.equal(report.reportShapeParitySummary.parityLabel, "parityOk");
  assert.equal(report.pipelineFailureSummary.pipelineOutcomeLabel, "degradedSuccess");
  assert.deepEqual(
    report.endToEndRunSummary,
    buildExpectedEndToEndRunSummary({
      runStatus: "warning",
      outputStatus: "valid",
      reportStatus: "inconsistent",
      deckStatus: "ready"
    })
  );
  assert.equal(report.outputPackageValidation.validationLabel, "valid");
  assert.equal(report.outputFileMetadataSummary.outputFilePresent, true);
  assert.equal(report.inputFileLimitsSummary.inputFilePresent, true);
  assert.equal(report.inputFileLimitsSummary.limitsLabel, "withinLimit");
  assert.deepEqual(
    report.outputOverwriteSafetySummary,
    buildExpectedOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: true
    })
  );
  assert.deepEqual(
    report.inputOutputPathRelationshipSummary,
    buildExpectedInputOutputPathRelationshipSummary({
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: false
    })
  );
  assert.deepEqual(
    report.processingModeSummary,
    buildExpectedProcessingModeSummary("fix")
  );
  assert.deepEqual(
    report.reportCoverageSummary,
    buildExpectedReportCoverageSummary()
  );
  assert.deepEqual(report.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 0
    }
  ]);
});

test("invalid input path returns a clear error", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-cli-missing-"));
  tempPaths.push(workDir);

  const outputPath = path.join(workDir, "sales-fixed.pptx");
  const result = await runNodeProcess(
    [cliEntry, "fix", "standard", path.join(workDir, "missing.pptx"), outputPath],
    workDir
  );

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Error: input file not found/);
});

test("invalid extension returns a clear error", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-cli-extension-"));
  tempPaths.push(workDir);

  const inputPath = path.join(workDir, "bad.txt");
  await writeFile(inputPath, "not a pptx", "utf8");

  const result = await runNodeProcess(
    [cliEntry, "fix", "standard", inputPath, path.join(workDir, "sales-fixed.pptx")],
    workDir
  );

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Error: file must be \.pptx/);
});

test("deterministic output behavior produces identical reports for repeated runs", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "Change font only", fontFamily: "Arial", fontSize: 2400 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const firstOutput = path.join(path.dirname(inputPath), "first-fixed.pptx");
  const secondOutput = path.join(path.dirname(inputPath), "second-fixed.pptx");
  const firstReportPath = path.join(path.dirname(inputPath), "first-fixed.report.json");
  const secondReportPath = path.join(path.dirname(inputPath), "second-fixed.report.json");

  const firstRun = await runNodeProcess([cliEntry, "fix", "standard", inputPath, firstOutput], path.dirname(inputPath));
  const secondRun = await runNodeProcess([cliEntry, "fix", "standard", inputPath, secondOutput], path.dirname(inputPath));

  assert.equal(firstRun.exitCode, 0, firstRun.stderr);
  assert.equal(secondRun.exitCode, 0, secondRun.stderr);

  const firstReport = JSON.parse(await readFile(firstReportPath, "utf8"));
  const secondReport = JSON.parse(await readFile(secondReportPath, "utf8"));
  const firstOutputStats = await stat(firstOutput);
  const secondOutputStats = await stat(secondOutput);

  assert.deepEqual(
    {
      ...firstReport,
      outputFileMetadataSummary: buildExpectedOutputFileMetadataSummary(
        "__normalized__.pptx",
        firstOutputStats.size
      )
    },
    {
      ...secondReport,
      outputFileMetadataSummary: buildExpectedOutputFileMetadataSummary(
        "__normalized__.pptx",
        secondOutputStats.size
      )
    }
  );
});

test("directory processing writes fixed outputs and reports for each pptx file", async () => {
  const inputDirectory = await mkdtemp(path.join(tmpdir(), "pptx-fixer-batch-input-"));
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "pptx-fixer-batch-output-"));
  tempPaths.push(inputDirectory, outputDirectory);

  await writeFixturePptx(path.join(inputDirectory, "deck2.pptx"), {
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 2",
          runs: [
            { text: "Deck 2", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  await writeFixturePptx(path.join(inputDirectory, "deck1.pptx"), {
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "Deck 1", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });

  const result = await runNodeProcess([cliEntry, "fix", "standard", inputDirectory, outputDirectory], inputDirectory);

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Mode: standard/);
  assert.match(result.stdout, /Processing 2 files/);
  assert.match(result.stdout, /\[1\/2\] deck1\.pptx/);
  assert.match(result.stdout, /\[2\/2\] deck2\.pptx/);
  assert.match(result.stdout, /Processed: 2/);
  assert.match(result.stdout, /Succeeded: 2/);
  assert.match(result.stdout, /Failed: 0/);

  await loadPresentation(path.join(outputDirectory, "deck1-fixed.pptx"));
  await loadPresentation(path.join(outputDirectory, "deck2-fixed.pptx"));

  const deck1Report = JSON.parse(
    await readFile(path.join(outputDirectory, "deck1-fixed.report.json"), "utf8")
  );
  const deck2Report = JSON.parse(
    await readFile(path.join(outputDirectory, "deck2-fixed.report.json"), "utf8")
  );

  assert.equal(deck1Report.applied, true);
  assert.equal(deck2Report.applied, true);
});

test("mixed success and failure batch runs continue processing and summarize results", async () => {
  const inputDirectory = await mkdtemp(path.join(tmpdir(), "pptx-fixer-batch-mixed-input-"));
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "pptx-fixer-batch-mixed-output-"));
  tempPaths.push(inputDirectory, outputDirectory);

  await writeFixturePptx(path.join(inputDirectory, "good.pptx"), {
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "Good", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  await writeFile(path.join(inputDirectory, "broken.pptx"), "not a zip", "utf8");

  const result = await runNodeProcess([cliEntry, "fix", "standard", inputDirectory, outputDirectory], inputDirectory);

  assert.equal(result.exitCode, 1);
  assert.match(result.stdout, /Mode: standard/);
  assert.match(result.stdout, /Processing 2 files/);
  assert.match(result.stdout, /\[1\/2\] broken\.pptx/);
  assert.match(result.stdout, /\[2\/2\] good\.pptx/);
  assert.match(result.stdout, /Processed: 2/);
  assert.match(result.stdout, /Succeeded: 1/);
  assert.match(result.stdout, /Failed: 1/);
  assert.match(result.stderr, /Error: broken\.pptx:/);

  await loadPresentation(path.join(outputDirectory, "good-fixed.pptx"));
  const goodReport = JSON.parse(
    await readFile(path.join(outputDirectory, "good-fixed.report.json"), "utf8")
  );
  assert.equal(goodReport.applied, true);
});

test("audit command writes audit report and prints summary without creating fixed pptx", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [
            { text: "A", fontFamily: "Calibri", fontSize: 2400 },
            { text: "B", fontFamily: "Calibri", fontSize: 2400 },
            { text: "C", fontFamily: "Calibri", fontSize: 2400 },
            { text: "D", fontFamily: "Arial", fontSize: 1800 }
          ]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Body 2",
          runs: [
            { text: "Appendix", fontFamily: "Calibri", fontSize: 2000 }
          ]
        })
      ]
    ]
  });
  const auditReportPath = path.join(path.dirname(inputPath), "sample.audit.json");
  const fixedOutputPath = path.join(path.dirname(inputPath), "sample-fixed.pptx");

  const result = await runNodeProcess([cliEntry, "audit", inputPath], path.dirname(inputPath));

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /PPTX Fixer Audit/);
  assert.match(result.stdout, /Input: .*sample\.pptx/);
  assert.match(result.stdout, /Slides: 2/);
  assert.match(result.stdout, /Fonts detected:/);
  assert.match(result.stdout, /Calibri \(83%\)/);
  assert.match(result.stdout, /Arial \(17%\)/);
  assert.match(result.stdout, /Font drift: 1 slides/);
  assert.match(result.stdout, /Font size drift: 2 slides/);
  assert.match(result.stdout, /Audit report written to .*sample\.audit\.json/);

  const auditReport = JSON.parse(await readFile(auditReportPath, "utf8"));
  assert.equal(auditReport.slideCount, 2);
  await assert.rejects(readFile(fixedOutputPath), /ENOENT/);
});

test("audit command handles invalid input clearly", async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-audit-missing-"));
  tempPaths.push(workDir);

  const result = await runNodeProcess(
    [cliEntry, "audit", path.join(workDir, "missing.pptx")],
    workDir
  );

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Error: input file not found/);
});

test("audit command is deterministic across repeated runs", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "Body", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const auditReportPath = path.join(path.dirname(inputPath), "sample.audit.json");

  const firstRun = await runNodeProcess([cliEntry, "audit", inputPath], path.dirname(inputPath));
  const firstAuditReport = await readFile(auditReportPath, "utf8");
  const secondRun = await runNodeProcess([cliEntry, "audit", inputPath], path.dirname(inputPath));
  const secondAuditReport = await readFile(auditReportPath, "utf8");

  assert.equal(firstRun.exitCode, 0, firstRun.stderr);
  assert.equal(secondRun.exitCode, 0, secondRun.stderr);
  assert.equal(firstAuditReport, secondAuditReport);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-cli-full-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "sample.pptx");
  await writeFixturePptx(filePath, options);
  return filePath;
}

async function writeFixturePptx(
  filePath: string,
  options: { slides: string[][] }
): Promise<void> {
  const zip = new JSZip();

  zip.file("[Content_Types].xml", buildContentTypesXml(options.slides.length));
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", buildPresentationXml(options.slides.length));
  zip.file("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(options.slides.length));

  options.slides.forEach((shapes, index) => {
    zip.file(`ppt/slides/slide${index + 1}.xml`, buildSlideXml(shapes));
  });

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(filePath, buffer);
}

function buildSlideXml(shapes: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      ${shapes.join("\n")}
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function buildShapeXml(options: {
  id: number;
  name: string;
  runs: Array<{
    text: string;
    fontSize?: number;
    fontFamily?: string;
  }>;
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const runs = options.runs
    .map((run) => {
      const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
      const latinNode = run.fontFamily
        ? `<a:latin typeface="${run.fontFamily}"/>`
        : "";
      return `<a:r>
        <a:rPr${sizeAttribute}>
          ${latinNode}
        </a:rPr>
        <a:t>${run.text}</a:t>
      </a:r>`;
    })
    .join("");

  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${options.id}" name="${options.name}"/>
    <p:cNvSpPr/>
    <p:nvPr>${placeholder}</p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      ${runs}
    </a:p>
  </p:txBody>
</p:sp>`;
}

function buildContentTypesXml(slideCount: number): string {
  const overrides = Array.from({ length: slideCount }, (_, index) =>
    `  <Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
${overrides}
</Types>`;
}

function buildPresentationXml(slideCount: number): string {
  const slideEntries = Array.from({ length: slideCount }, (_, index) =>
    `    <p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
${slideEntries}
  </p:sldIdLst>
</p:presentation>`;
}

function buildPresentationRelsXml(slideCount: number): string {
  const slideEntries = Array.from({ length: slideCount }, (_, index) =>
    `  <Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${slideEntries}
</Relationships>`;
}

function runNodeProcess(args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr
      });
    });
  });
}

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

function buildExpectedOutputFileMetadataSummary(outputPath: string, outputFileSizeBytes: number) {
  return {
    outputFileName: path.basename(outputPath),
    outputExtension: path.extname(outputPath).toLowerCase(),
    outputFileSizeBytes,
    outputFilePresent: true,
    summaryLine: "Output file metadata captured successfully."
  };
}

function buildExpectedInputFileLimitsSummary(inputPath: string, inputFileSizeBytes: number) {
  void inputPath;
  return {
    inputFilePresent: true,
    inputFileSizeBytes,
    sizeLimitBytes: 52428800,
    warningThresholdBytes: 41943040,
    limitsLabel: "withinLimit",
    summaryLine: "Input file size is within the configured basic limit."
  };
}

function buildExpectedOutputOverwriteSafetySummary(options: {
  outputExistedBeforeWrite: boolean | null;
  outputPresentAfterWrite: boolean;
}) {
  const overwriteSafetyLabel = options.outputPresentAfterWrite === false
    ? "missingOutput"
    : options.outputExistedBeforeWrite === true
    ? "overwroteExistingFile"
    : options.outputExistedBeforeWrite === false
    ? "newFile"
    : "unknown";

  return {
    overwriteSafetyLabel,
    outputExistedBeforeWrite: options.outputExistedBeforeWrite,
    outputPresentAfterWrite: options.outputPresentAfterWrite,
    summaryLine: overwriteSafetyLabel === "missingOutput"
      ? "Output overwrite status could not be determined because the output file is missing."
      : overwriteSafetyLabel === "overwroteExistingFile"
      ? "Output file path existed before write and was overwritten."
      : overwriteSafetyLabel === "newFile"
      ? "Output file path did not exist before write and a new file was produced."
      : "Output overwrite status could not be determined from the available machine-readable signals."
  };
}

function buildExpectedInputOutputPathRelationshipSummary(options: {
  inputPathAvailable: boolean;
  outputPathAvailable: boolean;
  samePath: boolean | null;
}) {
  const pathRelationshipLabel = options.inputPathAvailable === false || options.outputPathAvailable === false
    ? "unknown"
    : options.samePath
    ? "samePath"
    : "differentPath";

  return {
    pathRelationshipLabel,
    inputPathAvailable: options.inputPathAvailable,
    outputPathAvailable: options.outputPathAvailable,
    samePath: options.inputPathAvailable === false || options.outputPathAvailable === false
      ? null
      : options.samePath,
    summaryLine: pathRelationshipLabel === "samePath"
      ? "Input and output paths resolve to the same file path."
      : pathRelationshipLabel === "differentPath"
      ? "Input and output paths resolve to different file paths."
      : "Input and output path relationship could not be determined from the available machine-readable signals."
  };
}

function buildExpectedProcessingModeSummary(processingModeLabel: "all" | "fix" | "audit" | "unknown") {
  return {
    processingModeLabel,
    processingModeAvailable: processingModeLabel !== "unknown",
    summaryLine: processingModeLabel === "all"
      ? "Processing mode was captured as full pipeline mode."
      : processingModeLabel === "fix"
      ? "Processing mode was captured as fix mode."
      : processingModeLabel === "audit"
      ? "Processing mode was captured as audit mode."
      : "Processing mode could not be determined from the available machine-readable signals."
  };
}

function buildExpectedReportCoverageSummary() {
  return {
    expectedFieldCount: 18,
    presentFieldCount: 18,
    missingFieldCount: 0,
    coverageLabel: "complete",
    missingFields: [],
    summaryLine: "Report coverage is complete for the expected summary field set."
  };
}

function buildExpectedReportShapeParitySummary() {
  return {
    parityLabel: "parityOk",
    cliHasAllRequiredFields: true,
    apiHasAllRequiredFields: true,
    missingInCli: [],
    missingInApi: [],
    summaryLine: "CLI and API report shapes are aligned for all required summary fields."
  };
}

function buildExpectedPipelineFailureSummary() {
  return {
    pipelineOutcomeLabel: "success",
    pipelineOutcomeReason: "outputValidated",
    summaryLine: "Pipeline completed successfully and produced a validated output package."
  };
}

function buildExpectedEndToEndRunSummary(options: {
  runStatus: "success" | "warning" | "failure";
  outputStatus: "valid" | "invalid";
  reportStatus: "consistent" | "inconsistent";
  deckStatus: "ready" | "mostlyReady" | "needsReview";
}) {
  return {
    ...options,
    summaryLine: options.runStatus === "success"
      ? "Pipeline run completed successfully with a valid output and consistent report."
      : options.runStatus === "warning"
      ? "Pipeline run completed with warnings; review output and report details."
      : "Pipeline run failed to produce a valid output."
  };
}
