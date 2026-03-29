import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

type Alignment = "left" | "center" | "right" | "justify";

type ParagraphDefinition = {
  text: string;
  alignment?: Alignment;
  bulletLevel?: number;
  bullet?: boolean;
  autoNumberType?: string;
  spacingAfterPt?: number;
  lineSpacingPt?: number;
  lineSpacingPct?: number;
};

type ShapeDefinition = {
  id: number;
  name: string;
  placeholderType?: string;
  paragraphs: ParagraphDefinition[];
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(repoRoot, "testdata", "corpus", "boundary");
const outputDeckPath = path.join(outputDirectory, "mixed-hard-boundary-v1.pptx");

async function main(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });

  const zip = new JSZip();
  zip.file("[Content_Types].xml", buildContentTypesXml(2));
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", buildPresentationXml(2));
  zip.file("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(2));
  zip.file("ppt/slides/slide1.xml", buildSlideXml(buildSlideOne()));
  zip.file("ppt/slides/slide2.xml", buildSlideXml(buildSlideTwo()));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(outputDeckPath, buffer);
  console.log(`Generated mixed hard boundary deck: ${outputDeckPath}`);
}

function buildSlideOne(): ShapeDefinition[] {
  return [
    {
      id: 2,
      name: "Title Placeholder 1",
      placeholderType: "title",
      paragraphs: [{ text: "Mixed Hard Boundary" }]
    },
    {
      id: 3,
      name: "Numbered List",
      paragraphs: [
        { text: "Numbered item one", autoNumberType: "arabicPeriod", bulletLevel: 0 },
        { text: "Numbered item two", autoNumberType: "arabicPeriod", bulletLevel: 0 },
        { text: "Numbered child one", autoNumberType: "arabicPeriod", bulletLevel: 1 },
        { text: "Numbered child two", autoNumberType: "arabicPeriod", bulletLevel: 1 }
      ]
    },
    {
      id: 4,
      name: "Symbol List",
      paragraphs: [
        { text: "Symbol item one", bullet: true, bulletLevel: 0 },
        { text: "Symbol item two", bullet: true, bulletLevel: 0 },
        { text: "Symbol child one", bullet: true, bulletLevel: 1 },
        { text: "Symbol child two", bullet: true, bulletLevel: 1 }
      ]
    }
  ];
}

function buildSlideTwo(): ShapeDefinition[] {
  return [
    {
      id: 2,
      name: "Title Placeholder 2",
      placeholderType: "title",
      paragraphs: [{ text: "Boundary Spacing" }]
    },
    {
      id: 3,
      name: "Paragraph Spacing Boundary",
      paragraphs: [
        { text: "Inherited spacing boundary paragraph" },
        { text: "Explicit 24pt spacing boundary paragraph", spacingAfterPt: 24 },
        { text: "Explicit 12pt spacing boundary paragraph", spacingAfterPt: 12 }
      ]
    },
    {
      id: 4,
      name: "Line Spacing Boundary",
      paragraphs: [
        { text: "Percent line spacing boundary paragraph", lineSpacingPct: 120 },
        { text: "Point line spacing boundary paragraph", lineSpacingPt: 14 },
        { text: "Percent line spacing boundary paragraph two", lineSpacingPct: 120 }
      ]
    }
  ];
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
  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shape.id}" name="${shape.name}"/>
    <p:cNvSpPr/>
    <p:nvPr>${placeholder}</p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    ${shape.paragraphs.map((paragraph) => buildParagraphXml(paragraph)).join("\n")}
  </p:txBody>
</p:sp>`;
}

function buildParagraphXml(paragraph: ParagraphDefinition): string {
  const attributes = [
    paragraph.bulletLevel === undefined ? "" : `lvl="${paragraph.bulletLevel}"`,
    paragraph.alignment === undefined ? "" : `algn="${toOpenXmlAlignment(paragraph.alignment)}"`
  ].filter(Boolean).join(" ");
  const children: string[] = [];

  if (paragraph.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${paragraph.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (paragraph.lineSpacingPt !== undefined) {
    children.push(`<a:lnSpc><a:spcPts val="${paragraph.lineSpacingPt * 100}"/></a:lnSpc>`);
  }

  if (paragraph.lineSpacingPct !== undefined) {
    children.push(`<a:lnSpc><a:spcPct val="${paragraph.lineSpacingPct * 1000}"/></a:lnSpc>`);
  }

  if (paragraph.autoNumberType) {
    children.push(`<a:buAutoNum type="${paragraph.autoNumberType}"/>`);
  } else if (paragraph.bullet) {
    children.push(`<a:buChar char="&#8226;"/>`);
  }

  const paragraphProperties = children.length > 0
    ? `<a:pPr${attributes.length > 0 ? ` ${attributes}` : ""}>${children.join("")}</a:pPr>`
    : attributes.length > 0
      ? `<a:pPr ${attributes}></a:pPr>`
      : "";

  return `<a:p>
      ${paragraphProperties}
      <a:r><a:rPr sz="2000"><a:latin typeface="Calibri"/></a:rPr><a:t>${escapeXml(paragraph.text)}</a:t></a:r>
    </a:p>`;
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
