import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

type Alignment = "left" | "center" | "right" | "justify";

interface RunDefinition {
  text: string;
  fontFamily?: string;
  fontSize?: number;
}

interface ParagraphDefinition {
  runs: RunDefinition[];
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  lineSpacingPct?: number;
  bulletLevel?: number;
  bulletChar?: string;
  autoNumberType?: string;
  alignment?: Alignment;
}

interface ShapeDefinition {
  id: number;
  name: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  placeholderType?: string;
  paragraphs?: ParagraphDefinition[];
  runs?: RunDefinition[];
}

const SLIDE_WIDTH = 9144000;
const SLIDE_HEIGHT = 6858000;
const FIXED_ZIP_DATE = new Date("2026-03-29T00:00:00.000Z");

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
  await writeDeck(boundaryDeckPath, buildTypographyBoundarySlides());
  await writeDeck(alignmentBoundaryDeckPath, buildAlignmentBoundarySlides());

  console.log(`Generated canonical master deck: ${masterDeckPath}`);
  console.log(`Generated typography boundary deck: ${boundaryDeckPath}`);
  console.log(`Generated alignment boundary deck: ${alignmentBoundaryDeckPath}`);
}

async function writeDeck(filePath: string, slides: ShapeDefinition[][]): Promise<void> {
  const zip = new JSZip();

  addZipFile(zip, "[Content_Types].xml", buildContentTypesXml(slides.length));
  addZipFile(zip, "_rels/.rels", ROOT_RELS_XML);
  addZipFile(zip, "ppt/presentation.xml", buildPresentationXml(slides.length));
  addZipFile(zip, "ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(slides.length));

  slides.forEach((shapes, index) => {
    addZipFile(zip, `ppt/slides/slide${index + 1}.xml`, buildSlideXml(shapes));
  });

  await writeFile(filePath, await zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE",
    platform: "UNIX",
    streamFiles: false
  }));
}

function addZipFile(zip: JSZip, filePath: string, content: string): void {
  zip.file(filePath, content, { date: FIXED_ZIP_DATE });
}

function buildMasterAcceptanceSlides(): ShapeDefinition[][] {
  return [
    [
      createTitleShape(2, "Master Acceptance: Clean Reference"),
      createBodyShape(3, 685800, 1295400, 7772400, 3657600, [
        paragraph("This reference slide should remain unchanged after cleanup.", { spacingAfterPt: 18 }),
        paragraph("Aptos body copy is explicit and stable across all paragraphs.", { spacingAfterPt: 18 }),
        paragraph("The slide exists to make before and after review easy, not to provoke fixes.", { spacingAfterPt: 18 }),
        paragraph("If this slide changes, the validation story should treat that as a regression signal.", { spacingAfterPt: 18 })
      ]),
      createBodyShape(4, 685800, 5207000, 7772400, 914400, [
        paragraph("QA note: clean reference, no intended fixes, no hidden typography tricks.")
      ])
    ],
    [
      createTitleShape(2, "Master Acceptance: Typography Drift"),
      createBodyShape(3, 685800, 1295400, 7772400, 4419600, [
        paragraph("Baseline body paragraph establishes the Aptos baseline.", { spacingAfterPt: 18 }),
        {
          runs: [
            { text: "One mixed sentence carries an ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "Arial family outlier", fontFamily: "Arial", fontSize: 2000 },
            { text: " and a ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "24pt size outlier", fontFamily: "Aptos", fontSize: 2400 },
            { text: " that should normalize safely.", fontFamily: "Aptos", fontSize: 2000 }
          ],
          spacingAfterPt: 18
        },
        paragraph("Intentional Georgia callout must stay distinct.", { fontFamily: "Georgia", spacingAfterPt: 18 }),
        paragraph("Intentional 24pt callout must stay larger.", { fontSize: 2400, spacingAfterPt: 18 }),
        paragraph("Body paragraph returns to the Aptos baseline after the callouts.", { spacingAfterPt: 18 })
      ])
    ],
    [
      createTitleShape(2, "Master Acceptance: Alignment Drift"),
      createBodyShape(3, 685800, 1295400, 4114800, 4114800, [
        paragraph("Left aligned baseline paragraph one.", { alignment: "left", spacingAfterPt: 12 }),
        paragraph("Left aligned baseline paragraph two.", { alignment: "left", spacingAfterPt: 12 }),
        paragraph("Centered outlier paragraph.", { alignment: "center", spacingAfterPt: 12 }),
        paragraph("Left aligned baseline paragraph three.", { alignment: "left", spacingAfterPt: 12 })
      ]),
      createBodyShape(4, 5257800, 1752600, 2971800, 2057400, [
        paragraph("Intentional centered note must stay centered.", {
          alignment: "center",
          fontSize: 2400,
          spacingAfterPt: 18
        }),
        paragraph("This separate centered role is intentional and should not collapse into the body baseline.", {
          alignment: "center"
        })
      ])
    ],
    [
      createTitleShape(2, "Master Acceptance: Bullet And Indent Drift"),
      createBodyShape(3, 685800, 1219200, 3657600, 457200, [
        paragraph("The list below contains one symbol mismatch and one indent jump."),
      ]),
      createBodyShape(4, 685800, 1676400, 3657600, 3657600, [
        paragraph("Root bullet alpha", { bulletChar: "•", bulletLevel: 0 }),
        paragraph("Root bullet beta", { bulletChar: "•", bulletLevel: 0 }),
        paragraph("Wrong bullet symbol should normalize.", { bulletChar: "-", bulletLevel: 0 }),
        paragraph("Unexpected deep indent should normalize.", { bulletChar: "•", bulletLevel: 2 }),
        paragraph("Root bullet gamma", { bulletChar: "•", bulletLevel: 0 })
      ]),
      createBodyShape(5, 4800600, 1676400, 3657600, 3657600, [
        paragraph("Numbered steps should stay numbered and ordered."),
        paragraph("Review scope", { autoNumberType: "arabicPeriod", bulletLevel: 0 }),
        paragraph("Normalize only the obvious drift", { autoNumberType: "arabicPeriod", bulletLevel: 0 }),
        paragraph("Keep list intent readable", { autoNumberType: "arabicPeriod", bulletLevel: 0 })
      ])
    ],
    [
      createTitleShape(2, "Master Acceptance: Spacing Drift"),
      createBodyShape(3, 685800, 1295400, 3657600, 4114800, [
        paragraph("Paragraph spacing baseline one.", { spacingBeforePt: 6, spacingAfterPt: 18 }),
        paragraph("Paragraph spacing baseline two.", { spacingBeforePt: 6, spacingAfterPt: 18 }),
        paragraph("Paragraph spacing outlier should normalize.", { spacingBeforePt: 0, spacingAfterPt: 40 }),
        paragraph("Paragraph spacing baseline three.", { spacingBeforePt: 6, spacingAfterPt: 18 })
      ]),
      createBodyShape(4, 4800600, 1295400, 3657600, 4114800, [
        paragraph("Line spacing baseline one keeps body text readable over multiple lines for QA review.", { lineSpacingPct: 120000, spacingAfterPt: 12 }),
        paragraph("Line spacing baseline two also stays stable across wrapped text in the same content block.", { lineSpacingPct: 120000, spacingAfterPt: 12 }),
        paragraph("Line spacing outlier should normalize without changing paragraph rhythm elsewhere.", { lineSpacingPct: 145000, spacingAfterPt: 12 }),
        paragraph("Line spacing baseline three closes the block at the original leading.", { lineSpacingPct: 120000, spacingAfterPt: 12 })
      ])
    ],
    [
      createTitleShape(2, "Master Acceptance: QA Matrix"),
      createBodyShape(3, 685800, 1219200, 7772400, 4572000, [
        paragraph("Clean reference | should remain unchanged", { spacingAfterPt: 12 }),
        paragraph("Typography drift | one family outlier + one size outlier + protected callouts", { spacingAfterPt: 12 }),
        paragraph("Alignment drift | one local centered false positive + one protected centered role", { spacingAfterPt: 12 }),
        paragraph("Bullet and indent drift | one marker mismatch + one indent jump + numbered list intact", { spacingAfterPt: 12 }),
        paragraph("Spacing drift | one paragraph spacing outlier + one line spacing outlier", { spacingAfterPt: 12 }),
        paragraph("Product review use | stable before and after pass/fail deck for manual QA", { spacingAfterPt: 12 })
      ])
    ]
  ];
}

function buildTypographyBoundarySlides(): ShapeDefinition[][] {
  return [[
    createTitleShape(2, "Boundary: Typography Roles"),
    createBodyShape(3, 685800, 1295400, 7772400, 4114800, [
      paragraph("Boundary baseline paragraph.", { spacingAfterPt: 18 }),
      paragraph("Boundary Georgia role must stay distinct.", { fontFamily: "Georgia", spacingAfterPt: 18 }),
      paragraph("Boundary 24pt role must stay larger.", { fontSize: 2400, spacingAfterPt: 18 }),
      paragraph("Boundary baseline paragraph repeated.", { spacingAfterPt: 18 })
    ])
  ]];
}

function buildAlignmentBoundarySlides(): ShapeDefinition[][] {
  return [[
    createTitleShape(2, "Boundary: Alignment Roles"),
    createBodyShape(3, 685800, 1295400, 7772400, 4114800, [
      paragraph("Alignment boundary baseline one.", { alignment: "left", spacingAfterPt: 12 }),
      paragraph("Boundary centered role must stay centered.", { alignment: "center", fontSize: 2800, spacingAfterPt: 12 }),
      paragraph("Alignment boundary baseline two.", { alignment: "left", spacingAfterPt: 12 }),
      paragraph("Alignment boundary baseline three.", { alignment: "left", spacingAfterPt: 12 }),
      paragraph("Boundary right role must stay right.", { alignment: "right", fontFamily: "Georgia", spacingAfterPt: 12 }),
      paragraph("Alignment boundary baseline four.", { alignment: "left", spacingAfterPt: 12 })
    ])
  ]];
}

function createTitleShape(id: number, text: string): ShapeDefinition {
  return {
    id,
    name: `Title ${id}`,
    x: 457200,
    y: 274320,
    cx: 8229600,
    cy: 685800,
    placeholderType: "title",
    runs: [
      { text, fontFamily: "Aptos", fontSize: 2800 }
    ]
  };
}

function createBodyShape(
  id: number,
  x: number,
  y: number,
  cx: number,
  cy: number,
  paragraphs: ParagraphDefinition[]
): ShapeDefinition {
  return {
    id,
    name: `Body ${id}`,
    x,
    y,
    cx,
    cy,
    paragraphs
  };
}

function paragraph(
  text: string,
  options: {
    fontFamily?: string;
    fontSize?: number;
    spacingBeforePt?: number;
    spacingAfterPt?: number;
    lineSpacingPct?: number;
    bulletLevel?: number;
    bulletChar?: string;
    autoNumberType?: string;
    alignment?: Alignment;
  } = {}
): ParagraphDefinition {
  return {
    runs: [
      {
        text,
        fontFamily: options.fontFamily ?? "Aptos",
        fontSize: options.fontSize ?? 2000
      }
    ],
    spacingBeforePt: options.spacingBeforePt,
    spacingAfterPt: options.spacingAfterPt,
    lineSpacingPct: options.lineSpacingPct,
    bulletLevel: options.bulletLevel,
    bulletChar: options.bulletChar,
    autoNumberType: options.autoNumberType,
    alignment: options.alignment
  };
}

function buildSlideXml(shapes: ShapeDefinition[]): string {
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
      ${shapes.map((shape) => buildShapeXml(shape)).join("\n")}
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
    <p:cNvPr id="${options.id}" name="${escapeXml(options.name)}"/>
    <p:cNvSpPr/>
    <p:nvPr>${placeholder}</p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${options.x}" y="${options.y}"/>
      <a:ext cx="${options.cx}" cy="${options.cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
  </p:spPr>
  <p:txBody>
    <a:bodyPr wrap="square"/>
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
    paragraph.alignment ? `algn="${toOpenXmlAlignment(paragraph.alignment)}"` : "",
    paragraph.bulletLevel !== undefined ? `lvl="${paragraph.bulletLevel}"` : ""
  ].filter(Boolean).join(" ");

  const children: string[] = [];

  if (paragraph.spacingBeforePt !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${paragraph.spacingBeforePt * 100}"/></a:spcBef>`);
  }

  if (paragraph.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${paragraph.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (paragraph.lineSpacingPct !== undefined) {
    children.push(`<a:lnSpc><a:spcPct val="${paragraph.lineSpacingPct}"/></a:lnSpc>`);
  }

  if (paragraph.autoNumberType) {
    children.push(`<a:buAutoNum type="${paragraph.autoNumberType}"/>`);
  } else if (paragraph.bulletChar) {
    children.push(`<a:buChar char="${escapeXml(paragraph.bulletChar)}"/>`);
  } else {
    children.push("<a:buNone/>");
  }

  if (attributes.length === 0 && children.length === 0) {
    return "";
  }

  return `<a:pPr${attributes ? ` ${attributes}` : ""}>${children.join("")}</a:pPr>`;
}

function buildRunXml(run: RunDefinition): string {
  const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
  const latinNode = run.fontFamily ? `<a:latin typeface="${escapeXml(run.fontFamily)}"/>` : "";

  return `<a:r>
        <a:rPr${sizeAttribute}>${latinNode}</a:rPr>
        <a:t>${escapeXml(run.text)}</a:t>
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
  <p:sldSz cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}"/>
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

function toOpenXmlAlignment(value: Alignment): string {
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

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
