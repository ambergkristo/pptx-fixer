import path from "node:path";

import { analyzeSlides, loadPresentation } from "../audit/pptxAudit.ts";
import type { BrandFooterStyle, BrandLogoPosition, BrandPresetDefinition } from "./brandPresetCatalog.ts";

export interface TemplateShellSourceDefinition {
  sourceKind: "preset" | "uploaded_template";
  label: string;
  description: string;
  normalizeFontFamily: string;
  templateDefaults: {
    logoPosition: BrandLogoPosition;
    footerStyle: BrandFooterStyle;
  };
}

export function templateShellSourceFromPreset(
  preset: BrandPresetDefinition
): TemplateShellSourceDefinition {
  return {
    sourceKind: "preset",
    label: preset.label,
    description: preset.description,
    normalizeFontFamily: preset.normalizeFontFamily,
    templateDefaults: { ...preset.templateDefaults }
  };
}

export async function resolveUploadedTemplateShellSource(
  templateInputPath: string
): Promise<TemplateShellSourceDefinition> {
  const presentation = await loadPresentation(templateInputPath);
  const auditReport = analyzeSlides(presentation);

  if (auditReport.slideCount === 0) {
    throw new Error("uploaded template is not supported: no slides were detected");
  }

  const stableFontFamily = auditReport.deckStyleFingerprint.fontFamily ?? auditReport.fontDrift.dominantFont;
  if (!stableFontFamily) {
    throw new Error("uploaded template is not supported: no stable dominant font family was detected");
  }

  const roleCounts = auditReport.textRoleSummary.groupCounts;
  const usableRoleGroups =
    roleCounts.title +
    roleCounts.section_title +
    roleCounts.subtitle +
    roleCounts.body +
    roleCounts.bullet_list;
  if (usableRoleGroups === 0) {
    throw new Error("uploaded template is not supported: no usable text roles were detected");
  }

  if (
    auditReport.deckFontUsage.dominantFontFamilyCoverage < 45 &&
    auditReport.fontDriftSeverity === "high"
  ) {
    throw new Error("uploaded template is not supported: typography is too inconsistent to derive a safe shell");
  }

  const label = humanizeTemplateLabel(path.parse(templateInputPath).name);
  const footerStyle: BrandFooterStyle = roleCounts.footer > 0 ? "brand_footer" : "minimal";
  const logoPosition: BrandLogoPosition =
    roleCounts.footer > 0 || roleCounts.note > 0 ? "bottom_right" : "top_right";

  return {
    sourceKind: "uploaded_template",
    label,
    description: `Derived from uploaded template ${path.basename(templateInputPath)}.`,
    normalizeFontFamily: stableFontFamily,
    templateDefaults: {
      logoPosition,
      footerStyle
    }
  };
}

function humanizeTemplateLabel(fileStem: string): string {
  const cleaned = fileStem
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) {
    return "Uploaded Template";
  }

  return cleaned
    .split(" ")
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(" ");
}
