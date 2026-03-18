import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeEndToEndRunSummary } from "../packages/fix/endToEndRunSummary.ts";

test("returns success, valid, consistent, and ready for a successful pipeline run", () => {
  assert.deepEqual(
    summarizeEndToEndRunSummary(buildBaseInput()),
    {
      runStatus: "success",
      outputStatus: "valid",
      reportStatus: "consistent",
      deckStatus: "ready",
      summaryLine: "Pipeline run completed successfully with a valid output and consistent report."
    }
  );
});

test("returns warning, valid, inconsistent, and mostlyReady for a degraded run", () => {
  assert.deepEqual(
    summarizeEndToEndRunSummary({
      ...buildBaseInput(),
      pipelineFailureSummary: {
        pipelineOutcomeLabel: "degradedSuccess",
        pipelineOutcomeReason: "outputProducedWithReportConcerns",
        summaryLine: "Pipeline completed and produced an output file, but report consistency concerns were detected."
      },
      reportConsistencySummary: {
        consistencyLabel: "minorMismatch",
        consistencyFlags: [],
        summaryLine: "Report outputs are mostly consistent, with one detected mismatch."
      },
      deckReadinessSummary: {
        readinessLabel: "mostlyReady",
        readinessReason: "minorRemainingIssues",
        summaryLine: "This deck appears mostly ready after cleanup, with only minor remaining formatting issues."
      }
    }),
    {
      runStatus: "warning",
      outputStatus: "valid",
      reportStatus: "inconsistent",
      deckStatus: "mostlyReady",
      summaryLine: "Pipeline run completed with warnings; review output and report details."
    }
  );
});

test("returns failure, invalid, inconsistent, and needsReview for a failed run", () => {
  assert.deepEqual(
    summarizeEndToEndRunSummary({
      ...buildBaseInput(),
      pipelineFailureSummary: {
        pipelineOutcomeLabel: "failure",
        pipelineOutcomeReason: "outputMissingOrInvalid",
        summaryLine: "Pipeline did not produce a valid output package."
      },
      outputPackageValidation: {
        validationLabel: "invalid",
        checks: {
          fileExists: false,
          nonEmptyFile: false,
          readableZip: false,
          hasContentTypes: false,
          hasRootRels: false,
          hasPresentationPart: false
        },
        summaryLine: "Output PPTX package validation failed."
      },
      reportConsistencySummary: {
        consistencyLabel: "inconsistent",
        consistencyFlags: [
          "readinessWithRemainingHighIssues"
        ],
        summaryLine: "Report outputs contain conflicting signals."
      },
      reportShapeParitySummary: {
        parityLabel: "parityMismatch",
        cliHasAllRequiredFields: false,
        apiHasAllRequiredFields: false,
        missingInCli: ["deckQaSummary"],
        missingInApi: ["deckQaSummary"],
        summaryLine: "CLI and API report shapes are not aligned for all required summary fields."
      },
      deckReadinessSummary: {
        readinessLabel: "manualReviewRecommended",
        readinessReason: "manualActionStillNeeded",
        summaryLine: "Manual review is recommended before using this deck."
      }
    }),
    {
      runStatus: "failure",
      outputStatus: "invalid",
      reportStatus: "inconsistent",
      deckStatus: "needsReview",
      summaryLine: "Pipeline run failed to produce a valid output."
    }
  );
});

test("is deterministic across repeated calls", () => {
  const input = {
    ...buildBaseInput(),
    pipelineFailureSummary: {
      pipelineOutcomeLabel: "degradedSuccess" as const,
      pipelineOutcomeReason: "outputProducedWithReportConcerns" as const,
      summaryLine: "Pipeline completed and produced an output file, but report consistency concerns were detected."
    },
    reportConsistencySummary: {
      consistencyLabel: "minorMismatch" as const,
      consistencyFlags: [],
      summaryLine: "Report outputs are mostly consistent, with one detected mismatch."
    },
    deckReadinessSummary: {
      readinessLabel: "mostlyReady" as const,
      readinessReason: "minorRemainingIssues" as const,
      summaryLine: "This deck appears mostly ready after cleanup, with only minor remaining formatting issues."
    }
  };

  assert.deepEqual(
    summarizeEndToEndRunSummary(input),
    summarizeEndToEndRunSummary(input)
  );
});

function buildBaseInput() {
  return {
    pipelineFailureSummary: {
      pipelineOutcomeLabel: "success" as const,
      pipelineOutcomeReason: "outputValidated" as const,
      summaryLine: "Pipeline completed successfully and produced a validated output package."
    },
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
    },
    deckReadinessSummary: {
      readinessLabel: "ready" as const,
      readinessReason: "noRemainingIssues" as const,
      summaryLine: "This deck appears ready after cleanup with no remaining formatting issues detected."
    }
  };
}
