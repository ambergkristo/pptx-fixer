import { test } from "node:test";
import assert from "node:assert/strict";

import { buildUploadResultViewModel } from "../apps/product-shell-ui/src/lib/uploadResultViewModel.ts";

test("builds a ready upload result surface from real report fields", () => {
  const viewModel = buildUploadResultViewModel(buildReportInput({
    runStatus: "success",
    validationLabel: "valid",
    readinessLabel: "ready",
    improvementLabel: "major",
    primaryAction: "none",
    outputFilePresent: true,
    limitsLabel: "withinLimit"
  }));

  assert.equal(viewModel.overallStatus, "success");
  assert.equal(viewModel.headline, "Repair completed successfully.");
  assert.deepEqual(viewModel.readinessSignal, {
    signalStatus: "good",
    label: "Ready",
    description: "This deck appears ready after cleanup with no remaining formatting issues detected.",
    reasonLine: "This label is shown because no unresolved categories remain after cleanup.",
    blockerLine: "No unresolved categories are blocking a better readiness state.",
    blockerCategories: [],
    useNowLine: "Good enough to use now based on this run. No unresolved categories remain in the current report.",
    scopeNote: "Category reduction is deck-specific on the current eligible-cleanup boundary. It does not imply broad category closure."
  });
  assert.deepEqual(
    viewModel.categorySummary?.rows.map((row) => [row.label, row.beforeCount, row.afterCount, row.reductionCount, row.outcomeLabel]),
    [
      ["Font family", 2, 0, 2, "Resolved"],
      ["Font size", 0, 0, 0, "Clean"],
      ["Paragraph spacing", 1, 0, 1, "Resolved"],
      ["Bullet indentation", 0, 0, 0, "Clean"],
      ["Alignment", 0, 0, 0, "Clean"],
      ["Line spacing", 0, 0, 0, "Clean"]
    ]
  );
  assert.deepEqual(viewModel.remainingIssues, {
    sectionStatus: "good",
    title: "What improved",
    description: "Improved categories reflect real reduction on this deck. No unresolved categories remain in the current report.",
    improvedCategories: ["Font family", "Paragraph spacing"],
    unresolvedCategories: [],
    actionLine: "Current run recommendation: No significant formatting issues remain."
  });
});

test("builds a mostly-ready upload result surface with unresolved categories", () => {
  const viewModel = buildUploadResultViewModel(buildReportInput({
    runStatus: "warning",
    validationLabel: "valid",
    readinessLabel: "mostlyReady",
    improvementLabel: "minor",
    primaryAction: "review",
    outputFilePresent: true,
    limitsLabel: "overLimit"
  }));

  assert.equal(viewModel.overallStatus, "warning");
  assert.equal(viewModel.readinessSignal?.label, "Mostly ready");
  assert.equal(viewModel.readinessSignal?.signalStatus, "warning");
  assert.equal(
    viewModel.readinessSignal?.reasonLine,
    "This label is shown because only low-severity unresolved categories remain after cleanup: Paragraph spacing."
  );
  assert.equal(
    viewModel.readinessSignal?.blockerLine,
    "1 unresolved category is still blocking a better readiness state."
  );
  assert.deepEqual(viewModel.readinessSignal?.blockerCategories, ["Paragraph spacing"]);
  assert.equal(
    viewModel.readinessSignal?.useNowLine,
    "Usable now only if minor residual drift is acceptable, but review the unresolved categories before sharing."
  );
  assert.deepEqual(
    viewModel.remainingIssues?.improvedCategories,
    ["Font family", "Paragraph spacing"]
  );
  assert.deepEqual(
    viewModel.remainingIssues?.unresolvedCategories,
    ["Paragraph spacing"]
  );
  assert.equal(
    viewModel.categorySummary?.rows.find((row) => row.categoryKey === "paragraph_spacing")?.outcomeLabel,
    "Reduced"
  );
  assert.equal(
    viewModel.sections.find((section) => section.sectionKey === "file")?.sectionStatus,
    "warning"
  );
});

test("builds a manual-review upload result surface when unresolved issues remain high-risk", () => {
  const viewModel = buildUploadResultViewModel(buildReportInput({
    runStatus: "failure",
    validationLabel: "invalid",
    readinessLabel: "manualReviewRecommended",
    improvementLabel: "none",
    primaryAction: "manual_attention",
    outputFilePresent: false,
    limitsLabel: "withinLimit"
  }));

  assert.equal(viewModel.overallStatus, "failure");
  assert.deepEqual(viewModel.readinessSignal, {
    signalStatus: "bad",
    label: "Manual review needed",
    description: "This deck still requires manual review after cleanup.",
    reasonLine: "This label is shown because the current run still requires manual attention and unresolved categories remain: Font family, Paragraph spacing, Line spacing.",
    blockerLine: "3 unresolved categories are still blocking a better readiness state.",
    blockerCategories: ["Font family", "Paragraph spacing", "Line spacing"],
    useNowLine: "Still needs review. Do not treat the current output as finished until the unresolved categories are reviewed.",
    scopeNote: "Category reduction is deck-specific on the current manual-review boundary. It does not imply broad category closure."
  });
  assert.deepEqual(viewModel.remainingIssues, {
    sectionStatus: "bad",
    title: "What improved and what still needs review",
    description: "Improved categories reflect real reduction on this deck. Unresolved categories are still blocking a better readiness state.",
    improvedCategories: ["Paragraph spacing"],
    unresolvedCategories: ["Font family", "Paragraph spacing", "Line spacing"],
    actionLine: "Current run recommendation: Significant formatting inconsistency remains after cleanup."
  });
  assert.equal(
    viewModel.categorySummary?.rows.find((row) => row.categoryKey === "font_consistency")?.outcomeLabel,
    "Unchanged"
  );
});

test("keeps deterministic section ordering", () => {
  const viewModel = buildUploadResultViewModel(buildReportInput({
    runStatus: "success",
    validationLabel: "valid",
    readinessLabel: "ready",
    improvementLabel: "moderate",
    primaryAction: "refine",
    outputFilePresent: true,
    limitsLabel: "nearLimit"
  }));

  assert.deepEqual(
    viewModel.sections.map((section) => section.sectionKey),
    ["output", "deck", "cleanup", "action", "file"]
  );
});

test("uses actionReason exactly even when a competing summaryLine is present", () => {
  const report = buildReportInput({
    runStatus: "warning",
    validationLabel: "valid",
    readinessLabel: "mostlyReady",
    improvementLabel: "minor",
    primaryAction: "review",
    outputFilePresent: true,
    limitsLabel: "withinLimit",
    actionSummaryLine: "This competing summary line must be ignored."
  });

  assert.equal(
    buildUploadResultViewModel(report).sections[3]?.description,
    "Automatic cleanup resolved most detected drift."
  );
});

test("returns identical results on repeated calls", () => {
  const report = buildReportInput({
    runStatus: "warning",
    validationLabel: "valid",
    readinessLabel: "mostlyReady",
    improvementLabel: "minor",
    primaryAction: "review",
    outputFilePresent: true,
    limitsLabel: "withinLimit"
  });

  assert.deepEqual(
    buildUploadResultViewModel(report),
    buildUploadResultViewModel(report)
  );
});

function buildReportInput(options: {
  runStatus: "success" | "warning" | "failure";
  validationLabel: "valid" | "invalid";
  readinessLabel: "ready" | "mostlyReady" | "manualReviewRecommended";
  improvementLabel: "none" | "minor" | "moderate" | "major";
  primaryAction: "none" | "review" | "refine" | "manual_attention";
  outputFilePresent: boolean;
  limitsLabel: "withinLimit" | "nearLimit" | "overLimit" | "missingInput";
  actionSummaryLine?: string;
}) {
  const issueCategorySummary = options.readinessLabel === "ready"
    ? [
        { category: "font_consistency", detectedBefore: 2, fixed: 2, remaining: 0, status: "improved" as const },
        { category: "font_size_consistency", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "paragraph_spacing", detectedBefore: 1, fixed: 1, remaining: 0, status: "improved" as const },
        { category: "bullet_indentation", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "alignment", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "line_spacing", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const }
      ]
    : options.readinessLabel === "mostlyReady"
    ? [
        { category: "font_consistency", detectedBefore: 1, fixed: 1, remaining: 0, status: "improved" as const },
        { category: "font_size_consistency", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "paragraph_spacing", detectedBefore: 3, fixed: 2, remaining: 1, status: "improved" as const },
        { category: "bullet_indentation", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "alignment", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "line_spacing", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const }
      ]
    : [
        { category: "font_consistency", detectedBefore: 1, fixed: 0, remaining: 1, status: "unchanged" as const },
        { category: "font_size_consistency", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "paragraph_spacing", detectedBefore: 2, fixed: 1, remaining: 1, status: "improved" as const },
        { category: "bullet_indentation", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "alignment", detectedBefore: 0, fixed: 0, remaining: 0, status: "clean" as const },
        { category: "line_spacing", detectedBefore: 2, fixed: 0, remaining: 2, status: "unchanged" as const }
      ];

  const remainingIssuesSummary = options.readinessLabel === "ready"
    ? {
        remainingIssueCount: 0,
        remainingSeverityLabel: "none" as const,
        topRemainingIssueCategories: [],
        summaryLine: "No remaining formatting issues were detected after cleanup."
      }
    : options.readinessLabel === "mostlyReady"
    ? {
        remainingIssueCount: 1,
        remainingSeverityLabel: "low" as const,
        topRemainingIssueCategories: ["paragraph_spacing"],
        summaryLine: "Only minor formatting issues remain after cleanup."
      }
    : {
        remainingIssueCount: 4,
        remainingSeverityLabel: "high" as const,
        topRemainingIssueCategories: ["font_consistency", "paragraph_spacing", "line_spacing"],
        summaryLine: "Several formatting issues still remain after cleanup."
      };

  return {
    endToEndRunSummary: {
      runStatus: options.runStatus,
      outputStatus: options.validationLabel === "valid" ? "valid" : "invalid",
      reportStatus: options.runStatus === "warning" ? "inconsistent" : "consistent",
      deckStatus: options.readinessLabel === "ready"
        ? "ready"
        : options.readinessLabel === "mostlyReady"
        ? "mostlyReady"
        : "needsReview",
      summaryLine: options.runStatus === "success"
        ? "Pipeline run completed successfully with a valid output and consistent report."
        : options.runStatus === "warning"
        ? "Pipeline run completed with warnings; review output and report details."
        : "Pipeline run failed to produce a valid output."
    },
    outputPackageValidation: {
      validationLabel: options.validationLabel,
      checks: {
        fileExists: options.validationLabel === "valid",
        nonEmptyFile: options.validationLabel === "valid",
        readableZip: options.validationLabel === "valid",
        hasContentTypes: options.validationLabel === "valid",
        hasRootRels: options.validationLabel === "valid",
        hasPresentationPart: options.validationLabel === "valid"
      },
      summaryLine: options.validationLabel === "valid"
        ? "Output PPTX package validation passed."
        : "Output PPTX package validation failed."
    },
    deckReadinessSummary: {
      readinessLabel: options.readinessLabel,
      readinessReason: options.readinessLabel === "ready"
        ? "noRemainingIssues"
        : options.readinessLabel === "mostlyReady"
        ? "minorRemainingIssues"
        : "manualActionStillNeeded",
      summaryLine: options.readinessLabel === "ready"
        ? "This deck appears ready after cleanup with no remaining formatting issues detected."
        : options.readinessLabel === "mostlyReady"
        ? "This deck appears mostly ready after cleanup, with only minor remaining formatting issues."
        : "This deck still requires manual review after cleanup."
    },
    issueCategorySummary,
    remainingIssuesSummary,
    brandScoreImprovementSummary: {
      brandScoreBefore: 95,
      brandScoreAfter: options.improvementLabel === "none"
        ? 95
        : options.improvementLabel === "minor"
        ? 96
        : options.improvementLabel === "moderate"
        ? 99
        : 100,
      scoreDelta: options.improvementLabel === "none"
        ? 0
        : options.improvementLabel === "minor"
        ? 1
        : options.improvementLabel === "moderate"
        ? 4
        : 5,
      improvementLabel: options.improvementLabel,
      summaryLine: options.improvementLabel === "none"
        ? "Cleanup did not improve the overall brand score."
        : options.improvementLabel === "minor"
        ? "Cleanup produced a small brand consistency improvement."
        : options.improvementLabel === "moderate"
        ? "Cleanup produced a meaningful brand consistency improvement."
        : "Cleanup produced a strong brand consistency improvement."
    },
    recommendedActionSummary: {
      primaryAction: options.primaryAction,
      actionReason: options.primaryAction === "none"
        ? "No significant formatting issues remain."
        : options.primaryAction === "review"
        ? "Automatic cleanup resolved most detected drift."
        : options.primaryAction === "refine"
        ? "Some formatting drift remains and should be reviewed."
        : "Significant formatting inconsistency remains after cleanup.",
      ...(options.actionSummaryLine === undefined
        ? {}
        : { summaryLine: options.actionSummaryLine }),
      focusAreas: []
    },
    outputFileMetadataSummary: {
      outputFileName: "sales-fixed.pptx",
      outputExtension: ".pptx",
      outputFileSizeBytes: options.outputFilePresent ? 1234 : 0,
      outputFilePresent: options.outputFilePresent,
      summaryLine: options.outputFilePresent
        ? "Output file metadata captured successfully."
        : "Output file metadata could not be captured because the output file is missing."
    },
    inputFileLimitsSummary: {
      inputFilePresent: options.limitsLabel !== "missingInput",
      inputFileSizeBytes: 1234,
      sizeLimitBytes: 52428800,
      warningThresholdBytes: 41943040,
      limitsLabel: options.limitsLabel,
      summaryLine: options.limitsLabel === "missingInput"
        ? "Input file limits could not be assessed because the input file is missing."
        : options.limitsLabel === "withinLimit"
        ? "Input file size is within the configured basic limit."
        : options.limitsLabel === "nearLimit"
        ? "Input file size is near the configured basic limit."
        : "Input file size exceeds the configured basic limit."
    }
  };
}
