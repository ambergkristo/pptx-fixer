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
  placeholderType?: string;
  paragraphs?: ParagraphDefinition[];
  runs?: RunDefinition[];
};

const SLIDE_WIDTH = 9144000;
const SLIDE_HEIGHT = 6858000;
const FIXED_ZIP_DATE = new Date("2026-03-29T00:00:00.000Z");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(repoRoot, "testdata", "corpus", "mixed-formatting");
const outputDeckPath = path.join(outputDirectory, "combined-qa-test-deck-v1.pptx");

async function main(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });

  const zip = new JSZip();
  const slides = buildCombinedQaSlides();

  addZipFile(zip, "[Content_Types].xml", buildContentTypesXml(slides.length));
  addZipFile(zip, "_rels/.rels", ROOT_RELS_XML);
  addZipFile(zip, "ppt/presentation.xml", buildPresentationXml(slides.length));
  addZipFile(zip, "ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(slides.length));

  slides.forEach((shapes, index) => {
    addZipFile(zip, `ppt/slides/slide${index + 1}.xml`, buildSlideXml(shapes));
  });

  await writeFile(outputDeckPath, await zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE",
    platform: "UNIX",
    streamFiles: false
  }));

  console.log(`Generated combined QA deck: ${outputDeckPath}`);
}

function buildCombinedQaSlides(): ShapeDefinition[][] {
  return [
    [
      createTitleShape(2, "Combined QA: Clean Reference"),
      createBodyShape(3, 685800, 1295400, 7772400, 4206240, [
        paragraph("This clean reference slide should remain unchanged after cleanup.", { spacingAfterPt: 18 }),
        paragraph("Aptos body copy is explicit and stable across paragraph spacing, line spacing, and alignment.", { spacingAfterPt: 18 }),
        paragraph("The slide exists to make manual before and after review easy, not to provoke fixes.", { spacingAfterPt: 18 }),
        paragraph("If this slide changes, the QA deck should treat that as a regression signal.", { spacingAfterPt: 18 })
      ])
    ],
    [
      createTitleShape(2, "Combined QA: Typography Drift"),
      createBodyShape(3, 685800, 1295400, 7772400, 4206240, [
        paragraph("Baseline body paragraph establishes the Aptos family and 20pt size.", { spacingAfterPt: 18 }),
        {
          runs: [
            { text: "One review sentence includes an ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "Arial body-family outlier", fontFamily: "Arial", fontSize: 2000 },
            { text: ", then returns to Aptos and carries a ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "24pt body-size outlier", fontFamily: "Aptos", fontSize: 2400 },
            { text: " that should normalize safely.", fontFamily: "Aptos", fontSize: 2000 }
          ],
          spacingAfterPt: 18
        },
        paragraph("Intentional Georgia callout must stay distinct for emphasis.", { fontFamily: "Georgia", spacingAfterPt: 18 }),
        paragraph("Body paragraph returns to the Aptos baseline after the protected callout.", { spacingAfterPt: 18 })
      ])
    ],
    [
      createTitleShape(2, "Combined QA: Alignment Drift"),
      createBodyShape(3, 685800, 1295400, 4114800, 4206240, [
        paragraph("Left-aligned baseline paragraph one anchors the content block.", { alignment: "left", spacingAfterPt: 12 }),
        paragraph("Left-aligned baseline paragraph two repeats the local norm.", { alignment: "left", spacingAfterPt: 12 }),
        paragraph("Centered local drift paragraph should normalize back to left.", { alignment: "center", spacingAfterPt: 12 }),
        paragraph("Right-aligned local drift paragraph should also normalize back to left.", { alignment: "right", spacingAfterPt: 12 }),
        paragraph("Left-aligned baseline paragraph three closes the block.", { alignment: "left", spacingAfterPt: 12 })
      ]),
      createBodyShape(4, 5257800, 1752600, 2971800, 2286000, [
        paragraph("Intentional centered role must stay centered.", {
          alignment: "center",
          fontSize: 2400,
          spacingAfterPt: 18
        }),
        paragraph("This separate centered note is intentional and should remain visually distinct.", {
          alignment: "center"
        })
      ])
    ],
    [
      createTitleShape(2, "Combined QA: Bullet And Indent Drift"),
      createBodyShape(3, 685800, 1219200, 3657600, 457200, [
        paragraph("The list below contains one symbol mismatch and one indent jump.", { spacingAfterPt: 12 })
      ]),
      createBodyShape(4, 685800, 1676400, 3657600, 3657600, [
        paragraph("Root bullet alpha", { bulletChar: "•", bulletLevel: 0 }),
        paragraph("Root bullet beta", { bulletChar: "•", bulletLevel: 0 }),
        paragraph("Wrong bullet symbol should normalize.", { bulletChar: "-", bulletLevel: 0 }),
        paragraph("Unexpected deep indent should normalize.", { bulletChar: "•", bulletLevel: 2 }),
        paragraph("Root bullet gamma", { bulletChar: "•", bulletLevel: 0 })
      ]),
      createBodyShape(5, 4800600, 1676400, 3657600, 3657600, [
        paragraph("Numbered list must stay numbered and ordered.", { spacingAfterPt: 12 }),
        paragraph("Review the combined deck", { autoNumberType: "arabicPeriod", bulletLevel: 0 }),
        paragraph("Normalize only the obvious list drift", { autoNumberType: "arabicPeriod", bulletLevel: 0 }),
        paragraph("Keep numbering intact for manual review", { autoNumberType: "arabicPeriod", bulletLevel: 0 })
      ])
    ],
    [
      createTitleShape(2, "Combined QA: Spacing Drift"),
      createBodyShape(3, 685800, 1295400, 3657600, 4206240, [
        paragraph("Paragraph spacing baseline one.", { spacingBeforePt: 6, spacingAfterPt: 18 }),
        paragraph("Paragraph spacing baseline two.", { spacingBeforePt: 6, spacingAfterPt: 18 }),
        paragraph("Paragraph spacing outlier should normalize without flattening the whole slide.", { spacingBeforePt: 0, spacingAfterPt: 42 }),
        paragraph("Paragraph spacing baseline three returns to the expected rhythm.", { spacingBeforePt: 6, spacingAfterPt: 18 })
      ]),
      createBodyShape(4, 4800600, 1295400, 3657600, 4206240, [
        paragraph("Line spacing baseline one stays readable over wrapped QA text.", { lineSpacingPct: 120000, spacingAfterPt: 12 }),
        paragraph("Line spacing baseline two repeats the same leading to establish a safe norm.", { lineSpacingPct: 120000, spacingAfterPt: 12 }),
        paragraph("Line spacing outlier should normalize without touching paragraph rhythm elsewhere.", { lineSpacingPct: 145000, spacingAfterPt: 12 }),
        paragraph("Line spacing baseline three closes the block at the original leading.", { lineSpacingPct: 120000, spacingAfterPt: 12 })
      ])
    ],
    [
      createTitleShape(2, "Combined QA: Hostile Mixed Slide"),
      createBodyShape(3, 685800, 1219200, 3657600, 4389120, [
        paragraph("Mixed baseline paragraph anchors this hostile review slide.", { spacingAfterPt: 12, lineSpacingPct: 120000 }),
        {
          runs: [
            { text: "This hostile paragraph mixes ", fontFamily: "Aptos", fontSize: 2000 },
            { text: "Arial", fontFamily: "Arial", fontSize: 2200 },
            { text: " body text with spacing and alignment drift.", fontFamily: "Aptos", fontSize: 2000 }
          ],
          alignment: "center",
          spacingBeforePt: 0,
          spacingAfterPt: 30,
          lineSpacingPct: 145000
        },
        paragraph("A hostile list follows immediately after the typography outlier.", { spacingAfterPt: 12 }),
        paragraph("Chaos root bullet", { bulletChar: "•", bulletLevel: 0 }),
        paragraph("Chaos deep indent", { bulletChar: "•", bulletLevel: 2 }),
        paragraph("Closing baseline paragraph returns to the local body style.", { spacingAfterPt: 12, lineSpacingPct: 120000 })
      ]),
      createBodyShape(4, 4800600, 1676400, 3657600, 2743200, [
        paragraph("Right-aligned note here is hostile local drift, not a protected role.", {
          alignment: "right",
          spacingAfterPt: 12
        }),
        paragraph("The engine should improve this slide but may still leave mixed-category residuals.", {
          alignment: "right",
          spacingAfterPt: 12
        })
      ])
    ],
    [
      createTitleShape(2, "Combined QA: Boundary Hero"),
      createBodyShape(3, 1371600, 1463040, 6400800, 2743200, [
        paragraph("Centered hero composition must stay centered.", {
          alignment: "center",
          fontSize: 3000,
          spacingAfterPt: 18
        }),
        paragraph("The supporting subtitle remains centered to prove the engine does not flatten hero layouts.", {
          alignment: "center",
          spacingAfterPt: 18
        }),
        paragraph("This boundary slide should stay visually intact.", {
          alignment: "center"
        })
      ])
    ],
    [
      createTitleShape(2, "Combined QA: Boundary Roles"),
      createBodyShape(3, 685800, 1295400, 3429000, 3429000, [
        paragraph("Left body baseline anchors the mixed role slide.", { alignment: "left", spacingAfterPt: 12 }),
        paragraph("A second left body paragraph keeps the baseline stable.", { alignment: "left", spacingAfterPt: 12 }),
        paragraph("Intentional Georgia callout must stay distinct.", { fontFamily: "Georgia", spacingAfterPt: 12 })
      ]),
      createBodyShape(4, 4572000, 1524000, 3429000, 1828800, [
        paragraph("Right-aligned KPI must stay right.", {
          alignment: "right",
          fontSize: 2800,
          spacingAfterPt: 18
        }),
        paragraph("Right-aligned attribution must stay right.", {
          alignment: "right"
        })
      ]),
      createBodyShape(5, 3200400, 3810000, 2743200, 1143000, [
        paragraph("Intentional centered quote must stay centered.", {
          alignment: "center",
          fontSize: 2400,
          spacingAfterPt: 12
        })
      ])
    ],
    [
      createTitleShape(2, "Combined QA: Manual Checklist"),
      createBodyShape(3, 685800, 1219200, 7772400, 4572000, [
        paragraph("Slide 1 | Clean reference | unchanged | pending manual review", { spacingAfterPt: 12 }),
        paragraph("Slide 2 | Typography drift | family/size outliers normalize, Georgia stays | pending manual review", { spacingAfterPt: 12 }),
        paragraph("Slide 3 | Alignment drift | centered/right local drift normalize, centered role stays | pending manual review", { spacingAfterPt: 12 }),
        paragraph("Slide 4 | Bullet and indent drift | symbol and indent normalize, numbering stays | pending manual review", { spacingAfterPt: 12 }),
        paragraph("Slide 5 | Spacing drift | line and paragraph spacing improve safely | pending manual review", { spacingAfterPt: 12 }),
        paragraph("Slide 6 | Hostile mixed | multiple categories improve without obvious collateral damage | pending manual review", { spacingAfterPt: 12 }),
        paragraph("Slides 7-8 | Boundary roles | centered, right-aligned, and distinct typography roles survive | pending manual review", { spacingAfterPt: 12 })
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

function buildParagraphPropertiesXml(paragraph: ParagraphDefinition): string {
  const attributes = [
    paragraph.bulletLevel === undefined ? "" : `lvl="${paragraph.bulletLevel}"`,
    paragraph.alignment === undefined ? "" : `algn="${toOpenXmlAlignment(paragraph.alignment)}"`
  ].filter(Boolean).join(" ");

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

function addZipFile(zip: JSZip, filePath: string, content: string): void {
  zip.file(filePath, content, { date: FIXED_ZIP_DATE });
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
