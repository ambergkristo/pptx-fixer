import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";

import JSZip from "jszip";

import { createProductShellApp } from "../apps/product-shell/server.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("audit upload returns audit summary json", async () => {
  const harness = await createHarness();
  await using _server = harness;

  const response = await uploadFile(`${harness.baseUrl}/audit`, {
    fileName: "sales.pptx",
    fileBuffer: await createFixturePptxBuffer({
      slides: [
        [
          buildShapeXml({
            id: 2,
            name: "Body 1",
            paragraphs: [
              {
                bullet: true,
                bulletLevel: 0,
                alignment: "left",
                runs: [
                  { text: "A", fontFamily: "Calibri", fontSize: 2400 }
                ]
              },
              {
                bullet: true,
                bulletLevel: 2,
                alignment: "center",
                lineSpacingPct: 140,
                runs: [
                  { text: "B", fontFamily: "Arial", fontSize: 1800 }
                ]
              },
              {
                bullet: true,
                bulletLevel: 0,
                alignment: "left",
                runs: [
                  { text: "C", fontFamily: "Calibri", fontSize: 2400 }
                ]
              }
            ]
          })
        ]
      ]
    })
  });

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.deepEqual(json, {
    slideCount: 1,
    fontDrift: 1,
    fontSizeDrift: 1,
    spacingDrift: 0,
    bulletIndentDriftCount: 1,
    lineSpacingDriftCount: 1,
    alignmentDriftCount: 1
  });
});

test("fix upload returns report and download url", async () => {
  const harness = await createHarness();
  await using _server = harness;

  const response = await uploadFile(`${harness.baseUrl}/fix`, {
    fileName: "sales.pptx",
    fileBuffer: await createFixturePptxBuffer({
      slides: [
        [
          buildShapeXml({
            id: 2,
            name: "Body 1",
            runs: [
              { text: "Change both", fontFamily: "Arial", fontSize: 1800 },
              { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
            ]
          })
        ]
      ]
    }),
    fields: {
      mode: "standard"
    }
  });

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.report.mode, "standard");
  assert.equal(json.report.validation.reloadable, true);
  assert.match(json.downloadUrl, /^\/download\/.+\.pptx$/);

  const downloadResponse = await fetch(`${harness.baseUrl}${json.downloadUrl}`);
  assert.equal(downloadResponse.status, 200);
  const downloadBuffer = Buffer.from(await downloadResponse.arrayBuffer());
  assert.equal(downloadBuffer.subarray(0, 2).toString("utf8"), "PK");
});

test("invalid file upload is rejected", async () => {
  const harness = await createHarness();
  await using _server = harness;

  const response = await uploadFile(`${harness.baseUrl}/audit`, {
    fileName: "notes.txt",
    fileBuffer: Buffer.from("not a pptx", "utf8")
  });

  assert.equal(response.status, 400);
  const json = await response.json();
  assert.deepEqual(json, {
    error: "file must be .pptx"
  });
});

test("validation failure returns a clear error", async () => {
  const harness = await createHarness({
    runFixesByModeImpl: async () => ({
      mode: "minimal",
      applied: true,
      noOp: false,
      steps: [
        {
          name: "fontFamilyFix",
          changedRuns: 1
        }
      ],
      deckFontUsage: {
        fontFamilyHistogram: {
          Calibri: 1
        },
        fontSizeHistogram: {
          24: 1
        },
        dominantFontFamilyCoverage: 100,
        dominantFontSizeCoverage: 100
      },
      deckStyleFingerprint: {
        fontFamily: "Calibri",
        fontSize: 24,
        alignment: null,
        lineSpacing: null,
        spacingBefore: null,
        spacingAfter: null
      },
      fontDriftSeverity: "low",
      deckQaSummary: {
        brandScore: 99,
        qualityLabel: "good",
        summaryLine: "Deck is mostly consistent with minor formatting drift.",
        keyIssues: [
          "Font family drift detected"
        ],
        fixImpact: {
          changedSlides: 1,
          totalChanges: 1
        }
      },
      topProblemSlides: [
        {
          slideIndex: 1,
          brandScore: 99,
          qualityLabel: "good",
          summaryLine: "Slide is mostly consistent with minor formatting drift.",
          keyIssues: [
            "Font family drift detected"
          ]
        }
      ],
      totals: {
        fontFamilyChanges: 1,
        fontSizeChanges: 0,
        spacingChanges: 0,
        bulletChanges: 0,
        alignmentChanges: 0,
        lineSpacingChanges: 0,
        dominantBodyStyleChanges: 0,
        dominantFontFamilyChanges: 0,
        dominantFontSizeChanges: 0
      },
      changesBySlide: [
        {
          slide: 1,
          slideFontUsage: {
            fontFamilyHistogram: {
              Calibri: 1
            },
            fontSizeHistogram: {
              24: 1
            }
          },
          slideQaSummary: {
            brandScore: 99,
            qualityLabel: "good",
            summaryLine: "Slide is mostly consistent with minor formatting drift.",
            keyIssues: [
              "Font family drift detected"
            ]
          },
          fontFamilyChanges: 1,
          fontSizeChanges: 0,
          spacingChanges: 0,
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
      ],
      validation: {
        outputExists: true,
        isZip: true,
        coreEntriesPresent: true,
        reloadable: false,
        slideCountMatches: false
      },
      verification: {
        inputSlideCount: 1,
        outputSlideCount: null,
        fontDriftBefore: 1,
        fontDriftAfter: null,
        fontSizeDriftBefore: 1,
        fontSizeDriftAfter: null,
        spacingDriftBefore: 0,
        spacingDriftAfter: null,
        bulletIndentDriftBefore: 0,
        bulletIndentDriftAfter: null,
        alignmentDriftBefore: 0,
        alignmentDriftAfter: null,
        lineSpacingDriftBefore: 0,
        lineSpacingDriftAfter: null
      }
    })
  });
  await using _server = harness;

  const response = await uploadFile(`${harness.baseUrl}/fix`, {
    fileName: "sales.pptx",
    fileBuffer: await createFixturePptxBuffer({
      slides: [
        [
          buildShapeXml({
            id: 2,
            name: "Body 1",
            runs: [
              { text: "Change", fontFamily: "Arial", fontSize: 1800 }
            ]
          })
        ]
      ]
    }),
    fields: {
      mode: "minimal"
    }
  });

  assert.equal(response.status, 500);
  const json = await response.json();
  assert.deepEqual(json, {
    error: "export validation failed"
  });
});

test("download endpoint returns 404 for unknown file", async () => {
  const harness = await createHarness();
  await using _server = harness;

  const response = await fetch(`${harness.baseUrl}/download/missing-file.pptx`);

  assert.equal(response.status, 404);
});

async function createHarness(options: {
  runFixesByModeImpl?: Parameters<typeof createProductShellApp>[0]["runFixesByModeImpl"];
} = {}) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-shell-"));
  tempPaths.push(rootDir);

  const tempStorageDirectory = path.join(rootDir, "tmp");
  const outputStorageDirectory = path.join(rootDir, "output");
  const app = createProductShellApp({
    tempStorageDirectory,
    outputStorageDirectory,
    runFixesByModeImpl: options.runFixesByModeImpl
  });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind product shell test server");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async [Symbol.asyncDispose]() {
      server.close();
      await once(server, "close");
    }
  };
}

async function uploadFile(
  url: string,
  options: {
    fileName: string;
    fileBuffer: Buffer;
    fields?: Record<string, string>;
  }
): Promise<Response> {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([options.fileBuffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    }),
    options.fileName
  );

  for (const [key, value] of Object.entries(options.fields ?? {})) {
    formData.append(key, value);
  }

  return fetch(url, {
    method: "POST",
    body: formData
  });
}

async function createFixturePptxBuffer(options: { slides: string[][] }): Promise<Buffer> {
  const zip = new JSZip();

  zip.file("[Content_Types].xml", buildContentTypesXml(options.slides.length));
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", buildPresentationXml(options.slides.length));
  zip.file("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(options.slides.length));

  options.slides.forEach((shapes, index) => {
    zip.file(`ppt/slides/slide${index + 1}.xml`, buildSlideXml(shapes));
  });

  return zip.generateAsync({ type: "nodebuffer" });
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
    spacingAfterPt?: number;
    bullet?: boolean;
    bulletLevel?: number;
    lineSpacingPt?: number;
    lineSpacingPct?: number;
    alignment?: "left" | "center" | "right" | "justify";
  }>;
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const paragraphs = (options.paragraphs ?? [{ runs: options.runs ?? [] }])
    .map((paragraph) => {
      const paragraphProperties = buildParagraphPropertiesXml({
        spacingAfterPt: paragraph.spacingAfterPt,
        bullet: paragraph.bullet,
        bulletLevel: paragraph.bulletLevel,
        lineSpacingPt: paragraph.lineSpacingPt,
        lineSpacingPct: paragraph.lineSpacingPct,
        alignment: paragraph.alignment
      });
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
    ${paragraphs}
  </p:txBody>
</p:sp>`;
}

function buildParagraphPropertiesXml(options: {
  spacingAfterPt?: number;
  bullet?: boolean;
  bulletLevel?: number;
  lineSpacingPt?: number;
  lineSpacingPct?: number;
  alignment?: "left" | "center" | "right" | "justify";
}): string {
  const attributes = [
    options.bulletLevel === undefined ? "" : `lvl="${options.bulletLevel}"`,
    options.alignment === undefined ? "" : `algn="${toOpenXmlAlignment(options.alignment)}"`
  ].filter((attribute) => attribute.length > 0).join(" ");
  const children: string[] = [];

  if (options.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${options.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (options.lineSpacingPt !== undefined) {
    children.push(`<a:lnSpc><a:spcPts val="${options.lineSpacingPt * 100}"/></a:lnSpc>`);
  }

  if (options.lineSpacingPct !== undefined) {
    children.push(`<a:lnSpc><a:spcPct val="${options.lineSpacingPct * 1000}"/></a:lnSpc>`);
  }

  if (options.bullet) {
    children.push(`<a:buChar char="•"/>`);
  }

  if (children.length === 0) {
    return "";
  }

  return `<a:pPr${attributes.length > 0 ? ` ${attributes}` : ""}>${children.join("")}</a:pPr>`;
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
