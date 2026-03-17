import path from "node:path";
import { stat } from "node:fs/promises";

export interface OutputFileMetadataSummary {
  outputFileName: string;
  outputExtension: string;
  outputFileSizeBytes: number;
  outputFilePresent: boolean;
  summaryLine: string;
}

export async function summarizeOutputFileMetadata(
  outputPath: string
): Promise<OutputFileMetadataSummary> {
  try {
    const outputStats = await stat(outputPath);
    if (!outputStats.isFile()) {
      return {
        outputFileName: "",
        outputExtension: "",
        outputFileSizeBytes: 0,
        outputFilePresent: false,
        summaryLine: "Output file metadata could not be captured because the output file is missing."
      };
    }

    const outputFileName = path.basename(outputPath);

    return {
      outputFileName,
      outputExtension: path.extname(outputFileName).toLowerCase(),
      outputFileSizeBytes: outputStats.size,
      outputFilePresent: true,
      summaryLine: "Output file metadata captured successfully."
    };
  } catch {
    return {
      outputFileName: "",
      outputExtension: "",
      outputFileSizeBytes: 0,
      outputFilePresent: false,
      summaryLine: "Output file metadata could not be captured because the output file is missing."
    };
  }
}
