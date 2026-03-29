export type CleanupMode = "minimal" | "standard";

export interface AuditSummary {
  slideCount: number;
  fontDrift: number;
  fontSizeDrift: number;
  spacingDrift: number;
  bulletIndentDriftCount: number;
  lineSpacingDriftCount: number;
  alignmentDriftCount: number;
}

export interface DeckStyleFingerprint {
  fontFamily: string | null;
  fontSize: number | null;
  alignment: string | null;
  lineSpacing: number | null;
  spacingBefore: number | null;
  spacingAfter: number | null;
}

export interface DeckQaSummary {
  brandScore: number;
  qualityLabel: "good" | "warning" | "poor";
  summaryLine: string;
  keyIssues: string[];
  fixImpact: {
    changedSlides: number;
    totalChanges: number;
  };
}

export interface SlideQaSummary {
  brandScore: number;
  qualityLabel: "good" | "warning" | "poor";
  summaryLine: string;
  keyIssues: string[];
}

export interface TopProblemSlideSummary {
  slideIndex: number;
  brandScore: number;
  qualityLabel: "good" | "warning" | "poor";
  summaryLine: string;
  keyIssues: string[];
}

export interface CleanupOutcomeSummary {
  changedSlides: number;
  totalChanges: number;
  appliedStages: string[];
  remainingDrift: {
    fontDrift: number;
    fontSizeDrift: number;
    spacingDriftCount: number;
    bulletIndentDriftCount: number;
    alignmentDriftCount: number;
    lineSpacingDriftCount: number;
  };
  summaryLine: string;
}

export interface RecommendedActionSummary {
  primaryAction: "none" | "review" | "refine" | "manual_attention";
  actionReason: string;
  focusAreas: string[];
}

export interface IssueCategorySummaryEntry {
  category: "font_consistency" | "font_size_consistency" | "paragraph_spacing" | "bullet_indentation" | "alignment" | "line_spacing";
  detectedBefore: number;
  fixed: number;
  remaining: number;
  status: "clean" | "improved" | "unchanged";
}

export interface BrandScoreImprovementSummary {
  brandScoreBefore: number;
  brandScoreAfter: number;
  scoreDelta: number;
  improvementLabel: "none" | "minor" | "moderate" | "major";
  summaryLine: string;
}

export interface RemainingIssuesSummary {
  remainingIssueCount: number;
  remainingSeverityLabel: "none" | "low" | "moderate" | "high";
  topRemainingIssueCategories: Array<
    "font_consistency" | "font_size_consistency" | "paragraph_spacing" | "bullet_indentation" | "alignment" | "line_spacing"
  >;
  summaryLine: string;
}

export interface DeckReadinessSummary {
  readinessLabel: "ready" | "mostlyReady" | "manualReviewRecommended";
  readinessReason:
    | "noRemainingIssues"
    | "minorRemainingIssues"
    | "unresolvedFormattingRisk"
    | "cleanupDidNotImprove"
    | "manualActionStillNeeded";
  summaryLine: string;
}

export interface ReportConsistencySummary {
  consistencyLabel: "consistent" | "minorMismatch" | "inconsistent";
  consistencyFlags: Array<
    | "readinessWithoutImprovement"
    | "readinessWithRemainingHighIssues"
    | "noRemainingIssuesButManualReview"
    | "manualReviewDespiteNoRemainingIssues"
    | "improvementWithoutOutcomeSignal"
  >;
  summaryLine: string;
}

export interface ReportShapeParitySummary {
  parityLabel: "parityOk" | "parityMismatch";
  cliHasAllRequiredFields: boolean;
  apiHasAllRequiredFields: boolean;
  missingInCli: Array<
    | "deckQaSummary"
    | "slideQaSummary"
    | "topProblemSlides"
    | "cleanupOutcomeSummary"
    | "recommendedActionSummary"
    | "issueCategorySummary"
    | "brandScoreImprovementSummary"
    | "remainingIssuesSummary"
    | "deckReadinessSummary"
    | "reportConsistencySummary"
    | "outputPackageValidation"
    | "outputFileMetadataSummary"
  >;
  missingInApi: Array<
    | "deckQaSummary"
    | "slideQaSummary"
    | "topProblemSlides"
    | "cleanupOutcomeSummary"
    | "recommendedActionSummary"
    | "issueCategorySummary"
    | "brandScoreImprovementSummary"
    | "remainingIssuesSummary"
    | "deckReadinessSummary"
    | "reportConsistencySummary"
    | "outputPackageValidation"
    | "outputFileMetadataSummary"
  >;
  summaryLine: string;
}

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

export interface OutputPackageValidation {
  validationLabel: "valid" | "invalid";
  checks: {
    fileExists: boolean;
    nonEmptyFile: boolean;
    readableZip: boolean;
    hasContentTypes: boolean;
    hasRootRels: boolean;
    hasPresentationPart: boolean;
  };
  summaryLine: string;
}

export interface OutputFileMetadataSummary {
  outputFileName: string;
  outputExtension: string;
  outputFileSizeBytes: number;
  outputFilePresent: boolean;
  summaryLine: string;
}

export interface InputFileLimitsSummary {
  inputFilePresent: boolean;
  inputFileSizeBytes: number;
  sizeLimitBytes: number;
  warningThresholdBytes: number;
  limitsLabel: "withinLimit" | "nearLimit" | "overLimit" | "missingInput";
  summaryLine:
    | "Input file limits could not be assessed because the input file is missing."
    | "Input file size is within the configured basic limit."
    | "Input file size is near the configured basic limit."
    | "Input file size exceeds the configured basic limit.";
}

export interface OutputOverwriteSafetySummary {
  overwriteSafetyLabel: "newFile" | "overwroteExistingFile" | "unknown" | "missingOutput";
  outputExistedBeforeWrite: boolean | null;
  outputPresentAfterWrite: boolean;
  summaryLine:
    | "Output overwrite status could not be determined because the output file is missing."
    | "Output file path existed before write and was overwritten."
    | "Output file path did not exist before write and a new file was produced."
    | "Output overwrite status could not be determined from the available machine-readable signals.";
}

export interface InputOutputPathRelationshipSummary {
  pathRelationshipLabel: "samePath" | "differentPath" | "unknown";
  inputPathAvailable: boolean;
  outputPathAvailable: boolean;
  samePath: boolean | null;
  summaryLine:
    | "Input and output paths resolve to the same file path."
    | "Input and output paths resolve to different file paths."
    | "Input and output path relationship could not be determined from the available machine-readable signals.";
}

export interface ProcessingModeSummary {
  processingModeLabel: "all" | "fix" | "audit" | "unknown";
  processingModeAvailable: boolean;
  summaryLine:
    | "Processing mode was captured as full pipeline mode."
    | "Processing mode was captured as fix mode."
    | "Processing mode was captured as audit mode."
    | "Processing mode could not be determined from the available machine-readable signals.";
}

export interface ReportCoverageSummary {
  expectedFieldCount: number;
  presentFieldCount: number;
  missingFieldCount: number;
  coverageLabel: "complete" | "partial";
  missingFields: Array<
    | "deckQaSummary"
    | "slideQaSummary"
    | "topProblemSlides"
    | "cleanupOutcomeSummary"
    | "recommendedActionSummary"
    | "issueCategorySummary"
    | "brandScoreImprovementSummary"
    | "remainingIssuesSummary"
    | "deckReadinessSummary"
    | "reportConsistencySummary"
    | "outputPackageValidation"
    | "outputFileMetadataSummary"
    | "pipelineFailureSummary"
    | "endToEndRunSummary"
    | "inputFileLimitsSummary"
    | "outputOverwriteSafetySummary"
    | "inputOutputPathRelationshipSummary"
    | "processingModeSummary"
  >;
  summaryLine:
    | "Report coverage is complete for the expected summary field set."
    | "Report coverage is partial for the expected summary field set.";
}

export interface FixReport {
  mode: CleanupMode;
  applied: boolean;
  noOp: boolean;
  steps: Array<
    | {
        name: "fontFamilyFix" | "fontSizeFix";
        changedRuns: number;
      }
    | {
        name: "spacingFix" | "bulletFix" | "alignmentFix" | "lineSpacingFix" | "dominantBodyStyleFix" | "dominantFontFamilyFix" | "dominantFontSizeFix";
        changedParagraphs: number;
      }
  >;
  deckFontUsage: {
    fontFamilyHistogram: Record<string, number>;
    fontSizeHistogram: Record<string, number>;
    dominantFontFamilyCoverage: number;
    dominantFontSizeCoverage: number;
  };
  deckStyleFingerprint: DeckStyleFingerprint;
  fontDriftSeverity: "low" | "medium" | "high";
  deckQaSummary: DeckQaSummary;
  topProblemSlides: TopProblemSlideSummary[];
  cleanupOutcomeSummary: CleanupOutcomeSummary;
  recommendedActionSummary: RecommendedActionSummary;
  issueCategorySummary: IssueCategorySummaryEntry[];
  brandScoreImprovementSummary: BrandScoreImprovementSummary;
  remainingIssuesSummary: RemainingIssuesSummary;
  deckReadinessSummary: DeckReadinessSummary;
  reportConsistencySummary: ReportConsistencySummary;
  reportShapeParitySummary: ReportShapeParitySummary;
  pipelineFailureSummary: PipelineFailureSummary;
  endToEndRunSummary: EndToEndRunSummary;
  outputPackageValidation: OutputPackageValidation;
  outputFileMetadataSummary: OutputFileMetadataSummary;
  inputFileLimitsSummary: InputFileLimitsSummary;
  outputOverwriteSafetySummary: OutputOverwriteSafetySummary;
  inputOutputPathRelationshipSummary: InputOutputPathRelationshipSummary;
  processingModeSummary: ProcessingModeSummary;
  reportCoverageSummary: ReportCoverageSummary;
  totals: {
    fontFamilyChanges: number;
    fontSizeChanges: number;
    spacingChanges: number;
    bulletChanges: number;
    alignmentChanges: number;
    lineSpacingChanges: number;
    dominantBodyStyleChanges: number;
    dominantFontFamilyChanges: number;
    dominantFontSizeChanges: number;
  };
  changesBySlide: Array<{
    slide: number;
    slideFontUsage: {
      fontFamilyHistogram: Record<string, number>;
      fontSizeHistogram: Record<string, number>;
    };
    slideQaSummary: SlideQaSummary;
    fontFamilyChanges: number;
    fontSizeChanges: number;
    spacingChanges: number;
    bulletChanges: number;
    alignmentChanges: number;
    lineSpacingChanges: number;
    dominantBodyStyleChanges: number;
    dominantFontFamilyChanges: number;
    dominantFontSizeChanges: number;
    dominantBodyStyleEligibleGroups: number;
    dominantBodyStyleTouchedGroups: number;
    dominantBodyStyleSkippedGroups: number;
    dominantBodyStyleAlignmentChanges: number;
    dominantBodyStyleSpacingBeforeChanges: number;
    dominantBodyStyleSpacingAfterChanges: number;
    dominantBodyStyleLineSpacingChanges: number;
  }>;
  validation: {
    outputExists: boolean;
    isZip: boolean;
    coreEntriesPresent: boolean;
    reloadable: boolean;
    slideCountMatches: boolean;
  };
  verification: {
    inputSlideCount: number;
    outputSlideCount: number | null;
    fontDriftBefore: number;
    fontDriftAfter: number | null;
    fontSizeDriftBefore: number;
    fontSizeDriftAfter: number | null;
    spacingDriftBefore: number;
    spacingDriftAfter: number | null;
    bulletIndentDriftBefore: number;
    bulletIndentDriftAfter: number | null;
    alignmentDriftBefore: number;
    alignmentDriftAfter: number | null;
    lineSpacingDriftBefore: number;
    lineSpacingDriftAfter: number | null;
  };
}

export interface FixResponse {
  report: FixReport;
  downloadUrl: string;
  reportDownloadUrl: string;
  reportFileName: string;
}

export async function uploadAudit(file: File): Promise<AuditSummary> {
  const formData = new FormData();
  formData.append("file", file);
  return sendMultipartRequest<AuditSummary>("/audit", formData);
}

export async function uploadFix(file: File, mode: CleanupMode): Promise<FixResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  return sendMultipartRequest<FixResponse>("/fix", formData);
}

async function sendMultipartRequest<T>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: string };
    return payload.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
