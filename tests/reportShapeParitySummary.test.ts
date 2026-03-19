import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeReportShapeParity } from "../packages/fix/reportShapeParitySummary.ts";

test("returns parityOk when both CLI and API full report shapes contain all required fields", () => {
  const fullReportPayload = buildFullReportPayload();

  assert.deepEqual(
    summarizeReportShapeParity({
      cliVisibleReportPayload: fullReportPayload,
      apiVisibleReportPayload: fullReportPayload
    }),
    {
      parityLabel: "parityOk",
      cliHasAllRequiredFields: true,
      apiHasAllRequiredFields: true,
      missingInCli: [],
      missingInApi: [],
      summaryLine: "CLI and API report shapes are aligned for all required summary fields."
    }
  );
});

test("returns parityMismatch when CLI payload is missing one required field", () => {
  const cliPayload = buildFullReportPayload();
  delete cliPayload.deckQaSummary;

  assert.deepEqual(
    summarizeReportShapeParity({
      cliVisibleReportPayload: cliPayload,
      apiVisibleReportPayload: buildFullReportPayload()
    }),
    {
      parityLabel: "parityMismatch",
      cliHasAllRequiredFields: false,
      apiHasAllRequiredFields: true,
      missingInCli: ["deckQaSummary"],
      missingInApi: [],
      summaryLine: "CLI and API report shapes are not aligned for all required summary fields."
    }
  );
});

test("returns parityMismatch when API payload is missing one required field", () => {
  const apiPayload = buildFullReportPayload();
  delete apiPayload.outputFileMetadataSummary;

  assert.deepEqual(
    summarizeReportShapeParity({
      cliVisibleReportPayload: buildFullReportPayload(),
      apiVisibleReportPayload: apiPayload
    }),
    {
      parityLabel: "parityMismatch",
      cliHasAllRequiredFields: true,
      apiHasAllRequiredFields: false,
      missingInCli: [],
      missingInApi: ["outputFileMetadataSummary"],
      summaryLine: "CLI and API report shapes are not aligned for all required summary fields."
    }
  );
});

test("preserves required field order when multiple fields are missing", () => {
  const cliPayload = buildFullReportPayload();
  delete cliPayload.deckQaSummary;
  delete cliPayload.recommendedActionSummary;
  delete cliPayload.outputPackageValidation;

  assert.deepEqual(
    summarizeReportShapeParity({
      cliVisibleReportPayload: cliPayload,
      apiVisibleReportPayload: buildFullReportPayload()
    }).missingInCli,
    [
      "deckQaSummary",
      "recommendedActionSummary",
      "outputPackageValidation"
    ]
  );
});

test("detects missing slideQaSummary through changesBySlide entries", () => {
  const apiPayload = buildFullReportPayload();
  delete apiPayload.changesBySlide[0].slideQaSummary;

  assert.deepEqual(
    summarizeReportShapeParity({
      cliVisibleReportPayload: buildFullReportPayload(),
      apiVisibleReportPayload: apiPayload
    }),
    {
      parityLabel: "parityMismatch",
      cliHasAllRequiredFields: true,
      apiHasAllRequiredFields: false,
      missingInCli: [],
      missingInApi: ["slideQaSummary"],
      summaryLine: "CLI and API report shapes are not aligned for all required summary fields."
    }
  );
});

test("is deterministic across repeated calls", () => {
  const cliPayload = buildFullReportPayload();
  delete cliPayload.deckReadinessSummary;
  delete cliPayload.outputFileMetadataSummary;

  assert.deepEqual(
    summarizeReportShapeParity({
      cliVisibleReportPayload: cliPayload,
      apiVisibleReportPayload: buildFullReportPayload()
    }),
    summarizeReportShapeParity({
      cliVisibleReportPayload: cliPayload,
      apiVisibleReportPayload: buildFullReportPayload()
    })
  );
});

function buildFullReportPayload() {
  return {
    deckQaSummary: {},
    topProblemSlides: [],
    cleanupOutcomeSummary: {},
    recommendedActionSummary: {},
    issueCategorySummary: [],
    categoryReductionReportingSummary: {},
    complianceOrientedReportSummary: {},
    brandScoreImprovementSummary: {},
    remainingIssuesSummary: {},
    deckReadinessSummary: {},
    reportConsistencySummary: {},
    outputPackageValidation: {},
    outputFileMetadataSummary: {},
    changesBySlide: [
      {
        slideQaSummary: {}
      }
    ]
  };
}
