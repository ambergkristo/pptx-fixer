export type SlideQaQualityLabel = "good" | "warning" | "poor";

export interface SlideQaSummary {
  brandScore: number;
  qualityLabel: SlideQaQualityLabel;
  summaryLine: string;
  keyIssues: string[];
}

export interface SlideQaInputs {
  fontDriftCount: number;
  fontSizeDriftCount: number;
  spacingDriftCount: number;
  bulletIndentDriftCount: number;
  alignmentDriftCount: number;
  lineSpacingDriftCount: number;
}

export function summarizeSlideQaSummary(inputs: SlideQaInputs): SlideQaSummary {
  const brandScore = summarizeBrandScore(inputs);
  const qualityLabel = summarizeQualityLabel(brandScore);

  return {
    brandScore,
    qualityLabel,
    summaryLine: summarizeSummaryLine(qualityLabel),
    keyIssues: summarizeKeyIssues(inputs)
  };
}

function summarizeBrandScore(inputs: SlideQaInputs): number {
  const penalty =
    inputs.fontDriftCount +
    inputs.fontSizeDriftCount +
    inputs.spacingDriftCount +
    (inputs.bulletIndentDriftCount * 2) +
    inputs.alignmentDriftCount +
    inputs.lineSpacingDriftCount;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function summarizeQualityLabel(brandScore: number): SlideQaQualityLabel {
  if (brandScore >= 85) {
    return "good";
  }

  if (brandScore >= 60) {
    return "warning";
  }

  return "poor";
}

function summarizeSummaryLine(qualityLabel: SlideQaQualityLabel): string {
  if (qualityLabel === "good") {
    return "Slide is mostly consistent with minor formatting drift.";
  }

  if (qualityLabel === "warning") {
    return "Slide has moderate formatting inconsistency.";
  }

  return "Slide has significant formatting inconsistency and needs cleanup.";
}

function summarizeKeyIssues(inputs: SlideQaInputs): string[] {
  const issues: string[] = [];

  if (inputs.fontDriftCount > 0) {
    issues.push("Font family drift detected");
  }

  if (inputs.fontSizeDriftCount > 0) {
    issues.push("Font size drift detected");
  }

  if (inputs.spacingDriftCount > 0) {
    issues.push("Paragraph spacing drift detected");
  }

  if (inputs.bulletIndentDriftCount > 0) {
    issues.push("Bullet formatting inconsistency detected");
  }

  if (inputs.alignmentDriftCount > 0) {
    issues.push("Alignment inconsistency detected");
  }

  if (inputs.lineSpacingDriftCount > 0) {
    issues.push("Line spacing inconsistency detected");
  }

  return issues.slice(0, 3);
}
