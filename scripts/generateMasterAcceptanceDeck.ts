import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

type Alignment = "l" | "ctr" | "r" | "just";

interface RunDefinition {
  text: string;
  fontFamily?: string;
  fontSize?: number;
}

interface ParagraphDefinition {
  runs: RunDefinition[];
  spacingBefore?: number;
  spacingAfter?: number;
  lineSpacingPct?: number;
  bullet?: boolean;
  bulletLevel?: number;
  alignment?: Alignment;
}

interface ShapeDefinition {
  id: number;
  name: string;
  placeholderType?: string;
  paragraphs?: ParagraphDefinition[];
  runs?: RunDefinition[];
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const corpusRoot = path.join(repoRoot, "testdata", "corpus");
const masterDirectory = path.join(corpusRoot, "master");
const mixedFormattingDirectory = path.join(corpusRoot, "mixed-formatting");
const alignmentDirectory = path.join(corpusRoot, "alignment");
const masterDeckPath = path.join(masterDirectory, "cleandeck-master-acceptance-v1.pptx");
const boundaryDeckPath = path.join(mixedFormattingDirectory, "font-role-guard-boundary.pptx");
const alignmentBoundaryDeckPath = path.join(alignmentDirectory, "alignment-role-guard-boundary.pptx");

async function main(): Promise<void> {
  await mkdir(masterDirectory, { recursive: true });
  await mkdir(mixedFormattingDirectory, { recursive: true });
  await mkdir(alignmentDirectory, { recursive: true });

  await writeDeck(masterDeckPath, buildMasterAcceptanceSlides());
  await writeDeck(boundaryDeckPath, buildBoundarySlides());
  await writeDeck(alignmentBoundaryDeckPath, buildAlignmentBoundarySlides());

  console.log(`Generated canonical master deck: ${masterDeckPath}`);
  console.log(`Generated typography boundary deck: ${boundaryDeckPath}`);
  console.log(`Generated alignment boundary deck: ${alignmentBoundaryDeckPath}`);
}

async function writeDeck(filePath: string, slides: string[][]): Promise<void> {
  const zip = new JSZip();

  zip.file("[Content_Types].xml", buildContentTypesXml(slides.length));
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", buildPresentationXml(slides.length));
  zip.file("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(slides.length));

  slides.forEach((shapes, index) => {
    zip.file(`ppt/slides/slide${index + 1}.xml`, buildSlideXml(shapes));
  });

  await writeFile(filePath, await zip.generateAsync({ type: "nodebuffer" }));
}

function buildMasterAcceptanceSlides(): string[][] {
  return [
    [
      buildShapeXml({
        id: 2,
        name: "Title 1",
        placeholderType: "title",
        runs: [
          { text: "Master Acceptance: Font Roles", fontFamily: "Calibri", fontSize: 2800 }
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 1",
        paragraphs: [
          {
            runs: [
              { text: "Baseline body paragraph establishes the local font baseline.", fontFamily: "Calibri", fontSize: 2000 }
            ],
            spacingAfter: 1800
          },
          {
            runs: [
              { text: "Mixed-run drift starts with ", fontFamily: "Calibri", fontSize: 2000 },
              { text: "Arial noise", fontFamily: "Arial", fontSize: 2000 },
              { text: " inside one sentence.", fontFamily: "Calibri", fontSize: 2000 }
            ],
            spacingAfter: 1800
          },
          {
            runs: [
              { text: "Intentional Georgia callout must stay distinct.", fontFamily: "Georgia", fontSize: 2000 }
            ],
            spacingAfter: 1800
          },
          {
            runs: [
              { text: "Body paragraph returns to the baseline after the callout.", fontFamily: "Calibri", fontSize: 2000 }
            ],
            spacingAfter: 1800
          }
        ]
      })
    ],
    [
      buildShapeXml({
        id: 2,
        name: "Title 2",
        placeholderType: "title",
        runs: [
          { text: "Master Acceptance: Size Roles", fontFamily: "Calibri", fontSize: 2800 }
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 2",
        paragraphs: [
          {
            runs: [
              { text: "Baseline body paragraph establishes the normal text size.", fontFamily: "Calibri", fontSize: 2000 }
            ],
            spacingAfter: 1800
          },
          {
            runs: [
              { text: "Mixed-size drift appears with a ", fontFamily: "Calibri", fontSize: 2000 },
              { text: "24pt fragment", fontFamily: "Calibri", fontSize: 2400 },
              { text: " inside a normal sentence.", fontFamily: "Calibri", fontSize: 2000 }
            ],
            spacingAfter: 1800
          },
          {
            runs: [
              { text: "Intentional 24pt callout must stay larger.", fontFamily: "Calibri", fontSize: 2400 }
            ],
            spacingAfter: 1800
          },
          {
            runs: [
              { text: "Body paragraph returns to the normal size after the callout.", fontFamily: "Calibri", fontSize: 2000 }
            ],
            spacingAfter: 1800
          }
        ]
      })
    ],
    [
      buildShapeXml({
        id: 2,
        name: "Title 3",
        placeholderType: "title",
        runs: [
          { text: "Master Acceptance: Bullet Drift", fontFamily: "Calibri", fontSize: 2800 }
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 3",
        paragraphs: [
          {
            runs: [
              { text: "The list below contains one indentation jump that should close safely.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            bullet: true,
            bulletLevel: 0,
            runs: [
              { text: "Root bullet alpha", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            bullet: true,
            bulletLevel: 0,
            runs: [
              { text: "Root bullet beta", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            bullet: true,
            bulletLevel: 2,
            runs: [
              { text: "Unexpected deep indent", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            bullet: true,
            bulletLevel: 0,
            runs: [
              { text: "Root bullet gamma", fontFamily: "Calibri", fontSize: 2000 }
            ]
          }
        ]
      })
    ],
    [
      buildShapeXml({
        id: 2,
        name: "Title 4",
        placeholderType: "title",
        runs: [
          { text: "Master Acceptance: Alignment Drift", fontFamily: "Calibri", fontSize: 2800 }
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 4",
        paragraphs: [
          {
            alignment: "l",
            runs: [
              { text: "Left aligned baseline paragraph one.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            alignment: "l",
            runs: [
              { text: "Left aligned baseline paragraph two.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            alignment: "ctr",
            runs: [
              { text: "Centered outlier paragraph.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            alignment: "l",
            runs: [
              { text: "Left aligned baseline paragraph three.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          }
        ]
      })
    ],
    [
      buildShapeXml({
        id: 2,
        name: "Title 5",
        placeholderType: "title",
        runs: [
          { text: "Master Acceptance: Paragraph Spacing Drift", fontFamily: "Calibri", fontSize: 2800 }
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 5",
        paragraphs: [
          {
            spacingBefore: 600,
            spacingAfter: 1800,
            runs: [
              { text: "Paragraph spacing baseline one.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            spacingBefore: 600,
            spacingAfter: 1800,
            runs: [
              { text: "Paragraph spacing baseline two.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            spacingBefore: 0,
            spacingAfter: 4000,
            runs: [
              { text: "Paragraph spacing outlier should normalize.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            spacingBefore: 600,
            spacingAfter: 1800,
            runs: [
              { text: "Paragraph spacing baseline three.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          }
        ]
      })
    ],
    [
      buildShapeXml({
        id: 2,
        name: "Title 6",
        placeholderType: "title",
        runs: [
          { text: "Master Acceptance: Line Spacing Drift", fontFamily: "Calibri", fontSize: 2800 }
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 6",
        paragraphs: [
          {
            lineSpacingPct: 120000,
            runs: [
              { text: "Line spacing baseline one.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            lineSpacingPct: 120000,
            runs: [
              { text: "Line spacing baseline two.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            lineSpacingPct: 145000,
            runs: [
              { text: "Line spacing outlier should normalize.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          },
          {
            lineSpacingPct: 120000,
            runs: [
              { text: "Line spacing baseline three.", fontFamily: "Calibri", fontSize: 2000 }
            ]
          }
        ]
      })
    ]
  ];
}

function buildBoundarySlides(): string[][] {
  return [[
    buildShapeXml({
      id: 2,
      name: "Title Boundary",
      placeholderType: "title",
      runs: [
        { text: "Boundary: Typography Roles", fontFamily: "Calibri", fontSize: 2800 }
      ]
    }),
    buildShapeXml({
      id: 3,
      name: "Boundary Body",
      paragraphs: [
        {
          runs: [
            { text: "Boundary baseline paragraph.", fontFamily: "Calibri", fontSize: 2000 }
          ],
          spacingAfter: 1800
        },
        {
          runs: [
            { text: "Boundary Georgia role must stay distinct.", fontFamily: "Georgia", fontSize: 2000 }
          ],
          spacingAfter: 1800
        },
        {
          runs: [
            { text: "Boundary 24pt role must stay larger.", fontFamily: "Calibri", fontSize: 2400 }
          ],
          spacingAfter: 1800
        },
        {
          runs: [
            { text: "Boundary baseline paragraph repeated.", fontFamily: "Calibri", fontSize: 2000 }
          ],
          spacingAfter: 1800
        }
      ]
    })
  ]];
}

function buildAlignmentBoundarySlides(): string[][] {
  return [[
    buildShapeXml({
      id: 2,
      name: "Title Alignment Boundary",
      placeholderType: "title",
      runs: [
        { text: "Boundary: Alignment Roles", fontFamily: "Calibri", fontSize: 2800 }
      ]
    }),
    buildShapeXml({
      id: 3,
      name: "Boundary Alignment Body",
      paragraphs: [
        {
          alignment: "l",
          runs: [
            { text: "Alignment boundary baseline one.", fontFamily: "Calibri", fontSize: 2000 }
          ]
        },
        {
          alignment: "ctr",
          runs: [
            { text: "Boundary centered role must stay centered.", fontFamily: "Calibri", fontSize: 2800 }
          ]
        },
        {
          alignment: "l",
          runs: [
            { text: "Alignment boundary baseline two.", fontFamily: "Calibri", fontSize: 2000 }
          ]
        },
        {
          alignment: "l",
          runs: [
            { text: "Alignment boundary baseline three.", fontFamily: "Calibri", fontSize: 2000 }
          ]
        },
        {
          alignment: "r",
          runs: [
            { text: "Boundary right role must stay right.", fontFamily: "Georgia", fontSize: 2000 }
          ]
        },
        {
          alignment: "l",
          runs: [
            { text: "Alignment boundary baseline four.", fontFamily: "Calibri", fontSize: 2000 }
          ]
        }
      ]
    })
  ]];
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

function buildShapeXml(options: ShapeDefinition): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const paragraphs = options.paragraphs ?? [{ runs: options.runs ?? [] }];
  const paragraphXml = paragraphs.map((paragraph) => buildParagraphXml(paragraph)).join("");

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

function buildParagraphXml(paragraph: ParagraphDefinition): string {
  const paragraphProperties = buildParagraphPropertiesXml(paragraph);
  const runs = paragraph.runs.map((run) => buildRunXml(run)).join("");

  return `<a:p>
      ${paragraphProperties}
      ${runs}
    </a:p>`;
}

function buildParagraphPropertiesXml(paragraph: ParagraphDefinition): string {
  const attributes = [
    paragraph.alignment ? `algn="${paragraph.alignment}"` : "",
    paragraph.bulletLevel !== undefined ? `lvl="${paragraph.bulletLevel}"` : ""
  ].filter(Boolean).join(" ");

  const children: string[] = [];

  if (paragraph.spacingBefore !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${paragraph.spacingBefore}"/></a:spcBef>`);
  }

  if (paragraph.spacingAfter !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${paragraph.spacingAfter}"/></a:spcAft>`);
  }

  if (paragraph.lineSpacingPct !== undefined) {
    children.push(`<a:lnSpc><a:spcPct val="${paragraph.lineSpacingPct}"/></a:lnSpc>`);
  }

  if (paragraph.bullet) {
    children.push(`<a:buChar char="•"/>`);
  }

  if (!paragraph.bullet) {
    children.push(`<a:buNone/>`);
  }

  if (attributes.length === 0 && children.length === 0) {
    return "";
  }

  return `<a:pPr${attributes ? ` ${attributes}` : ""}>${children.join("")}</a:pPr>`;
}

function buildRunXml(run: RunDefinition): string {
  const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
  const latinNode = run.fontFamily ? `<a:latin typeface="${run.fontFamily}"/>` : "";

  return `<a:r>
        <a:rPr${sizeAttribute}>${latinNode}</a:rPr>
        <a:t>${run.text}</a:t>
      </a:r>`;
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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
