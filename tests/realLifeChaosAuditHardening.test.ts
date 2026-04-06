import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("analyzeSlides ignores slide-wide line-spacing drift from standalone and leading-singleton role shapes", async () => {
  const fixturePath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Heading",
        paragraphs: [
          buildParagraph("Regional signals")
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Left body",
        paragraphs: [
          buildParagraph("The region remains the cleanest baseline.", { lineSpacingPct: 110, alignment: "left" }),
          buildParagraph("Reading edge stays predictable.", { alignment: "left" })
        ]
      }),
      buildShapeXml({
        id: 4,
        name: "KPI commentary",
        paragraphs: [
          buildParagraph("Upside case still depends on two expansions.", { lineSpacingPct: 110 }),
          buildParagraph("SMB activation recovered.", { spacingBeforePt: 4 }),
          buildParagraph("One regional team still reports in older template format.", { spacingBeforePt: 10 })
        ]
      }),
      buildShapeXml({
        id: 5,
        name: "Footer",
        paragraphs: [
          buildParagraph("Slide 4 of 10", { alignment: "right" })
        ]
      })
    ]]
  });

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.lineSpacingDrift, {
    driftParagraphs: []
  });
  assert.equal(report.lineSpacingDriftCount, 0);
});

test("analyzeSlides ignores uniform explicit non-left line-spacing role shapes during slide-wide comparison", async () => {
  const fixturePath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Finance panel",
        paragraphs: [
          buildParagraph("Cash timing improves materially.", { lineSpacingPct: 120, alignment: "right" }),
          buildParagraph("Arrow bullet with right alignment", { lineSpacingPct: 120, alignment: "right", spacingBeforePt: 18 }),
          buildParagraph("Roman numbering appears in copied finance notes", { lineSpacingPct: 120, alignment: "right", spacingBeforePt: 9, autoNum: "romanLcPeriod" })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Summary",
        paragraphs: [
          buildParagraph("Mixed panel assembled from copied sources.")
        ]
      })
    ]]
  });

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.lineSpacingDrift, {
    driftParagraphs: []
  });
  assert.equal(report.lineSpacingDriftCount, 0);
});

test("analyzeSlides ignores coherent edge-cadence paragraph-spacing roles", async () => {
  const fixturePath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Minimal gaps",
        paragraphs: [
          buildParagraph("Procurement approved the revised paper.", { spacingAfterPt: 1, lineSpacingPct: 110 }),
          buildParagraph("Security review remains on track.", { spacingBeforePt: 1, spacingAfterPt: 1, lineSpacingPct: 110 }),
          buildParagraph("Implementation staffing is still the main dependency.", { spacingBeforePt: 1, spacingAfterPt: 1, lineSpacingPct: 110 }),
          buildParagraph("No extra visual air is intended between these paragraphs.", { spacingBeforePt: 1, lineSpacingPct: 110 })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Heading",
        paragraphs: [
          buildParagraph("Stakeholder notes copied from email fragments")
        ]
      })
    ]]
  });

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.spacingDrift, {
    driftParagraphs: []
  });
  assert.equal(report.spacingDriftCount, 0);
});

test("analyzeSlides ignores mixed-marker explanation paragraph-spacing roles", async () => {
  const fixturePath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Marker explanation",
        paragraphs: [
          buildParagraph("Standard round bullet on first item"),
          buildParagraph("Square bullet on second item with deeper margin", { spacingBeforePt: 8 }),
          buildParagraph("Arrow bullet on third item", { spacingBeforePt: 8 }),
          buildParagraph("Arabic numbering mixed into symbol list", { spacingBeforePt: 10, autoNum: "arabicPeriod" }),
          buildParagraph("Roman numbering with another indent pattern", { spacingBeforePt: 12, autoNum: "romanLcPeriod" })
        ]
      }),
      buildShapeXml({
        id: 3,
        name: "Summary",
        paragraphs: [
          buildParagraph("Realistic list chaos from merged workstreams")
        ]
      })
    ]]
  });

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.spacingDrift, {
    driftParagraphs: []
  });
  assert.equal(report.spacingDriftCount, 0);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-real-chaos-audit-"));
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

  await writeFile(filePath, await zip.generateAsync({ type: "nodebuffer" }));
  return filePath;
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
  paragraphs: string[];
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType ? `<p:ph type="${options.placeholderType}"/>` : "";
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
    ${options.paragraphs.join("")}
  </p:txBody>
</p:sp>`;
}

function buildParagraph(
  text: string,
  options: {
    spacingBeforePt?: number;
    spacingAfterPt?: number;
    lineSpacingPct?: number;
    alignment?: "left" | "center" | "right";
    autoNum?: "arabicPeriod" | "romanLcPeriod";
  } = {}
): string {
  const children: string[] = [];

  if (options.spacingBeforePt !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${options.spacingBeforePt * 100}"/></a:spcBef>`);
  }

  if (options.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${options.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (options.lineSpacingPct !== undefined) {
    children.push(`<a:lnSpc><a:spcPct val="${options.lineSpacingPct * 1000}"/></a:lnSpc>`);
  }

  if (options.autoNum !== undefined) {
    children.push(`<a:buAutoNum type="${options.autoNum}" startAt="1"/>`);
  }

  const alignmentAttribute = options.alignment ? ` algn="${toOpenXmlAlignment(options.alignment)}"` : "";
  const paragraphProperties =
    children.length > 0 || alignmentAttribute.length > 0
      ? `<a:pPr${alignmentAttribute}>${children.join("")}</a:pPr>`
      : "";

  return `<a:p>
      ${paragraphProperties}
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>${text}</a:t></a:r>
    </a:p>`;
}

function toOpenXmlAlignment(value: "left" | "center" | "right"): string {
  if (value === "left") {
    return "l";
  }

  if (value === "center") {
    return "ctr";
  }

  return "r";
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
  const relationships = Array.from({ length: slideCount }, (_, index) =>
    `  <Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${relationships}
</Relationships>`;
}

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
