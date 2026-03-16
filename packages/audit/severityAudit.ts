import type { DominantBodyStyle } from "./dominantStyleAudit.ts";
import type { ParagraphGroupWithStyleSignature } from "./styleSignatureAudit.ts";

export type SeverityLabel = "low" | "medium" | "high";

export interface SlideSeverityInput {
  fontDriftCount: number;
  fontSizeDriftCount: number;
  spacingDriftCount: number;
  bulletIndentDriftCount: number;
  alignmentDriftCount: number;
  lineSpacingDriftCount: number;
  paragraphGroups: ParagraphGroupWithStyleSignature[];
  dominantBodyStyle: DominantBodyStyle;
}

export interface SlideSeveritySummary {
  severityScore: number;
  severityLabel: SeverityLabel;
}

export function summarizeSlideSeverity(
  input: SlideSeverityInput
): SlideSeveritySummary {
  const severityScore =
    input.fontDriftCount +
    input.fontSizeDriftCount +
    input.spacingDriftCount +
    (input.bulletIndentDriftCount * 2) +
    input.alignmentDriftCount +
    input.lineSpacingDriftCount;

  return {
    severityScore,
    severityLabel: mapSeverityLabel(severityScore)
  };
}

function mapSeverityLabel(score: number): SeverityLabel {
  if (score >= 7) {
    return "high";
  }

  if (score >= 3) {
    return "medium";
  }

  return "low";
}
