import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

interface CorpusManifestEntry {
  id: string;
  file: string;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpusRoot = path.join(repoRoot, "testdata", "corpus");
const manifestPath = path.join(corpusRoot, "manifest.json");
const manifest = await loadManifest();
const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("admitted spacing corpus decks preserve proof boundary and second-pass stability", async () => {
  for (const scenario of [
    {
      id: "line-spacing-combined-drift",
      category: "line_spacing",
      expectedChangesKey: "lineSpacingChanges" as const,
      getRemainingDrift: async (filePath: string) => analyzeSlides(await loadPresentation(filePath)).lineSpacingDriftCount
    },
    {
      id: "paragraph-spacing-combined-drift",
      category: "paragraph_spacing",
      expectedChangesKey: "spacingChanges" as const,
      getRemainingDrift: async (filePath: string) => analyzeSlides(await loadPresentation(filePath)).spacingDriftCount
    }
  ]) {
    const entry = manifest.find((candidate) => candidate.id === scenario.id);
    assert.ok(entry, `${scenario.id} must be present in the admitted corpus manifest`);

    const inputPath = path.join(corpusRoot, entry.file);
    const outputDir = await mkdtemp(path.join(tmpdir(), `pptx-fixer-${scenario.id}-hardening-`));
    tempPaths.push(outputDir);
    const outputPath = path.join(outputDir, `${scenario.id}-fixed.pptx`);
    const secondOutputPath = path.join(outputDir, `${scenario.id}-fixed-second-pass.pptx`);

    const report = await runAllFixes(inputPath, outputPath);

    assert.ok(report.totals[scenario.expectedChangesKey] > 0);
    assert.ok(
      report.totals[scenario.expectedChangesKey] + report.totals.dominantBodyStyleChanges > 0
    );
    assert.deepEqual(
      report.issueCategorySummary.find((entry) => entry.category === scenario.category),
      {
        category: scenario.category,
        detectedBefore: 4,
        fixed: 4,
        remaining: 0,
        status: "improved"
      }
    );
    assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
    assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
    assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
    assert.equal(await scenario.getRemainingDrift(outputPath), 0);

    const secondReport = await runAllFixes(outputPath, secondOutputPath);
    assert.equal(secondReport.applied, false);
    assert.equal(secondReport.noOp, true);
    assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
  }
});

test("spacing guardrail cases remain unchanged and truthful when mixed line-spacing kinds block normalization", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { spacingAfterPt: 12, lineSpacingPct: 120 }),
          buildParagraph("Beta", { spacingAfterPt: 24, lineSpacingPt: 14 }),
          buildParagraph("Gamma", { spacingAfterPt: 12, lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "spacing-guardrail-conflict-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "spacing-guardrail-conflict-fixed-second-pass.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.noOp, true);
  assert.equal(report.totals.spacingChanges, 0);
  assert.equal(report.totals.lineSpacingChanges, 0);
  assert.equal(report.verification.spacingDriftBefore, 1);
  assert.equal(report.verification.spacingDriftAfter, 1);
  assert.equal(report.verification.lineSpacingDriftBefore, 1);
  assert.equal(report.verification.lineSpacingDriftAfter, 1);
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "paragraph_spacing"),
    {
      category: "paragraph_spacing",
      detectedBefore: 1,
      fixed: 0,
      remaining: 1,
      status: "unchanged"
    }
  );
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "line_spacing"),
    {
      category: "line_spacing",
      detectedBefore: 1,
      fixed: 0,
      remaining: 1,
      status: "unchanged"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "manualReviewRecommended");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");

  const secondReport = await runAllFixes(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

test("line-spacing and paragraph-spacing fixes remain separately visible when both improve in the same flow", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { spacingBeforePt: 6, spacingAfterPt: 12, lineSpacingPct: 120 }),
          buildParagraph("Beta", { spacingBeforePt: 12, spacingAfterPt: 24, lineSpacingPct: 140 }),
          buildParagraph("Gamma", { spacingBeforePt: 6, spacingAfterPt: 12, lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "spacing-combined-flow-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "spacing-combined-flow-fixed-second-pass.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.spacingChanges, 1);
  assert.equal(report.totals.lineSpacingChanges, 1);
  assert.equal(report.totals.dominantBodyStyleChanges, 0);
  assert.equal(report.verification.spacingDriftBefore, 1);
  assert.equal(report.verification.spacingDriftAfter, 0);
  assert.equal(report.verification.lineSpacingDriftBefore, 1);
  assert.equal(report.verification.lineSpacingDriftAfter, 0);
  assert.deepEqual(
    report.changesBySlide.map((slide) => ({
      slide: slide.slide,
      spacingChanges: slide.spacingChanges,
      lineSpacingChanges: slide.lineSpacingChanges,
      dominantBodyStyleSpacingBeforeChanges: slide.dominantBodyStyleSpacingBeforeChanges,
      dominantBodyStyleSpacingAfterChanges: slide.dominantBodyStyleSpacingAfterChanges,
      dominantBodyStyleLineSpacingChanges: slide.dominantBodyStyleLineSpacingChanges
    })),
    [
      {
        slide: 1,
        spacingChanges: 1,
        lineSpacingChanges: 1,
        dominantBodyStyleSpacingBeforeChanges: 0,
        dominantBodyStyleSpacingAfterChanges: 0,
        dominantBodyStyleLineSpacingChanges: 0
      }
    ]
  );
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "paragraph_spacing"),
    {
      category: "paragraph_spacing",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    }
  );
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "line_spacing"),
    {
      category: "line_spacing",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
  assert.equal(analyzeSlides(await loadPresentation(outputPath)).spacingDriftCount, 0);
  assert.equal(analyzeSlides(await loadPresentation(outputPath)).lineSpacingDriftCount, 0);

  const secondReport = await runAllFixes(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

async function loadManifest(): Promise<CorpusManifestEntry[]> {
  return JSON.parse(await readFile(manifestPath, "utf8")) as CorpusManifestEntry[];
}

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-spacing-hardening-fixture-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "sample.pptx");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", buildContentTypesXml(options.slides.length));
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", buildPresentationXml(options.slides.length));
  zip.file("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(options.slides.length));

  options.slides.forEach((shapes, index) => {
    zip.file(`ppt/slides/slide${index + 1}.xml`, buildSlideXml(shapes));
  });

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(filePath, buffer);
  return filePath;
}

function buildSlideXml(shapes: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      ${shapes.join("\n")}
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function buildShapeXml(options: {
  id: number;
  name: string;
  paragraphs: string[];
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType ? `<p:ph type="${options.placeholderType}"/>` : "";
  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${options.id}" name="${options.name}"/>
    <p:cNvSpPr/>
    <p:nvPr>${placeholder}</p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    ${options.paragraphs.join("")}
  </p:txBody>
</p:sp>`;
}

function buildParagraph(
  text: string,
  options: {
    spacingBeforePt?: number;
    spacingAfterPt?: number;
    lineSpacingPt?: number;
    lineSpacingPct?: number;
  } = {}
): string {
  const children: string[] = [];

  if (options.spacingBeforePt !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${options.spacingBeforePt * 100}"/></a:spcBef>`);
  }

  if (options.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${options.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (options.lineSpacingPt !== undefined) {
    children.push(`<a:lnSpc><a:spcPts val="${options.lineSpacingPt * 100}"/></a:lnSpc>`);
  }

  if (options.lineSpacingPct !== undefined) {
    children.push(`<a:lnSpc><a:spcPct val="${options.lineSpacingPct * 1000}"/></a:lnSpc>`);
  }

  const paragraphProperties = children.length > 0 ? `<a:pPr>${children.join("")}</a:pPr>` : "";
  return `<a:p>
      ${paragraphProperties}
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>${text}</a:t></a:r>
    </a:p>`;
}

function buildContentTypesXml(slideCount: number): string {
  const slideOverrides = Array.from({ length: slideCount }, (_, index) =>
    `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideOverrides}
</Types>`;
}

function buildPresentationXml(slideCount: number): string {
  const slideIds = Array.from({ length: slideCount }, (_, index) =>
    `<p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>${slideIds}</p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
}

function buildPresentationRelsXml(slideCount: number): string {
  const relationships = Array.from({ length: slideCount }, (_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relationships}
</Relationships>`;
}

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
