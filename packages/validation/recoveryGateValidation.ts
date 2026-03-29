import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { analyzeSlides, loadPresentation, type AuditReport, type LoadedPresentation } from "../audit/pptxAudit.ts";
import { runAllFixes, type RunAllFixesReport } from "../fix/runAllFixes.ts";
import { readMasterAcceptanceSource } from "./masterAcceptance.ts";
import {
  readRecoveryGateSource,
  resolveRecoveryGateDeckPath,
  resolveRecoveryGateSourcePath,
  type RecoveryGateDeckReference,
  type RecoveryGateSource,
  type RecoveryMetricId
} from "./recoveryGate.ts";

export interface RecoveryGateMetricRow {
  file: string;
  scenario: RecoveryGateDeckReference["scenario"];
  metric: string;
  before: number;
  after: number;
  assessment: "Better" | "Same" | "Worse" | "Recorded" | "None";
  metricKind: "value" | "diagnostic" | "activity" | "boundary";
}

export interface RecoveryGateCheckResult {
  kind: "alignment" | "typography";
  file: string;
  slide: number;
  text: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  reason: string;
}

export interface RecoveryGateValidationReport {
  generatedAt: string;
  sourcePath: string;
  artifactDirectory: string;
  masterAcceptancePath: string;
  rows: RecoveryGateMetricRow[];
  checkResults: RecoveryGateCheckResult[];
  realOutputJudgment: {
    productGotBetter: boolean;
    summary: string;
  };
}

interface DeckMetricSnapshot {
  fontFamilyDrift: number;
  fontSizeDrift: number;
  alignmentDrift: number;
  bulletMarkerDrift: number;
  bulletIndentDrift: number;
  lineSpacingValueDrift: number;
  lineSpacingDiagnosticDrift: number;
  paragraphSpacingValueDrift: number;
  paragraphSpacingDiagnosticDrift: number;
}

interface DeckValidationResult {
  reference: RecoveryGateDeckReference;
  outputPath: string;
  beforeAuditPath: string;
  afterReportPath: string;
  beforeMetrics: DeckMetricSnapshot;
  afterMetrics: DeckMetricSnapshot;
  changedTextRuns: number;
  changedParagraphs: number;
  slidesTouched: number;
  boundaryMutations: number;
  checkResults: RecoveryGateCheckResult[];
}

const METRIC_LABELS: Record<RecoveryMetricId, { label: string; kind: "value" | "diagnostic" }> = {
  fontFamilyDrift: { label: "font family drift count", kind: "value" },
  fontSizeDrift: { label: "font size drift count", kind: "value" },
  alignmentDrift: { label: "alignment drift count", kind: "value" },
  bulletMarkerDrift: { label: "bullet marker drift count", kind: "value" },
  bulletIndentDrift: { label: "bullet indent drift count", kind: "value" },
  lineSpacingValueDrift: { label: "line spacing value drift count", kind: "value" },
  lineSpacingDiagnosticDrift: { label: "line spacing diagnostic count", kind: "diagnostic" },
  paragraphSpacingValueDrift: { label: "paragraph spacing value drift count", kind: "value" },
  paragraphSpacingDiagnosticDrift: { label: "paragraph spacing diagnostic count", kind: "diagnostic" }
};

export async function runRecoveryGateValidation(
  artifactDirectory: string
): Promise<RecoveryGateValidationReport> {
  const recoverySource = await readRecoveryGateSource();
  const masterAcceptance = await readMasterAcceptanceSource();
  await mkdir(artifactDirectory, { recursive: true });

  const deckResults: DeckValidationResult[] = [];

  for (const reference of recoverySource.decks) {
    const inputPath = resolveRecoveryGateDeckPath(reference.file);
    const beforeAudit = analyzeSlides(await loadPresentation(inputPath));
    const outputPath = path.join(artifactDirectory, `${sanitizeFileName(reference.id)}-fixed.pptx`);
    const report = await runAllFixes(inputPath, outputPath);
    const afterAudit = analyzeSlides(await loadPresentation(outputPath));
    const beforeAuditPath = path.join(artifactDirectory, `${sanitizeFileName(reference.id)}.before.audit.json`);
    const afterReportPath = path.join(artifactDirectory, `${sanitizeFileName(reference.id)}.after.report.json`);
    await writeFile(beforeAuditPath, JSON.stringify(beforeAudit, null, 2), "utf8");
    await writeFile(afterReportPath, JSON.stringify(report, null, 2), "utf8");

    const beforeMetrics = summarizeDeckMetrics(beforeAudit);
    const afterMetrics = summarizeDeckMetrics(afterAudit);
    const checkResults = [
      ...(await evaluateAlignmentChecks(outputPath, recoverySource, reference.file)),
      ...(await evaluateTypographyChecks(outputPath, recoverySource, reference.file))
    ];
    const changedTextRuns = report.totals.fontFamilyChanges + report.totals.fontSizeChanges;
    const changedParagraphs =
      report.totals.spacingChanges +
      report.totals.bulletChanges +
      report.totals.alignmentChanges +
      report.totals.lineSpacingChanges +
      report.totals.dominantBodyStyleChanges +
      report.totals.dominantFontFamilyChanges +
      report.totals.dominantFontSizeChanges;
    const slidesTouched = report.changesBySlide.length;

    deckResults.push({
      reference,
      outputPath,
      beforeAuditPath,
      afterReportPath,
      beforeMetrics,
      afterMetrics,
      changedTextRuns,
      changedParagraphs,
      slidesTouched,
      boundaryMutations: checkResults.filter((check) => !check.passed).length,
      checkResults
    });
  }

  const rows = deckResults.flatMap((result) => buildRows(result));
  const checkResults = deckResults.flatMap((result) => result.checkResults);
  const productGotBetter = evaluateProductImprovement(deckResults);
  const summary = productGotBetter
    ? "Canonical master output improved, hostile recovery deck now closes the stressed value metrics, and boundary decks stayed truthful."
    : "Recovery gate remains incomplete because master or hostile value metrics did not improve enough, or a boundary deck regressed.";

  const validationReport: RecoveryGateValidationReport = {
    generatedAt: new Date().toISOString(),
    sourcePath: resolveRecoveryGateSourcePath(),
    artifactDirectory,
    masterAcceptancePath: masterAcceptance.file,
    rows,
    checkResults,
    realOutputJudgment: {
      productGotBetter,
      summary
    }
  };

  await writeFile(
    path.join(artifactDirectory, "recovery-gate-validation.report.json"),
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

function summarizeDeckMetrics(auditReport: AuditReport): DeckMetricSnapshot {
  return {
    fontFamilyDrift: auditReport.fontDrift.driftRuns.reduce((total, run) => total + run.count, 0),
    fontSizeDrift: auditReport.fontSizeDrift.driftRuns.reduce((total, run) => total + run.count, 0),
    alignmentDrift: auditReport.alignmentDriftCount,
    bulletMarkerDrift: auditReport.bulletIndentDrift.driftParagraphs.filter((entry) => entry.reason.startsWith("marker mismatch")).length,
    bulletIndentDrift: auditReport.bulletIndentDrift.driftParagraphs.filter((entry) => !entry.reason.startsWith("marker mismatch")).length,
    lineSpacingValueDrift: auditReport.lineSpacingDrift.driftParagraphs.filter((entry) => entry.lineSpacing !== null).length,
    lineSpacingDiagnosticDrift: auditReport.lineSpacingDrift.driftParagraphs.filter((entry) => entry.lineSpacing === null).length,
    paragraphSpacingValueDrift: auditReport.spacingDrift.driftParagraphs.filter(
      (entry) => entry.spacingBefore !== null || entry.spacingAfter !== null
    ).length,
    paragraphSpacingDiagnosticDrift: auditReport.spacingDrift.driftParagraphs.filter(
      (entry) => entry.spacingBefore === null && entry.spacingAfter === null
    ).length
  };
}

function buildRows(result: DeckValidationResult): RecoveryGateMetricRow[] {
  const rows: RecoveryGateMetricRow[] = [];

  for (const metricId of result.reference.metrics) {
    const descriptor = METRIC_LABELS[metricId];
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric: descriptor.label,
      before: result.beforeMetrics[metricId],
      after: result.afterMetrics[metricId],
      assessment: compareMetric(descriptor.kind, result.beforeMetrics[metricId], result.afterMetrics[metricId]),
      metricKind: descriptor.kind
    });
  }

  if (result.reference.expectUntouched) {
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric: "boundary mutations",
      before: 0,
      after: result.changedTextRuns + result.changedParagraphs + result.boundaryMutations,
      assessment: compareMetric("boundary", 0, result.changedTextRuns + result.changedParagraphs + result.boundaryMutations),
      metricKind: "boundary"
    });
  } else {
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric: "changed text runs",
      before: 0,
      after: result.changedTextRuns,
      assessment: compareActivityMetric(result.changedTextRuns),
      metricKind: "activity"
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
  }

  const alignmentChecks = result.checkResults.filter((entry) => entry.kind === "alignment");
  if (alignmentChecks.length > 0) {
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric: "count of preserved legitimate centered/right-aligned roles",
      before: alignmentChecks.length,
      after: alignmentChecks.filter((entry) => entry.passed).length,
      assessment: comparePreservedRoleMetric(alignmentChecks.length, alignmentChecks.filter((entry) => entry.passed).length),
      metricKind: "boundary"
    });
  }

  const typographyChecks = result.checkResults.filter((entry) => entry.kind === "typography");
  if (typographyChecks.length > 0) {
    rows.push({
      file: result.reference.file,
      scenario: result.reference.scenario,
      metric: "count of preserved legitimate distinct family/size roles",
      before: typographyChecks.length,
      after: typographyChecks.filter((entry) => entry.passed).length,
      assessment: comparePreservedRoleMetric(typographyChecks.length, typographyChecks.filter((entry) => entry.passed).length),
      metricKind: "boundary"
    });
  }

  return rows;
}

function compareMetric(
  kind: "value" | "diagnostic" | "boundary",
  before: number,
  after: number
): "Better" | "Same" | "Worse" {
  if (kind === "diagnostic" || kind === "boundary") {
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

function comparePreservedRoleMetric(before: number, after: number): "Better" | "Same" | "Worse" {
  if (after < before) {
    return "Worse";
  }

  if (after > before) {
    return "Better";
  }

  return "Same";
}

function evaluateProductImprovement(results: DeckValidationResult[]): boolean {
  const masterResult = results.find((result) => result.reference.scenario === "master acceptance");
  const hostileResult = results.find((result) => result.reference.file === "hostile/cleandeck-chaos-gate-v1.pptx");
  const boundaryResults = results.filter((result) => result.reference.scenario === "negative/boundary");

  if (!masterResult || !hostileResult) {
    return false;
  }

  const masterImproved = masterResult.reference.metrics.some((metricId) => masterResult.afterMetrics[metricId] < masterResult.beforeMetrics[metricId]);
  const hostileValueClosed = hostileResult.reference.metrics
    .filter((metricId) => METRIC_LABELS[metricId].kind === "value")
    .every((metricId) => hostileResult.afterMetrics[metricId] === 0 && hostileResult.beforeMetrics[metricId] > 0);
  const boundariesStayedSafe = boundaryResults.every(
    (result) =>
      result.changedTextRuns === 0 &&
      result.changedParagraphs === 0 &&
      result.boundaryMutations === 0 &&
      result.reference.metrics.every((metricId) => result.afterMetrics[metricId] <= result.beforeMetrics[metricId])
  );

  return masterImproved && hostileValueClosed && boundariesStayedSafe;
}

async function evaluateAlignmentChecks(
  filePath: string,
  source: RecoveryGateSource,
  file: string
): Promise<RecoveryGateCheckResult[]> {
  const checks = source.protectedAlignmentChecks.filter((check) => check.file === file);
  if (checks.length === 0) {
    return [];
  }

  const presentation = await loadPresentation(filePath);
  return checks.map((check) => {
    const actualAlignment = findParagraphAlignment(presentation, check.slide, check.text);
    return {
      kind: "alignment",
      file: check.file,
      slide: check.slide,
      text: check.text,
      expected: check.expectedAlignment,
      actual: actualAlignment,
      passed: actualAlignment === check.expectedAlignment,
      reason: check.reason
    };
  });
}

async function evaluateTypographyChecks(
  filePath: string,
  source: RecoveryGateSource,
  file: string
): Promise<RecoveryGateCheckResult[]> {
  const checks = source.protectedTypographyChecks.filter((check) => check.file === file);
  if (checks.length === 0) {
    return [];
  }

  const presentation = await loadPresentation(filePath);
  return checks.map((check) => {
    const actualTypography = findParagraphTypography(presentation, check.slide, check.text);
    const expected = `${check.expectedFontFamily} ${check.expectedFontSizePt}pt`;
    const actual = actualTypography ? `${actualTypography.fontFamily} ${actualTypography.fontSizePt}pt` : null;
    return {
      kind: "typography",
      file: check.file,
      slide: check.slide,
      text: check.text,
      expected,
      actual,
      passed: actualTypography?.fontFamily === check.expectedFontFamily && actualTypography?.fontSizePt === check.expectedFontSizePt,
      reason: check.reason
    };
  });
}

type XmlNode = Record<string, unknown>;

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

function findParagraphTypography(
  presentation: LoadedPresentation,
  slideNumber: number,
  expectedText: string
): { fontFamily: string; fontSizePt: number } | null {
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

      const fontFamilies = runs.map((run) => extractRunFontFamily(run));
      const fontSizes = runs.map((run) => extractRunFontSize(run));
      if (fontFamilies.some((value) => value === null) || fontSizes.some((value) => value === null)) {
        return null;
      }

      const distinctFamilies = new Set(fontFamilies);
      const distinctSizes = new Set(fontSizes);
      if (distinctFamilies.size !== 1 || distinctSizes.size !== 1) {
        return null;
      }

      return {
        fontFamily: fontFamilies[0]!,
        fontSizePt: fontSizes[0]!
      };
    }
  }

  return null;
}

function renderProductImprovementMarkdown(report: RecoveryGateValidationReport): string {
  const valueRows = report.rows.filter((row) => row.metricKind === "value");
  const diagnosticRows = report.rows.filter((row) => row.metricKind === "diagnostic");
  const activityRows = report.rows.filter((row) => row.metricKind === "activity");
  const boundaryRows = report.rows.filter((row) => row.metricKind === "boundary");

  return [
    "# Recovery Gate Validation",
    "",
    `Generated: ${report.generatedAt}`,
    `Master acceptance PPTX: ${report.masterAcceptancePath}`,
    `Source config: ${report.sourcePath}`,
    "",
    "VALUE METRICS",
    "",
    "| File | Scenario | Metric | Before | After | Assessment |",
    "|------|----------|--------|--------|-------|------------|",
    ...valueRows.map(renderRow),
    "",
    "DIAGNOSTIC METRICS",
    "",
    "| File | Scenario | Metric | Before | After | Assessment |",
    "|------|----------|--------|--------|-------|------------|",
    ...diagnosticRows.map(renderRow),
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
    `- ${report.realOutputJudgment.summary}`,
    "",
    "BOUNDARY CHECKS",
    ...report.checkResults.map(
      (check) => `- ${check.file} | slide ${check.slide} | ${check.text} | expected ${check.expected} | actual ${check.actual ?? "unknown"} | ${check.passed ? "pass" : "fail"}`
    )
  ].join("\n");
}

function renderRealOutputNote(
  report: RecoveryGateValidationReport,
  results: DeckValidationResult[]
): string {
  const lines = [
    "# Recovery Gate Real Output Note",
    "",
    `Generated: ${report.generatedAt}`,
    `Master acceptance PPTX: ${report.masterAcceptancePath}`,
    ""
  ];

  for (const result of results) {
    lines.push(`## ${result.reference.file}`);
    lines.push(`- Scenario: ${result.reference.scenario}`);
    lines.push(`- Output PPTX: ${result.outputPath}`);
    lines.push(`- Before audit JSON: ${result.beforeAuditPath}`);
    lines.push(`- After report JSON: ${result.afterReportPath}`);
    lines.push(`- Changed text runs: ${result.changedTextRuns}`);
    lines.push(`- Changed paragraphs: ${result.changedParagraphs}`);
    lines.push(`- Slides touched: ${result.slidesTouched}`);
    lines.push("");
  }

  lines.push("REAL OUTPUT JUDGMENT");
  lines.push(`- Did the product get better on real PPTX output? ${report.realOutputJudgment.productGotBetter ? "yes" : "no"}`);
  lines.push(`- ${report.realOutputJudgment.summary}`);
  return lines.join("\n");
}

function renderRow(row: RecoveryGateMetricRow): string {
  return `| ${row.file} | ${row.scenario} | ${row.metric} | ${row.before} | ${row.after} | ${row.assessment} |`;
}

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

  if (paragraphProperties.algn === "l") {
    return "left";
  }
  if (paragraphProperties.algn === "ctr") {
    return "center";
  }
  if (paragraphProperties.algn === "r") {
    return "right";
  }
  if (paragraphProperties.algn === "just") {
    return "justify";
  }

  return paragraphProperties.algn;
}

function extractRunFontFamily(run: XmlNode): string | null {
  const runProperties = asXmlNode(run.rPr);
  if (!runProperties) {
    return null;
  }

  const direct = typeof runProperties.typeface === "string" ? runProperties.typeface : null;
  if (direct) {
    return direct;
  }

  const latin = asXmlNode(runProperties.latin);
  return latin && typeof latin.typeface === "string" ? latin.typeface : null;
}

function extractRunFontSize(run: XmlNode): number | null {
  const runProperties = asXmlNode(run.rPr);
  if (!runProperties) {
    return null;
  }

  const value = runProperties.sz;
  if (typeof value === "number") {
    return value / 100;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed / 100;
  }

  return null;
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
