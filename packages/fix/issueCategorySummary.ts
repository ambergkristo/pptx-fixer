import type { FixVerificationSummary } from "./runAllFixes.ts";

export type IssueCategory =
  | "font_consistency"
  | "font_size_consistency"
  | "paragraph_spacing"
  | "bullet_indentation"
  | "alignment"
  | "line_spacing";

export type IssueCategoryStatus = "clean" | "improved" | "unchanged";

export interface IssueCategorySummaryEntry {
  category: IssueCategory;
  detectedBefore: number;
  fixed: number;
  remaining: number;
  status: IssueCategoryStatus;
}

export function summarizeIssueCategorySummary(
  verification: FixVerificationSummary
): IssueCategorySummaryEntry[] {
  return [
    summarizeCategory("font_consistency", verification.fontDriftBefore, verification.fontDriftAfter),
    summarizeCategory("font_size_consistency", verification.fontSizeDriftBefore, verification.fontSizeDriftAfter),
    summarizeCategory("paragraph_spacing", verification.spacingDriftBefore, verification.spacingDriftAfter),
    summarizeCategory("bullet_indentation", verification.bulletIndentDriftBefore, verification.bulletIndentDriftAfter),
    summarizeCategory("alignment", verification.alignmentDriftBefore, verification.alignmentDriftAfter),
    summarizeCategory("line_spacing", verification.lineSpacingDriftBefore, verification.lineSpacingDriftAfter)
  ];
}

function summarizeCategory(
  category: IssueCategory,
  detectedBefore: number,
  remainingAfter: number | null
): IssueCategorySummaryEntry {
  const remaining = remainingAfter ?? 0;
  const fixed = Math.max(0, detectedBefore - remaining);

  return {
    category,
    detectedBefore,
    fixed,
    remaining,
    status: summarizeStatus(detectedBefore, remaining, fixed)
  };
}

function summarizeStatus(
  detectedBefore: number,
  remaining: number,
  fixed: number
): IssueCategoryStatus {
  if (detectedBefore === 0 && remaining === 0) {
    return "clean";
  }

  if (fixed > 0) {
    return "improved";
  }

  return "unchanged";
}
