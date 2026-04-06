export interface ProcessingModeSummary {
  processingModeLabel: "all" | "fix" | "normalize" | "template" | "audit" | "unknown";
  processingModeAvailable: boolean;
  summaryLine:
    | "Processing mode was captured as full pipeline mode."
    | "Processing mode was captured as fix mode."
    | "Processing mode was captured as normalize mode."
    | "Processing mode was captured as template mode."
    | "Processing mode was captured as audit mode."
    | "Processing mode could not be determined from the available machine-readable signals.";
}

const SUMMARY_LINE_BY_PROCESSING_MODE_LABEL = {
  all: "Processing mode was captured as full pipeline mode.",
  fix: "Processing mode was captured as fix mode.",
  normalize: "Processing mode was captured as normalize mode.",
  template: "Processing mode was captured as template mode.",
  audit: "Processing mode was captured as audit mode.",
  unknown: "Processing mode could not be determined from the available machine-readable signals."
} as const;

export function summarizeProcessingModeSummary(options: {
  mode: string | null;
}): ProcessingModeSummary {
  const processingModeLabel = options.mode === null
    ? "unknown"
    : options.mode === "standard" || options.mode === "all"
    ? "all"
    : options.mode === "normalize"
    ? "normalize"
    : options.mode === "template"
    ? "template"
    : options.mode === "minimal" || options.mode === "fix"
    ? "fix"
    : options.mode === "audit"
    ? "audit"
    : "unknown";
  const processingModeAvailable = processingModeLabel !== "unknown";

  return {
    processingModeLabel,
    processingModeAvailable,
    summaryLine: SUMMARY_LINE_BY_PROCESSING_MODE_LABEL[processingModeLabel]
  };
}
