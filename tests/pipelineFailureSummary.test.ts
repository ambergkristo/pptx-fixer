import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizePipelineFailureSummary } from "../packages/fix/pipelineFailureSummary.ts";

test("returns success when output is present, package is valid, and report summaries are consistent", () => {
  assert.deepEqual(
    summarizePipelineFailureSummary(buildBaseInput()),
    {
      pipelineOutcomeLabel: "success",
      pipelineOutcomeReason: "outputValidated",
      summaryLine: "Pipeline completed successfully and produced a validated output package."
    }
  );
});

test("returns failure when output file metadata says the output is missing", () => {
  assert.deepEqual(
    summarizePipelineFailureSummary({
      ...buildBaseInput(),
      outputFileMetadataSummary: {
        ...buildBaseInput().outputFileMetadataSummary,
        outputFilePresent: false
      }
    }),
    {
      pipelineOutcomeLabel: "failure",
      pipelineOutcomeReason: "outputMissingOrInvalid",
      summaryLine: "Pipeline did not produce a valid output package."
    }
  );
});

test("returns failure when package validation is invalid", () => {
  assert.deepEqual(
    summarizePipelineFailureSummary({
      ...buildBaseInput(),
      outputPackageValidation: {
        ...buildBaseInput().outputPackageValidation,
        validationLabel: "invalid"
      }
    }),
    {
      pipelineOutcomeLabel: "failure",
      pipelineOutcomeReason: "outputMissingOrInvalid",
      summaryLine: "Pipeline did not produce a valid output package."
    }
  );
});

test("returns degradedSuccess when report consistency is not consistent", () => {
  assert.deepEqual(
    summarizePipelineFailureSummary({
      ...buildBaseInput(),
      reportConsistencySummary: {
        consistencyLabel: "minorMismatch",
        consistencyFlags: [],
        summaryLine: "Report outputs are mostly consistent, with one detected mismatch."
      }
    }),
    {
      pipelineOutcomeLabel: "degradedSuccess",
      pipelineOutcomeReason: "outputProducedWithReportConcerns",
      summaryLine: "Pipeline completed and produced an output file, but report consistency concerns were detected."
    }
  );
});

test("returns degradedSuccess when report shape parity is not ok", () => {
  assert.deepEqual(
    summarizePipelineFailureSummary({
      ...buildBaseInput(),
      reportShapeParitySummary: {
        parityLabel: "parityMismatch",
        cliHasAllRequiredFields: false,
        apiHasAllRequiredFields: true,
        missingInCli: ["deckQaSummary"],
        missingInApi: [],
        summaryLine: "CLI and API report shapes are not aligned for all required summary fields."
      }
    }),
    {
      pipelineOutcomeLabel: "degradedSuccess",
      pipelineOutcomeReason: "outputProducedWithReportConcerns",
      summaryLine: "Pipeline completed and produced an output file, but report consistency concerns were detected."
    }
  );
});

test("is deterministic across repeated calls", () => {
  const input = {
    ...buildBaseInput(),
    reportConsistencySummary: {
      consistencyLabel: "minorMismatch",
      consistencyFlags: [],
      summaryLine: "Report outputs are mostly consistent, with one detected mismatch."
    }
  };

  assert.deepEqual(
    summarizePipelineFailureSummary(input),
    summarizePipelineFailureSummary(input)
  );
});

function buildBaseInput() {
  return {
    outputPackageValidation: {
      validationLabel: "valid" as const,
      checks: {
        fileExists: true,
        nonEmptyFile: true,
        readableZip: true,
        hasContentTypes: true,
        hasRootRels: true,
        hasPresentationPart: true
      },
      summaryLine: "Output PPTX package validation passed."
    },
    outputFileMetadataSummary: {
      outputFileName: "deck-fixed.pptx",
      outputExtension: ".pptx",
      outputFileSizeBytes: 1024,
      outputFilePresent: true,
      summaryLine: "Output file metadata captured successfully."
    },
    reportConsistencySummary: {
      consistencyLabel: "consistent" as const,
      consistencyFlags: [],
      summaryLine: "Report outputs are internally consistent."
    },
    reportShapeParitySummary: {
      parityLabel: "parityOk" as const,
      cliHasAllRequiredFields: true,
      apiHasAllRequiredFields: true,
      missingInCli: [],
      missingInApi: [],
      summaryLine: "CLI and API report shapes are aligned for all required summary fields."
    }
  };
}

