export type DeckQaQualityLabel = "good" | "warning" | "poor";

export interface DeckQaFixImpact {
  changedSlides: number;
  totalChanges: number;
}

export interface DeckQaSummary {
  brandScore: number;
  qualityLabel: DeckQaQualityLabel;
  summaryLine: string;
  keyIssues: string[];
  fixImpact: DeckQaFixImpact;
}

export interface DeckQaAuditInputs {
  slideCount: number;
  fontDriftCount: number;
  fontSizeDriftCount: number;
  spacingDriftCount: number;
  bulletIndentDriftCount: number;
  alignmentDriftCount: number;
  lineSpacingDriftCount: number;
}

export interface DeckQaFixImpactInputs {
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
    fontFamilyChanges: number;
    fontSizeChanges: number;
    spacingChanges: number;
    bulletChanges: number;
    alignmentChanges: number;
    lineSpacingChanges: number;
    dominantBodyStyleChanges: number;
    dominantFontFamilyChanges: number;
    dominantFontSizeChanges: number;
  }>;
}

export function summarizeDeckQaSummary(
  audit: DeckQaAuditInputs,
  fixImpact: DeckQaFixImpact = { changedSlides: 0, totalChanges: 0 }
): DeckQaSummary {
  const brandScore = summarizeBrandScore(audit);
  const qualityLabel = summarizeQualityLabel(brandScore);

  return {
    brandScore,
    qualityLabel,
    summaryLine: summarizeSummaryLine(qualityLabel),
    keyIssues: summarizeKeyIssues(audit),
    fixImpact
  };
}

export function summarizeDeckQaFixImpact(
  report: DeckQaFixImpactInputs
): DeckQaFixImpact {
  return {
    changedSlides: report.changesBySlide.filter((slide) => hasSlideChanges(slide)).length,
    totalChanges:
      report.totals.fontFamilyChanges +
      report.totals.fontSizeChanges +
      report.totals.spacingChanges +
      report.totals.bulletChanges +
      report.totals.alignmentChanges +
      report.totals.lineSpacingChanges +
      report.totals.dominantBodyStyleChanges +
      report.totals.dominantFontFamilyChanges +
      report.totals.dominantFontSizeChanges
  };
}

function summarizeBrandScore(audit: DeckQaAuditInputs): number {
  const penalty =
    audit.fontDriftCount +
    audit.fontSizeDriftCount +
    audit.spacingDriftCount +
    (audit.bulletIndentDriftCount * 2) +
    audit.alignmentDriftCount +
    audit.lineSpacingDriftCount;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function summarizeQualityLabel(brandScore: number): DeckQaQualityLabel {
  if (brandScore >= 85) {
    return "good";
  }

  if (brandScore >= 60) {
    return "warning";
  }

  return "poor";
}

function summarizeSummaryLine(qualityLabel: DeckQaQualityLabel): string {
  if (qualityLabel === "good") {
    return "Deck is mostly consistent with minor formatting drift.";
  }

  if (qualityLabel === "warning") {
    return "Deck has moderate brand/style inconsistency.";
  }

  return "Deck has significant formatting inconsistency and needs cleanup.";
}

function summarizeKeyIssues(audit: DeckQaAuditInputs): string[] {
  const issues: string[] = [];

  if (audit.fontDriftCount > 0) {
    issues.push("Font family drift detected");
  }

  if (audit.fontSizeDriftCount > 0) {
    issues.push("Font size drift detected");
  }

  if (audit.spacingDriftCount > 0) {
    issues.push("Paragraph spacing drift detected");
  }

  if (audit.bulletIndentDriftCount > 0) {
    issues.push("Bullet formatting inconsistency detected");
  }

  if (audit.alignmentDriftCount > 0) {
    issues.push("Alignment inconsistency detected");
  }

  if (audit.lineSpacingDriftCount > 0) {
    issues.push("Line spacing inconsistency detected");
  }

  return issues.slice(0, 3);
}

function hasSlideChanges(slide: DeckQaFixImpactInputs["changesBySlide"][number]): boolean {
  return (
    slide.fontFamilyChanges +
    slide.fontSizeChanges +
    slide.spacingChanges +
    slide.bulletChanges +
    slide.alignmentChanges +
    slide.lineSpacingChanges +
    slide.dominantBodyStyleChanges +
    slide.dominantFontFamilyChanges +
    slide.dominantFontSizeChanges
  ) > 0;
}
