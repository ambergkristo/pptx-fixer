export type NormalizeTypographySource = "auto" | "preset" | "custom";

export interface BrandPresetOption {
  id: string;
  label: string;
  description: string;
  normalizeFontFamily: string;
}

export const BRAND_PRESET_OPTIONS: BrandPresetOption[] = [
  {
    id: "modern_sans",
    label: "Modern Sans",
    description: "IBM Plex Sans with a clean corporate tone.",
    normalizeFontFamily: "IBM Plex Sans"
  },
  {
    id: "editorial_serif",
    label: "Editorial Serif",
    description: "Source Serif 4 for narrative-heavy decks.",
    normalizeFontFamily: "Source Serif 4"
  },
  {
    id: "compact_sans",
    label: "Compact Sans",
    description: "Manrope for dense executive update decks.",
    normalizeFontFamily: "Manrope"
  }
];
