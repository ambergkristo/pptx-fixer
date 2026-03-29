import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { ProtectedAlignmentCheck, ProtectedTypographyCheck } from "./masterAcceptance.ts";

export type RecoveryMetricId =
  | "fontFamilyDrift"
  | "fontSizeDrift"
  | "alignmentDrift"
  | "bulletMarkerDrift"
  | "bulletIndentDrift"
  | "lineSpacingValueDrift"
  | "lineSpacingDiagnosticDrift"
  | "paragraphSpacingValueDrift"
  | "paragraphSpacingDiagnosticDrift";

export interface RecoveryGateDeckReference {
  id: string;
  file: string;
  scenario: "master acceptance" | "relevant corpus" | "hostile stress" | "negative/boundary";
  reason: string;
  metrics: RecoveryMetricId[];
  expectUntouched?: boolean;
}

export interface RecoveryGateSource {
  id: string;
  version: string;
  decks: RecoveryGateDeckReference[];
  protectedAlignmentChecks: ProtectedAlignmentCheck[];
  protectedTypographyChecks: ProtectedTypographyCheck[];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourcePath = path.join(repoRoot, "testdata", "corpus", "recoveryGate.json");

export function resolveRecoveryGateSourcePath(): string {
  return sourcePath;
}

export async function readRecoveryGateSource(): Promise<RecoveryGateSource> {
  return JSON.parse(await readFile(sourcePath, "utf8")) as RecoveryGateSource;
}

export function resolveRecoveryGateDeckPath(file: string): string {
  return path.join(repoRoot, "testdata", "corpus", file);
}
