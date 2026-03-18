import type { OutputPackageValidationSummary } from "../export/outputPackageValidation.ts";
import type { DeckReadinessSummary } from "./deckReadinessSummary.ts";
import type { PipelineFailureSummary } from "./pipelineFailureSummary.ts";
import type { ReportConsistencySummary } from "./reportConsistencySummary.ts";
import type { ReportShapeParitySummary } from "./reportShapeParitySummary.ts";

export interface EndToEndRunSummary {
  runStatus: "success" | "warning" | "failure";
  outputStatus: "valid" | "invalid";
  reportStatus: "consistent" | "inconsistent";
  deckStatus: "ready" | "mostlyReady" | "needsReview";
  summaryLine:
    | "Pipeline run completed successfully with a valid output and consistent report."
    | "Pipeline run completed with warnings; review output and report details."
    | "Pipeline run failed to produce a valid output.";
}

const RUN_STATUS_BY_PIPELINE_OUTCOME = {
  success: "success",
  degradedSuccess: "warning",
  failure: "failure"
} as const;

const OUTPUT_STATUS_BY_VALIDATION = {
  valid: "valid",
  invalid: "invalid"
} as const;

const DECK_STATUS_BY_READINESS = {
  ready: "ready",
  mostlyReady: "mostlyReady",
  manualReviewRecommended: "needsReview"
} as const;

const SUMMARY_LINE_BY_RUN_STATUS = {
  success: "Pipeline run completed successfully with a valid output and consistent report.",
  warning: "Pipeline run completed with warnings; review output and report details.",
  failure: "Pipeline run failed to produce a valid output."
} as const;

export function summarizeEndToEndRunSummary(options: {
  pipelineFailureSummary: PipelineFailureSummary;
  outputPackageValidation: OutputPackageValidationSummary;
  reportConsistencySummary: ReportConsistencySummary;
  reportShapeParitySummary: ReportShapeParitySummary;
  deckReadinessSummary: DeckReadinessSummary;
}): EndToEndRunSummary {
  const runStatus = RUN_STATUS_BY_PIPELINE_OUTCOME[
    options.pipelineFailureSummary.pipelineOutcomeLabel
  ];
  const outputStatus = OUTPUT_STATUS_BY_VALIDATION[
    options.outputPackageValidation.validationLabel
  ];
  const reportStatus = options.reportConsistencySummary.consistencyLabel === "consistent"
    && options.reportShapeParitySummary.parityLabel === "parityOk"
    ? "consistent"
    : "inconsistent";
  const deckStatus = DECK_STATUS_BY_READINESS[
    options.deckReadinessSummary.readinessLabel
  ];

  return {
    runStatus,
    outputStatus,
    reportStatus,
    deckStatus,
    summaryLine: SUMMARY_LINE_BY_RUN_STATUS[runStatus]
  };
}
