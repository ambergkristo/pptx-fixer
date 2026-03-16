import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { normalizeDominantFontFamilies } from "../packages/fix/dominantFontFamilyFix.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("normalizeDominantFontFamilies corrects eligible body-group font family and becomes no-op on second pass", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph([{ text: "Alpha", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Beta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph([{ text: "Gamma", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Delta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Target",
        paragraphs: [
          buildParagraph([{ text: "Epsilon", fontFamily: "Arial" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Zeta", fontFamily: "Arial" }], { spacingAfterPt: 12 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-font-family-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "dominant-font-family-fixed-second-pass.pptx");

  const report = await normalizeDominantFontFamilies(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.deepEqual(report.changedParagraphs, [{
      slide: 1,
      from: "Arial",
      to: "Calibri",
      count: 2
    }]);
  assert.deepEqual(await extractAllSlideTextTokens(inputPath), await extractAllSlideTextTokens(outputPath));
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /name="Body Target"[\s\S]*?typeface="Calibri"[\s\S]*?typeface="Calibri"/);

  const secondReport = await normalizeDominantFontFamilies(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.deepEqual(secondReport.changedParagraphs, []);
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

test("normalizeDominantFontFamilies leaves body groups unchanged when dominant font-family candidate is not eligible", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph([{ text: "Alpha", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Beta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph([{ text: "Gamma", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Delta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Target",
        paragraphs: [
          buildParagraph([{ text: "Epsilon", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Zeta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 5,
        name: "Standalone 1",
        paragraphs: [
          buildParagraph([
            { text: "One", fontFamily: "Arial" },
            { text: "Two", fontFamily: "Arial" }
          ], { spacingAfterPt: 36 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-font-family-not-eligible.pptx");

  const report = await normalizeDominantFontFamilies(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("normalizeDominantFontFamilies leaves mixed or ambiguous body groups unchanged", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph([{ text: "Alpha", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Beta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph([{ text: "Gamma", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Delta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Mixed",
        paragraphs: [
          buildParagraph([
            { text: "Epsilon", fontFamily: "Arial" },
            { text: "Mixed", fontFamily: "Calibri" }
          ], { spacingAfterPt: 12 }),
          buildParagraph([
            { text: "Zeta", fontFamily: "Arial" },
            { text: "Mixed", fontFamily: "Calibri" }
          ], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 5,
        name: "Standalone 1",
        paragraphs: [
          buildParagraph([
            { text: "One", fontFamily: "Arial" },
            { text: "Two", fontFamily: "Arial" }
          ], { spacingAfterPt: 36 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-font-family-mixed.pptx");

  const report = await normalizeDominantFontFamilies(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("normalizeDominantFontFamilies leaves inherited or missing font-family structures unchanged", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph([{ text: "Alpha", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Beta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph([{ text: "Gamma", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Delta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Inherit",
        paragraphs: [
          buildParagraph([{ text: "Epsilon" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Zeta" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 5,
        name: "Standalone 1",
        paragraphs: [
          buildParagraph([
            { text: "One", fontFamily: "Arial" },
            { text: "Two", fontFamily: "Arial" }
          ], { spacingAfterPt: 36 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-font-family-inherited.pptx");

  const report = await normalizeDominantFontFamilies(inputPath, outputPath);

  assert.equal(report.applied, false);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /name="Body Inherit"[\s\S]*?<a:rPr sz="2400"><\/a:rPr>/);
});

test("normalizeDominantFontFamilies preserves title groups even when title font differs from dominant body font", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Title 1",
        placeholderType: "title",
        paragraphs: [
          buildParagraph([{ text: "Quarterly Review", fontFamily: "Arial" }])
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body A",
        paragraphs: [
          buildParagraph([{ text: "Alpha", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Beta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body B",
        paragraphs: [
          buildParagraph([{ text: "Gamma", fontFamily: "Calibri" }], { spacingAfterPt: 12 }),
          buildParagraph([{ text: "Delta", fontFamily: "Calibri" }], { spacingAfterPt: 12 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-font-family-title-preserved.pptx");

  const report = await normalizeDominantFontFamilies(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.match(await readSlideXml(outputPath, 1), /name="Title 1"[\s\S]*?typeface="Arial"/);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-dominant-font-family-fixture-"));
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
  runs: Array<{ text: string; fontFamily?: string }>,
  options: { spacingAfterPt?: number } = {}
): string {
  const children: string[] = [];

  if (options.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${options.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  const paragraphProperties = children.length > 0 ? `<a:pPr>${children.join("")}</a:pPr>` : "";
  const serializedRuns = runs.map((run) => {
    const latinNode = run.fontFamily ? `<a:latin typeface="${run.fontFamily}"/>` : "";
    return `<a:r><a:rPr sz="2400">${latinNode}</a:rPr><a:t>${run.text}</a:t></a:r>`;
  }).join("");

  return `<a:p>${paragraphProperties}${serializedRuns}</a:p>`;
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
