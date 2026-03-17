import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";

import JSZip from "jszip";

export type OutputPackageValidationLabel = "valid" | "invalid";

export interface OutputPackageValidationChecks {
  fileExists: boolean;
  nonEmptyFile: boolean;
  readableZip: boolean;
  hasContentTypes: boolean;
  hasRootRels: boolean;
  hasPresentationPart: boolean;
}

export interface OutputPackageValidationSummary {
  validationLabel: OutputPackageValidationLabel;
  checks: OutputPackageValidationChecks;
  summaryLine: string;
}

export async function validateOutputPackage(
  outputPath: string
): Promise<OutputPackageValidationSummary> {
  const checks: OutputPackageValidationChecks = {
    fileExists: false,
    nonEmptyFile: false,
    readableZip: false,
    hasContentTypes: false,
    hasRootRels: false,
    hasPresentationPart: false
  };

  try {
    await access(outputPath, constants.F_OK);
    checks.fileExists = true;
  } catch {
    return summarizeResult(checks);
  }

  let outputBuffer: Buffer;
  try {
    const outputStats = await stat(outputPath);
    checks.nonEmptyFile = outputStats.size > 0;
    if (!checks.nonEmptyFile) {
      return summarizeResult(checks);
    }

    outputBuffer = await readFile(outputPath);
  } catch {
    return summarizeResult(checks);
  }

  try {
    const archive = await JSZip.loadAsync(outputBuffer);
    checks.readableZip = true;
    checks.hasContentTypes = archive.file("[Content_Types].xml") !== null;
    checks.hasRootRels = archive.file("_rels/.rels") !== null;
    checks.hasPresentationPart = archive.file("ppt/presentation.xml") !== null;
  } catch {
    return summarizeResult(checks);
  }

  return summarizeResult(checks);
}

function summarizeResult(
  checks: OutputPackageValidationChecks
): OutputPackageValidationSummary {
  const validationLabel = Object.values(checks).every(Boolean)
    ? "valid"
    : "invalid";

  return {
    validationLabel,
    checks,
    summaryLine:
      validationLabel === "valid"
        ? "Output PPTX package validation passed."
        : "Output PPTX package validation failed."
  };
}
