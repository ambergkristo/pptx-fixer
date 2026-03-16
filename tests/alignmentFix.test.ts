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

test("runAllFixes corrects an isolated alignment outlier and becomes no-op on second pass", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            buildAlignedParagraph("Alpha", "left"),
            buildAlignedParagraph("Beta", "left"),
            buildAlignedParagraph("Gamma", "center"),
            buildAlignedParagraph("Delta", "left")
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "alignment-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "alignment-fixed-second-pass.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.noOp, false);
  assert.deepEqual(report.steps, [
    { name: "fontFamilyFix", changedRuns: 0 },
    { name: "fontSizeFix", changedRuns: 0 },
    { name: "spacingFix", changedParagraphs: 0 },
    { name: "bulletFix", changedParagraphs: 0 },
    { name: "alignmentFix", changedParagraphs: 1 }
  ]);
  assert.deepEqual(report.totals, {
    fontFamilyChanges: 0,
    fontSizeChanges: 0,
    spacingChanges: 0,
    bulletChanges: 0,
    alignmentChanges: 1
  });
  assert.deepEqual(report.changesBySlide, [
    {
      slide: 1,
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 1
    }
  ]);
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
    alignmentDriftBefore: 1,
    alignmentDriftAfter: 0
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.equal(outputAudit.alignmentDriftCount, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(inputPath),
    await extractAllSlideTextTokens(outputPath)
  );
  assert.doesNotMatch(await readSlideXml(outputPath, 1), /algn="ctr"/);

  const secondReport = await runAllFixes(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.deepEqual(secondReport.steps, [
    { name: "fontFamilyFix", changedRuns: 0 },
    { name: "fontSizeFix", changedRuns: 0 },
    { name: "spacingFix", changedParagraphs: 0 },
    { name: "bulletFix", changedParagraphs: 0 },
    { name: "alignmentFix", changedParagraphs: 0 }
  ]);
  assert.deepEqual(secondReport.verification, {
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
    alignmentDriftAfter: 0
  });
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

test("runAllFixes preserves intentional centered title above left-aligned body", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          paragraphs: [buildAlignedParagraph("Quarterly review", "center")]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          paragraphs: [
            buildAlignedParagraph("Alpha", "left"),
            buildAlignedParagraph("Beta", "left")
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "alignment-title-preserved.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.noOp, true);
  assert.equal(report.verification.alignmentDriftBefore, 0);
  assert.equal(report.verification.alignmentDriftAfter, 0);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes skips ambiguous mixed alignment groups safely", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            buildAlignedParagraph("Alpha", "left"),
            buildAlignedParagraph("Beta", "center"),
            buildAlignedParagraph("Gamma", "right")
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "alignment-ambiguous-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.noOp, true);
  assert.equal(report.totals.alignmentChanges, 0);
  assert.equal(report.verification.alignmentDriftBefore, 3);
  assert.equal(report.verification.alignmentDriftAfter, 3);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes corrects only the safe local group when multiple text groups share a slide", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body Safe",
          paragraphs: [
            buildAlignedParagraph("Alpha", "left"),
            buildAlignedParagraph("Beta", "left"),
            buildAlignedParagraph("Gamma", "center"),
            buildAlignedParagraph("Delta", "left")
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body Ambiguous",
          paragraphs: [
            buildAlignedParagraph("One", "left"),
            buildAlignedParagraph("Two", "center"),
            buildAlignedParagraph("Three", "right")
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "alignment-multi-group-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.alignmentChanges, 1);
  assert.equal(report.verification.alignmentDriftBefore, 4);
  assert.equal(report.verification.alignmentDriftAfter, 3);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /name="Body Safe"[\s\S]*?algn="l"[\s\S]*?algn="l"[\s\S]*?algn="l"/);
  assert.match(outputXml, /name="Body Ambiguous"[\s\S]*?algn="l"[\s\S]*?algn="ctr"[\s\S]*?algn="r"/);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-alignment-fixture-"));
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

function buildAlignedParagraph(text: string, alignment: "left" | "center" | "right" | "justify"): string {
  return `<a:p>
      <a:pPr algn="${toOpenXmlAlignment(alignment)}"></a:pPr>
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>${text}</a:t></a:r>
    </a:p>`;
}

function toOpenXmlAlignment(value: "left" | "center" | "right" | "justify"): string {
  if (value === "left") {
    return "l";
  }

  if (value === "center") {
    return "ctr";
  }

  if (value === "right") {
    return "r";
  }

  return "just";
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
