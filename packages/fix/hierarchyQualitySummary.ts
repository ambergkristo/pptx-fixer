import type { AuditReport } from "../audit/pptxAudit.ts";
import type { TextRole } from "../audit/textRoleAudit.ts";

export type HierarchyQualityAssessmentLabel =
  | "notAssessed"
  | "healthy"
  | "reviewRecommended";

export type HierarchyQualitySignal =
  | "headingBodySizeCompression"
  | "headingBodyRhythmCompression"
  | "crossSlideRoleVariance";

export interface HierarchyQualitySummary {
  assessmentLabel: HierarchyQualityAssessmentLabel;
  modeApplied: boolean;
  allowsReady: boolean;
  blockingSignals: HierarchyQualitySignal[];
  metrics: {
    compressedHeadingGroupCount: number;
    compressedHeadingRhythmCount: number;
    crossSlideRoleVarianceCount: number;
    dominantHeadingToBodySizeRatio: number | null;
  };
  summaryLine: string;
}

const HEADING_ROLES = new Set<TextRole>(["title", "section_title", "subtitle"]);
const VARIANCE_ELIGIBLE_ROLES = ["title", "section_title", "subtitle", "body", "bullet_list"] as const;

export function summarizeHierarchyQualitySummary(input: {
  mode: "minimal" | "standard" | "normalize" | "template";
  inputAudit: AuditReport;
  outputAudit: AuditReport | null;
}): HierarchyQualitySummary {
  if ((input.mode !== "normalize" && input.mode !== "template") || input.outputAudit === null) {
    return {
      assessmentLabel: "notAssessed",
      modeApplied: false,
      allowsReady: true,
      blockingSignals: [],
      metrics: {
        compressedHeadingGroupCount: 0,
        compressedHeadingRhythmCount: 0,
        crossSlideRoleVarianceCount: 0,
        dominantHeadingToBodySizeRatio: null
      },
      summaryLine: "Hierarchy-quality checks were not applied for this processing mode."
    };
  }

  const outputMetrics = collectHierarchyMetrics(input.outputAudit);
  const signals: HierarchyQualitySignal[] = [];

  if (outputMetrics.compressedHeadingGroupCount > 0) {
    signals.push("headingBodySizeCompression");
  }

  if (outputMetrics.compressedHeadingRhythmCount > 0) {
    signals.push("headingBodyRhythmCompression");
  }

  if (outputMetrics.crossSlideRoleVarianceCount > 0) {
    signals.push("crossSlideRoleVariance");
  }

  const assessmentLabel = signals.length === 0 ? "healthy" : "reviewRecommended";

  return {
    assessmentLabel,
    modeApplied: true,
    allowsReady: assessmentLabel === "healthy",
    blockingSignals: signals,
    metrics: outputMetrics,
    summaryLine: summarizeSummaryLine(assessmentLabel, signals)
  };
}

function collectHierarchyMetrics(auditReport: AuditReport): HierarchyQualitySummary["metrics"] {
  let compressedHeadingGroupCount = 0;
  let compressedHeadingRhythmCount = 0;
  const headingRatios: number[] = [];
  const fontSizesByRole = new Map<TextRole, number[]>();

  for (const slide of auditReport.slides) {
    const bodyFontSize = slide.dominantBodyStyle.fontSize;
    const bodySpacingAfter = slide.dominantBodyStyle.spacingAfter;
    const bodyLineSpacing = slide.dominantBodyStyle.lineSpacing?.value ?? null;
    const pairCount = Math.min(slide.paragraphGroups.length, slide.textRoleSummary.groups.length);

    for (let index = 0; index < pairCount; index += 1) {
      const roleGroup = slide.textRoleSummary.groups[index];
      const paragraphGroup = slide.paragraphGroups[index];
      if (!roleGroup || !paragraphGroup) {
        continue;
      }

      if (typeof paragraphGroup.styleSignature.fontSize === "number") {
        const values = fontSizesByRole.get(roleGroup.role) ?? [];
        values.push(paragraphGroup.styleSignature.fontSize);
        fontSizesByRole.set(roleGroup.role, values);
      }

      if (!HEADING_ROLES.has(roleGroup.role)) {
        continue;
      }

      const headingSize = paragraphGroup.styleSignature.fontSize ?? roleGroup.averageFontSize;
      if (typeof headingSize === "number" && typeof bodyFontSize === "number" && bodyFontSize > 0) {
        const ratio = Number.parseFloat((headingSize / bodyFontSize).toFixed(2));
        headingRatios.push(ratio);
        if (ratio <= 1.15) {
          compressedHeadingGroupCount += roleGroup.paragraphCount;
        }
      }

      const headingSpacingAfter = parseSpacingMetric(paragraphGroup.styleSignature.spacingAfter);
      const headingLineSpacing = paragraphGroup.styleSignature.lineSpacing?.value ?? null;
      const matchesBodySpacing = headingSpacingAfter !== null &&
        bodySpacingAfter !== null &&
        Math.abs(headingSpacingAfter - bodySpacingAfter) <= 0.01;
      const matchesBodyLineSpacing = headingLineSpacing !== null &&
        bodyLineSpacing !== null &&
        Math.abs(headingLineSpacing - bodyLineSpacing) <= 0.01;

      if (
        typeof headingSize === "number" &&
        typeof bodyFontSize === "number" &&
        headingSize <= bodyFontSize + 4 &&
        (matchesBodySpacing || matchesBodyLineSpacing)
      ) {
        compressedHeadingRhythmCount += roleGroup.paragraphCount;
      }
    }
  }

  const crossSlideRoleVarianceCount = VARIANCE_ELIGIBLE_ROLES.reduce((total, role) => {
    const values = fontSizesByRole.get(role) ?? [];
    if (values.length < 3) {
      return total;
    }

    const distinctCount = new Set(values.map((value) => value.toString())).size;
    return distinctCount > 1 ? total + 1 : total;
  }, 0);

  const dominantHeadingToBodySizeRatio = headingRatios.length === 0
    ? null
    : Number.parseFloat((headingRatios.reduce((sum, ratio) => sum + ratio, 0) / headingRatios.length).toFixed(2));

  return {
    compressedHeadingGroupCount,
    compressedHeadingRhythmCount,
    crossSlideRoleVarianceCount,
    dominantHeadingToBodySizeRatio
  };
}

function parseSpacingMetric(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : null;
}

function summarizeSummaryLine(
  assessmentLabel: HierarchyQualityAssessmentLabel,
  signals: HierarchyQualitySignal[]
): string {
  if (assessmentLabel === "notAssessed") {
    return "Hierarchy-quality checks were not applied for this processing mode.";
  }

  if (assessmentLabel === "healthy") {
    return "Hierarchy-quality checks passed for this normalized output.";
  }

  if (signals.length === 1 && signals[0] === "crossSlideRoleVariance") {
    return "Normalized output still needs review because the same text role remains visually inconsistent across slides.";
  }

  if (signals.length === 1) {
    return "Normalized output still needs review because heading hierarchy remains too compressed.";
  }

  return "Normalized output still needs review because hierarchy compression and mixed-role variance remain visible.";
}
