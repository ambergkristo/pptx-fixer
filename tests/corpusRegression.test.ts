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
  file: string;
  risk: string;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpusRoot = path.join(repoRoot, "testdata", "corpus");
const manifestPath = path.join(corpusRoot, "manifest.json");
const tempPaths: string[] = [];
const runExtendedCorpus = process.env.PPTX_FIXER_EXTENDED_CORPUS === "1";

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("corpus manifest defines categorized core and extended decks", async () => {
  const manifest = await loadManifest();
  assert.ok(manifest.length >= 6);
  assert.ok(manifest.some((entry) => entry.tier === "core"));
  assert.ok(manifest.some((entry) => entry.tier === "extended"));

  for (const entry of manifest) {
    assert.ok(entry.id.length > 0);
    assert.ok(entry.category.length > 0);
    assert.ok(entry.risk.length > 0);
    assert.match(entry.file, /^[a-z-]+\/.+\.pptx$/);
    await readFile(path.join(corpusRoot, entry.file));
  }
});

for (const entry of await loadManifest()) {
  test(`corpus regression: ${entry.id}`, {
    skip: entry.tier === "extended" && !runExtendedCorpus
  }, async () => {
    const inputPath = path.join(corpusRoot, entry.file);
    const presentation = await loadPresentation(inputPath);
    const auditReport = analyzeSlides(presentation);

    assert.ok(auditReport.slideCount > 0, `${entry.id} should contain at least one slide`);

    const outputDir = await mkdtemp(path.join(tmpdir(), `pptx-fixer-corpus-${entry.id}-`));
    tempPaths.push(outputDir);
    const outputPath = path.join(outputDir, `${entry.id}-fixed.pptx`);

    const report = await runAllFixes(inputPath, outputPath);
    const validation = await validateFixedPptx(outputPath, auditReport.slideCount);

    assert.deepEqual(validation.validation, report.validation);
    assert.deepEqual(validation.validation, {
      outputExists: true,
      isZip: true,
      coreEntriesPresent: true,
      reloadable: true,
      slideCountMatches: true
    });
    assert.ok(validation.presentation, `${entry.id} should reload after cleanup`);
    assert.deepEqual(
      await extractAllSlideTextTokens(inputPath),
      await extractAllSlideTextTokens(outputPath)
    );
  });
}

async function loadManifest(): Promise<CorpusManifestEntry[]> {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as CorpusManifestEntry[];
  return manifest;
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
