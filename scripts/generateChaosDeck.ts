import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

type Alignment = "left" | "center" | "right" | "justify";

type RunDefinition = {
  text: string;
  fontFamily?: string;
  fontSize?: number;
};

type ParagraphDefinition = {
  runs: RunDefinition[];
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  bulletLevel?: number;
  bulletChar?: string;
  autoNumberType?: string;
  lineSpacingPt?: number;
  lineSpacingPct?: number;
  alignment?: Alignment;
};

type ShapeDefinition = {
  id: number;
  name: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  paragraphs?: ParagraphDefinition[];
  runs?: RunDefinition[];
  placeholderType?: string;
};

const SLIDE_WIDTH = 9144000;
const SLIDE_HEIGHT = 6858000;
const FIXED_ZIP_DATE = new Date("2026-03-29T00:00:00.000Z");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const generatedOutputDirectory = path.join(repoRoot, "testdata", "generated");
const generatedOutputDeckPath = path.join(generatedOutputDirectory, "cleandeck-chaos-deck.pptx");
const corpusOutputDirectory = path.join(repoRoot, "testdata", "corpus", "hostile");
const corpusOutputDeckPath = path.join(corpusOutputDirectory, "cleandeck-chaos-gate-v1.pptx");

async function main(): Promise<void> {
  await mkdir(generatedOutputDirectory, { recursive: true });
  await mkdir(corpusOutputDirectory, { recursive: true });

  const buffer = await buildDeckBuffer(buildChaosSlides());
  await writeFile(generatedOutputDeckPath, buffer);
  await writeFile(corpusOutputDeckPath, buffer);

  console.log(`Generated hostile recovery deck: ${corpusOutputDeckPath}`);
  console.log(`Generated local copy: ${generatedOutputDeckPath}`);
}

async function buildDeckBuffer(slides: ShapeDefinition[][]): Promise<Buffer> {
  const zip = new JSZip();
  addZipFile(zip, "[Content_Types].xml", buildContentTypesXml(slides.length));
  addZipFile(zip, "_rels/.rels", ROOT_RELS_XML);
  addZipFile(zip, "ppt/presentation.xml", buildPresentationXml(slides.length));
  addZipFile(zip, "ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(slides.length));

  slides.forEach((shapes, index) => {
    addZipFile(zip, `ppt/slides/slide${index + 1}.xml`, buildSlideXml(shapes));
  });

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE",
    platform: "UNIX",
    streamFiles: false
  });
}

function addZipFile(zip: JSZip, filePath: string, content: string): void {
  zip.file(filePath, content, { date: FIXED_ZIP_DATE });
}

function buildChaosSlides(): ShapeDefinition[][] {
  return [
    [
      createTitleShape(2, "Chaos Gate: Mixed Hostile Typography"),
      createBodyShape(3, 685800, 1295400, 7772400, 4206240, [
        paragraph("Baseline body paragraph establishes the Aptos family and 20pt size.", { spacingAfterPt: 12 }),
        {
          runs: [
            { text: "A hostile sentence mixes ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "Arial", fontFamily: "Arial", fontSize: 2000 },
            { text: ", ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "Georgia", fontFamily: "Georgia", fontSize: 2200 },
            { text: ", and a ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "24pt Aptos fragment", fontFamily: "Aptos", fontSize: 2400 },
            { text: " in one paragraph.", fontFamily: "Aptos", fontSize: 2000 }
          ],
          spacingAfterPt: 12
        },
        paragraph("A second baseline paragraph confirms the local body role.", { spacingAfterPt: 12 }),
        paragraph("A title-family mismatch below should normalize only if evidence is strong enough.", {
          fontFamily: "Times New Roman",
          spacingAfterPt: 12
        })
      ])
    ],
    [
      createTitleShape(2, "Chaos Gate: Alignment Variance"),
      createBodyShape(3, 685800, 1295400, 7772400, 4206240, [
        paragraph("Left aligned baseline paragraph one.", { alignment: "left", spacingAfterPt: 12 }),
        paragraph("Right aligned outlier paragraph.", { alignment: "right", spacingAfterPt: 12 }),
        paragraph("Left aligned baseline paragraph two.", { alignment: "left", spacingAfterPt: 12 }),
        paragraph("Centered outlier paragraph.", { alignment: "center", spacingAfterPt: 12 }),
        paragraph("Left aligned baseline paragraph three.", { alignment: "left", spacingAfterPt: 12 })
      ])
    ],
    [
      createTitleShape(2, "Chaos Gate: Bullet Marker And Indent Variance"),
      createBodyShape(3, 685800, 1219200, 3657600, 457200, [
        paragraph("Symbol list contains both a marker mismatch and an indent jump.")
      ]),
      createBodyShape(4, 685800, 1676400, 3657600, 3657600, [
        paragraph("Root bullet alpha", { bulletChar: "•", bulletLevel: 0 }),
        paragraph("Root bullet beta", { bulletChar: "•", bulletLevel: 0 }),
        paragraph("Marker mismatch item", { bulletChar: "-", bulletLevel: 0 }),
        paragraph("Indent jump item", { bulletChar: "•", bulletLevel: 2 }),
        paragraph("Root bullet gamma", { bulletChar: "•", bulletLevel: 0 })
      ]),
      createBodyShape(5, 4800600, 1676400, 3657600, 3657600, [
        paragraph("Numbered list must stay numbered and ordered."),
        paragraph("Open review", { autoNumberType: "arabicPeriod", bulletLevel: 0 }),
        paragraph("Inspect symbol cleanup", { autoNumberType: "arabicPeriod", bulletLevel: 0 }),
        paragraph("Keep numbering intact", { autoNumberType: "arabicPeriod", bulletLevel: 0 })
      ])
    ],
    [
      createTitleShape(2, "Chaos Gate: Line Spacing Extremes"),
      createBodyShape(3, 685800, 1295400, 7772400, 4206240, [
        paragraph("Line spacing baseline one keeps review text readable across wrapped content for QA.", { lineSpacingPct: 120000, spacingAfterPt: 12 }),
        paragraph("Line spacing baseline two repeats the same leading to establish a strong local norm.", { lineSpacingPct: 120000, spacingAfterPt: 12 }),
        paragraph("The hostile outlier compresses leading hard and should normalize without breaking the block.", { lineSpacingPct: 90000, spacingAfterPt: 12 }),
        paragraph("A second hostile outlier pushes leading loose to stress the same cleanup path.", { lineSpacingPct: 160000, spacingAfterPt: 12 }),
        paragraph("Line spacing baseline three closes the block at the original leading.", { lineSpacingPct: 120000, spacingAfterPt: 12 })
      ])
    ],
    [
      createTitleShape(2, "Chaos Gate: Paragraph Spacing Extremes"),
      createBodyShape(3, 685800, 1295400, 7772400, 4206240, [
        paragraph("Paragraph spacing baseline one.", { spacingBeforePt: 6, spacingAfterPt: 18 }),
        paragraph("Paragraph spacing baseline two.", { spacingBeforePt: 6, spacingAfterPt: 18 }),
        paragraph("Paragraph spacing outlier collapses before-space and exaggerates after-space.", { spacingBeforePt: 0, spacingAfterPt: 42 }),
        paragraph("Another spacing outlier adds excess before-space and no after-space at all.", { spacingBeforePt: 24, spacingAfterPt: 0 }),
        paragraph("Paragraph spacing baseline three returns to the expected rhythm.", { spacingBeforePt: 6, spacingAfterPt: 18 })
      ])
    ],
    [
      createTitleShape(2, "Chaos Gate: Mixed Chaos Slide"),
      createBodyShape(3, 685800, 1219200, 3657600, 4297680, [
        paragraph("Mixed body baseline paragraph anchors this slide.", { spacingAfterPt: 12, lineSpacingPct: 120000 }),
        {
          runs: [
            { text: "This paragraph mixes ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "Arial", fontFamily: "Arial", fontSize: 2200 },
            { text: " with hostile spacing and alignment.", fontFamily: "Aptos", fontSize: 2000 }
          ],
          alignment: "center",
          spacingBeforePt: 0,
          spacingAfterPt: 30,
          lineSpacingPct: 145000
        },
        paragraph("Nested list drift follows immediately after the typography outlier.", { spacingAfterPt: 12 }),
        paragraph("Chaos root bullet", { bulletChar: "•", bulletLevel: 0 }),
        paragraph("Chaos deep indent", { bulletChar: "•", bulletLevel: 2 }),
        paragraph("Closing baseline paragraph returns to the normal body style.", { spacingAfterPt: 12, lineSpacingPct: 120000 })
      ]),
      createBodyShape(4, 4800600, 1676400, 3657600, 2743200, [
        paragraph("Mixed chaos note", { fontFamily: "Georgia", alignment: "right", spacingAfterPt: 12 }),
        paragraph("Intentional right role should remain visible even while the rest of the slide is hostile.", {
          alignment: "right",
          spacingAfterPt: 12
        })
      ])
    ],
    [
      createTitleShape(2, "Chaos Gate: QA Matrix"),
      createBodyShape(3, 685800, 1219200, 7772400, 4572000, [
        paragraph("Typography | mixed family and size runs plus one title-family outlier", { spacingAfterPt: 12 }),
        paragraph("Alignment | both centered and right local outliers inside left body regions", { spacingAfterPt: 12 }),
        paragraph("Bullets | one symbol mismatch and one indent jump plus a numbered reference list", { spacingAfterPt: 12 }),
        paragraph("Line spacing | one tight outlier and one loose outlier in the same block", { spacingAfterPt: 12 }),
        paragraph("Paragraph spacing | collapsed and exaggerated rhythm on adjacent paragraphs", { spacingAfterPt: 12 }),
        paragraph("Mixed chaos | one slide where typography, alignment, bullets, and spacing collide", { spacingAfterPt: 12 })
      ])
    ]
  ];
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
    runs: [{ text, fontFamily: "Aptos", fontSize: 2800 }]
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
    bulletLevel?: number;
    bulletChar?: string;
    autoNumberType?: string;
    lineSpacingPt?: number;
    lineSpacingPct?: number;
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
    bulletLevel: options.bulletLevel,
    bulletChar: options.bulletChar,
    autoNumberType: options.autoNumberType,
    lineSpacingPt: options.lineSpacingPt,
    lineSpacingPct: options.lineSpacingPct,
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

function buildShapeXml(shape: ShapeDefinition): string {
  const placeholder = shape.placeholderType ? `<p:ph type="${shape.placeholderType}"/>` : "";
  const paragraphs = (shape.paragraphs ?? [{ runs: shape.runs ?? [] }])
    .map((paragraph) => buildParagraphXml(paragraph))
    .join("\n");

  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shape.id}" name="${escapeXml(shape.name)}"/>
    <p:cNvSpPr/>
    <p:nvPr>${placeholder}</p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${shape.x}" y="${shape.y}"/>
      <a:ext cx="${shape.cx}" cy="${shape.cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
  </p:spPr>
  <p:txBody>
    <a:bodyPr wrap="square"/>
    <a:lstStyle/>
    ${paragraphs}
  </p:txBody>
</p:sp>`;
}

function buildParagraphXml(paragraph: ParagraphDefinition): string {
  const paragraphProperties = buildParagraphPropertiesXml(paragraph);
  const runs = paragraph.runs.map((run) => buildRunXml(run)).join("\n");

  return `<a:p>
      ${paragraphProperties}
      ${runs}
    </a:p>`;
}

function buildRunXml(run: RunDefinition): string {
  const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
  const latinNode = run.fontFamily ? `<a:latin typeface="${escapeXml(run.fontFamily)}"/>` : "";

  return `<a:r>
        <a:rPr${sizeAttribute}>${latinNode}</a:rPr>
        <a:t>${escapeXml(run.text)}</a:t>
      </a:r>`;
}

function buildParagraphPropertiesXml(paragraph: ParagraphDefinition): string {
  const attributes = [
    paragraph.bulletLevel === undefined ? "" : `lvl="${paragraph.bulletLevel}"`,
    paragraph.alignment === undefined ? "" : `algn="${toOpenXmlAlignment(paragraph.alignment)}"`
  ]
    .filter((attribute) => attribute.length > 0)
    .join(" ");

  const children: string[] = [];

  if (paragraph.spacingBeforePt !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${paragraph.spacingBeforePt * 100}"/></a:spcBef>`);
  }

  if (paragraph.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${paragraph.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (paragraph.lineSpacingPt !== undefined) {
    children.push(`<a:lnSpc><a:spcPts val="${paragraph.lineSpacingPt * 100}"/></a:lnSpc>`);
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

  if (children.length === 0 && attributes.length === 0) {
    return "";
  }

  return `<a:pPr${attributes.length > 0 ? ` ${attributes}` : ""}>${children.join("")}</a:pPr>`;
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
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
