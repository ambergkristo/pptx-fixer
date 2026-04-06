import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeProcessingModeSummary } from "../packages/fix/processingModeSummary.ts";

test("returns unknown when no machine-readable mode is available", () => {
  assert.deepEqual(
    summarizeProcessingModeSummary({ mode: null }),
    {
      processingModeLabel: "unknown",
      processingModeAvailable: false,
      summaryLine: "Processing mode could not be determined from the available machine-readable signals."
    }
  );
});

test("maps full pipeline mode to all", () => {
  assert.deepEqual(
    summarizeProcessingModeSummary({ mode: "standard" }),
    {
      processingModeLabel: "all",
      processingModeAvailable: true,
      summaryLine: "Processing mode was captured as full pipeline mode."
    }
  );
});

test("maps fix mode to fix", () => {
  assert.deepEqual(
    summarizeProcessingModeSummary({ mode: "minimal" }),
    {
      processingModeLabel: "fix",
      processingModeAvailable: true,
      summaryLine: "Processing mode was captured as fix mode."
    }
  );
});

test("maps normalize mode to normalize", () => {
  assert.deepEqual(
    summarizeProcessingModeSummary({ mode: "normalize" }),
    {
      processingModeLabel: "normalize",
      processingModeAvailable: true,
      summaryLine: "Processing mode was captured as normalize mode."
    }
  );
});

test("maps template mode to template", () => {
  assert.deepEqual(
    summarizeProcessingModeSummary({ mode: "template" }),
    {
      processingModeLabel: "template",
      processingModeAvailable: true,
      summaryLine: "Processing mode was captured as template mode."
    }
  );
});

test("maps audit mode to audit", () => {
  assert.deepEqual(
    summarizeProcessingModeSummary({ mode: "audit" }),
    {
      processingModeLabel: "audit",
      processingModeAvailable: true,
      summaryLine: "Processing mode was captured as audit mode."
    }
  );
});

test("returns identical results on repeated calls", () => {
  const first = summarizeProcessingModeSummary({ mode: "minimal" });
  const second = summarizeProcessingModeSummary({ mode: "minimal" });

  assert.deepEqual(first, second);
});
