export type NormalizeTypographySource = "auto" | "preset" | "custom";
export type TemplateSourceKind = "preset" | "upload";
export type TemplateLogoPosition = "top_left" | "top_right" | "bottom_left" | "bottom_right";
export type TemplateFooterStyle = "none" | "minimal" | "brand_footer";

export interface BrandPresetOption {
  id: string;
  label: string;
  description: string;
  normalizeFontFamily: string;
  templateDefaults: {
    logoPosition: TemplateLogoPosition;
    footerStyle: TemplateFooterStyle;
  };
}

export const BRAND_PRESET_OPTIONS: BrandPresetOption[] = [
  {
    id: "modern_sans",
    label: "Modern Sans",
    description: "IBM Plex Sans with a clean corporate tone.",
    normalizeFontFamily: "IBM Plex Sans",
    templateDefaults: {
      logoPosition: "top_right",
      footerStyle: "minimal"
    }
  },
  {
    id: "editorial_serif",
    label: "Editorial Serif",
    description: "Source Serif 4 for narrative-heavy decks.",
    normalizeFontFamily: "Source Serif 4",
    templateDefaults: {
      logoPosition: "top_left",
      footerStyle: "minimal"
    }
  },
  {
    id: "compact_sans",
    label: "Compact Sans",
    description: "Manrope for dense executive update decks.",
    normalizeFontFamily: "Manrope",
    templateDefaults: {
      logoPosition: "bottom_right",
      footerStyle: "brand_footer"
    }
  }
];

export const TEMPLATE_LOGO_POSITION_OPTIONS: Array<{
  value: TemplateLogoPosition;
  label: string;
}> = [
  { value: "top_left", label: "Top left" },
  { value: "top_right", label: "Top right" },
  { value: "bottom_left", label: "Bottom left" },
  { value: "bottom_right", label: "Bottom right" }
];

export const TEMPLATE_FOOTER_STYLE_OPTIONS: Array<{
  value: TemplateFooterStyle;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "brand_footer", label: "Brand footer" }
];

export const TEMPLATE_SOURCE_OPTIONS: Array<{
  value: TemplateSourceKind;
  label: string;
  description: string;
}> = [
  { value: "preset", label: "Preset", description: "Use a saved brand preset" },
  { value: "upload", label: "Upload", description: "Derive a shell from a template PPTX" }
];
