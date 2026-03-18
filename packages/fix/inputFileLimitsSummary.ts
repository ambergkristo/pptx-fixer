import { stat } from "node:fs/promises";

export const INPUT_FILE_SIZE_LIMIT_BYTES = 52428800;
export const INPUT_FILE_WARNING_THRESHOLD_BYTES = 41943040;

export interface InputFileLimitsSummary {
  inputFilePresent: boolean;
  inputFileSizeBytes: number;
  sizeLimitBytes: number;
  warningThresholdBytes: number;
  limitsLabel: "withinLimit" | "nearLimit" | "overLimit" | "missingInput";
  summaryLine:
    | "Input file limits could not be assessed because the input file is missing."
    | "Input file size is within the configured basic limit."
    | "Input file size is near the configured basic limit."
    | "Input file size exceeds the configured basic limit.";
}

const SUMMARY_LINE_BY_LIMITS_LABEL = {
  missingInput: "Input file limits could not be assessed because the input file is missing.",
  withinLimit: "Input file size is within the configured basic limit.",
  nearLimit: "Input file size is near the configured basic limit.",
  overLimit: "Input file size exceeds the configured basic limit."
} as const;

export async function summarizeInputFileLimits(
  inputFilePath: string
): Promise<InputFileLimitsSummary> {
  try {
    const inputFileStats = await stat(inputFilePath);
    if (inputFileStats.isFile() === false) {
      return buildMissingInputSummary();
    }

    const inputFileSizeBytes = inputFileStats.size;
    const limitsLabel = inputFileSizeBytes > INPUT_FILE_SIZE_LIMIT_BYTES
      ? "overLimit"
      : inputFileSizeBytes >= INPUT_FILE_WARNING_THRESHOLD_BYTES
      ? "nearLimit"
      : "withinLimit";

    return {
      inputFilePresent: true,
      inputFileSizeBytes,
      sizeLimitBytes: INPUT_FILE_SIZE_LIMIT_BYTES,
      warningThresholdBytes: INPUT_FILE_WARNING_THRESHOLD_BYTES,
      limitsLabel,
      summaryLine: SUMMARY_LINE_BY_LIMITS_LABEL[limitsLabel]
    };
  } catch {
    return buildMissingInputSummary();
  }
}

function buildMissingInputSummary(): InputFileLimitsSummary {
  return {
    inputFilePresent: false,
    inputFileSizeBytes: 0,
    sizeLimitBytes: INPUT_FILE_SIZE_LIMIT_BYTES,
    warningThresholdBytes: INPUT_FILE_WARNING_THRESHOLD_BYTES,
    limitsLabel: "missingInput",
    summaryLine: SUMMARY_LINE_BY_LIMITS_LABEL.missingInput
  };
}
