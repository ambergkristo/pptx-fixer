import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export interface MasterAcceptanceDeckReference {
  id: string;
  file: string;
  scenario: "master acceptance" | "relevant corpus" | "negative/boundary";
  reason: string;
}

export interface ProtectedTypographyCheck {
  file: string;
  slide: number;
  text: string;
  expectedFontFamily: string;
  expectedFontSizePt: number;
  reason: string;
}

export interface ProtectedAlignmentCheck {
  file: string;
  slide: number;
  text: string;
  expectedAlignment: "left" | "center" | "right" | "justify";
  reason: string;
}

export interface MasterAcceptanceSource {
  id: string;
  version: string;
  file: string;
  sourceType: "synthetic" | "sanitized";
  corpusClass: "mixed-real-world" | "hostile-stress" | "clean-reference";
  eligibility: "eligibleCleanupBoundary" | "manualReviewBoundary";
  expectedOutcome: "ready" | "mostlyReady" | "manualReviewRecommended";
  targetedCleanupCategories: string[];
  relevantDecks: MasterAcceptanceDeckReference[];
  protectedAlignmentChecks?: ProtectedAlignmentCheck[];
  protectedTypographyChecks: ProtectedTypographyCheck[];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourcePath = path.join(repoRoot, "testdata", "corpus", "masterAcceptance.json");

export function resolveRepoRoot(): string {
  return repoRoot;
}

export function resolveMasterAcceptanceSourcePath(): string {
  return sourcePath;
}

export async function readMasterAcceptanceSource(): Promise<MasterAcceptanceSource> {
  return JSON.parse(await readFile(sourcePath, "utf8")) as MasterAcceptanceSource;
}

export function resolveCorpusDeckPath(file: string): string {
  return path.join(repoRoot, "testdata", "corpus", file);
}

export async function resolveMasterAcceptanceDeckPath(): Promise<string> {
  const source = await readMasterAcceptanceSource();
  return resolveCorpusDeckPath(source.file);
}
