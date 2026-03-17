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
