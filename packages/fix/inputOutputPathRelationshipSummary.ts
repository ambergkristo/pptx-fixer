import path from "node:path";

export interface InputOutputPathRelationshipSummary {
  pathRelationshipLabel: "samePath" | "differentPath" | "unknown";
  inputPathAvailable: boolean;
  outputPathAvailable: boolean;
  samePath: boolean | null;
  summaryLine:
    | "Input and output paths resolve to the same file path."
    | "Input and output paths resolve to different file paths."
    | "Input and output path relationship could not be determined from the available machine-readable signals.";
}

const SUMMARY_LINE_BY_PATH_RELATIONSHIP_LABEL = {
  samePath: "Input and output paths resolve to the same file path.",
  differentPath: "Input and output paths resolve to different file paths.",
  unknown: "Input and output path relationship could not be determined from the available machine-readable signals."
} as const;

export function summarizeInputOutputPathRelationship(options: {
  inputPath: string | null;
  outputPath: string | null;
}): InputOutputPathRelationshipSummary {
  const inputPathAvailable = typeof options.inputPath === "string";
  const outputPathAvailable = typeof options.outputPath === "string";
  const samePath = inputPathAvailable && outputPathAvailable
    ? path.resolve(options.inputPath) === path.resolve(options.outputPath)
    : null;
  const pathRelationshipLabel = inputPathAvailable === false || outputPathAvailable === false
    ? "unknown"
    : samePath
    ? "samePath"
    : "differentPath";

  return {
    pathRelationshipLabel,
    inputPathAvailable,
    outputPathAvailable,
    samePath,
    summaryLine: SUMMARY_LINE_BY_PATH_RELATIONSHIP_LABEL[pathRelationshipLabel]
  };
}
