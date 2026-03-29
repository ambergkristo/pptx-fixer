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

test("runAllFixes corrects an isolated spcPct line-spacing outlier and becomes no-op on second pass", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta", { lineSpacingPct: 120 }),
          buildParagraph("Gamma", { lineSpacingPct: 140 }),
          buildParagraph("Delta", { lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-pct-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "line-spacing-pct-fixed-second-pass.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.deepEqual(report.steps, [
    { name: "fontFamilyFix", changedRuns: 0 },
    { name: "fontSizeFix", changedRuns: 0 },
    { name: "spacingFix", changedParagraphs: 0 },
    { name: "bulletFix", changedParagraphs: 0 },
    { name: "alignmentFix", changedParagraphs: 0 },
    { name: "lineSpacingFix", changedParagraphs: 1 },
    { name: "dominantBodyStyleFix", changedParagraphs: 0 },
    { name: "dominantFontFamilyFix", changedParagraphs: 0 },
    { name: "dominantFontSizeFix", changedParagraphs: 0 }
  ]);
  assert.deepEqual(report.totals, {
    fontFamilyChanges: 0,
    fontSizeChanges: 0,
    spacingChanges: 0,
    bulletChanges: 0,
    alignmentChanges: 0,
    lineSpacingChanges: 1,
    dominantBodyStyleChanges: 0,
    dominantFontFamilyChanges: 0,
    dominantFontSizeChanges: 0
  });
  assert.deepEqual(report.verification, {
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 0,
    fontSizeDriftAfter: 0,
    spacingDriftBefore: 0,
    spacingDriftAfter: 0,
    bulletIndentDriftBefore: 0,
    bulletIndentDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 1,
    lineSpacingDriftAfter: 0
  });
  assert.equal(analyzeSlides(await loadPresentation(outputPath)).lineSpacingDriftCount, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(inputPath),
    await extractAllSlideTextTokens(outputPath)
  );
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /<a:spcPct val="120000"/);
  assert.doesNotMatch(outputXml, /<a:spcPct val="140000"/);

  const secondReport = await runAllFixes(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.equal(secondReport.verification.lineSpacingDriftBefore, 0);
  assert.equal(secondReport.verification.lineSpacingDriftAfter, 0);
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

test("runAllFixes corrects an isolated spcPts line-spacing outlier", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPt: 14 }),
          buildParagraph("Beta", { lineSpacingPt: 14 }),
          buildParagraph("Gamma", { lineSpacingPt: 18 }),
          buildParagraph("Delta", { lineSpacingPt: 14 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-pts-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.totals.lineSpacingChanges, 1);
  assert.equal(report.verification.lineSpacingDriftBefore, 1);
  assert.equal(report.verification.lineSpacingDriftAfter, 0);
  assert.match(await readSlideXml(outputPath, 1), /<a:spcPts val="1400"/);
  assert.doesNotMatch(await readSlideXml(outputPath, 1), /<a:spcPts val="1800"/);
});

test("runAllFixes preserves intentional title/body line-spacing differences", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Title 1",
        placeholderType: "title",
        paragraphs: [buildParagraph("Quarterly review", { lineSpacingPct: 140 })]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta", { lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-title-preserved.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.verification.lineSpacingDriftBefore, 0);
  assert.equal(report.verification.lineSpacingDriftAfter, 0);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes skips ambiguous mixed explicit line-spacing groups safely", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta", { lineSpacingPct: 140 }),
          buildParagraph("Gamma", { lineSpacingPct: 160 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-ambiguous-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.totals.lineSpacingChanges, 0);
  assert.equal(report.verification.lineSpacingDriftBefore, 3);
  assert.equal(report.verification.lineSpacingDriftAfter, 3);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes skips mixed line-spacing unit forms in one local group", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta", { lineSpacingPt: 14 }),
          buildParagraph("Gamma", { lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-mixed-units-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.totals.lineSpacingChanges, 0);
  assert.equal(report.verification.lineSpacingDriftBefore, 1);
  assert.equal(report.verification.lineSpacingDriftAfter, 1);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes preserves inherited/default line spacing and does not bridge across it", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta"),
          buildParagraph("Gamma", { lineSpacingPct: 140 }),
          buildParagraph("Delta", { lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-inherit-preserved.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.totals.lineSpacingChanges, 0);
  assert.equal(report.verification.lineSpacingDriftBefore, 2);
  assert.equal(report.verification.lineSpacingDriftAfter, 2);
  const xml = await readSlideXml(outputPath, 1);
  const betaParagraph = Array.from(xml.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)).find((match) => match[0].includes("<a:t>Beta</a:t>"));
  assert.ok(betaParagraph);
  assert.doesNotMatch(betaParagraph[0], /<a:pPr>/);
});

test("runAllFixes corrects a trailing explicit line-spacing outlier after a stable baseline split by an inherited divider", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta", { lineSpacingPct: 120 }),
          buildParagraph("Gamma", { lineSpacingPct: 120 }),
          buildParagraph("Divider"),
          buildParagraph("Tail baseline", { lineSpacingPct: 120 }),
          buildParagraph("Tail outlier", { lineSpacingPct: 150 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-tail-outlier-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.lineSpacingChanges, 1);
  assert.equal(report.verification.lineSpacingDriftBefore, 2);
  assert.equal(report.verification.lineSpacingDriftAfter, 1);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /Tail outlier/);
  assert.doesNotMatch(outputXml, /<a:spcPct val="150000"\/><\/a:lnSpc>[\s\S]*?Tail outlier/);
});

test("runAllFixes corrects multiple same-kind line-spacing outliers when one explicit value has a clear local majority", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta", { lineSpacingPct: 120 }),
          buildParagraph("Gamma", { lineSpacingPct: 90 }),
          buildParagraph("Delta", { lineSpacingPct: 160 }),
          buildParagraph("Epsilon", { lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-majority-outliers-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.lineSpacingChanges, 2);
  assert.equal(report.verification.lineSpacingDriftBefore, 2);
  assert.equal(report.verification.lineSpacingDriftAfter, 0);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.doesNotMatch(outputXml, /<a:spcPct val="90000"\/>/);
  assert.doesNotMatch(outputXml, /<a:spcPct val="160000"\/>/);
  assert.match(outputXml, /<a:spcPct val="120000"/);
});

test("runAllFixes bridges inherited paragraphs to a stabilized explicit line-spacing baseline inside one hostile body block", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body 1",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta", { lineSpacingPct: 145 }),
          buildParagraph("Gamma"),
          buildParagraph("Delta"),
          buildParagraph("Epsilon"),
          buildParagraph("Zeta", { lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "line-spacing-inherited-bridge-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.lineSpacingChanges, 4);
  assert.equal(report.verification.lineSpacingDriftBefore, 3);
  assert.equal(report.verification.lineSpacingDriftAfter, 0);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.doesNotMatch(outputXml, /<a:spcPct val="145000"[\s\S]*?Beta/);
  assert.match(outputXml, /Gamma[\s\S]*?<a:lnSpc><a:spcPct val="120000"/);
  assert.match(outputXml, /Delta[\s\S]*?<a:lnSpc><a:spcPct val="120000"/);
  assert.match(outputXml, /Epsilon[\s\S]*?<a:lnSpc><a:spcPct val="120000"/);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-line-spacing-fixture-"));
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
    lineSpacingPt?: number;
    lineSpacingPct?: number;
  } = {}
): string {
  const children: string[] = [];

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
  const overrides = Array.from({ length: slideCount }, (_, index) =>
    `  <Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
${overrides}
</Types>`;
}

function buildPresentationXml(slideCount: number): string {
  const slideEntries = Array.from({ length: slideCount }, (_, index) =>
    `    <p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
${slideEntries}
  </p:sldIdLst>
</p:presentation>`;
}

function buildPresentationRelsXml(slideCount: number): string {
  const slideEntries = Array.from({ length: slideCount }, (_, index) =>
    `  <Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${slideEntries}
</Relationships>`;
}

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
