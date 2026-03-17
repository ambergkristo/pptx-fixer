import type {
  IssueCategory,
  IssueCategorySummaryEntry
} from "./issueCategorySummary.ts";

export type RemainingIssuesSeverityLabel = "none" | "low" | "moderate" | "high";

export interface RemainingIssuesSummary {
  remainingIssueCount: number;
  remainingSeverityLabel: RemainingIssuesSeverityLabel;
  topRemainingIssueCategories: IssueCategory[];
  summaryLine: string;
}

const CATEGORY_WEIGHT: Record<IssueCategory, number> = {
  font_consistency: 1,
  font_size_consistency: 1,
  paragraph_spacing: 1,
  bullet_indentation: 2,
  alignment: 1,
  line_spacing: 1
};

export function summarizeRemainingIssuesSummary(
  issueCategorySummary: IssueCategorySummaryEntry[]
): RemainingIssuesSummary {
  const remainingCategories = issueCategorySummary
    .filter((entry) => entry.remaining > 0)
    .sort(compareRemainingIssueCategories);
  const remainingIssueCount = remainingCategories.length;
  const remainingSeverityLabel = summarizeRemainingSeverityLabel(remainingIssueCount);

  return {
    remainingIssueCount,
    remainingSeverityLabel,
    topRemainingIssueCategories: remainingCategories
      .slice(0, 3)
      .map((entry) => entry.category),
    summaryLine: summarizeSummaryLine(remainingSeverityLabel)
  };
}

function compareRemainingIssueCategories(
  left: IssueCategorySummaryEntry,
  right: IssueCategorySummaryEntry
): number {
  const impactDifference = weightedImpact(right) - weightedImpact(left);
  if (impactDifference !== 0) {
    return impactDifference;
  }

  const weightDifference =
    CATEGORY_WEIGHT[right.category] - CATEGORY_WEIGHT[left.category];
  if (weightDifference !== 0) {
    return weightDifference;
  }

  return left.category.localeCompare(right.category);
}

function weightedImpact(entry: IssueCategorySummaryEntry): number {
  return entry.remaining * CATEGORY_WEIGHT[entry.category];
}

function summarizeRemainingSeverityLabel(
  remainingIssueCount: number
): RemainingIssuesSeverityLabel {
  if (remainingIssueCount === 0) {
    return "none";
  }

  if (remainingIssueCount === 1) {
    return "low";
  }

  if (remainingIssueCount <= 3) {
    return "moderate";
  }

  return "high";
}

function summarizeSummaryLine(
  remainingSeverityLabel: RemainingIssuesSeverityLabel
): string {
  if (remainingSeverityLabel === "none") {
    return "No remaining formatting issues were detected after cleanup.";
  }

  if (remainingSeverityLabel === "low") {
    return "A small number of formatting issues remain after cleanup.";
  }

  if (remainingSeverityLabel === "moderate") {
    return "Some formatting issues remain after cleanup and may require manual review.";
  }

  return "Multiple formatting issues remain after cleanup and manual review is recommended.";
}
