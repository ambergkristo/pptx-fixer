import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { normalizeFontSizes } from "../packages/fix/fontSizeFix.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("normalizes explicit run-level font sizes in normal text shapes only", async () => {
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
            { text: "Stable text", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Body 2",
          runs: [
            { text: "Appendix details", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "fixed-size.pptx");
  const inputSlideBefore = await readArchiveEntry(inputPath, "ppt/slides/slide1.xml");

  const report = await normalizeFontSizes(inputPath, outputPath);

  assert.deepEqual(report, {
    applied: true,
    dominantSizePt: 24,
    changedRuns: [
      {
        slide: 1,
        fromSizePt: 18,
        toSizePt: 24,
        count: 1
      }
    ],
    skipped: []
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.deepEqual(outputAudit.fontSizesUsed, [
    {
      sizePt: 24,
      usageCount: 4
    }
  ]);
  assert.deepEqual(outputAudit.fontSizeDrift, {
    dominantSizePt: 24,
    driftRuns: []
  });

  const inputSlideAfter = await readArchiveEntry(inputPath, "ppt/slides/slide1.xml");
  const outputSlide = await readArchiveEntry(outputPath, "ppt/slides/slide1.xml");

  assert.equal(inputSlideAfter, inputSlideBefore);
  assert.match(inputSlideAfter, /sz="1800"/);
  assert.doesNotMatch(outputSlide, /sz="1800"/);
  assert.match(outputSlide, /sz="2400"/);
});

test("returns no-op and creates separate output when no dominant font size exists", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "No explicit size A", fontFamily: "Calibri" },
            { text: "No explicit size B", fontFamily: "Arial" }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "no-op-size-fixed.pptx");

  const report = await normalizeFontSizes(inputPath, outputPath);

  assert.deepEqual(report, {
    applied: false,
    dominantSizePt: null,
    changedRuns: [],
    skipped: [
      {
        reason: "no dominant font size"
      }
    ]
  });

  const inputBytes = await readFile(inputPath);
  const outputBytes = await readFile(outputPath);
  assert.deepEqual(outputBytes, inputBytes);
});

test("does not overwrite the input file and preserves Open XML write-back units", async () => {
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
            { text: "Keep me", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "separate-size-output.pptx");
  const inputStatBefore = await stat(inputPath);
  const inputContentsBefore = await readFile(inputPath);

  await normalizeFontSizes(inputPath, outputPath);

  const inputStatAfter = await stat(inputPath);
  const inputContentsAfter = await readFile(inputPath);
  const outputSlide = await readArchiveEntry(outputPath, "ppt/slides/slide1.xml");

  assert.equal(inputStatAfter.size, inputStatBefore.size);
  assert.deepEqual(inputContentsAfter, inputContentsBefore);
  assert.notDeepEqual(await readFile(outputPath), inputContentsBefore);
  assert.match(outputSlide, /sz="2400"/);
  assert.doesNotMatch(outputSlide, /sz="18"/);
});

test("preserves standalone and mixed-size hierarchy roles on multi-group shapes instead of flattening font sizes globally", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2000 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          paragraphs: [
            {
              runs: [
                { text: "Body", fontFamily: "Calibri", fontSize: 2000 },
                { text: " copy", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1200
            },
            {
              runs: [
                { text: "Callout", fontFamily: "Calibri", fontSize: 1800 }
              ],
              spacingAfter: 3000
            },
            {
              runs: [
                { text: "Mixed", fontFamily: "Calibri", fontSize: 2000 },
                { text: " size", fontFamily: "Calibri", fontSize: 1800 }
              ],
              spacingAfter: 1200,
              alignment: "l"
            },
            {
              runs: [
                { text: "Body again", fontFamily: "Calibri", fontSize: 2000 },
                { text: " stable", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1200
            }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "hierarchy-preserved-size.pptx");

  const report = await normalizeFontSizes(inputPath, outputPath);

  assert.deepEqual(report, {
    applied: false,
    dominantSizePt: 20,
    changedRuns: [],
    skipped: [
      {
        reason: "no safe changes"
      }
    ]
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.deepEqual(outputAudit.fontSizeDrift, {
    dominantSizePt: 20,
    driftRuns: [
      {
        slide: 1,
        sizePt: 18,
        count: 2
      }
    ]
  });

  const outputSlide = await readArchiveEntry(outputPath, "ppt/slides/slide1.xml");
  assert.match(outputSlide, /sz="1800"/);
  assert.match(outputSlide, /sz="2000"/);
});

test("preserves an isolated paragraph-level size role inside a repeated body group", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2000 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          paragraphs: [
            {
              runs: [
                { text: "Body alpha", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1200
            },
            {
              runs: [
                { text: "Intentional large callout", fontFamily: "Calibri", fontSize: 2400 }
              ],
              spacingAfter: 1200
            },
            {
              runs: [
                { text: "Body beta", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1200
            }
          ]
        }),
        buildShapeXml({
          id: 4,
          name: "Body 2",
          paragraphs: [
            {
              runs: [
                { text: "Body gamma", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1200
            },
            {
              runs: [
                { text: "Body delta", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1200
            }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "isolated-size-role-preserved.pptx");

  const report = await normalizeFontSizes(inputPath, outputPath);

  assert.deepEqual(report, {
    applied: false,
    dominantSizePt: 20,
    changedRuns: [],
    skipped: [
      {
        reason: "no safe changes"
      }
    ]
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.deepEqual(outputAudit.fontSizeDrift, {
    dominantSizePt: 20,
    driftRuns: [
      {
        slide: 1,
        sizePt: 24,
        count: 1
      }
    ]
  });

  const outputSlide = await readArchiveEntry(outputPath, "ppt/slides/slide1.xml");
  assert.match(outputSlide, /Intentional large callout/);
  assert.match(outputSlide, /sz="2400"/);
});

test("fixes mixed-run size drift inside a body group while preserving an intentional larger paragraph role", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2800 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          paragraphs: [
            {
              runs: [
                { text: "Baseline body paragraph.", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1800
            },
            {
              runs: [
                { text: "Sentence starts normal ", fontFamily: "Calibri", fontSize: 2000 },
                { text: "but drifts larger", fontFamily: "Calibri", fontSize: 2400 },
                { text: " before ending.", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1800
            },
            {
              runs: [
                { text: "Intentional large callout", fontFamily: "Calibri", fontSize: 2400 }
              ],
              spacingAfter: 1800
            },
            {
              runs: [
                { text: "Back to baseline body paragraph.", fontFamily: "Calibri", fontSize: 2000 }
              ],
              spacingAfter: 1800
            }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "mixed-run-size-fixed-callout-preserved.pptx");

  const report = await normalizeFontSizes(inputPath, outputPath);

  assert.deepEqual(report, {
    applied: true,
    dominantSizePt: 20,
    changedRuns: [
      {
        slide: 1,
        fromSizePt: 24,
        toSizePt: 20,
        count: 1
      }
    ],
    skipped: []
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.deepEqual(outputAudit.fontSizeDrift, {
    dominantSizePt: 20,
    driftRuns: [
      {
        slide: 1,
        sizePt: 28,
        count: 1
      },
      {
        slide: 1,
        sizePt: 24,
        count: 1
      }
    ]
  });

  const outputSlide = await readArchiveEntry(outputPath, "ppt/slides/slide1.xml");
  assert.match(outputSlide, /Intentional large callout/);
  assert.match(outputSlide, /sz="2400"[\s\S]*?Intentional large callout/);
  assert.doesNotMatch(outputSlide, /sz="2400"[\s\S]*?but drifts larger/);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-size-fix-fixture-"));
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
    fontSize?: number;
    fontFamily?: string;
  }>;
  paragraphs?: Array<{
    runs: Array<{
      text: string;
      fontSize?: number;
      fontFamily?: string;
    }>;
    spacingAfter?: number;
    alignment?: "l" | "ctr" | "r" | "just";
  }>;
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const paragraphs = options.paragraphs ?? [{ runs: options.runs ?? [] }];
  const paragraphXml = paragraphs
    .map((paragraph) => {
      const spacingAfterXml = paragraph.spacingAfter === undefined
        ? ""
        : `<a:spcAft><a:spcPts val="${paragraph.spacingAfter}"/></a:spcAft>`;
      const alignmentAttribute = paragraph.alignment ? ` algn="${paragraph.alignment}"` : "";
      const paragraphProperties = spacingAfterXml || alignmentAttribute
        ? `<a:pPr${alignmentAttribute}>${spacingAfterXml}</a:pPr>`
        : "";
      const runs = paragraph.runs
        .map((run) => {
          const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
          const latinNode = run.fontFamily
            ? `<a:latin typeface="${run.fontFamily}"/>`
            : "";
          return `<a:r>
        <a:rPr${sizeAttribute}>
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
