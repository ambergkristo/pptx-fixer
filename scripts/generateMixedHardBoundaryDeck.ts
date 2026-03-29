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
  alignment?: Alignment;
  bulletLevel?: number;
  bulletChar?: string;
  autoNumberType?: string;
  spacingAfterPt?: number;
  lineSpacingPt?: number;
  lineSpacingPct?: number;
};

type ShapeDefinition = {
  id: number;
  name: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  placeholderType?: string;
  paragraphs?: ParagraphDefinition[];
  runs?: RunDefinition[];
};

const SLIDE_WIDTH = 9144000;
const SLIDE_HEIGHT = 6858000;
const FIXED_ZIP_DATE = new Date("2026-03-29T00:00:00.000Z");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(repoRoot, "testdata", "corpus", "boundary");
const outputDeckPath = path.join(outputDirectory, "mixed-hard-boundary-v1.pptx");

async function main(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });

  const zip = new JSZip();
  addZipFile(zip, "[Content_Types].xml", buildContentTypesXml(5));
  addZipFile(zip, "_rels/.rels", ROOT_RELS_XML);
  addZipFile(zip, "ppt/presentation.xml", buildPresentationXml(5));
  addZipFile(zip, "ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(5));
  addZipFile(zip, "ppt/slides/slide1.xml", buildSlideXml(buildCenteredHeroSlide()));
  addZipFile(zip, "ppt/slides/slide2.xml", buildSlideXml(buildRightAlignedRoleSlide()));
  addZipFile(zip, "ppt/slides/slide3.xml", buildSlideXml(buildGeorgiaRoleSlide()));
  addZipFile(zip, "ppt/slides/slide4.xml", buildSlideXml(buildMixedIntentionalRoleSlide()));
  addZipFile(zip, "ppt/slides/slide5.xml", buildSlideXml(buildQaMatrixSlide()));

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE",
    platform: "UNIX",
    streamFiles: false
  });
  await writeFile(outputDeckPath, buffer);
  console.log(`Generated mixed hard boundary deck: ${outputDeckPath}`);
}

function addZipFile(zip: JSZip, filePath: string, content: string): void {
  zip.file(filePath, content, { date: FIXED_ZIP_DATE });
}

function buildCenteredHeroSlide(): ShapeDefinition[] {
  return [
    createTitleShape(2, "Mixed Hard Boundary: Centered Hero"),
    createBodyShape(3, 1371600, 1463040, 6400800, 2743200, [
      paragraph("Centered hero composition must stay centered.", {
        alignment: "center",
        fontSize: 3000,
        spacingAfterPt: 18
      }),
      paragraph("The subtitle remains centered to prove the engine does not flatten intentional hero layouts.", {
        alignment: "center",
        spacingAfterPt: 18
      }),
      paragraph("This slide is boundary-only and should stay untouched.", {
        alignment: "center"
      })
    ])
  ];
}

function buildRightAlignedRoleSlide(): ShapeDefinition[] {
  return [
    createTitleShape(2, "Mixed Hard Boundary: Right-Aligned KPI"),
    createBodyShape(3, 4800600, 1752600, 3429000, 2743200, [
      paragraph("Right-aligned KPI must stay right.", {
        alignment: "right",
        fontSize: 2800,
        spacingAfterPt: 18
      }),
      paragraph("Right-aligned attribution must stay right.", {
        alignment: "right",
        spacingAfterPt: 18
      }),
      paragraph("The visual role is intentional and must not be forced left.", {
        alignment: "right"
      })
    ])
  ];
}

function buildGeorgiaRoleSlide(): ShapeDefinition[] {
  return [
    createTitleShape(2, "Mixed Hard Boundary: Distinct Typography"),
    createBodyShape(3, 685800, 1295400, 7772400, 3657600, [
      paragraph("Baseline Aptos paragraph frames the distinct callout.", { spacingAfterPt: 18 }),
      paragraph("Boundary Georgia role must stay distinct.", {
        fontFamily: "Georgia",
        spacingAfterPt: 18
      }),
      paragraph("The surrounding Aptos body text should remain separate from the Georgia emphasis role.", {
        spacingAfterPt: 18
      })
    ])
  ];
}

function buildMixedIntentionalRoleSlide(): ShapeDefinition[] {
  return [
    createTitleShape(2, "Mixed Hard Boundary: Intentional Role Mix"),
    createBodyShape(3, 685800, 1676400, 2743200, 3429000, [
      paragraph("Left body copy anchors the composition and should remain left aligned.", {
        alignment: "left",
        spacingAfterPt: 12
      }),
      paragraph("A second left body paragraph keeps the baseline stable.", {
        alignment: "left",
        spacingAfterPt: 12
      })
    ]),
    createBodyShape(4, 3200400, 2057400, 2743200, 2057400, [
      paragraph("Intentional centered quote must stay centered.", {
        alignment: "center",
        fontSize: 2400,
        spacingAfterPt: 12
      })
    ]),
    createBodyShape(5, 5943600, 3657600, 2057400, 1143000, [
      paragraph("Intentional right attribution must stay right.", {
        alignment: "right"
      })
    ])
  ];
}

function buildQaMatrixSlide(): ShapeDefinition[] {
  return [
    createTitleShape(2, "Mixed Hard Boundary: QA Matrix"),
    createBodyShape(3, 685800, 1219200, 2743200, 4572000, [
      paragraph("Numbered list role must stay numbered."),
      paragraph("Numbered item one", { autoNumberType: "arabicPeriod", bulletLevel: 0 }),
      paragraph("Numbered item two", { autoNumberType: "arabicPeriod", bulletLevel: 0 }),
      paragraph("Numbered child one", { autoNumberType: "arabicPeriod", bulletLevel: 1 }),
      paragraph("Numbered child two", { autoNumberType: "arabicPeriod", bulletLevel: 1 })
    ]),
    createBodyShape(4, 3657600, 1219200, 2743200, 4572000, [
      paragraph("Symbol list role must stay symbolic."),
      paragraph("Symbol item one", { bulletChar: "•", bulletLevel: 0 }),
      paragraph("Symbol item two", { bulletChar: "•", bulletLevel: 0 }),
      paragraph("Symbol child one", { bulletChar: "•", bulletLevel: 1 }),
      paragraph("Symbol child two", { bulletChar: "•", bulletLevel: 1 })
    ]),
    createBodyShape(5, 6400800, 1219200, 2057400, 4572000, [
      paragraph("Inherited spacing boundary paragraph"),
      paragraph("Explicit 24pt spacing boundary paragraph", { spacingAfterPt: 24 }),
      paragraph("Explicit 12pt spacing boundary paragraph", { spacingAfterPt: 12 }),
      paragraph("Percent line spacing boundary paragraph", { lineSpacingPct: 120000 }),
      paragraph("Point line spacing boundary paragraph", { lineSpacingPt: 1400 }),
      paragraph("Percent line spacing boundary paragraph two", { lineSpacingPct: 120000 })
    ])
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
    alignment?: Alignment;
    bulletLevel?: number;
    bulletChar?: string;
    autoNumberType?: string;
    spacingAfterPt?: number;
    lineSpacingPt?: number;
    lineSpacingPct?: number;
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
    alignment: options.alignment,
    bulletLevel: options.bulletLevel,
    bulletChar: options.bulletChar,
    autoNumberType: options.autoNumberType,
    spacingAfterPt: options.spacingAfterPt,
    lineSpacingPt: options.lineSpacingPt,
    lineSpacingPct: options.lineSpacingPct
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

function buildParagraphPropertiesXml(paragraph: ParagraphDefinition): string {
  const attributes = [
    paragraph.bulletLevel === undefined ? "" : `lvl="${paragraph.bulletLevel}"`,
    paragraph.alignment === undefined ? "" : `algn="${toOpenXmlAlignment(paragraph.alignment)}"`
  ].filter(Boolean).join(" ");
  const children: string[] = [];

  if (paragraph.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${paragraph.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (paragraph.lineSpacingPt !== undefined) {
    children.push(`<a:lnSpc><a:spcPts val="${paragraph.lineSpacingPt}"/></a:lnSpc>`);
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

  const paragraphProperties = children.length > 0
    ? `<a:pPr${attributes.length > 0 ? ` ${attributes}` : ""}>${children.join("")}</a:pPr>`
    : attributes.length > 0
      ? `<a:pPr ${attributes}></a:pPr>`
      : "";

  return paragraphProperties;
}

function buildRunXml(run: RunDefinition): string {
  const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
  const latinNode = run.fontFamily ? `<a:latin typeface="${escapeXml(run.fontFamily)}"/>` : "";

  return `<a:r>
        <a:rPr${sizeAttribute}>${latinNode}</a:rPr>
        <a:t>${escapeXml(run.text)}</a:t>
      </a:r>`;
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

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
