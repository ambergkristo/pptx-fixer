import type { FixReport } from "./api";

export interface UploadResultSectionViewModel {
  sectionKey: "output" | "deck" | "cleanup" | "action" | "file";
  sectionStatus: "good" | "warning" | "bad";
  title: string;
  description: string;
}

export interface UploadResultReadinessSignalViewModel {
  signalStatus: "good" | "warning" | "bad";
  label: "Ready" | "Mostly ready" | "Manual review needed";
  description: string;
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
    | "Cleanup completed successfully."
    | "Cleanup completed with warnings."
    | "Cleanup failed.";
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
>;

export function buildUploadResultViewModel(report: UploadResultViewModelInput): UploadResultViewModel {
  const overallStatus = report.endToEndRunSummary.runStatus;

  return {
    overallStatus,
    headline: overallStatus === "success"
      ? "Cleanup completed successfully."
      : overallStatus === "warning"
      ? "Cleanup completed with warnings."
      : "Cleanup failed.",
    readinessSignal: buildReadinessSignal(report),
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
    remainingIssues: buildRemainingIssues(report),
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
        title: "Cleanup result",
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

function buildReadinessSignal(report: UploadResultViewModelInput): UploadResultReadinessSignalViewModel {
  return {
    signalStatus: report.deckReadinessSummary.readinessLabel === "ready"
      ? "good"
      : report.deckReadinessSummary.readinessLabel === "mostlyReady"
      ? "warning"
      : "bad",
    label: report.deckReadinessSummary.readinessLabel === "ready"
      ? "Ready"
      : report.deckReadinessSummary.readinessLabel === "mostlyReady"
      ? "Mostly ready"
      : "Manual review needed",
    description: report.deckReadinessSummary.summaryLine,
    scopeNote:
      summarizeCategoryReportingScope(report) === "eligibleCleanupBoundary"
        ? "Category reduction is deck-specific on the current eligible-cleanup boundary. It does not imply broad category closure."
        : "Category reduction is deck-specific on the current manual-review boundary. It does not imply broad category closure."
  };
}

function buildRemainingIssues(report: UploadResultViewModelInput): UploadResultRemainingIssuesViewModel {
  const improvedCategories = report.issueCategorySummary
    .filter((entry) => entry.fixed > 0)
    .map((entry) => getCategoryLabel(entry.category));
  const unresolvedCategories = report.issueCategorySummary
    .filter((entry) => entry.remaining > 0)
    .map((entry) => getCategoryLabel(entry.category));
  const hasRemainingIssues = unresolvedCategories.length > 0;

  return {
    sectionStatus: hasRemainingIssues
      ? report.deckReadinessSummary.readinessLabel === "mostlyReady"
        ? "warning"
        : "bad"
      : "good",
    title: hasRemainingIssues ? "Remaining issues" : "Remaining issues cleared",
    description: report.remainingIssuesSummary.summaryLine,
    improvedCategories,
    unresolvedCategories,
    actionLine: report.recommendedActionSummary.actionReason
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
