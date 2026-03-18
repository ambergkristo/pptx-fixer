import type { OutputFileMetadataSummary } from "../export/outputFileMetadataSummary.ts";

export interface OutputOverwriteSafetySummary {
  overwriteSafetyLabel: "newFile" | "overwroteExistingFile" | "unknown" | "missingOutput";
  outputExistedBeforeWrite: boolean | null;
  outputPresentAfterWrite: boolean;
  summaryLine:
    | "Output overwrite status could not be determined because the output file is missing."
    | "Output file path existed before write and was overwritten."
    | "Output file path did not exist before write and a new file was produced."
    | "Output overwrite status could not be determined from the available machine-readable signals.";
}

const SUMMARY_LINE_BY_OVERWRITE_SAFETY_LABEL = {
  missingOutput: "Output overwrite status could not be determined because the output file is missing.",
  overwroteExistingFile: "Output file path existed before write and was overwritten.",
  newFile: "Output file path did not exist before write and a new file was produced.",
  unknown: "Output overwrite status could not be determined from the available machine-readable signals."
} as const;

export function summarizeOutputOverwriteSafetySummary(options: {
  outputExistedBeforeWrite: boolean | null;
  outputFileMetadataSummary: OutputFileMetadataSummary;
}): OutputOverwriteSafetySummary {
  const outputPresentAfterWrite = options.outputFileMetadataSummary.outputFilePresent;
  const overwriteSafetyLabel = outputPresentAfterWrite === false
    ? "missingOutput"
    : options.outputExistedBeforeWrite === true
    ? "overwroteExistingFile"
    : options.outputExistedBeforeWrite === false
    ? "newFile"
    : "unknown";

  return {
    overwriteSafetyLabel,
    outputExistedBeforeWrite: options.outputExistedBeforeWrite,
    outputPresentAfterWrite,
    summaryLine: SUMMARY_LINE_BY_OVERWRITE_SAFETY_LABEL[overwriteSafetyLabel]
  };
}
