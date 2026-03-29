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
  type ProtectedTypographyCheck
} from "./masterAcceptance.ts";

export interface ProductImprovementRow {
  file: string;
  scenario: MasterAcceptanceDeckReference["scenario"];
  metric: string;
  before: number;
  after: number;
  judgment: "Better" | "Same" | "Worse";
}

export interface ProtectedTypographyCheckResult {
  file: string;
  slide: number;
  text: string;
  expectedFontFamily: string;
  actualFontFamily: string | null;
  expectedFontSizePt: number;
  actualFontSizePt: number | null;
  reason: string;
  passed: boolean;
}

export interface MasterAcceptanceValidationReport {
  generatedAt: string;
  sourcePath: string;
  artifactDirectory: string;
  masterAcceptance: MasterAcceptanceSource;
  rows: ProductImprovementRow[];
  protectedTypographyChecks: ProtectedTypographyCheckResult[];
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
    fontDriftBefore: number;
    fontDriftAfter: number;
  };
  changedTextRuns: number;
  changedParagraphs: number;
  slidesTouched: number;
  expectedProtectedFamilyRoles: number;
  preservedProtectedFamilyRoles: number;
  protectedTypographyChecks: ProtectedTypographyCheckResult[];
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
    const protectedChecks = await evaluateProtectedTypographyChecks(
      outputPath,
      source.protectedTypographyChecks.filter((check) => check.file === reference.file)
    );
    const familyProtectedChecks = protectedChecks.filter((check) => check.expectedFontFamily !== null);
    const slidesTouched = report.changesBySlide.filter(
      (slide) => slide.fontFamilyChanges > 0 || slide.dominantFontFamilyChanges > 0
    ).length;

    deckResults.push({
      reference,
      outputPath,
      beforeAuditPath,
      afterReportPath,
      verification: {
        fontDriftBefore: report.verification.fontDriftBefore,
        fontDriftAfter: report.verification.fontDriftAfter ?? report.verification.fontDriftBefore
      },
      changedTextRuns: report.totals.fontFamilyChanges,
      changedParagraphs: report.totals.dominantFontFamilyChanges,
      slidesTouched,
      expectedProtectedFamilyRoles: familyProtectedChecks.length,
      preservedProtectedFamilyRoles: familyProtectedChecks.filter((check) => check.passed).length,
      protectedTypographyChecks: protectedChecks
    });
  }

  const rows = deckResults.flatMap((result) => buildRows(result));
  const protectedTypographyChecks = deckResults.flatMap((result) => result.protectedTypographyChecks);
  const failedProtectedChecks = protectedTypographyChecks.filter((check) => !check.passed);
  const masterRows = rows.filter((row) => row.file === source.file);
  const masterFontFamilyImproved = masterRows.some(
    (row) => row.metric === "font family drift count" && row.judgment === "Better"
  );
  const hasWorseBoundarySignal = rows.some(
    (row) => row.scenario === "negative/boundary" && row.judgment === "Worse"
  ) || failedProtectedChecks.some((check) => {
    const deck = source.relevantDecks.find((reference) => reference.file === check.file);
    return deck?.scenario === "negative/boundary";
  });
  const productGotBetter = masterFontFamilyImproved && failedProtectedChecks.length === 0 && !hasWorseBoundarySignal;
  const summary = productGotBetter
    ? "Canonical master font-family drift improved measurably and protected family-role checks stayed intact."
    : "Canonical master font-family proof is incomplete because family drift did not improve enough or boundary-safety checks did not fully hold.";

  const validationReport: MasterAcceptanceValidationReport = {
    generatedAt: new Date().toISOString(),
    sourcePath,
    artifactDirectory,
    masterAcceptance: source,
    rows,
    protectedTypographyChecks,
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
  const lines = [
    "# Master Acceptance Validation",
    "",
    `Generated: ${report.generatedAt}`,
    revisionLabel ? `Revision: ${revisionLabel}` : null,
    `Source of truth: ${report.masterAcceptance.file}`,
    `Source config: ${report.sourcePath}`,
    "",
    "| File | Scenario | Metric | Before | After | Better / Same / Worse |",
    "|------|----------|--------|--------|-------|------------------------|",
    ...report.rows.map(
      (row) => `| ${row.file} | ${row.scenario} | ${row.metric} | ${row.before} | ${row.after} | ${row.judgment} |`
    ),
    "",
    "REAL OUTPUT JUDGMENT",
    `- Did the product get better on real PPTX output? ${report.realOutputJudgment.productGotBetter ? "yes" : "no"}`,
    `- ${report.realOutputJudgment.summary}`
  ].filter((line): line is string => line !== null);

  if (report.protectedTypographyChecks.length > 0) {
    lines.push("", "PROTECTED TYPOGRAPHY CHECKS");
    for (const check of report.protectedTypographyChecks) {
      lines.push(
        `- ${check.file} | slide ${check.slide} | ${check.text} | expected ${check.expectedFontFamily} ${check.expectedFontSizePt}pt | actual ${check.actualFontFamily ?? "unknown"} ${check.actualFontSizePt ?? "unknown"}pt | ${check.passed ? "pass" : "fail"}`
      );
    }
  }

  return lines.join("\n");
}

function buildRows(result: DeckValidationResult): ProductImprovementRow[] {
  const rows: ProductImprovementRow[] = [];
  const metrics: Array<[string, number, number]> = [
    ["font family drift count", result.verification.fontDriftBefore, result.verification.fontDriftAfter],
    ["changed text runs", 0, result.changedTextRuns],
    ["changed paragraphs", 0, result.changedParagraphs],
    ["count of slides touched", 0, result.slidesTouched]
  ];

  if (result.expectedProtectedFamilyRoles > 0) {
    metrics.push([
      "count of preserved legitimate distinct family roles",
      result.expectedProtectedFamilyRoles,
      result.preservedProtectedFamilyRoles
    ]);
  }

  for (const [metric, before, after] of metrics) {
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric,
      before,
      after,
      judgment: compareMetric(metric, before, after)
    });
  }

  if (result.protectedTypographyChecks.length > 0) {
    const failedCheckCount = result.protectedTypographyChecks.filter((check) => !check.passed).length;
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric: "protected typography mutations",
      before: 0,
      after: failedCheckCount,
      judgment: compareMetric("protected typography mutations", 0, failedCheckCount)
    });
  }

  return rows;
}

function compareMetric(metric: string, before: number, after: number): "Better" | "Same" | "Worse" {
  if (
    metric === "changed text runs" ||
    metric === "changed paragraphs" ||
    metric === "count of slides touched" ||
    metric === "count of preserved legitimate distinct family roles"
  ) {
    if (after > before) {
      return "Better";
    }

    if (after < before) {
      return "Worse";
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
    lines.push(`- Font family drift: ${result.verification.fontDriftBefore} -> ${result.verification.fontDriftAfter}`);
    lines.push(`- Changed text runs: ${result.changedTextRuns}`);
    lines.push(`- Changed paragraphs: ${result.changedParagraphs}`);
    lines.push(`- Slides touched: ${result.slidesTouched}`);

    if (result.expectedProtectedFamilyRoles > 0) {
      lines.push(
        `- Preserved legitimate distinct family roles: ${result.preservedProtectedFamilyRoles}/${result.expectedProtectedFamilyRoles}`
      );
    }

    lines.push("");
  }

  lines.push("REAL OUTPUT JUDGMENT");
  lines.push(`- Did the product get better on real PPTX output? ${report.realOutputJudgment.productGotBetter ? "yes" : "no"}`);
  lines.push(`- ${report.realOutputJudgment.summary}`);

  return lines.join("\n");
}

async function evaluateProtectedTypographyChecks(
  filePath: string,
  checks: ProtectedTypographyCheck[]
): Promise<ProtectedTypographyCheckResult[]> {
  if (checks.length === 0) {
    return [];
  }

  const presentation = await loadPresentation(filePath);
  return checks.map((check) => {
    const actual = findParagraphTypography(presentation, check.slide, check.text);
    const passed = actual !== null &&
      actual.fontFamily === check.expectedFontFamily &&
      actual.fontSizePt === check.expectedFontSizePt;

    return {
      file: check.file,
      slide: check.slide,
      text: check.text,
      expectedFontFamily: check.expectedFontFamily,
      actualFontFamily: actual?.fontFamily ?? null,
      expectedFontSizePt: check.expectedFontSizePt,
      actualFontSizePt: actual?.fontSizePt ?? null,
      reason: check.reason,
      passed
    };
  });
}

function findParagraphTypography(
  presentation: LoadedPresentation,
  slideNumber: number,
  expectedText: string
): { fontFamily: string | null; fontSizePt: number | null } | null {
  const slide = presentation.slides.find((entry) => entry.index === slideNumber);
  if (!slide) {
    return null;
  }

  for (const shape of getSlideShapes(slide.xml)) {
    for (const paragraph of getParagraphs(shape)) {
      if (extractParagraphText(paragraph) !== expectedText) {
        continue;
      }

      const runs = getRuns(paragraph);
      if (runs.length === 0) {
        return null;
      }

      const fontFamilies = runs.map((run) => extractExplicitFontFamily(asXmlNode(run.rPr)));
      const fontSizes = runs.map((run) => extractExplicitFontSizePt(asXmlNode(run.rPr)));

      return {
        fontFamily: resolveUniformValue(fontFamilies),
        fontSizePt: resolveUniformValue(fontSizes)
      };
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

function extractExplicitFontFamily(runProperties: XmlNode | null): string | null {
  if (!runProperties) {
    return null;
  }

  if (typeof runProperties.typeface === "string") {
    return runProperties.typeface;
  }

  for (const nodeName of ["latin", "ea", "cs", "sym"]) {
    const node = asXmlNode(runProperties[nodeName]);
    if (node && typeof node.typeface === "string") {
      return node.typeface;
    }
  }

  return null;
}

function extractExplicitFontSizePt(runProperties: XmlNode | null): number | null {
  if (!runProperties) {
    return null;
  }

  const rawSize = runProperties.sz;
  if (typeof rawSize === "number") {
    return rawSize / 100;
  }

  if (typeof rawSize === "string" && rawSize.length > 0) {
    const parsed = Number.parseInt(rawSize, 10);
    return Number.isNaN(parsed) ? null : parsed / 100;
  }

  return null;
}

function resolveUniformValue<T extends string | number>(values: Array<T | null>): T | null {
  if (values.length === 0 || values.some((value) => value === null)) {
    return null;
  }

  const distinctValues = new Set(values);
  return distinctValues.size === 1 ? values[0] : null;
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
