import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { analyzeSlides, loadPresentation, type LoadedPresentation } from "../audit/pptxAudit.ts";
import { runAllFixes } from "../fix/runAllFixes.ts";
import {
  readMasterAcceptanceSource,
  resolveCorpusDeckPath,
  resolveMasterAcceptanceSourcePath,
  type MasterAcceptanceDeckReference,
  type MasterAcceptanceSource,
  type ProtectedAlignmentCheck
} from "./masterAcceptance.ts";

export interface ProductImprovementRow {
  file: string;
  scenario: MasterAcceptanceDeckReference["scenario"];
  metric: string;
  before: number;
  after: number;
  assessment: "Better" | "Same" | "Worse" | "Recorded" | "None";
  metricKind: "value" | "activity" | "boundary";
}

export interface ProtectedAlignmentCheckResult {
  file: string;
  slide: number;
  text: string;
  expectedAlignment: string;
  actualAlignment: string | null;
  reason: string;
  passed: boolean;
}

export interface MasterAcceptanceValidationReport {
  generatedAt: string;
  sourcePath: string;
  artifactDirectory: string;
  masterAcceptance: MasterAcceptanceSource;
  rows: ProductImprovementRow[];
  protectedAlignmentChecks: ProtectedAlignmentCheckResult[];
  realOutputJudgment: {
    productGotBetter: boolean;
    summary: string;
  };
}

interface DeckValidationResult {
  reference: MasterAcceptanceDeckReference;
  outputPath: string;
  beforeAuditPath: string;
  afterReportPath: string;
  verification: {
    alignmentDriftBefore: number;
    alignmentDriftAfter: number;
  };
  changedParagraphs: number;
  slidesTouched: number;
  expectedProtectedAlignmentRoles: number;
  preservedProtectedAlignmentRoles: number;
  protectedAlignmentChecks: ProtectedAlignmentCheckResult[];
}

export async function runMasterAcceptanceValidation(
  artifactDirectory: string
): Promise<MasterAcceptanceValidationReport> {
  const source = await readMasterAcceptanceSource();
  const sourcePath = resolveMasterAcceptanceSourcePath();
  await mkdir(artifactDirectory, { recursive: true });

  const references: MasterAcceptanceDeckReference[] = [
    {
      id: source.id,
      file: source.file,
      scenario: "master acceptance",
      reason: "canonical master output truth source"
    },
    ...source.relevantDecks
  ];

  const deckResults: DeckValidationResult[] = [];

  for (const reference of references) {
    const inputPath = resolveCorpusDeckPath(reference.file);
    const beforeAudit = analyzeSlides(await loadPresentation(inputPath));
    const outputPath = path.join(artifactDirectory, `${sanitizeFileName(reference.id)}-fixed.pptx`);
    const report = await runAllFixes(inputPath, outputPath);
    const beforeAuditPath = path.join(artifactDirectory, `${sanitizeFileName(reference.id)}.before.audit.json`);
    const afterReportPath = path.join(artifactDirectory, `${sanitizeFileName(reference.id)}.after.report.json`);
    await writeFile(beforeAuditPath, JSON.stringify(beforeAudit, null, 2), "utf8");
    await writeFile(afterReportPath, JSON.stringify(report, null, 2), "utf8");

    const alignmentChecks = await evaluateProtectedAlignmentChecks(
      outputPath,
      (source.protectedAlignmentChecks ?? []).filter((check) => check.file === reference.file)
    );
    const changedParagraphs = report.totals.alignmentChanges +
      report.changesBySlide.reduce((total, slide) => total + slide.dominantBodyStyleAlignmentChanges, 0);
    const slidesTouched = report.changesBySlide.filter(
      (slide) => slide.alignmentChanges > 0 || slide.dominantBodyStyleAlignmentChanges > 0
    ).length;

    deckResults.push({
      reference,
      outputPath,
      beforeAuditPath,
      afterReportPath,
      verification: {
        alignmentDriftBefore: report.verification.alignmentDriftBefore,
        alignmentDriftAfter: report.verification.alignmentDriftAfter ?? report.verification.alignmentDriftBefore
      },
      changedParagraphs,
      slidesTouched,
      expectedProtectedAlignmentRoles: alignmentChecks.length,
      preservedProtectedAlignmentRoles: alignmentChecks.filter((check) => check.passed).length,
      protectedAlignmentChecks: alignmentChecks
    });
  }

  const rows = deckResults.flatMap((result) => buildRows(result));
  const protectedAlignmentChecks = deckResults.flatMap((result) => result.protectedAlignmentChecks);
  const failedProtectedChecks = protectedAlignmentChecks.filter((check) => !check.passed);
  const masterRows = rows.filter((row) => row.file === source.file);
  const masterAlignmentImproved = masterRows.some(
    (row) => row.metric === "alignment drift count" && row.assessment === "Better"
  );
  const hasWorseBoundarySignal = rows.some(
    (row) => row.scenario === "negative/boundary" && row.assessment === "Worse"
  ) || failedProtectedChecks.some((check) => {
    const deck = source.relevantDecks.find((reference) => reference.file === check.file);
    return deck?.scenario === "negative/boundary";
  });
  const productGotBetter = masterAlignmentImproved && failedProtectedChecks.length === 0 && !hasWorseBoundarySignal;
  const summary = productGotBetter
    ? "Canonical master alignment drift improved measurably and protected centered/right alignment roles stayed intact."
    : "Canonical master alignment proof is incomplete because alignment drift did not improve enough or boundary-safety checks did not fully hold.";

  const validationReport: MasterAcceptanceValidationReport = {
    generatedAt: new Date().toISOString(),
    sourcePath,
    artifactDirectory,
    masterAcceptance: source,
    rows,
    protectedAlignmentChecks,
    realOutputJudgment: {
      productGotBetter,
      summary
    }
  };

  await writeFile(
    path.join(artifactDirectory, "master-acceptance-validation.report.json"),
    JSON.stringify(validationReport, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(artifactDirectory, "PRODUCT_IMPROVEMENT_TABLE.md"),
    renderProductImprovementMarkdown(validationReport),
    "utf8"
  );
  await writeFile(
    path.join(artifactDirectory, "REAL_OUTPUT_NOTE.md"),
    renderRealOutputNote(validationReport, deckResults),
    "utf8"
  );

  return validationReport;
}

export function renderProductImprovementMarkdown(
  report: MasterAcceptanceValidationReport,
  revisionLabel?: string
): string {
  const valueRows = report.rows.filter((row) => row.metricKind === "value");
  const activityRows = report.rows.filter((row) => row.metricKind === "activity");
  const boundaryRows = report.rows.filter((row) => row.metricKind === "boundary");

  const lines = [
    "# Master Acceptance Validation",
    "",
    `Generated: ${report.generatedAt}`,
    revisionLabel ? `Revision: ${revisionLabel}` : null,
    `Source of truth: ${report.masterAcceptance.file}`,
    `Source config: ${report.sourcePath}`,
    "",
    "VALUE METRICS",
    "",
    "| File | Scenario | Metric | Before | After | Assessment |",
    "|------|----------|--------|--------|-------|------------|",
    ...valueRows.map(renderRow),
    "",
    "ACTIVITY METRICS",
    "",
    "| File | Scenario | Metric | Before | After | Assessment |",
    "|------|----------|--------|--------|-------|------------|",
    ...activityRows.map(renderRow),
    "",
    "BOUNDARY METRICS",
    "",
    "| File | Scenario | Metric | Before | After | Assessment |",
    "|------|----------|--------|--------|-------|------------|",
    ...boundaryRows.map(renderRow),
    "",
    "REAL OUTPUT JUDGMENT",
    `- Did the product get better on real PPTX output? ${report.realOutputJudgment.productGotBetter ? "yes" : "no"}`,
    `- ${report.realOutputJudgment.summary}`
  ].filter((line): line is string => line !== null);

  if (report.protectedAlignmentChecks.length > 0) {
    lines.push("", "PROTECTED ALIGNMENT CHECKS");
    for (const check of report.protectedAlignmentChecks) {
      lines.push(
        `- ${check.file} | slide ${check.slide} | ${check.text} | expected ${check.expectedAlignment} | actual ${check.actualAlignment ?? "unknown"} | ${check.passed ? "pass" : "fail"}`
      );
    }
  }

  return lines.join("\n");
}

function buildRows(result: DeckValidationResult): ProductImprovementRow[] {
  const rows: ProductImprovementRow[] = [];
  rows.push({
    file: result.reference.file,
    scenario: result.reference.scenario,
    metric: "alignment drift count",
    before: result.verification.alignmentDriftBefore,
    after: result.verification.alignmentDriftAfter,
    assessment: compareTrackedMetric("value", result.verification.alignmentDriftBefore, result.verification.alignmentDriftAfter),
    metricKind: "value"
  });
  rows.push({
    file: result.reference.file,
    scenario: result.reference.scenario,
    metric: "changed paragraphs",
    before: 0,
    after: result.changedParagraphs,
    assessment: compareActivityMetric(result.changedParagraphs),
    metricKind: "activity"
  });
  rows.push({
    file: result.reference.file,
    scenario: result.reference.scenario,
    metric: "count of slides touched",
    before: 0,
    after: result.slidesTouched,
    assessment: compareActivityMetric(result.slidesTouched),
    metricKind: "activity"
  });

  if (result.expectedProtectedAlignmentRoles > 0) {
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric: "count of preserved legitimate centered/right-aligned roles",
      before: result.expectedProtectedAlignmentRoles,
      after: result.preservedProtectedAlignmentRoles,
      assessment: compareTrackedMetric("boundary", result.expectedProtectedAlignmentRoles, result.preservedProtectedAlignmentRoles),
      metricKind: "boundary"
    });
  }

  if (result.protectedAlignmentChecks.length > 0) {
    const failedCheckCount = result.protectedAlignmentChecks.filter((check) => !check.passed).length;
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric: "protected alignment mutations",
      before: 0,
      after: failedCheckCount,
      assessment: compareTrackedMetric("boundary", 0, failedCheckCount),
      metricKind: "boundary"
    });
  }

  return rows;
}

function compareTrackedMetric(
  kind: "value" | "boundary",
  before: number,
  after: number
): "Better" | "Same" | "Worse" {
  if (kind === "boundary") {
    if (after > before) {
      return "Worse";
    }

    if (after < before) {
      return "Better";
    }

    return "Same";
  }

  if (after < before) {
    return "Better";
  }

  if (after > before) {
    return "Worse";
  }

  return "Same";
}

function compareActivityMetric(after: number): "Recorded" | "None" {
  return after > 0 ? "Recorded" : "None";
}

function renderRealOutputNote(
  report: MasterAcceptanceValidationReport,
  deckResults: DeckValidationResult[]
): string {
  const lines = [
    "# Real Output Note",
    "",
    `Generated: ${report.generatedAt}`,
    `Master deck: ${report.masterAcceptance.file}`,
    ""
  ];

  for (const result of deckResults) {
    lines.push(`## ${result.reference.file}`);
    lines.push(`- Scenario: ${result.reference.scenario}`);
    lines.push(`- Output PPTX: ${result.outputPath}`);
    lines.push(`- Before audit JSON: ${result.beforeAuditPath}`);
    lines.push(`- After report JSON: ${result.afterReportPath}`);
    lines.push(`- Alignment drift: ${result.verification.alignmentDriftBefore} -> ${result.verification.alignmentDriftAfter}`);
    lines.push(`- Changed paragraphs: ${result.changedParagraphs}`);
    lines.push(`- Slides touched: ${result.slidesTouched}`);

    if (result.expectedProtectedAlignmentRoles > 0) {
      lines.push(
        `- Preserved legitimate centered/right-aligned roles: ${result.preservedProtectedAlignmentRoles}/${result.expectedProtectedAlignmentRoles}`
      );
    }

    lines.push("");
  }

  lines.push("REAL OUTPUT JUDGMENT");
  lines.push(`- Did the product get better on real PPTX output? ${report.realOutputJudgment.productGotBetter ? "yes" : "no"}`);
  lines.push(`- ${report.realOutputJudgment.summary}`);

  return lines.join("\n");
}

function renderRow(row: ProductImprovementRow): string {
  return `| ${row.file} | ${row.scenario} | ${row.metric} | ${row.before} | ${row.after} | ${row.assessment} |`;
}

async function evaluateProtectedAlignmentChecks(
  filePath: string,
  checks: ProtectedAlignmentCheck[]
): Promise<ProtectedAlignmentCheckResult[]> {
  if (checks.length === 0) {
    return [];
  }

  const presentation = await loadPresentation(filePath);
  return checks.map((check) => {
    const actualAlignment = findParagraphAlignment(presentation, check.slide, check.text);
    const passed = actualAlignment === check.expectedAlignment;

    return {
      file: check.file,
      slide: check.slide,
      text: check.text,
      expectedAlignment: check.expectedAlignment,
      actualAlignment,
      reason: check.reason,
      passed
    };
  });
}

function findParagraphAlignment(
  presentation: LoadedPresentation,
  slideNumber: number,
  expectedText: string
): string | null {
  const slide = presentation.slides.find((entry) => entry.index === slideNumber);
  if (!slide) {
    return null;
  }

  for (const shape of getSlideShapes(slide.xml)) {
    for (const paragraph of getParagraphs(shape)) {
      if (extractParagraphText(paragraph) !== expectedText) {
        continue;
      }

      return extractParagraphAlignment(paragraph);
    }
  }

  return null;
}

type XmlNode = Record<string, unknown>;

function getSlideShapes(slideXml: XmlNode): XmlNode[] {
  return asArray(asXmlNode(asXmlNode(asXmlNode(slideXml.sld)?.cSld)?.spTree)?.sp);
}

function getParagraphs(shape: XmlNode): XmlNode[] {
  return asArray(asXmlNode(shape.txBody)?.p);
}

function getRuns(paragraph: XmlNode): XmlNode[] {
  return [...asArray(paragraph.r), ...asArray(paragraph.fld)].flatMap((entry) => {
    const node = asXmlNode(entry);
    return node ? [node] : [];
  });
}

function extractParagraphText(paragraph: XmlNode): string {
  return getRuns(paragraph)
    .map((run) => {
      const value = run.t;
      return typeof value === "string" ? value : "";
    })
    .join("")
    .trim();
}

function extractParagraphAlignment(paragraph: XmlNode): string | null {
  const paragraphProperties = asXmlNode(paragraph.pPr);
  if (!paragraphProperties || typeof paragraphProperties.algn !== "string") {
    return null;
  }

  return normalizeAlignmentValue(paragraphProperties.algn);
}

function normalizeAlignmentValue(value: string): string | null {
  if (value === "l") {
    return "left";
  }

  if (value === "ctr") {
    return "center";
  }

  if (value === "r") {
    return "right";
  }

  if (value === "just") {
    return "justify";
  }

  return value.length > 0 ? value : null;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function asXmlNode(value: unknown): XmlNode | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as XmlNode
    : null;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value as T];
}
