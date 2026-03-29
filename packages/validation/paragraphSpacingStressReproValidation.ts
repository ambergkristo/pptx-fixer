import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  analyzeSlides,
  loadPresentation,
  type AuditReport,
  type LoadedPresentation
} from "../audit/pptxAudit.ts";
import { runAllFixes, type RunAllFixesReport } from "../fix/runAllFixes.ts";
import { readRecoveryGateSource } from "./recoveryGate.ts";

type ValueMetricId =
  | "fontFamilyDrift"
  | "fontSizeDrift"
  | "bulletMarkerDrift"
  | "bulletIndentDrift"
  | "lineSpacingValueDrift"
  | "lineSpacingDiagnosticDrift"
  | "paragraphSpacingValueDrift"
  | "paragraphSpacingDiagnosticDrift";

interface StressReproSource {
  id: string;
  version: string;
  file: string;
  slideCount: number;
  sourceFilename: string;
  sourceSha256: string;
  sourceType: "sanitized";
  corpusClass: "hostile-stress";
  eligibility: "eligibleCleanupBoundary";
  expectedOutcome: "manualReviewRecommended";
  targetedCleanupCategories: string[];
  reason: string;
}

interface DeckMetricSnapshot {
  fontFamilyDrift: number;
  fontSizeDrift: number;
  bulletMarkerDrift: number;
  bulletIndentDrift: number;
  lineSpacingValueDrift: number;
  lineSpacingDiagnosticDrift: number;
  paragraphSpacingValueDrift: number;
  paragraphSpacingDiagnosticDrift: number;
}

interface ParagraphSpacingSlideCount {
  slide: number;
  count: number;
}

interface DeckRunArtifacts {
  outputPath: string;
  beforeAuditPath: string;
  afterAuditPath: string;
  afterReportPath: string;
}

interface DeckValidationResult {
  file: string;
  scenario: string;
  beforeMetrics: DeckMetricSnapshot;
  afterMetrics: DeckMetricSnapshot;
  report: RunAllFixesReport;
  artifacts: DeckRunArtifacts;
  changedTextRuns: number;
  changedParagraphs: number;
  slidesTouched: number;
  boundaryMutations: number;
  checkResults: RecoveryGateCheckResult[];
}

interface RecoveryGateCheckResult {
  kind: "alignment" | "typography";
  file: string;
  slide: number;
  text: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  reason: string;
}

export interface ParagraphSpacingStressReproRow {
  file: string;
  scenario: string;
  metric: string;
  before: number;
  after: number;
  assessment: "Better" | "Same" | "Worse" | "Recorded" | "None";
  metricKind: "value" | "activity" | "boundary";
}

export interface ParagraphSpacingStressReproValidationReport {
  generatedAt: string;
  sourcePath: string;
  artifactDirectory: string;
  stressDeck: {
    file: string;
    sourceFilename: string;
    sourceSha256: string;
    committedSha256: string;
    committedUnchanged: boolean;
    beforeMetrics: DeckMetricSnapshot;
    afterMetrics: DeckMetricSnapshot;
    changedTextRuns: number;
    changedParagraphs: number;
    slidesTouched: number;
    paragraphSpacingBySlideBefore: ParagraphSpacingSlideCount[];
    paragraphSpacingBySlideAfter: ParagraphSpacingSlideCount[];
    improvedCategories: string[];
    unchangedAffectedCategories: string[];
    worsenedCategories: string[];
    tiedCategoryInference: string;
    outputPath: string;
    beforeAuditPath: string;
    afterAuditPath: string;
    afterReportPath: string;
  };
  protectedDecks: Array<{
    file: string;
    scenario: string;
    beforeMetrics: DeckMetricSnapshot;
    afterMetrics: DeckMetricSnapshot;
    changedParagraphs: number;
    slidesTouched: number;
    boundaryMutations: number;
    outputPath: string;
  }>;
  rows: ParagraphSpacingStressReproRow[];
  checkResults: RecoveryGateCheckResult[];
  realOutputJudgment: {
    reproConfirmed: boolean;
    summary: string;
  };
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourcePath = path.join(repoRoot, "testdata", "corpus", "paragraphSpacingStressRepro.json");
const corpusRoot = path.join(repoRoot, "testdata", "corpus");

const PROTECTED_DECKS = [
  {
    file: "master/cleandeck-master-acceptance-v1.pptx",
    scenario: "canonical master"
  },
  {
    file: "hostile/cleandeck-chaos-gate-v1.pptx",
    scenario: "hostile chaos gate"
  },
  {
    file: "boundary/mixed-hard-boundary-v1.pptx",
    scenario: "mixed hard boundary"
  },
  {
    file: "mixed-formatting/combined-qa-test-deck-v1.pptx",
    scenario: "combined QA"
  }
] as const;

const VALUE_METRIC_LABELS: Record<ValueMetricId, string> = {
  fontFamilyDrift: "font family drift count",
  fontSizeDrift: "font size drift count",
  bulletMarkerDrift: "bullet marker drift count",
  bulletIndentDrift: "bullet indent drift count",
  lineSpacingValueDrift: "line spacing value drift count",
  lineSpacingDiagnosticDrift: "line spacing diagnostic count",
  paragraphSpacingValueDrift: "paragraph spacing value drift count",
  paragraphSpacingDiagnosticDrift: "paragraph spacing diagnostic count"
};

export async function runParagraphSpacingStressReproValidation(
  artifactDirectory: string
): Promise<ParagraphSpacingStressReproValidationReport> {
  const source = await readStressReproSource();
  const recoveryGateSource = await readRecoveryGateSource();
  await mkdir(artifactDirectory, { recursive: true });

  const stressResult = await validateDeck({
    file: source.file,
    scenario: "paragraph spacing stress repro",
    artifactDirectory,
    recoveryGateSource
  });

  const protectedResults = [];
  for (const deck of PROTECTED_DECKS) {
    protectedResults.push(
      await validateDeck({
        file: deck.file,
        scenario: deck.scenario,
        artifactDirectory,
        recoveryGateSource
      })
    );
  }

  const committedSha256 = await hashFile(path.join(corpusRoot, source.file));
  const committedUnchanged = committedSha256 === source.sourceSha256;
  if (!committedUnchanged) {
    throw new Error(
      `Committed stress deck hash mismatch for ${source.file}. Expected ${source.sourceSha256}, got ${committedSha256}.`
    );
  }

  const stressDeckSummary = {
    file: source.file,
    sourceFilename: source.sourceFilename,
    sourceSha256: source.sourceSha256,
    committedSha256,
    committedUnchanged,
    beforeMetrics: stressResult.beforeMetrics,
    afterMetrics: stressResult.afterMetrics,
    changedTextRuns: stressResult.changedTextRuns,
    changedParagraphs: stressResult.changedParagraphs,
    slidesTouched: stressResult.slidesTouched,
    paragraphSpacingBySlideBefore: summarizeParagraphSpacingBySlide(await loadAudit(stressResult.artifacts.beforeAuditPath)),
    paragraphSpacingBySlideAfter: summarizeParagraphSpacingBySlide(await loadAudit(stressResult.artifacts.afterAuditPath)),
    improvedCategories: summarizeImprovedCategories(stressResult.beforeMetrics, stressResult.afterMetrics),
    unchangedAffectedCategories: summarizeUnchangedAffectedCategories(stressResult.beforeMetrics, stressResult.afterMetrics),
    worsenedCategories: summarizeWorsenedCategories(stressResult.beforeMetrics, stressResult.afterMetrics),
    tiedCategoryInference: summarizeTiedCategoryInference(stressResult.beforeMetrics, stressResult.afterMetrics, stressResult.report),
    outputPath: stressResult.artifacts.outputPath,
    beforeAuditPath: stressResult.artifacts.beforeAuditPath,
    afterAuditPath: stressResult.artifacts.afterAuditPath,
    afterReportPath: stressResult.artifacts.afterReportPath
  };

  const rows = [
    ...buildStressRows(stressResult),
    ...protectedResults.flatMap((result) => buildProtectedRows(result))
  ];
  const checkResults = [stressResult, ...protectedResults].flatMap((result) => result.checkResults);
  const reproConfirmed =
    stressResult.afterMetrics.paragraphSpacingValueDrift > stressResult.beforeMetrics.paragraphSpacingValueDrift ||
    stressResult.report.verification.spacingDriftAfter! > stressResult.report.verification.spacingDriftBefore;
  const stressClosed =
    stressResult.report.verification.spacingDriftAfter === 0 &&
    stressResult.report.verification.bulletIndentDriftAfter === 0 &&
    stressResult.report.verification.lineSpacingDriftAfter === 0;
  const summary = stressClosed
    ? `Exact stress repro no longer reproduces on the current engine: paragraph spacing ${stressResult.report.verification.spacingDriftBefore} -> ${stressResult.report.verification.spacingDriftAfter}, bullet drift ${stressResult.report.verification.bulletIndentDriftBefore} -> ${stressResult.report.verification.bulletIndentDriftAfter}, and line spacing ${stressResult.report.verification.lineSpacingDriftBefore} -> ${stressResult.report.verification.lineSpacingDriftAfter} while font family ${stressResult.beforeMetrics.fontFamilyDrift} -> ${stressResult.afterMetrics.fontFamilyDrift} and font size ${stressResult.beforeMetrics.fontSizeDrift} -> ${stressResult.afterMetrics.fontSizeDrift}.`
    : reproConfirmed
      ? `Exact stress repro confirmed: paragraph spacing drift worsens ${stressResult.report.verification.spacingDriftBefore} -> ${stressResult.report.verification.spacingDriftAfter} while font family ${stressResult.beforeMetrics.fontFamilyDrift} -> ${stressResult.afterMetrics.fontFamilyDrift} and font size ${stressResult.beforeMetrics.fontSizeDrift} -> ${stressResult.afterMetrics.fontSizeDrift}.`
      : "Exact stress repro was not confirmed on the committed deck.";

  const report: ParagraphSpacingStressReproValidationReport = {
    generatedAt: new Date().toISOString(),
    sourcePath,
    artifactDirectory,
    stressDeck: stressDeckSummary,
    protectedDecks: protectedResults.map((result) => ({
      file: result.file,
      scenario: result.scenario,
      beforeMetrics: result.beforeMetrics,
      afterMetrics: result.afterMetrics,
      changedParagraphs: result.changedParagraphs,
      slidesTouched: result.slidesTouched,
      boundaryMutations: result.boundaryMutations,
      outputPath: result.artifacts.outputPath
    })),
    rows,
    checkResults,
    realOutputJudgment: {
      reproConfirmed,
      summary
    }
  };

  await writeFile(
    path.join(artifactDirectory, "paragraph-spacing-stress-repro-validation.report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(artifactDirectory, "PRODUCT_IMPROVEMENT_TABLE.md"),
    renderProductImprovementMarkdown(report),
    "utf8"
  );
  await writeFile(
    path.join(artifactDirectory, "REAL_OUTPUT_NOTE.md"),
    renderRealOutputNote(report),
    "utf8"
  );

  return report;
}

async function validateDeck(options: {
  file: string;
  scenario: string;
  artifactDirectory: string;
  recoveryGateSource: Awaited<ReturnType<typeof readRecoveryGateSource>>;
}): Promise<DeckValidationResult> {
  const inputPath = path.join(corpusRoot, options.file);
  const beforeAudit = analyzeSlides(await loadPresentation(inputPath));
  const outputPath = path.join(options.artifactDirectory, `${sanitizeFileName(path.basename(options.file, ".pptx"))}-fixed.pptx`);
  const report = await runAllFixes(inputPath, outputPath);
  const afterAudit = analyzeSlides(await loadPresentation(outputPath));
  const beforeAuditPath = path.join(options.artifactDirectory, `${sanitizeFileName(path.basename(options.file, ".pptx"))}.before.audit.json`);
  const afterAuditPath = path.join(options.artifactDirectory, `${sanitizeFileName(path.basename(options.file, ".pptx"))}.after.audit.json`);
  const afterReportPath = path.join(options.artifactDirectory, `${sanitizeFileName(path.basename(options.file, ".pptx"))}.after.report.json`);
  await writeFile(beforeAuditPath, JSON.stringify(beforeAudit, null, 2), "utf8");
  await writeFile(afterAuditPath, JSON.stringify(afterAudit, null, 2), "utf8");
  await writeFile(afterReportPath, JSON.stringify(report, null, 2), "utf8");

  const outputPresentation = await loadPresentation(outputPath);
  const checkResults = [
    ...evaluateAlignmentChecks(outputPresentation, options.recoveryGateSource, options.file),
    ...evaluateTypographyChecks(outputPresentation, options.recoveryGateSource, options.file)
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

  return {
    file: options.file,
    scenario: options.scenario,
    beforeMetrics: summarizeDeckMetrics(beforeAudit),
    afterMetrics: summarizeDeckMetrics(afterAudit),
    report,
    artifacts: {
      outputPath,
      beforeAuditPath,
      afterAuditPath,
      afterReportPath
    },
    changedTextRuns,
    changedParagraphs,
    slidesTouched: report.changesBySlide.length,
    boundaryMutations: checkResults.filter((entry) => !entry.passed).length,
    checkResults
  };
}

function buildStressRows(result: DeckValidationResult): ParagraphSpacingStressReproRow[] {
  return [
    ...buildValueRows(result, [
      "fontFamilyDrift",
      "fontSizeDrift",
      "bulletMarkerDrift",
      "lineSpacingValueDrift",
      "paragraphSpacingValueDrift",
      "paragraphSpacingDiagnosticDrift"
    ]),
    {
      file: result.file,
      scenario: result.scenario,
      metric: "changed text runs",
      before: 0,
      after: result.changedTextRuns,
      assessment: compareActivityMetric(result.changedTextRuns),
      metricKind: "activity"
    },
    {
      file: result.file,
      scenario: result.scenario,
      metric: "changed paragraphs",
      before: 0,
      after: result.changedParagraphs,
      assessment: compareActivityMetric(result.changedParagraphs),
      metricKind: "activity"
    },
    {
      file: result.file,
      scenario: result.scenario,
      metric: "count of slides touched",
      before: 0,
      after: result.slidesTouched,
      assessment: compareActivityMetric(result.slidesTouched),
      metricKind: "activity"
    }
  ];
}

function buildProtectedRows(result: DeckValidationResult): ParagraphSpacingStressReproRow[] {
  const rows = [
    ...buildValueRows(result, [
      "paragraphSpacingValueDrift",
      "lineSpacingValueDrift"
    ]),
    {
      file: result.file,
      scenario: result.scenario,
      metric: "changed paragraphs",
      before: 0,
      after: result.changedParagraphs,
      assessment: compareActivityMetric(result.changedParagraphs),
      metricKind: "activity" as const
    },
    {
      file: result.file,
      scenario: result.scenario,
      metric: "count of slides touched",
      before: 0,
      after: result.slidesTouched,
      assessment: compareActivityMetric(result.slidesTouched),
      metricKind: "activity" as const
    }
  ];

  if (result.file === "boundary/mixed-hard-boundary-v1.pptx" || result.boundaryMutations > 0) {
    rows.push({
      file: result.file,
      scenario: result.scenario,
      metric: "boundary mutations",
      before: 0,
      after: result.boundaryMutations,
      assessment: compareBoundaryMetric(0, result.boundaryMutations),
      metricKind: "boundary"
    });
  }

  return rows;
}

function buildValueRows(
  result: DeckValidationResult,
  metricIds: ValueMetricId[]
): ParagraphSpacingStressReproRow[] {
  return metricIds.map((metricId) => ({
    file: result.file,
    scenario: result.scenario,
    metric: VALUE_METRIC_LABELS[metricId],
    before: result.beforeMetrics[metricId],
    after: result.afterMetrics[metricId],
    assessment: compareValueMetric(result.beforeMetrics[metricId], result.afterMetrics[metricId]),
    metricKind: "value"
  }));
}

function summarizeDeckMetrics(auditReport: AuditReport): DeckMetricSnapshot {
  return {
    fontFamilyDrift: auditReport.fontDrift.driftRuns.reduce((total, entry) => total + entry.count, 0),
    fontSizeDrift: auditReport.fontSizeDrift.driftRuns.reduce((total, entry) => total + entry.count, 0),
    bulletMarkerDrift: auditReport.bulletIndentDrift.driftParagraphs.filter((entry) => entry.reason.startsWith("marker mismatch")).length,
    bulletIndentDrift: auditReport.bulletIndentDrift.driftParagraphs.filter((entry) => !entry.reason.startsWith("marker mismatch")).length,
    lineSpacingValueDrift: auditReport.lineSpacingDrift.driftParagraphs.filter((entry) => entry.lineSpacing !== null).length,
    lineSpacingDiagnosticDrift: auditReport.lineSpacingDrift.driftParagraphs.filter((entry) => entry.lineSpacing === null).length,
    paragraphSpacingValueDrift: auditReport.spacingDrift.driftParagraphs.filter((entry) => entry.spacingBefore !== null || entry.spacingAfter !== null).length,
    paragraphSpacingDiagnosticDrift: auditReport.spacingDrift.driftParagraphs.filter((entry) => entry.spacingBefore === null && entry.spacingAfter === null).length
  };
}

function summarizeParagraphSpacingBySlide(auditReport: AuditReport): ParagraphSpacingSlideCount[] {
  const counts = new Map<number, number>();
  for (const paragraph of auditReport.spacingDrift.driftParagraphs) {
    counts.set(paragraph.slide, (counts.get(paragraph.slide) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([slide, count]) => ({ slide, count }))
    .sort((left, right) => left.slide - right.slide);
}

function summarizeImprovedCategories(before: DeckMetricSnapshot, after: DeckMetricSnapshot): string[] {
  return summarizeCategoryDeltas(before, after)
    .filter((entry) => entry.after < entry.before)
    .map((entry) => entry.label);
}

function summarizeUnchangedAffectedCategories(before: DeckMetricSnapshot, after: DeckMetricSnapshot): string[] {
  return summarizeCategoryDeltas(before, after)
    .filter((entry) => entry.before > 0 && entry.after === entry.before)
    .map((entry) => entry.label);
}

function summarizeWorsenedCategories(before: DeckMetricSnapshot, after: DeckMetricSnapshot): string[] {
  return summarizeCategoryDeltas(before, after)
    .filter((entry) => entry.after > entry.before)
    .map((entry) => entry.label);
}

function summarizeTiedCategoryInference(
  before: DeckMetricSnapshot,
  after: DeckMetricSnapshot,
  report: RunAllFixesReport
): string {
  const improved = summarizeImprovedCategories(before, after);
  const unchanged = summarizeUnchangedAffectedCategories(before, after);
  const worsened = summarizeWorsenedCategories(before, after);
  const collateralRunChanges = [];

  if (report.totals.fontFamilyChanges > 0) {
    collateralRunChanges.push("font family");
  }
  if (report.totals.fontSizeChanges > 0) {
    collateralRunChanges.push("font size");
  }

  const changeNote = collateralRunChanges.length > 0
    ? `Current cleanup also changes ${collateralRunChanges.join(" and ")} heavily`
    : "Current cleanup does not show a large collateral typography change footprint";

  if (after.paragraphSpacingValueDrift === 0) {
    return `${changeNote}; paragraph spacing, bullet marker drift, and line spacing all close while ${improved.join(", ") || "no categories"} improve and ${unchanged.join(", ") || "no categories"} remain unchanged.`;
  }

  if (after.paragraphSpacingValueDrift < before.paragraphSpacingValueDrift) {
    return `${changeNote}; paragraph spacing improves alongside ${improved.join(", ") || "no categories"} while ${unchanged.join(", ") || "no categories"} remain unchanged.`;
  }

  return `${changeNote}; paragraph spacing worsens while ${improved.join(", ") || "no categories"} improve and ${unchanged.join(", ") || "no categories"} remain unchanged. This suggests a multi-category interaction rather than an isolated spacing-only miss.`;
}

function summarizeCategoryDeltas(before: DeckMetricSnapshot, after: DeckMetricSnapshot): Array<{
  label: string;
  before: number;
  after: number;
}> {
  return [
    { label: "font family", before: before.fontFamilyDrift, after: after.fontFamilyDrift },
    { label: "font size", before: before.fontSizeDrift, after: after.fontSizeDrift },
    { label: "bullet marker", before: before.bulletMarkerDrift, after: after.bulletMarkerDrift },
    { label: "bullet indent", before: before.bulletIndentDrift, after: after.bulletIndentDrift },
    { label: "line spacing", before: before.lineSpacingValueDrift, after: after.lineSpacingValueDrift },
    { label: "paragraph spacing", before: before.paragraphSpacingValueDrift, after: after.paragraphSpacingValueDrift }
  ];
}

function compareValueMetric(before: number, after: number): "Better" | "Same" | "Worse" {
  if (after < before) {
    return "Better";
  }
  if (after > before) {
    return "Worse";
  }
  return "Same";
}

function compareBoundaryMetric(before: number, after: number): "Better" | "Same" | "Worse" {
  if (after > before) {
    return "Worse";
  }
  if (after < before) {
    return "Better";
  }
  return "Same";
}

function compareActivityMetric(after: number): "Recorded" | "None" {
  return after > 0 ? "Recorded" : "None";
}

function renderProductImprovementMarkdown(
  report: ParagraphSpacingStressReproValidationReport
): string {
  const valueRows = report.rows.filter((row) => row.metricKind === "value");
  const activityRows = report.rows.filter((row) => row.metricKind === "activity");
  const boundaryRows = report.rows.filter((row) => row.metricKind === "boundary");

  return [
    "# Paragraph Spacing Stress Repro Validation",
    "",
    `Generated: ${report.generatedAt}`,
    `Source config: ${report.sourcePath}`,
    `Committed unchanged: ${report.stressDeck.committedUnchanged ? "yes" : "no"}`,
    `Stress deck source hash: ${report.stressDeck.sourceSha256}`,
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
    `- Repro confirmed on current engine? ${report.realOutputJudgment.reproConfirmed ? "yes" : "no"}`,
    `- ${report.realOutputJudgment.summary}`
  ].join("\n");
}

function renderRealOutputNote(report: ParagraphSpacingStressReproValidationReport): string {
  return [
    "# Paragraph Spacing Stress Repro Note",
    "",
    `Generated: ${report.generatedAt}`,
    `Stress deck: ${report.stressDeck.file}`,
    `Committed unchanged: ${report.stressDeck.committedUnchanged ? "yes" : "no"}`,
    `Output PPTX: ${report.stressDeck.outputPath}`,
    `Before audit JSON: ${report.stressDeck.beforeAuditPath}`,
    `After audit JSON: ${report.stressDeck.afterAuditPath}`,
    `After report JSON: ${report.stressDeck.afterReportPath}`,
    "",
    "STRESS DECK SUMMARY",
    `- Paragraph spacing value drift: ${report.stressDeck.beforeMetrics.paragraphSpacingValueDrift} -> ${report.stressDeck.afterMetrics.paragraphSpacingValueDrift}`,
    `- Paragraph spacing diagnostic count: ${report.stressDeck.beforeMetrics.paragraphSpacingDiagnosticDrift} -> ${report.stressDeck.afterMetrics.paragraphSpacingDiagnosticDrift}`,
    `- Changed text runs: ${report.stressDeck.changedTextRuns}`,
    `- Changed paragraphs: ${report.stressDeck.changedParagraphs}`,
    `- Slides touched: ${report.stressDeck.slidesTouched}`,
    `- Paragraph spacing by slide before: ${report.stressDeck.paragraphSpacingBySlideBefore.map((entry) => `S${entry.slide}:${entry.count}`).join(", ")}`,
    `- Paragraph spacing by slide after: ${report.stressDeck.paragraphSpacingBySlideAfter.map((entry) => `S${entry.slide}:${entry.count}`).join(", ")}`,
    `- Improved categories: ${report.stressDeck.improvedCategories.join(", ") || "none"}`,
    `- Unchanged affected categories: ${report.stressDeck.unchangedAffectedCategories.join(", ") || "none"}`,
    `- Worsened categories: ${report.stressDeck.worsenedCategories.join(", ") || "none"}`,
    `- Tied-category inference: ${report.stressDeck.tiedCategoryInference}`,
    "",
    "PROTECTED DECK SUMMARY",
    ...report.protectedDecks.flatMap((deck) => [
      `- ${deck.file} | paragraph spacing ${deck.beforeMetrics.paragraphSpacingValueDrift} -> ${deck.afterMetrics.paragraphSpacingValueDrift} | line spacing ${deck.beforeMetrics.lineSpacingValueDrift} -> ${deck.afterMetrics.lineSpacingValueDrift} | changed paragraphs ${deck.changedParagraphs} | slides touched ${deck.slidesTouched} | boundary mutations ${deck.boundaryMutations}`
    ]),
    "",
    "REAL OUTPUT JUDGMENT",
    `- Repro confirmed on current engine? ${report.realOutputJudgment.reproConfirmed ? "yes" : "no"}`,
    `- ${report.realOutputJudgment.summary}`
  ].join("\n");
}

function renderRow(row: ParagraphSpacingStressReproRow): string {
  return `| ${row.file} | ${row.scenario} | ${row.metric} | ${row.before} | ${row.after} | ${row.assessment} |`;
}

async function readStressReproSource(): Promise<StressReproSource> {
  return JSON.parse(await readFile(sourcePath, "utf8")) as StressReproSource;
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex").toUpperCase();
}

async function loadAudit(filePath: string): Promise<AuditReport> {
  return JSON.parse(await readFile(filePath, "utf8")) as AuditReport;
}

function evaluateAlignmentChecks(
  presentation: LoadedPresentation,
  source: Awaited<ReturnType<typeof readRecoveryGateSource>>,
  file: string
): RecoveryGateCheckResult[] {
  const checks = source.protectedAlignmentChecks.filter((entry) => entry.file === file);
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

function evaluateTypographyChecks(
  presentation: LoadedPresentation,
  source: Awaited<ReturnType<typeof readRecoveryGateSource>>,
  file: string
): RecoveryGateCheckResult[] {
  const checks = source.protectedTypographyChecks.filter((entry) => entry.file === file);
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}
