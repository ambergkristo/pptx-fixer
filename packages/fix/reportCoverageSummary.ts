const COVERAGE_REPORT_FIELDS = [
  "deckQaSummary",
  "slideQaSummary",
  "topProblemSlides",
  "cleanupOutcomeSummary",
  "recommendedActionSummary",
  "issueCategorySummary",
  "categoryReductionReportingSummary",
  "brandScoreImprovementSummary",
  "remainingIssuesSummary",
  "deckReadinessSummary",
  "reportConsistencySummary",
  "outputPackageValidation",
  "outputFileMetadataSummary",
  "pipelineFailureSummary",
  "endToEndRunSummary",
  "inputFileLimitsSummary",
  "outputOverwriteSafetySummary",
  "inputOutputPathRelationshipSummary",
  "processingModeSummary"
] as const;

type CoverageReportField = (typeof COVERAGE_REPORT_FIELDS)[number];

export interface ReportCoverageSummary {
  expectedFieldCount: number;
  presentFieldCount: number;
  missingFieldCount: number;
  coverageLabel: "complete" | "partial";
  missingFields: CoverageReportField[];
  summaryLine:
    | "Report coverage is complete for the expected summary field set."
    | "Report coverage is partial for the expected summary field set.";
}

export function summarizeReportCoverage(payload: unknown): ReportCoverageSummary {
  const missingFields = COVERAGE_REPORT_FIELDS.filter((fieldName) => !hasCoverageField(payload, fieldName));
  const expectedFieldCount = COVERAGE_REPORT_FIELDS.length;
  const missingFieldCount = missingFields.length;
  const presentFieldCount = expectedFieldCount - missingFieldCount;
  const coverageLabel = missingFieldCount === 0 ? "complete" : "partial";

  return {
    expectedFieldCount,
    presentFieldCount,
    missingFieldCount,
    coverageLabel,
    missingFields,
    summaryLine: coverageLabel === "complete"
      ? "Report coverage is complete for the expected summary field set."
      : "Report coverage is partial for the expected summary field set."
  };
}

function hasCoverageField(payload: unknown, fieldName: CoverageReportField): boolean {
  if (!isRecord(payload)) {
    return false;
  }

  if (fieldName === "slideQaSummary") {
    if (!("changesBySlide" in payload) || !Array.isArray(payload.changesBySlide)) {
      return false;
    }

    return payload.changesBySlide.every((slideEntry) =>
      isRecord(slideEntry) && "slideQaSummary" in slideEntry
    );
  }

  return fieldName in payload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
