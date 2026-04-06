export type BrandPresetId =
  | "modern_sans"
  | "editorial_serif"
  | "compact_sans";

export type BrandLogoPosition =
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right";

export type BrandFooterStyle =
  | "none"
  | "minimal"
  | "brand_footer";

export interface BrandPresetDefinition {
  id: BrandPresetId;
  label: string;
  description: string;
  normalizeFontFamily: string;
  templateDefaults: {
    logoPosition: BrandLogoPosition;
    footerStyle: BrandFooterStyle;
  };
}

const BRAND_PRESETS: BrandPresetDefinition[] = [
  {
    id: "modern_sans",
    label: "Modern Sans",
    description: "Clean corporate sans with balanced hierarchy.",
    normalizeFontFamily: "IBM Plex Sans",
    templateDefaults: {
      logoPosition: "top_right",
      footerStyle: "minimal"
    }
  },
  {
    id: "editorial_serif",
    label: "Editorial Serif",
    description: "Presentation serif for narrative-heavy decks.",
    normalizeFontFamily: "Source Serif 4",
    templateDefaults: {
      logoPosition: "top_left",
      footerStyle: "minimal"
    }
  },
  {
    id: "compact_sans",
    label: "Compact Sans",
    description: "Tighter sans preset for dense business updates.",
    normalizeFontFamily: "Manrope",
    templateDefaults: {
      logoPosition: "bottom_right",
      footerStyle: "brand_footer"
    }
  }
];

export function listBrandPresets(): BrandPresetDefinition[] {
  return BRAND_PRESETS.map((preset) => ({
    ...preset,
    templateDefaults: { ...preset.templateDefaults }
  }));
}

export function resolveBrandPreset(
  presetId: string | null | undefined
): BrandPresetDefinition | null {
  if (typeof presetId !== "string") {
    return null;
  }

  const normalizedPresetId = presetId.trim();
  if (normalizedPresetId.length === 0) {
    return null;
  }

  return BRAND_PRESETS.find((preset) => preset.id === normalizedPresetId) ?? null;
}
