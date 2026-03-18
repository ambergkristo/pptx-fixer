import type { FixReport } from "./api";

export interface UploadResultSectionViewModel {
  sectionKey: "output" | "deck" | "cleanup" | "action" | "file";
  sectionStatus: "good" | "warning" | "bad";
  title: string;
  description: string;
}

export interface UploadResultViewModel {
  overallStatus: "success" | "warning" | "failure";
  headline:
    | "Cleanup completed successfully."
    | "Cleanup completed with warnings."
    | "Cleanup failed.";
  sections: UploadResultSectionViewModel[];
}

type UploadResultViewModelInput = Pick<
  FixReport,
  | "endToEndRunSummary"
  | "outputPackageValidation"
  | "deckReadinessSummary"
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
