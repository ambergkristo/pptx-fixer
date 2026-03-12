import { access, mkdir, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

import type { FixedPptxValidationReport } from "../../packages/export/validateFixedPptx.ts";

export interface InputTarget {
  path: string;
  type: "file" | "directory";
}

export async function resolveInputTarget(inputPath: string): Promise<InputTarget> {
  let inputStats;

  try {
    inputStats = await stat(inputPath);
  } catch {
    throw new Error("input file not found");
  }

  if (inputStats.isDirectory()) {
    return {
      path: inputPath,
      type: "directory"
    };
  }

  if (!hasPptxExtension(inputPath)) {
    throw new Error("file must be .pptx");
  }

  return {
    path: inputPath,
    type: "file"
  };
}

export async function validateInputFile(inputPath: string): Promise<void> {
  const target = await resolveInputTarget(inputPath);
  if (target.type !== "file") {
    throw new Error("file must be .pptx");
  }
}

export function validateOutputPath(outputPath: string): void {
  if (!hasPptxExtension(outputPath)) {
    throw new Error("file must be .pptx");
  }
}

export async function prepareOutputDirectory(outputPath: string): Promise<void> {
  await mkdir(outputPath, { recursive: true });
}

export async function listInputPptxFiles(inputDirectory: string): Promise<string[]> {
  const entries = await readdir(inputDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && hasPptxExtension(entry.name))
    .map((entry) => path.join(inputDirectory, entry.name))
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

export function buildBatchOutputPath(outputDirectory: string, inputFilePath: string): string {
  const parsed = path.parse(inputFilePath);
  return path.join(outputDirectory, `${parsed.name}-fixed.pptx`);
}

export function getReportPath(outputPath: string): string {
  return outputPath.replace(/\.pptx$/i, ".report.json");
}

export function getAuditReportPath(inputPath: string): string {
  return inputPath.replace(/\.pptx$/i, ".audit.json");
}

export function validationPassed(validation: FixedPptxValidationReport): boolean {
  return Object.values(validation).every(Boolean);
}

export function isOutputWriteError(error: unknown): boolean {
  if (!isNodeError(error)) {
    return false;
  }

  return ["EACCES", "EPERM", "EISDIR", "ENOTDIR", "EROFS", "ENOENT"].includes(error.code);
}

export function formatDriftValue(value: number | null): string {
  return value === null ? "n/a" : value.toString();
}

function hasPptxExtension(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".pptx";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
