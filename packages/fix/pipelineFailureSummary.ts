import type { OutputFileMetadataSummary } from "../export/outputFileMetadataSummary.ts";
import type { OutputPackageValidationSummary } from "../export/outputPackageValidation.ts";
import type { ReportConsistencySummary } from "./reportConsistencySummary.ts";
import type { ReportShapeParitySummary } from "./reportShapeParitySummary.ts";

export interface PipelineFailureSummary {
  pipelineOutcomeLabel: "success" | "degradedSuccess" | "failure";
  pipelineOutcomeReason:
    | "outputValidated"
    | "outputProducedWithValidationConcerns"
    | "outputProducedWithReportConcerns"
    | "outputMissingOrInvalid"
    | "pipelineExecutionFailed";
  summaryLine: string;
}

export function summarizePipelineFailureSummary(options: {
  outputPackageValidation: OutputPackageValidationSummary;
  outputFileMetadataSummary: OutputFileMetadataSummary;
  reportConsistencySummary: ReportConsistencySummary;
  reportShapeParitySummary: ReportShapeParitySummary;
}): PipelineFailureSummary {
  const allPackageChecksPassed = Object.values(options.outputPackageValidation.checks)
    .every((check) => check);

  if (
    options.outputFileMetadataSummary.outputFilePresent === false
    || options.outputPackageValidation.validationLabel === "invalid"
  ) {
    return {
      pipelineOutcomeLabel: "failure",
      pipelineOutcomeReason: "outputMissingOrInvalid",
      summaryLine: "Pipeline did not produce a valid output package."
    };
  }

  if (
    options.reportConsistencySummary.consistencyLabel !== "consistent"
    || options.reportShapeParitySummary.parityLabel !== "parityOk"
  ) {
    return {
      pipelineOutcomeLabel: "degradedSuccess",
      pipelineOutcomeReason: "outputProducedWithReportConcerns",
      summaryLine: "Pipeline completed and produced an output file, but report consistency concerns were detected."
    };
  }

  if (
    options.outputPackageValidation.validationLabel === "valid"
    && allPackageChecksPassed === false
  ) {
    return {
      pipelineOutcomeLabel: "degradedSuccess",
      pipelineOutcomeReason: "outputProducedWithValidationConcerns",
      summaryLine: "Pipeline completed and produced an output file, but validation concerns were detected."
    };
  }

  return {
    pipelineOutcomeLabel: "success",
    pipelineOutcomeReason: "outputValidated",
    summaryLine: "Pipeline completed successfully and produced a validated output package."
  };
}

