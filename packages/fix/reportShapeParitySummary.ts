const REQUIRED_REPORT_FIELDS = [
  "deckQaSummary",
  "slideQaSummary",
  "topProblemSlides",
  "cleanupOutcomeSummary",
  "recommendedActionSummary",
  "issueCategorySummary",
  "brandScoreImprovementSummary",
  "remainingIssuesSummary",
  "deckReadinessSummary",
  "reportConsistencySummary",
  "outputPackageValidation",
  "outputFileMetadataSummary",
  "inputFileLimitsSummary"
] as const;

type RequiredReportField = (typeof REQUIRED_REPORT_FIELDS)[number];

export interface ReportShapeParitySummary {
  parityLabel: "parityOk" | "parityMismatch";
  cliHasAllRequiredFields: boolean;
  apiHasAllRequiredFields: boolean;
  missingInCli: RequiredReportField[];
  missingInApi: RequiredReportField[];
  summaryLine: string;
}

export function summarizeReportShapeParity(options: {
  cliVisibleReportPayload: unknown;
  apiVisibleReportPayload: unknown;
}): ReportShapeParitySummary {
  const missingInCli = findMissingRequiredFields(options.cliVisibleReportPayload);
  const missingInApi = findMissingRequiredFields(options.apiVisibleReportPayload);
  const cliHasAllRequiredFields = missingInCli.length === 0;
  const apiHasAllRequiredFields = missingInApi.length === 0;
  const parityLabel = cliHasAllRequiredFields && apiHasAllRequiredFields
    ? "parityOk"
    : "parityMismatch";

  return {
    parityLabel,
    cliHasAllRequiredFields,
    apiHasAllRequiredFields,
    missingInCli,
    missingInApi,
    summaryLine: parityLabel === "parityOk"
      ? "CLI and API report shapes are aligned for all required summary fields."
      : "CLI and API report shapes are not aligned for all required summary fields."
  };
}

function findMissingRequiredFields(payload: unknown): RequiredReportField[] {
  return REQUIRED_REPORT_FIELDS.filter((fieldName) => !hasRequiredField(payload, fieldName));
}

function hasRequiredField(payload: unknown, fieldName: RequiredReportField): boolean {
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
