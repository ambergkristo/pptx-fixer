import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

import JSZip from "jszip";

import { loadPresentation, type LoadedPresentation } from "../audit/pptxAudit.ts";

export interface FixedPptxValidationReport {
  outputExists: boolean;
  isZip: boolean;
  coreEntriesPresent: boolean;
  reloadable: boolean;
  slideCountMatches: boolean;
}

export interface FixedPptxValidationResult {
  validation: FixedPptxValidationReport;
  presentation: LoadedPresentation | null;
}

const REQUIRED_CORE_ENTRIES = [
  "[Content_Types].xml",
  "ppt/presentation.xml",
  "ppt/_rels/presentation.xml.rels"
] as const;

export async function validateFixedPptx(
  outputPath: string,
  expectedSlideCount: number
): Promise<FixedPptxValidationResult> {
  const validation: FixedPptxValidationReport = {
    outputExists: false,
    isZip: false,
    coreEntriesPresent: false,
    reloadable: false,
    slideCountMatches: false
  };

  try {
    await access(outputPath, constants.F_OK);
    validation.outputExists = true;
  } catch {
    return {
      validation,
      presentation: null
    };
  }

  try {
    const outputBuffer = await readFile(outputPath);
    const archive = await JSZip.loadAsync(outputBuffer);
    validation.isZip = true;
    validation.coreEntriesPresent = REQUIRED_CORE_ENTRIES.every(
      (entryPath) => archive.file(entryPath) !== null
    );
  } catch {
    return {
      validation,
      presentation: null
    };
  }

  try {
    const presentation = await loadPresentation(outputPath);
    validation.reloadable = true;
    validation.slideCountMatches = presentation.slides.length === expectedSlideCount;

    return {
      validation,
      presentation
    };
  } catch {
    return {
      validation,
      presentation: null
    };
  }
}
