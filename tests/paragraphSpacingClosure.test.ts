import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("runAllFixes normalizes inherited and explicit paragraph-spacing drift when the shape-local dominant signature is clear", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { spacingBeforePt: 6, spacingAfterPt: 12 }),
          buildParagraph("Beta", { spacingBeforePt: 6, spacingAfterPt: 12 }),
          buildParagraph("Gamma"),
          buildParagraph("Delta", { spacingBeforePt: 12, spacingAfterPt: 24 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "paragraph-spacing-inherit-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "paragraph-spacing-inherit-fixed-second-pass.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.spacingChanges, 2);
  assert.equal(report.totals.dominantBodyStyleChanges, 0);
  assert.equal(report.verification.spacingDriftBefore, 2);
  assert.equal(report.verification.spacingDriftAfter, 0);
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "paragraph_spacing"),
    {
      category: "paragraph_spacing",
      detectedBefore: 2,
      fixed: 2,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
  assert.equal(analyzeSlides(await loadPresentation(outputPath)).spacingDriftCount, 0);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /<a:t>Gamma<\/a:t>/);
  assert.match(outputXml, /<a:t>Gamma<\/a:t>[\s\S]*?<a:spcPts val="600"><\/a:spcPts>/);
  assert.match(outputXml, /<a:t>Gamma<\/a:t>[\s\S]*?<a:spcPts val="1200"><\/a:spcPts>/);
  assert.doesNotMatch(outputXml, /<a:spcPts val="2400"/);

  const secondReport = await runAllFixes(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

test("runAllFixes leaves paragraph-spacing drift unchanged when no dominant signature is clear", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha"),
          buildParagraph("Beta", { spacingAfterPt: 12 }),
          buildParagraph("Gamma", { spacingAfterPt: 24 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "paragraph-spacing-ambiguous-inherit-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.totals.spacingChanges, 0);
  assert.equal(report.verification.spacingDriftBefore, 3);
  assert.equal(report.verification.spacingDriftAfter, 3);
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "paragraph_spacing"),
    {
      category: "paragraph_spacing",
      detectedBefore: 3,
      fixed: 0,
      remaining: 3,
      status: "unchanged"
    }
  );
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes leaves paragraph-spacing drift unchanged when the same flow contains mixed line-spacing kinds", async () => {
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
  const outputPath = path.join(path.dirname(inputPath), "paragraph-spacing-line-kind-conflict-fixed.pptx");

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
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes reports paragraph-spacing improvement coherently when dominant-body-style cleanup performs the reduction", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph("Alpha", { spacingBeforePt: 6, spacingAfterPt: 12 }),
          buildParagraph("Beta", { spacingBeforePt: 6, spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph("Gamma", { spacingBeforePt: 6, spacingAfterPt: 12 }),
          buildParagraph("Delta", { spacingBeforePt: 6, spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Target",
        paragraphs: [
          buildParagraph("Epsilon", { spacingBeforePt: 12, spacingAfterPt: 24 }),
          buildParagraph("Zeta", { spacingBeforePt: 12, spacingAfterPt: 24 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "paragraph-spacing-dominant-body-style-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.spacingChanges, 0);
  assert.equal(report.totals.dominantBodyStyleChanges, 4);
  assert.equal(report.verification.spacingDriftBefore, 2);
  assert.equal(report.verification.spacingDriftAfter, 0);
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "paragraph_spacing"),
    {
      category: "paragraph_spacing",
      detectedBefore: 2,
      fixed: 2,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
  assert.deepEqual(
    report.changesBySlide.map((slide) => ({
      slide: slide.slide,
      spacingChanges: slide.spacingChanges,
      dominantBodyStyleSpacingBeforeChanges: slide.dominantBodyStyleSpacingBeforeChanges,
      dominantBodyStyleSpacingAfterChanges: slide.dominantBodyStyleSpacingAfterChanges
    })),
    [
      {
        slide: 1,
        spacingChanges: 0,
        dominantBodyStyleSpacingBeforeChanges: 2,
        dominantBodyStyleSpacingAfterChanges: 2
      }
    ]
  );
});

test("runAllFixes still reduces paragraph spacing safely when line-spacing cleanup on the same paragraph flow is coherent", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { spacingAfterPt: 12, lineSpacingPct: 120 }),
          buildParagraph("Beta", { spacingAfterPt: 24, lineSpacingPct: 140 }),
          buildParagraph("Gamma", { spacingAfterPt: 12, lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "paragraph-and-line-spacing-coherent-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.spacingChanges, 1);
  assert.equal(report.totals.lineSpacingChanges, 1);
  assert.equal(report.verification.spacingDriftBefore, 1);
  assert.equal(report.verification.spacingDriftAfter, 0);
  assert.equal(report.verification.lineSpacingDriftBefore, 1);
  assert.equal(report.verification.lineSpacingDriftAfter, 0);
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
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-paragraph-spacing-closure-fixture-"));
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

async function readSlideXml(filePath: string, slideIndex: number): Promise<string> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const xml = await archive.file(`ppt/slides/slide${slideIndex}.xml`)?.async("string");
  assert.ok(xml, `Missing slide ${slideIndex}`);
  return xml;
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
