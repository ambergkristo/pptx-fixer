import type { FixReport } from "./api";

export interface UploadResultSectionViewModel {
  sectionKey: "output" | "deck" | "cleanup" | "action" | "file";
  sectionStatus: "good" | "warning" | "bad";
  title: string;
  description: string;
}

export interface UploadResultReadinessSignalViewModel {
  signalStatus: "good" | "warning" | "bad";
  label: "Ready" | "Improved, review needed" | "Mostly ready" | "Manual review needed";
  description: string;
  reasonLine: string;
  blockerLine: string;
  blockerCategories: string[];
  useNowLine: string;
  scopeNote: string;
}

export interface UploadResultCategoryRowViewModel {
  categoryKey:
    | "font_consistency"
    | "font_size_consistency"
    | "paragraph_spacing"
    | "bullet_indentation"
    | "alignment"
    | "line_spacing";
  label:
    | "Font family"
    | "Font size"
    | "Paragraph spacing"
    | "Bullet indentation"
    | "Alignment"
    | "Line spacing";
  beforeCount: number;
  afterCount: number;
  reductionCount: number;
  outcomeLabel: "Clean" | "Resolved" | "Reduced" | "Unchanged";
  outcomeStatus: "good" | "warning" | "bad";
}

export interface UploadResultRemainingIssuesViewModel {
  sectionStatus: "good" | "warning" | "bad";
  title: string;
  description: string;
  improvedCategories: string[];
  unresolvedCategories: string[];
  actionLine: string;
}

export interface UploadResultViewModel {
  overallStatus: "success" | "warning" | "failure";
  headline:
    | "Repair completed successfully."
    | "Repair completed with warnings."
    | "Repair failed.";
  readinessSignal?: UploadResultReadinessSignalViewModel;
  categorySummary?: {
    rows: UploadResultCategoryRowViewModel[];
  };
  remainingIssues?: UploadResultRemainingIssuesViewModel;
  sections: UploadResultSectionViewModel[];
}

type UploadResultViewModelInput = Pick<
  FixReport,
  | "endToEndRunSummary"
  | "outputPackageValidation"
  | "deckReadinessSummary"
  | "issueCategorySummary"
  | "remainingIssuesSummary"
  | "brandScoreImprovementSummary"
  | "recommendedActionSummary"
  | "outputFileMetadataSummary"
  | "inputFileLimitsSummary"
> & {
  hierarchyQualitySummary?: FixReport["hierarchyQualitySummary"];
};

export function buildUploadResultViewModel(report: UploadResultViewModelInput): UploadResultViewModel {
  const overallStatus = report.endToEndRunSummary.runStatus;
  const categoryLists = summarizeCategoryLists(report);

  return {
    overallStatus,
    headline: overallStatus === "success"
      ? "Repair completed successfully."
      : overallStatus === "warning"
      ? "Repair completed with warnings."
      : "Repair failed.",
    readinessSignal: buildReadinessSignal(report, categoryLists),
    categorySummary: {
      rows: report.issueCategorySummary.map((entry) => ({
        categoryKey: entry.category,
        label: getCategoryLabel(entry.category),
        beforeCount: entry.detectedBefore,
        afterCount: entry.remaining,
        reductionCount: entry.fixed,
        outcomeLabel: getOutcomeLabel(entry),
        outcomeStatus: getOutcomeStatus(entry)
      }))
    },
    remainingIssues: buildRemainingIssues(report, categoryLists),
    sections: [
      {
        sectionKey: "output",
        sectionStatus: report.outputPackageValidation.validationLabel === "valid" ? "good" : "bad",
        title: "Output",
        description: report.outputPackageValidation.summaryLine
      },
      {
        sectionKey: "deck",
        sectionStatus: report.deckReadinessSummary.readinessLabel === "ready"
          ? "good"
          : report.deckReadinessSummary.readinessLabel === "improvedManualReview"
          ? "warning"
          : report.deckReadinessSummary.readinessLabel === "mostlyReady"
          ? "warning"
          : "bad",
        title: "Deck readiness",
        description: report.deckReadinessSummary.summaryLine
      },
      {
        sectionKey: "cleanup",
        sectionStatus:
          report.brandScoreImprovementSummary.improvementLabel === "major" ||
          report.brandScoreImprovementSummary.improvementLabel === "moderate"
            ? "good"
            : "warning",
        title: "Repair result",
        description: report.brandScoreImprovementSummary.summaryLine
      },
      {
        sectionKey: "action",
        sectionStatus: report.recommendedActionSummary.primaryAction === "none" ? "good" : "warning",
        title: "Recommended action",
        description: report.recommendedActionSummary.actionReason
      },
      {
        sectionKey: "file",
        sectionStatus: report.outputFileMetadataSummary.outputFilePresent === false
          ? "bad"
          : report.inputFileLimitsSummary.limitsLabel === "overLimit"
          ? "warning"
          : "good",
        title: "Output file",
        description: report.outputFileMetadataSummary.summaryLine
      }
    ]
  };
}

function buildReadinessSignal(
  report: UploadResultViewModelInput,
  categoryLists: ReturnType<typeof summarizeCategoryLists>
): UploadResultReadinessSignalViewModel {
  return {
    signalStatus: report.deckReadinessSummary.readinessLabel === "ready"
      ? "good"
      : report.deckReadinessSummary.readinessLabel === "improvedManualReview"
      ? "warning"
      : report.deckReadinessSummary.readinessLabel === "mostlyReady"
      ? "warning"
      : "bad",
    label: report.deckReadinessSummary.readinessLabel === "ready"
      ? "Ready"
      : report.deckReadinessSummary.readinessLabel === "improvedManualReview"
      ? "Improved, review needed"
      : report.deckReadinessSummary.readinessLabel === "mostlyReady"
      ? "Mostly ready"
      : "Manual review needed",
    description: report.deckReadinessSummary.summaryLine,
    reasonLine: summarizeReadinessReasonLine(report, categoryLists.unresolvedCategories),
    blockerLine: summarizeBlockerLine(categoryLists.unresolvedCategories),
    blockerCategories: categoryLists.unresolvedCategories,
    useNowLine: summarizeUseNowLine(report, categoryLists.unresolvedCategories),
    scopeNote:
      summarizeCategoryReportingScope(report) === "eligibleCleanupBoundary"
        ? "Category reduction is deck-specific on the current eligible-cleanup boundary. It does not imply broad category closure."
        : "Category reduction is deck-specific on the current manual-review boundary. It does not imply broad category closure."
  };
}

function buildRemainingIssues(
  report: UploadResultViewModelInput,
  categoryLists: ReturnType<typeof summarizeCategoryLists>
): UploadResultRemainingIssuesViewModel {
  const hasHierarchyReview = report.deckReadinessSummary.readinessReason === "hierarchyQualityReviewNeeded";
  const hasRemainingIssues = categoryLists.unresolvedCategories.length > 0 || hasHierarchyReview;

  return {
    sectionStatus: hasRemainingIssues
      ? report.deckReadinessSummary.readinessLabel === "mostlyReady" ||
        report.deckReadinessSummary.readinessLabel === "improvedManualReview"
        ? "warning"
        : "bad"
      : "good",
    title: hasRemainingIssues ? "What improved and what still needs review" : "What improved",
    description: hasRemainingIssues
      ? hasHierarchyReview && categoryLists.unresolvedCategories.length === 0
        ? "Improved categories reflect real reduction on this deck. Visual hierarchy still needs review before the output should be treated as finished."
        : "Improved categories reflect real reduction on this deck. Unresolved categories are still blocking a better readiness state."
      : "Improved categories reflect real reduction on this deck. No unresolved categories remain in the current report.",
    improvedCategories: categoryLists.improvedCategories,
    unresolvedCategories: categoryLists.unresolvedCategories,
    actionLine: `Current run recommendation: ${report.recommendedActionSummary.actionReason}`
  };
}

function getCategoryLabel(
  category: UploadResultCategoryRowViewModel["categoryKey"]
): UploadResultCategoryRowViewModel["label"] {
  if (category === "font_consistency") {
    return "Font family";
  }

  if (category === "font_size_consistency") {
    return "Font size";
  }

  if (category === "paragraph_spacing") {
    return "Paragraph spacing";
  }

  if (category === "bullet_indentation") {
    return "Bullet indentation";
  }

  if (category === "alignment") {
    return "Alignment";
  }

  return "Line spacing";
}

function getOutcomeLabel(entry: UploadResultViewModelInput["issueCategorySummary"][number]) {
  if (entry.detectedBefore === 0 && entry.remaining === 0) {
    return "Clean";
  }

  if (entry.fixed > 0 && entry.remaining === 0) {
    return "Resolved";
  }

  if (entry.fixed > 0 && entry.remaining > 0) {
    return "Reduced";
  }

  return "Unchanged";
}

function getOutcomeStatus(entry: UploadResultViewModelInput["issueCategorySummary"][number]): "good" | "warning" | "bad" {
  if (entry.detectedBefore === 0 && entry.remaining === 0) {
    return "good";
  }

  if (entry.fixed > 0 && entry.remaining === 0) {
    return "good";
  }

  if (entry.fixed > 0 && entry.remaining > 0) {
    return "warning";
  }

  return "bad";
}

function summarizeCategoryReportingScope(report: UploadResultViewModelInput): "eligibleCleanupBoundary" | "manualReviewBoundary" {
  if (report.recommendedActionSummary.primaryAction === "manual_attention") {
    return "manualReviewBoundary";
  }

  if (
    report.remainingIssuesSummary.remainingSeverityLabel === "moderate" ||
    report.remainingIssuesSummary.remainingSeverityLabel === "high"
  ) {
    return "manualReviewBoundary";
  }

  return "eligibleCleanupBoundary";
}

function summarizeCategoryLists(report: UploadResultViewModelInput) {
  return {
    improvedCategories: report.issueCategorySummary
      .filter((entry) => entry.fixed > 0)
      .map((entry) => getCategoryLabel(entry.category)),
    unresolvedCategories: report.issueCategorySummary
      .filter((entry) => entry.remaining > 0)
      .map((entry) => getCategoryLabel(entry.category))
  };
}

function summarizeReadinessReasonLine(
  report: UploadResultViewModelInput,
  unresolvedCategories: string[]
): string {
  const unresolvedList = unresolvedCategories.length > 0
    ? unresolvedCategories.join(", ")
    : "none";

  if (report.deckReadinessSummary.readinessReason === "noRemainingIssues") {
    return "This label is shown because no unresolved categories remain after cleanup.";
  }

  if (report.deckReadinessSummary.readinessReason === "hierarchyQualityReviewNeeded") {
    return "This label is shown because role hierarchy still looks compressed or inconsistent after normalization.";
  }

  if (report.deckReadinessSummary.readinessReason === "minorRemainingIssues") {
    return `This label is shown because only low-severity unresolved categories remain after cleanup: ${unresolvedList}.`;
  }

  if (report.deckReadinessSummary.readinessReason === "manualActionStillNeeded") {
    return `This label is shown because the current run still requires manual attention and unresolved categories remain: ${unresolvedList}.`;
  }

  if (report.deckReadinessSummary.readinessReason === "cleanupDidNotImprove") {
    return `This label is shown because the current run did not materially improve the deck state and unresolved categories remain: ${unresolvedList}.`;
  }

  return `This label is shown because unresolved formatting risk remains after cleanup in: ${unresolvedList}.`;
}

function summarizeBlockerLine(unresolvedCategories: string[]): string {
  if (unresolvedCategories.length === 0) {
    return "No unresolved drift categories remain, but visual hierarchy may still need review.";
  }

  if (unresolvedCategories.length === 1) {
    return "1 unresolved category is still blocking a better readiness state.";
  }

  return `${unresolvedCategories.length} unresolved categories are still blocking a better readiness state.`;
}

function summarizeUseNowLine(
  report: UploadResultViewModelInput,
  unresolvedCategories: string[]
): string {
  if (report.deckReadinessSummary.readinessLabel === "ready") {
    return "Good enough to use now based on this run. No unresolved categories remain in the current report.";
  }

  if (report.deckReadinessSummary.readinessLabel === "improvedManualReview") {
    return "Improved output is available now, but review heading and body hierarchy before sharing.";
  }

  if (report.deckReadinessSummary.readinessLabel === "mostlyReady") {
    return unresolvedCategories.length > 0
      ? "Usable now only if minor residual drift is acceptable, but review the unresolved categories before sharing."
      : "Usable now, but a quick review is still recommended before sharing.";
  }

  return "Still needs review. Do not treat the current output as finished until the unresolved categories are reviewed.";
}
