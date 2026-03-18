import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeReportCoverage } from "../packages/fix/reportCoverageSummary.ts";

test("returns complete when all expected summary fields are present", () => {
  assert.deepEqual(
    summarizeReportCoverage(buildFullReportPayload()),
    {
      expectedFieldCount: 18,
      presentFieldCount: 18,
      missingFieldCount: 0,
      coverageLabel: "complete",
      missingFields: [],
      summaryLine: "Report coverage is complete for the expected summary field set."
    }
  );
});

test("returns partial when one expected field is missing", () => {
  const payload = buildFullReportPayload();
  delete payload.processingModeSummary;

  assert.deepEqual(
    summarizeReportCoverage(payload),
    {
      expectedFieldCount: 18,
      presentFieldCount: 17,
      missingFieldCount: 1,
      coverageLabel: "partial",
      missingFields: ["processingModeSummary"],
      summaryLine: "Report coverage is partial for the expected summary field set."
    }
  );
});

test("returns partial with deterministic missing field order when multiple fields are missing", () => {
  const payload = buildFullReportPayload();
  delete payload.recommendedActionSummary;
  delete payload.pipelineFailureSummary;
  delete payload.outputOverwriteSafetySummary;

  assert.deepEqual(
    summarizeReportCoverage(payload),
    {
      expectedFieldCount: 18,
      presentFieldCount: 15,
      missingFieldCount: 3,
      coverageLabel: "partial",
      missingFields: [
        "recommendedActionSummary",
        "pipelineFailureSummary",
        "outputOverwriteSafetySummary"
      ],
      summaryLine: "Report coverage is partial for the expected summary field set."
    }
  );
});

test("is deterministic across repeated calls", () => {
  const payload = buildFullReportPayload();
  delete payload.endToEndRunSummary;
  delete payload.inputOutputPathRelationshipSummary;

  assert.deepEqual(
    summarizeReportCoverage(payload),
    summarizeReportCoverage(payload)
  );
});

function buildFullReportPayload() {
  return {
    deckQaSummary: {},
    topProblemSlides: [],
    cleanupOutcomeSummary: {},
    recommendedActionSummary: {},
    issueCategorySummary: [],
    brandScoreImprovementSummary: {},
    remainingIssuesSummary: {},
    deckReadinessSummary: {},
    reportConsistencySummary: {},
    outputPackageValidation: {},
    outputFileMetadataSummary: {},
    pipelineFailureSummary: {},
    endToEndRunSummary: {},
    inputFileLimitsSummary: {},
    outputOverwriteSafetySummary: {},
    inputOutputPathRelationshipSummary: {},
    processingModeSummary: {},
    changesBySlide: [
      {
        slideQaSummary: {}
      }
    ]
  };
}
