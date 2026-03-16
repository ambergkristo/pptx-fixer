import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("runAllFixes corrects eligible body-group alignment to dominant style and becomes no-op on second pass", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph("Alpha", { alignment: "left" }),
          buildParagraph("Beta", { alignment: "left" })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph("Gamma", { alignment: "left" }),
          buildParagraph("Delta", { alignment: "left" })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Target",
        paragraphs: [
          buildParagraph("Epsilon", { alignment: "center" }),
          buildParagraph("Zeta", { alignment: "center" })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-body-style-alignment-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "dominant-body-style-alignment-fixed-second-pass.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.validation.reloadable, true);
  assert.deepEqual(report.steps, [
    { name: "fontFamilyFix", changedRuns: 0 },
    { name: "fontSizeFix", changedRuns: 0 },
    { name: "spacingFix", changedParagraphs: 0 },
    { name: "bulletFix", changedParagraphs: 0 },
    { name: "alignmentFix", changedParagraphs: 0 },
    { name: "lineSpacingFix", changedParagraphs: 0 },
    { name: "dominantBodyStyleFix", changedParagraphs: 2 }
  ]);
  assert.equal(report.totals.dominantBodyStyleChanges, 2);
  assert.deepEqual(
    report.changesBySlide.map(({ slide, dominantBodyStyleChanges }) => ({ slide, dominantBodyStyleChanges })),
    [{ slide: 1, dominantBodyStyleChanges: 2 }]
  );
  assert.deepEqual(
    await extractAllSlideTextTokens(inputPath),
    await extractAllSlideTextTokens(outputPath)
  );
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /name="Body Target"[\s\S]*?algn="l"[\s\S]*?algn="l"/);
  assert.doesNotMatch(outputXml, /name="Body Target"[\s\S]*?algn="ctr"/);

  const secondReport = await runAllFixes(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.equal(secondReport.totals.dominantBodyStyleChanges, 0);
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

test("runAllFixes corrects eligible body-group spacingBefore and spacingAfter to dominant style", async () => {
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
  const outputPath = path.join(path.dirname(inputPath), "dominant-body-style-spacing-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.dominantBodyStyleChanges, 4);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /name="Body Target"[\s\S]*?<a:spcBef>[\s\S]*?val="600"[\s\S]*?<a:spcAft>[\s\S]*?val="1200"/);
  assert.doesNotMatch(outputXml, /name="Body Target"[\s\S]*?val="2400"/);
});

test("runAllFixes corrects eligible body-group line spacing when the dominant kind matches", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPct: 120 }),
          buildParagraph("Beta", { lineSpacingPct: 120 })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph("Gamma", { lineSpacingPct: 120 }),
          buildParagraph("Delta", { lineSpacingPct: 120 })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Target",
        paragraphs: [
          buildParagraph("Epsilon", { lineSpacingPct: 140 }),
          buildParagraph("Zeta", { lineSpacingPct: 140 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-body-style-line-spacing-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.dominantBodyStyleChanges, 2);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /name="Body Target"[\s\S]*?<a:spcPct val="120000"/);
  assert.doesNotMatch(outputXml, /name="Body Target"[\s\S]*?<a:spcPct val="140000"\/>/);
});

test("runAllFixes leaves body groups unchanged when no dominant body style is available", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph("Alpha", { alignment: "left" }),
          buildParagraph("Beta", { alignment: "left" })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph("Gamma", { alignment: "center" }),
          buildParagraph("Delta", { alignment: "center" })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-body-style-no-dominant.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.totals.dominantBodyStyleChanges, 0);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes leaves inherited body-group formatting unchanged", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph("Alpha", { alignment: "left" }),
          buildParagraph("Beta", { alignment: "left" })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph("Gamma", { alignment: "left" }),
          buildParagraph("Delta", { alignment: "left" })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Inherit",
        paragraphs: [
          buildParagraph("Epsilon"),
          buildParagraph("Zeta")
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-body-style-inherited-unchanged.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.totals.dominantBodyStyleChanges, 0);
  const outputXml = await readSlideXml(outputPath, 1);
  assert.match(outputXml, /name="Body Inherit"[\s\S]*?<a:p>\s*<a:r/);
  assert.doesNotMatch(outputXml, /name="Body Inherit"[\s\S]*?algn=/);
});

test("runAllFixes leaves body groups unchanged when line spacing kinds are incompatible", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Body A",
        paragraphs: [
          buildParagraph("Alpha", { lineSpacingPt: 14 }),
          buildParagraph("Beta", { lineSpacingPt: 14 })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body B",
        paragraphs: [
          buildParagraph("Gamma", { lineSpacingPt: 14 }),
          buildParagraph("Delta", { lineSpacingPt: 14 })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body Target",
        paragraphs: [
          buildParagraph("Epsilon", { lineSpacingPct: 120 }),
          buildParagraph("Zeta", { lineSpacingPct: 120 })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-body-style-kind-mismatch.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.totals.dominantBodyStyleChanges, 0);
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes preserves title groups even when they differ from the dominant body style", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Title 1",
        placeholderType: "title",
        paragraphs: [
          buildParagraph("Quarterly Review", { alignment: "center" })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body A",
        paragraphs: [
          buildParagraph("Alpha", { alignment: "left" }),
          buildParagraph("Beta", { alignment: "left" })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "Body B",
        paragraphs: [
          buildParagraph("Gamma", { alignment: "left" }),
          buildParagraph("Delta", { alignment: "left" })
        ]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "dominant-body-style-title-preserved.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.totals.dominantBodyStyleChanges, 0);
  assert.match(await readSlideXml(outputPath, 1), /name="Title 1"[\s\S]*?algn="ctr"/);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-dominant-body-style-fixture-"));
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
    alignment?: "left" | "center" | "right" | "justify";
    spacingBeforePt?: number;
    spacingAfterPt?: number;
    lineSpacingPt?: number;
    lineSpacingPct?: number;
  } = {}
): string {
  const attributes = [
    options.alignment === undefined ? "" : `algn="${toOpenXmlAlignment(options.alignment)}"`
  ].filter((attribute) => attribute.length > 0).join(" ");
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

  const paragraphProperties = children.length > 0 || attributes.length > 0
    ? `<a:pPr${attributes.length > 0 ? ` ${attributes}` : ""}>${children.join("")}</a:pPr>`
    : "";
  return `<a:p>
      ${paragraphProperties}
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
