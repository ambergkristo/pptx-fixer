import { test } from "node:test";
import assert from "node:assert/strict";

import { buildUploadResultViewModel } from "../apps/product-shell-ui/src/lib/uploadResultViewModel.ts";

test("builds the success-case upload result view model", () => {
  assert.deepEqual(
    buildUploadResultViewModel(buildReportInput({
      runStatus: "success",
      validationLabel: "valid",
      readinessLabel: "ready",
      improvementLabel: "major",
      primaryAction: "none",
      outputFilePresent: true,
      limitsLabel: "withinLimit"
    })),
    {
      overallStatus: "success",
      headline: "Cleanup completed successfully.",
      sections: [
        {
          sectionKey: "output",
          sectionStatus: "good",
          title: "Output",
          description: "Output PPTX package validation passed."
        },
        {
          sectionKey: "deck",
          sectionStatus: "good",
          title: "Deck readiness",
          description: "This deck appears ready after cleanup with no remaining formatting issues detected."
        },
        {
          sectionKey: "cleanup",
          sectionStatus: "good",
          title: "Cleanup result",
          description: "Cleanup produced a strong brand consistency improvement."
        },
        {
          sectionKey: "action",
          sectionStatus: "good",
          title: "Recommended action",
          description: "No significant formatting issues remain."
        },
        {
          sectionKey: "file",
          sectionStatus: "good",
          title: "Output file",
          description: "Output file metadata captured successfully."
        }
      ]
    }
  );
});

test("builds the warning-case upload result view model", () => {
  assert.deepEqual(
    buildUploadResultViewModel(buildReportInput({
      runStatus: "warning",
      validationLabel: "valid",
      readinessLabel: "mostlyReady",
      improvementLabel: "minor",
      primaryAction: "review",
      outputFilePresent: true,
      limitsLabel: "overLimit"
    })),
    {
      overallStatus: "warning",
      headline: "Cleanup completed with warnings.",
      sections: [
        {
          sectionKey: "output",
          sectionStatus: "good",
          title: "Output",
          description: "Output PPTX package validation passed."
        },
        {
          sectionKey: "deck",
          sectionStatus: "warning",
          title: "Deck readiness",
          description: "This deck appears mostly ready after cleanup, with only minor remaining formatting issues."
        },
        {
          sectionKey: "cleanup",
          sectionStatus: "warning",
          title: "Cleanup result",
          description: "Cleanup produced a small brand consistency improvement."
        },
        {
          sectionKey: "action",
          sectionStatus: "warning",
          title: "Recommended action",
          description: "Automatic cleanup resolved most detected drift."
        },
        {
          sectionKey: "file",
          sectionStatus: "warning",
          title: "Output file",
          description: "Output file metadata captured successfully."
        }
      ]
    }
  );
});

test("builds the failure-case upload result view model", () => {
  assert.deepEqual(
    buildUploadResultViewModel(buildReportInput({
      runStatus: "failure",
      validationLabel: "invalid",
      readinessLabel: "manualReviewRecommended",
      improvementLabel: "none",
      primaryAction: "manual_attention",
      outputFilePresent: false,
      limitsLabel: "withinLimit"
    })),
    {
      overallStatus: "failure",
      headline: "Cleanup failed.",
      sections: [
        {
          sectionKey: "output",
          sectionStatus: "bad",
          title: "Output",
          description: "Output PPTX package validation failed."
        },
        {
          sectionKey: "deck",
          sectionStatus: "bad",
          title: "Deck readiness",
          description: "This deck still requires manual review after cleanup."
        },
        {
          sectionKey: "cleanup",
          sectionStatus: "warning",
          title: "Cleanup result",
          description: "Cleanup did not improve the overall brand score."
        },
        {
          sectionKey: "action",
          sectionStatus: "warning",
          title: "Recommended action",
          description: "Significant formatting inconsistency remains after cleanup."
        },
        {
          sectionKey: "file",
          sectionStatus: "bad",
          title: "Output file",
          description: "Output file metadata could not be captured because the output file is missing."
        }
      ]
    }
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
