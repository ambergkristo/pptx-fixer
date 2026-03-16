import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";

const tempPaths: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditCliEntry = path.join(repoRoot, "apps", "audit-cli", "runAudit.js");

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("loadPresentation and analyzeSlides enumerate slides, titles, and text boxes", async () => {
  const fixturePath = await createFixturePptx();

  const presentation = await loadPresentation(fixturePath);
  const report = analyzeSlides(presentation);

  assert.equal(report.file, fixturePath);
  assert.equal(report.slideCount, 2);
  assert.deepEqual(report.slides, [
    {
      index: 1,
      title: "Quarterly Review",
      textBoxCount: 2,
      fontsUsed: [
        {
          fontFamily: "Arial",
          usageCount: 1
        },
        {
          fontFamily: "Calibri",
          usageCount: 1
        }
      ],
      fontSizesUsed: [
        {
          sizePt: 24,
          usageCount: 1
        },
        {
          sizePt: 18,
          usageCount: 1
        }
      ]
    },
    {
      index: 2,
      title: null,
      textBoxCount: 1,
      fontsUsed: [
        {
          fontFamily: "Calibri",
          usageCount: 1
        }
      ],
      fontSizesUsed: [
        {
          sizePt: 20,
          usageCount: 1
        }
      ]
    }
  ]);
  assert.deepEqual(report.fontsUsed, [
    {
      fontFamily: "Calibri",
      usageCount: 2
    },
    {
      fontFamily: "Arial",
      usageCount: 1
    }
  ]);
  assert.deepEqual(report.fontSizesUsed, [
    {
      sizePt: 24,
      usageCount: 1
    },
    {
      sizePt: 20,
      usageCount: 1
    },
    {
      sizePt: 18,
      usageCount: 1
    }
  ]);
  assert.deepEqual(report.fontDrift, {
    dominantFont: "Calibri",
    driftRuns: [
      {
        slide: 1,
        fontFamily: "Arial",
        count: 1
      }
    ]
  });
  assert.deepEqual(report.fontSizeDrift, {
    dominantSizePt: 24,
    driftRuns: [
      {
        slide: 1,
        sizePt: 18,
        count: 1
      },
      {
        slide: 2,
        sizePt: 20,
        count: 1
      }
    ]
  });
  assert.deepEqual(report.spacingDrift, {
    driftParagraphs: [
      {
        slide: 1,
        paragraph: 1,
        spacingBefore: null,
        spacingAfter: "12pt",
        lineSpacing: null
      },
      {
        slide: 1,
        paragraph: 2,
        spacingBefore: null,
        spacingAfter: "24pt",
        lineSpacing: null
      }
    ]
  });
  assert.equal(report.spacingDriftCount, 2);
  assert.deepEqual(report.bulletIndentDrift, {
    driftParagraphs: [
      {
        slide: 2,
        paragraph: 4,
        level: 1,
        reason: "outlier lvl=1 in list dominated by lvl=0"
      },
      {
        slide: 2,
        paragraph: 8,
        level: 2,
        reason: "jump from lvl=0 to lvl=2"
      }
    ]
  });
  assert.equal(report.bulletIndentDriftCount, 2);
});

test("CLI writes audit-report.json with deterministic slide metadata", async () => {
  const fixturePath = await createFixturePptx();
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-cli-"));
  tempPaths.push(workDir);

  const result = await runNodeProcess(
    [auditCliEntry, fixturePath],
    workDir
  );

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Slides: 2/);
  assert.match(result.stdout, /Slide 1: Quarterly Review \| text boxes: 2/);
  assert.match(result.stdout, /Fonts detected:/);
  assert.match(result.stdout, /- Calibri \(2 uses\)/);
  assert.match(result.stdout, /- Arial \(1 uses\)/);
  assert.match(result.stdout, /Font sizes detected:/);
  assert.match(result.stdout, /- 24pt \(1 uses\)/);
  assert.match(result.stdout, /- 20pt \(1 uses\)/);
  assert.match(result.stdout, /- 18pt \(1 uses\)/);
  assert.match(result.stdout, /Dominant font: Calibri/);
  assert.match(result.stdout, /Slides with font drift:/);
  assert.match(result.stdout, /- Slide 1: Arial \(1 runs\)/);
  assert.match(result.stdout, /Dominant font size: 24pt/);
  assert.match(result.stdout, /Slides with size drift:/);
  assert.match(result.stdout, /- Slide 1: 18pt \(1 runs\)/);
  assert.match(result.stdout, /- Slide 2: 20pt \(1 runs\)/);
  assert.match(result.stdout, /Spacing drift: 2 paragraphs/);
  assert.match(result.stdout, /- Slide 1, paragraph 1: before=inherit, after=12pt, line=inherit/);
  assert.match(result.stdout, /- Slide 1, paragraph 2: before=inherit, after=24pt, line=inherit/);
  assert.match(result.stdout, /Bullet drift: 2 paragraphs/);
  assert.match(result.stdout, /- Slide 2, paragraph 4: lvl=1 \(outlier lvl=1 in list dominated by lvl=0\)/);
  assert.match(result.stdout, /- Slide 2, paragraph 8: lvl=2 \(jump from lvl=0 to lvl=2\)/);

  const outputPath = path.join(workDir, "audit-report.json");
  const output = JSON.parse(await readFile(outputPath, "utf8"));

  assert.deepEqual(output, {
    file: fixturePath,
    slideCount: 2,
    slides: [
      {
        index: 1,
        title: "Quarterly Review",
        textBoxCount: 2,
        fontsUsed: [
          {
            fontFamily: "Arial",
            usageCount: 1
          },
          {
            fontFamily: "Calibri",
            usageCount: 1
          }
        ],
        fontSizesUsed: [
          {
            sizePt: 24,
            usageCount: 1
          },
          {
            sizePt: 18,
            usageCount: 1
          }
        ]
      },
      {
        index: 2,
        title: null,
        textBoxCount: 1,
        fontsUsed: [
          {
            fontFamily: "Calibri",
            usageCount: 1
          }
        ],
        fontSizesUsed: [
          {
            sizePt: 20,
            usageCount: 1
          }
        ]
      }
    ],
    fontsUsed: [
      {
        fontFamily: "Calibri",
        usageCount: 2
      },
      {
        fontFamily: "Arial",
        usageCount: 1
      }
    ],
    fontSizesUsed: [
      {
        sizePt: 24,
        usageCount: 1
      },
      {
        sizePt: 20,
        usageCount: 1
      },
      {
        sizePt: 18,
        usageCount: 1
      }
    ],
    fontDrift: {
      dominantFont: "Calibri",
      driftRuns: [
        {
          slide: 1,
          fontFamily: "Arial",
          count: 1
        }
      ]
    },
    fontSizeDrift: {
      dominantSizePt: 24,
      driftRuns: [
        {
          slide: 1,
          sizePt: 18,
          count: 1
        },
        {
          slide: 2,
          sizePt: 20,
          count: 1
        }
      ]
    },
    spacingDrift: {
      driftParagraphs: [
        {
          slide: 1,
          paragraph: 1,
          spacingBefore: null,
          spacingAfter: "12pt",
          lineSpacing: null
        },
        {
          slide: 1,
          paragraph: 2,
          spacingBefore: null,
          spacingAfter: "24pt",
          lineSpacing: null
        }
      ]
    },
    spacingDriftCount: 2,
    bulletIndentDrift: {
      driftParagraphs: [
        {
          slide: 2,
          paragraph: 4,
          level: 1,
          reason: "outlier lvl=1 in list dominated by lvl=0"
        },
        {
          slide: 2,
          paragraph: 8,
          level: 2,
          reason: "jump from lvl=0 to lvl=2"
        }
      ]
    },
    bulletIndentDriftCount: 2
  });
});

async function createFixturePptx(): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-fixture-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "sample.pptx");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", CONTENT_TYPES_XML);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", PRESENTATION_XML);
  zip.file("ppt/_rels/presentation.xml.rels", PRESENTATION_RELS_XML);
  zip.file("ppt/slides/slide1.xml", buildSlideXml([
    buildShapeXml({
      id: 2,
      name: "Title 1",
      runs: [
        {
          text: "Quarterly Review",
          fontFamily: "Calibri",
          fontSize: 2400
        }
      ],
      placeholderType: "title"
    }),
    buildShapeXml({
      id: 3,
      name: "Body 1",
      paragraphs: [
        {
          spacingAfterPt: 12,
          runs: [
            {
              text: "Revenue highlights",
              fontFamily: "Arial",
              fontSize: 1800
            }
          ]
        },
        {
          spacingAfterPt: 24,
          runs: [
            {
              text: "Revenue outlook"
            }
          ]
        }
      ]
    })
  ]));
  zip.file("ppt/slides/slide2.xml", buildSlideXml([
    buildShapeXml({
      id: 2,
      name: "Body 2",
      paragraphs: [
        {
          runs: [
            {
              text: "Appendix details",
              fontFamily: "Calibri",
              fontSize: 2000
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 0,
          runs: [
            {
              text: "Root alpha"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 0,
          runs: [
            {
              text: "Root beta"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 1,
          runs: [
            {
              text: "Unexpected nested"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 0,
          runs: [
            {
              text: "Root gamma"
            }
          ]
        },
        {
          runs: [
            {
              text: "Divider"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 0,
          runs: [
            {
              text: "Another list"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 2,
          runs: [
            {
              text: "Jumped nested"
            }
          ]
        }
      ]
    })
  ]));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFixture(filePath, buffer);
  return filePath;
}

async function writeFixture(filePath: string, buffer: Buffer): Promise<void> {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(filePath, buffer);
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
    fontFamily?: string;
    fontSize?: number;
  }>;
  paragraphs?: Array<{
    runs: Array<{
      text: string;
      fontFamily?: string;
      fontSize?: number;
    }>;
    spacingAfterPt?: number;
    bullet?: boolean;
    bulletLevel?: number;
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
        bulletLevel: paragraph.bulletLevel
      });
      const runs = paragraph.runs
        .map(
          (run) => `<a:r>
        <a:rPr${run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`}>
          ${run.fontFamily ? `<a:latin typeface="${run.fontFamily}"/>` : ""}
        </a:rPr>
        <a:t>${run.text}</a:t>
      </a:r>`
        )
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
}): string {
  const attributes = options.bulletLevel === undefined ? "" : ` lvl="${options.bulletLevel}"`;
  const children: string[] = [];

  if (options.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${options.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (options.bullet) {
    children.push(`<a:buChar char="•"/>`);
  }

  if (children.length === 0) {
    return "";
  }

  return `<a:pPr${attributes}>${children.join("")}</a:pPr>`;
}

function runNodeProcess(args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr
      });
    });
  });
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

const PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
    <p:sldId id="257" r:id="rId2"/>
  </p:sldIdLst>
</p:presentation>`;

const PRESENTATION_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>`;
