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

test("runAllFixes normalizes clear paragraph spacing outliers and stays no-op on second pass", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          paragraphs: [
            {
              runs: [{ text: "Quarterly review", fontFamily: "Calibri", fontSize: 2400 }]
            }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          paragraphs: [
            {
              spacingAfterPt: 12,
              runs: [{ text: "Alpha", fontFamily: "Calibri", fontSize: 2400 }]
            },
            {
              spacingAfterPt: 12,
              runs: [{ text: "Beta", fontFamily: "Calibri", fontSize: 2400 }]
            },
            {
              spacingAfterPt: 24,
              runs: [{ text: "Gamma", fontFamily: "Calibri", fontSize: 2400 }]
            }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "spacing-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "spacing-fixed-second-pass.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.noOp, false);
  assert.deepEqual(report.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 0
    },
    {
      name: "fontSizeFix",
      changedRuns: 0
    },
    {
      name: "spacingFix",
      changedParagraphs: 1
    },
    {
      name: "bulletFix",
      changedParagraphs: 0
    },
    {
      name: "alignmentFix",
      changedParagraphs: 0
    },
    {
      name: "lineSpacingFix",
      changedParagraphs: 0
    },
    {
      name: "dominantBodyStyleFix",
      changedParagraphs: 0
    },
      {
        name: "dominantFontFamilyFix",
        changedParagraphs: 0
      },
      {
        name: "dominantFontSizeFix",
        changedParagraphs: 0
      }
  ]);
  assert.deepEqual(report.totals, {
    fontFamilyChanges: 0,
    fontSizeChanges: 0,
    spacingChanges: 1,
    bulletChanges: 0,
    alignmentChanges: 0,
    lineSpacingChanges: 0,
    dominantBodyStyleChanges: 0,
    dominantFontFamilyChanges: 0,
    dominantFontSizeChanges: 0
  });
  assert.deepEqual(report.changesBySlide, [
    {
      slide: 1,
      slideFontUsage: {
        fontFamilyHistogram: {
          Calibri: 4
        },
        fontSizeHistogram: {
          24: 4
        }
      },
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 1,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0,
      dominantBodyStyleEligibleGroups: 0,
      dominantBodyStyleTouchedGroups: 0,
      dominantBodyStyleSkippedGroups: 0,
      dominantBodyStyleAlignmentChanges: 0,
      dominantBodyStyleSpacingBeforeChanges: 0,
      dominantBodyStyleSpacingAfterChanges: 0,
      dominantBodyStyleLineSpacingChanges: 0
    }
  ]);
  assert.deepEqual(report.verification, {
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 0,
    fontSizeDriftAfter: 0,
    spacingDriftBefore: 1,
    spacingDriftAfter: 0,
    bulletIndentDriftBefore: 0,
    bulletIndentDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.equal(outputAudit.spacingDriftCount, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(inputPath),
    await extractAllSlideTextTokens(outputPath)
  );
  assert.match(await readSlideXml(outputPath, 1), /<a:spcPts val="1200"/);
  assert.doesNotMatch(await readSlideXml(outputPath, 1), /<a:spcPts val="2400"/);
  assert.doesNotMatch(await readSlideXml(outputPath, 1), /<a:spcBef/);

  const secondReport = await runAllFixes(outputPath, secondOutputPath);

  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.deepEqual(secondReport.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 0
    },
    {
      name: "fontSizeFix",
      changedRuns: 0
    },
    {
      name: "spacingFix",
      changedParagraphs: 0
    },
    {
      name: "bulletFix",
      changedParagraphs: 0
    },
    {
      name: "alignmentFix",
      changedParagraphs: 0
    },
    {
      name: "lineSpacingFix",
      changedParagraphs: 0
    },
    {
      name: "dominantBodyStyleFix",
      changedParagraphs: 0
    },
      {
        name: "dominantFontFamilyFix",
        changedParagraphs: 0
      },
      {
        name: "dominantFontSizeFix",
        changedParagraphs: 0
      }
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
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

test("runAllFixes skips ambiguous paragraph spacing signatures safely", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            {
              spacingAfterPt: 12,
              runs: [{ text: "Alpha", fontFamily: "Calibri", fontSize: 2400 }]
            },
            {
              spacingAfterPt: 24,
              runs: [{ text: "Beta", fontFamily: "Calibri", fontSize: 2400 }]
            },
            {
              spacingAfterPt: 36,
              runs: [{ text: "Gamma", fontFamily: "Calibri", fontSize: 2400 }]
            }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "spacing-ambiguous-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.noOp, true);
  assert.deepEqual(report.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 0
    },
    {
      name: "fontSizeFix",
      changedRuns: 0
    },
    {
      name: "spacingFix",
      changedParagraphs: 0
    },
    {
      name: "bulletFix",
      changedParagraphs: 0
    },
    {
      name: "alignmentFix",
      changedParagraphs: 0
    },
    {
      name: "lineSpacingFix",
      changedParagraphs: 0
    },
    {
      name: "dominantBodyStyleFix",
      changedParagraphs: 0
    },
      {
        name: "dominantFontFamilyFix",
        changedParagraphs: 0
      },
      {
        name: "dominantFontSizeFix",
        changedParagraphs: 0
      }
  ]);
  assert.deepEqual(report.totals, {
    fontFamilyChanges: 0,
    fontSizeChanges: 0,
    spacingChanges: 0,
    bulletChanges: 0,
    alignmentChanges: 0,
    lineSpacingChanges: 0,
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
    spacingDriftBefore: 3,
    spacingDriftAfter: 3,
    bulletIndentDriftBefore: 0,
    bulletIndentDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-spacing-fixture-"));
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
  paragraphs: Array<{
    runs: Array<{
      text: string;
      fontFamily?: string;
      fontSize?: number;
    }>;
    spacingBeforePt?: number;
    spacingAfterPt?: number;
  }>;
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const paragraphs = options.paragraphs
    .map((paragraph) => {
      const paragraphProperties = buildParagraphPropertiesXml({
        spacingBeforePt: paragraph.spacingBeforePt,
        spacingAfterPt: paragraph.spacingAfterPt
      });
      const runs = paragraph.runs
        .map((run) => {
          const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
          const latinNode = run.fontFamily ? `<a:latin typeface="${run.fontFamily}"/>` : "";
          return `<a:r>
        <a:rPr${sizeAttribute}>${latinNode}</a:rPr>
        <a:t>${run.text}</a:t>
      </a:r>`;
        })
        .join("");

      return `<a:p>
      ${paragraphProperties}
      ${runs}
    </a:p>`;
    })
    .join("");

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
    ${paragraphs}
  </p:txBody>
</p:sp>`;
}

function buildParagraphPropertiesXml(options: {
  spacingBeforePt?: number;
  spacingAfterPt?: number;
}): string {
  const children: string[] = [];

  if (options.spacingBeforePt !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${options.spacingBeforePt * 100}"/></a:spcBef>`);
  }

  if (options.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${options.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (children.length === 0) {
    return "";
  }

  return `<a:pPr>${children.join("")}</a:pPr>`;
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
