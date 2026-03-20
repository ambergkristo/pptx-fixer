import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { normalizeFontFamilies } from "../packages/fix/fontFamilyFix.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("normalizes explicit run-level font families in normal text shapes only", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [
            { text: "Revenue highlights", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable text", fontFamily: "Calibri", fontSize: 1800 }
          ]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Body 2",
          runs: [
            { text: "Appendix details", fontFamily: "Calibri", fontSize: 2000 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "fixed.pptx");
  const inputSlideBefore = await readArchiveEntry(inputPath, "ppt/slides/slide1.xml");

  const report = await normalizeFontFamilies(inputPath, outputPath);

  assert.deepEqual(report, {
    applied: true,
    dominantFont: "Calibri",
    changedRuns: [
      {
        slide: 1,
        from: "Arial",
        to: "Calibri",
        count: 1
      }
    ],
    skipped: []
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.deepEqual(outputAudit.fontsUsed, [
    {
      fontFamily: "Calibri",
      usageCount: 4
    }
  ]);
  assert.deepEqual(outputAudit.fontDrift, {
    dominantFont: "Calibri",
    driftRuns: []
  });

  const inputSlideAfter = await readArchiveEntry(inputPath, "ppt/slides/slide1.xml");
  const outputSlide = await readArchiveEntry(outputPath, "ppt/slides/slide1.xml");

  assert.equal(inputSlideAfter, inputSlideBefore);
  assert.match(inputSlideAfter, /typeface="Arial"/);
  assert.doesNotMatch(outputSlide, /typeface="Arial"/);
  assert.match(outputSlide, /typeface="Calibri"/);
});

test("returns no-op and creates separate output when no dominant font exists", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "No explicit font A", fontSize: 1800 },
            { text: "No explicit font B", fontSize: 2000 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "no-op-fixed.pptx");

  const report = await normalizeFontFamilies(inputPath, outputPath);

  assert.deepEqual(report, {
    applied: false,
    dominantFont: null,
    changedRuns: [],
    skipped: [
      {
        reason: "no dominant font"
      }
    ]
  });

  const inputBytes = await readFile(inputPath);
  const outputBytes = await readFile(outputPath);
  assert.deepEqual(outputBytes, inputBytes);
});

test("does not overwrite the input file", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Title", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [
            { text: "Change me", fontFamily: "Arial", fontSize: 1800 },
            { text: "Keep me", fontFamily: "Calibri", fontSize: 1800 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "separate-output.pptx");
  const inputStatBefore = await stat(inputPath);
  const inputContentsBefore = await readFile(inputPath);

  await normalizeFontFamilies(inputPath, outputPath);

  const inputStatAfter = await stat(inputPath);
  const inputContentsAfter = await readFile(inputPath);

  assert.equal(inputStatAfter.size, inputStatBefore.size);
  assert.deepEqual(inputContentsAfter, inputContentsBefore);
  assert.notDeepEqual(await readFile(outputPath), inputContentsBefore);
});

test("preserves standalone hierarchy roles on multi-group shapes instead of flattening font families globally", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          paragraphs: [
            {
              runs: [
                { text: "Lead-in", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1200
            },
            {
              runs: [
                { text: "Callout", fontFamily: "Georgia", fontSize: 1800 }
              ],
              spacingAfter: 3000
            },
            {
              runs: [
                { text: "Body", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1200
            }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "hierarchy-preserved.pptx");

  const report = await normalizeFontFamilies(inputPath, outputPath);

  assert.deepEqual(report, {
    applied: false,
    dominantFont: "Calibri",
    changedRuns: [],
    skipped: [
      {
        reason: "no safe changes"
      }
    ]
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.deepEqual(outputAudit.fontDrift, {
    dominantFont: "Calibri",
    driftRuns: [
      {
        slide: 1,
        fontFamily: "Georgia",
        count: 1
      }
    ]
  });

  const outputSlide = await readArchiveEntry(outputPath, "ppt/slides/slide1.xml");
  assert.match(outputSlide, /typeface="Georgia"/);
  assert.match(outputSlide, /typeface="Calibri"/);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-fix-fixture-"));
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

async function readArchiveEntry(filePath: string, entryPath: string): Promise<string> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const entry = archive.file(entryPath);
  assert.ok(entry, `Missing archive entry ${entryPath}`);
  return entry.async("string");
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
  runs?: Array<{
    text: string;
    fontSize: number;
    fontFamily?: string;
  }>;
  paragraphs?: Array<{
    runs: Array<{
      text: string;
      fontSize: number;
      fontFamily?: string;
    }>;
    spacingAfter?: number;
  }>;
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const paragraphs = options.paragraphs ?? [{ runs: options.runs ?? [] }];
  const paragraphXml = paragraphs
    .map((paragraph) => {
      const paragraphProperties = paragraph.spacingAfter === undefined
        ? ""
        : `<a:pPr><a:spcAft><a:spcPts val="${paragraph.spacingAfter}"/></a:spcAft></a:pPr>`;
      const runs = paragraph.runs
        .map((run) => {
          const latinNode = run.fontFamily
            ? `<a:latin typeface="${run.fontFamily}"/>`
            : "";
          return `<a:r>
        <a:rPr sz="${run.fontSize}">
          ${latinNode}
        </a:rPr>
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
    ${paragraphXml}
  </p:txBody>
</p:sp>`;
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
