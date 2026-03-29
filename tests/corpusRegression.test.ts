import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { validateFixedPptx } from "../packages/export/validateFixedPptx.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

interface CorpusManifestEntry {
  id: string;
  tier: "core" | "extended";
  category: string;
  producer: "office" | "google-slides" | "keynote" | "synthetic";
  slideCount: number;
  file: string;
  description: string;
  risk: string;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpusRoot = path.join(repoRoot, "testdata", "corpus");
const manifestPath = path.join(corpusRoot, "manifest.json");
const tempPaths: string[] = [];
const runExtendedCorpus = process.env.PPTX_FIXER_EXTENDED_CORPUS === "1";
const manifest = await loadManifest();

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("corpus manifest defines categorized core and extended decks", async () => {
  assert.ok(manifest.length >= 10);
  assert.ok(manifest.some((entry) => entry.tier === "core"));
  assert.ok(manifest.some((entry) => entry.tier === "extended"));

  for (const entry of manifest) {
    assert.ok(entry.id.length > 0);
    assert.ok(entry.category.length > 0);
    assert.ok(entry.description.length > 0);
    assert.ok(entry.risk.length > 0);
    assert.ok(entry.slideCount > 0);
    assert.match(entry.file, /^[a-z-]+\/.+\.pptx$/);
    assert.match(entry.producer, /^(office|google-slides|keynote|synthetic)$/);
    await readFile(path.join(corpusRoot, entry.file));
  }
});

test("admitted alignment corpus deck produces measurable alignment reduction", async () => {
  const entry = manifest.find((candidate) => candidate.id === "alignment-body-style-drift");
  assert.ok(entry, "alignment-body-style-drift must be present in the admitted corpus manifest");

  const inputPath = path.join(corpusRoot, entry.file);
  const inputAudit = analyzeSlides(await loadPresentation(inputPath));
  assert.equal(inputAudit.alignmentDriftCount, 2);

  const outputDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-corpus-alignment-"));
  tempPaths.push(outputDir);
  const outputPath = path.join(outputDir, `${entry.id}-fixed.pptx`);

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.verification.alignmentDriftBefore, 2);
  assert.equal(report.verification.alignmentDriftAfter, 0);
  assert.deepEqual(
    report.issueCategorySummary.find((category) => category.category === "alignment"),
    {
      category: "alignment",
      detectedBefore: 2,
      fixed: 2,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
});

test("admitted bullet-symbol corpus deck produces measurable bullet reduction", async () => {
  const entry = manifest.find((candidate) => candidate.id === "bullet-symbol-drift");
  assert.ok(entry, "bullet-symbol-drift must be present in the admitted corpus manifest");

  const inputPath = path.join(corpusRoot, entry.file);
  const inputAudit = analyzeSlides(await loadPresentation(inputPath));
  assert.equal(inputAudit.bulletIndentDriftCount, 1);

  const outputDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-corpus-bullet-symbol-"));
  tempPaths.push(outputDir);
  const outputPath = path.join(outputDir, `${entry.id}-fixed.pptx`);

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.verification.bulletIndentDriftBefore, 1);
  assert.equal(report.verification.bulletIndentDriftAfter, 0);
  assert.deepEqual(
    report.issueCategorySummary.find((category) => category.category === "bullet_indentation"),
    {
      category: "bullet_indentation",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
});

test("admitted bullet-indent corpus deck produces measurable indent reduction", async () => {
  const entry = manifest.find((candidate) => candidate.id === "bullet-indent-jump-drift");
  assert.ok(entry, "bullet-indent-jump-drift must be present in the admitted corpus manifest");

  const inputPath = path.join(corpusRoot, entry.file);
  const inputAudit = analyzeSlides(await loadPresentation(inputPath));
  assert.equal(inputAudit.bulletIndentDriftCount, 1);

  const outputDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-corpus-bullet-indent-"));
  tempPaths.push(outputDir);
  const outputPath = path.join(outputDir, `${entry.id}-fixed.pptx`);

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.verification.bulletIndentDriftBefore, 1);
  assert.equal(report.verification.bulletIndentDriftAfter, 0);
  assert.deepEqual(
    report.issueCategorySummary.find((category) => category.category === "bullet_indentation"),
    {
      category: "bullet_indentation",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
});

test("admitted line-spacing corpus deck produces measurable reduction across local and dominant-body-style paths", async () => {
  const entry = manifest.find((candidate) => candidate.id === "line-spacing-combined-drift");
  assert.ok(entry, "line-spacing-combined-drift must be present in the admitted corpus manifest");

  const inputPath = path.join(corpusRoot, entry.file);
  const inputAudit = analyzeSlides(await loadPresentation(inputPath));
  assert.equal(inputAudit.lineSpacingDriftCount, 4);

  const outputDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-corpus-line-spacing-"));
  tempPaths.push(outputDir);
  const outputPath = path.join(outputDir, `${entry.id}-fixed.pptx`);

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.totals.lineSpacingChanges, 2);
  assert.equal(report.totals.dominantBodyStyleChanges, 2);
  assert.equal(report.verification.lineSpacingDriftBefore, 4);
  assert.equal(report.verification.lineSpacingDriftAfter, 0);
  assert.deepEqual(
    report.changesBySlide.map((slide) => ({
      slide: slide.slide,
      lineSpacingChanges: slide.lineSpacingChanges,
      dominantBodyStyleLineSpacingChanges: slide.dominantBodyStyleLineSpacingChanges
    })),
    [
      {
        slide: 1,
        lineSpacingChanges: 2,
        dominantBodyStyleLineSpacingChanges: 0
      },
      {
        slide: 2,
        lineSpacingChanges: 0,
        dominantBodyStyleLineSpacingChanges: 2
      }
    ]
  );
  assert.deepEqual(
    report.issueCategorySummary.find((category) => category.category === "line_spacing"),
    {
      category: "line_spacing",
      detectedBefore: 4,
      fixed: 4,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
});

test("admitted paragraph-spacing corpus deck produces measurable reduction across local and dominant-body-style paths", async () => {
  const entry = manifest.find((candidate) => candidate.id === "paragraph-spacing-combined-drift");
  assert.ok(entry, "paragraph-spacing-combined-drift must be present in the admitted corpus manifest");

  const inputPath = path.join(corpusRoot, entry.file);
  const inputAudit = analyzeSlides(await loadPresentation(inputPath));
  assert.equal(inputAudit.spacingDriftCount, 4);

  const outputDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-corpus-paragraph-spacing-"));
  tempPaths.push(outputDir);
  const outputPath = path.join(outputDir, `${entry.id}-fixed.pptx`);

  const report = await runAllFixes(inputPath, outputPath);

  assert.ok(report.totals.spacingChanges + report.totals.dominantBodyStyleChanges > 0);
  assert.equal(report.verification.spacingDriftBefore, 4);
  assert.equal(report.verification.spacingDriftAfter, 0);
  assert.ok(
    report.changesBySlide.some(
      (slide) =>
        slide.spacingChanges > 0 ||
        slide.dominantBodyStyleSpacingBeforeChanges > 0 ||
        slide.dominantBodyStyleSpacingAfterChanges > 0
    )
  );
  assert.deepEqual(
    report.issueCategorySummary.find((category) => category.category === "paragraph_spacing"),
    {
      category: "paragraph_spacing",
      detectedBefore: 4,
      fixed: 4,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
});

for (const entry of manifest) {
  test(`corpus regression: ${entry.id}`, {
    skip: entry.tier === "extended" && !runExtendedCorpus
  }, async () => {
    const inputPath = path.join(corpusRoot, entry.file);
    const presentation = await stage(entry, "audit", async () => loadPresentation(inputPath));
    const auditReport = await stage(entry, "audit", async () => analyzeSlides(presentation));

    assert.equal(
      auditReport.slideCount,
      entry.slideCount,
      `${entry.id} should match declared slideCount`
    );

    const outputDir = await mkdtemp(path.join(tmpdir(), `pptx-fixer-corpus-${entry.id}-`));
    tempPaths.push(outputDir);
    const outputPath = path.join(outputDir, `${entry.id}-fixed.pptx`);

    const report = await stage(entry, "cleanup", async () => runAllFixes(inputPath, outputPath));
    const validation = await stage(entry, "export", async () =>
      validateFixedPptx(outputPath, auditReport.slideCount)
    );

    assert.deepEqual(validation.validation, report.validation);
    assert.deepEqual(validation.validation, {
      outputExists: true,
      isZip: true,
      coreEntriesPresent: true,
      reloadable: true,
      slideCountMatches: true
    });
    assert.ok(validation.presentation, `${entry.id} should reload after cleanup`);

    await stage(entry, "fidelity", async () => {
      assert.deepEqual(
        await extractAllSlideTextTokens(inputPath),
        await extractAllSlideTextTokens(outputPath)
      );
    });

    const secondOutputPath = path.join(outputDir, `${entry.id}-fixed-second-pass.pptx`);
    const secondReport = await stage(entry, "cleanup", async () =>
      runAllFixes(outputPath, secondOutputPath)
    );

    assert.equal(
      secondReport.noOp,
      true,
      `[corpus:${entry.id}] [category:${entry.category}] [stage:cleanup] second pass should be no-op`
    );
    assert.deepEqual(
      await readFile(outputPath),
      await readFile(secondOutputPath),
      `[corpus:${entry.id}] [category:${entry.category}] [stage:cleanup] second pass output should match first pass output`
    );
  });
}

async function loadManifest(): Promise<CorpusManifestEntry[]> {
  return JSON.parse(await readFile(manifestPath, "utf8")) as CorpusManifestEntry[];
}

async function stage<T>(
  entry: CorpusManifestEntry,
  stageName: "audit" | "cleanup" | "export" | "fidelity",
  fn: () => Promise<T> | T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[corpus:${entry.id}] [category:${entry.category}] [stage:${stageName}] ${message}`
    );
  }
}

async function extractAllSlideTextTokens(filePath: string): Promise<string[][]> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const slideEntries = Object.keys(archive.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    .sort((left, right) => {
      const leftIndex = Number.parseInt(left.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      const rightIndex = Number.parseInt(right.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      return leftIndex - rightIndex;
    });

  return Promise.all(
    slideEntries.map(async (entryPath) => {
      const xml = await archive.file(entryPath)?.async("string");
      assert.ok(xml, `Missing archive entry ${entryPath}`);
      return [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((match) => match[1]);
    })
  );
}
