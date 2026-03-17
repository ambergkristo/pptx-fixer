import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation, type AuditReport } from "../packages/audit/pptxAudit.ts";
import { runAllFixes, type RunAllFixesReport, type SlideChangeSummary } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("full pipeline remains stable and no-op on second pass for a realistic mixed deck", async () => {
  const inputPath = await createPipelineStabilityFixturePptx();
  const firstOutputPath = path.join(path.dirname(inputPath), "first-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "second-fixed.pptx");

  const firstReport = await runAllFixes(inputPath, firstOutputPath);
  const firstOutputAudit = analyzeSlides(await loadPresentation(firstOutputPath));
  const secondReport = await runAllFixes(firstOutputPath, secondOutputPath);
  const secondOutputAudit = analyzeSlides(await loadPresentation(secondOutputPath));

  assert.ok(firstReport.applied);
  assert.equal(firstReport.noOp, false);
  assert.ok(
    Object.values(firstReport.totals).some((count) => count > 0),
    "first pass should apply at least one cleanup change"
  );

  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.deepEqual(secondReport.steps, [
    { name: "fontFamilyFix", changedRuns: 0 },
    { name: "fontSizeFix", changedRuns: 0 },
    { name: "spacingFix", changedParagraphs: 0 },
    { name: "bulletFix", changedParagraphs: 0 },
    { name: "alignmentFix", changedParagraphs: 0 },
    { name: "lineSpacingFix", changedParagraphs: 0 },
    { name: "dominantBodyStyleFix", changedParagraphs: 0 },
    { name: "dominantFontFamilyFix", changedParagraphs: 0 },
    { name: "dominantFontSizeFix", changedParagraphs: 0 }
  ]);
  assert.deepEqual(secondReport.totals, {
    fontFamilyChanges: 0,
    fontSizeChanges: 0,
    spacingChanges: 0,
    bulletChanges: 0,
    alignmentChanges: 0,
    lineSpacingChanges: 0,
    dominantBodyStyleChanges: 0,
    dominantFontFamilyChanges: 0,
    dominantFontSizeChanges: 0
  });
  assert.deepEqual(secondReport.changesBySlide, []);

  assert.equal(secondReport.verification.fontDriftBefore, secondReport.verification.fontDriftAfter);
  assert.equal(secondReport.verification.fontSizeDriftBefore, secondReport.verification.fontSizeDriftAfter);
  assert.equal(secondReport.verification.spacingDriftBefore, secondReport.verification.spacingDriftAfter);
  assert.equal(secondReport.verification.bulletIndentDriftBefore, secondReport.verification.bulletIndentDriftAfter);
  assert.equal(secondReport.verification.alignmentDriftBefore, secondReport.verification.alignmentDriftAfter);
  assert.equal(secondReport.verification.lineSpacingDriftBefore, secondReport.verification.lineSpacingDriftAfter);

  assert.deepEqual(firstOutputAudit.deckFontUsage, secondReport.deckFontUsage);
  assert.equal(firstOutputAudit.fontDriftSeverity, secondReport.fontDriftSeverity);
  assert.deepEqual(firstOutputAudit.deckFontUsage, secondOutputAudit.deckFontUsage);
  assert.equal(firstOutputAudit.fontDriftSeverity, secondOutputAudit.fontDriftSeverity);
  assert.deepEqual(firstOutputAudit.deckStyleFingerprint, secondOutputAudit.deckStyleFingerprint);
  assert.deepEqual(
    firstOutputAudit.slides.map((slide) => slide.dominantBodyStyle),
    secondOutputAudit.slides.map((slide) => slide.dominantBodyStyle)
  );

  assert.deepEqual(await readFile(firstOutputPath), await readFile(secondOutputPath));
  assert.deepEqual(
    await extractAllSlideTextTokens(firstOutputPath),
    await extractAllSlideTextTokens(secondOutputPath)
  );

  assertStageCountersDoNotIncrease(firstReport, secondReport);
  assertSlideCountersDoNotIncrease(firstReport.changesBySlide, secondReport.changesBySlide);
  assert.equal(secondReport.totals.dominantBodyStyleChanges, 0);
  assert.equal(secondReport.totals.dominantFontFamilyChanges, 0);
  assert.equal(secondReport.totals.dominantFontSizeChanges, 0);
});

function assertStageCountersDoNotIncrease(
  firstReport: RunAllFixesReport,
  secondReport: RunAllFixesReport
): void {
  for (const key of [
    "fontFamilyChanges",
    "fontSizeChanges",
    "spacingChanges",
    "bulletChanges",
    "alignmentChanges",
    "lineSpacingChanges",
    "dominantBodyStyleChanges",
    "dominantFontFamilyChanges",
    "dominantFontSizeChanges"
  ] as const) {
    assert.ok(
      secondReport.totals[key] <= firstReport.totals[key],
      `${key} increased on second pass`
    );
  }
}

function assertSlideCountersDoNotIncrease(
  firstSlideChanges: SlideChangeSummary[],
  secondSlideChanges: SlideChangeSummary[]
): void {
  const secondBySlide = new Map(secondSlideChanges.map((entry) => [entry.slide, entry]));

  for (const firstEntry of firstSlideChanges) {
    const secondEntry = secondBySlide.get(firstEntry.slide);
    if (!secondEntry) {
      continue;
    }

    for (const key of [
      "fontFamilyChanges",
      "fontSizeChanges",
      "spacingChanges",
      "bulletChanges",
      "alignmentChanges",
      "lineSpacingChanges",
      "dominantBodyStyleChanges",
      "dominantFontFamilyChanges",
      "dominantFontSizeChanges",
      "dominantBodyStyleEligibleGroups",
      "dominantBodyStyleTouchedGroups",
      "dominantBodyStyleSkippedGroups",
      "dominantBodyStyleAlignmentChanges",
      "dominantBodyStyleSpacingBeforeChanges",
      "dominantBodyStyleSpacingAfterChanges",
      "dominantBodyStyleLineSpacingChanges"
    ] as const) {
      assert.ok(
        secondEntry[key] <= firstEntry[key],
        `slide ${firstEntry.slide} ${key} increased on second pass`
      );
    }
  }
}

async function createPipelineStabilityFixturePptx(): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-pipeline-stability-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "pipeline-stability-sample.pptx");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", buildContentTypesXml(2));
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", buildPresentationXml(2));
  zip.file("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(2));
  zip.file("ppt/slides/slide1.xml", buildSlideXml([
    buildShapeXml({
      id: 2,
      name: "Title 1",
      placeholderType: "title",
      paragraphs: [
        {
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }
      ]
    }),
    buildShapeXml({
      id: 3,
      name: "Global Drift",
      paragraphs: [
        {
          runs: [
            { text: "Deck drift", fontFamily: "Arial", fontSize: 1800 }
          ]
        },
        {
          runs: [
            { text: "Deck stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }
      ]
    }),
    buildShapeXml({
      id: 4,
      name: "Spacing Drift",
      paragraphs: [
        paragraphWithBodyStyle("Spacing A", { spacingAfterPt: 12 }),
        paragraphWithBodyStyle("Spacing B", { spacingAfterPt: 12 }),
        paragraphWithBodyStyle("Spacing C", { spacingAfterPt: 24 }),
        paragraphWithBodyStyle("Spacing D", { spacingAfterPt: 12 })
      ]
    }),
    buildShapeXml({
      id: 5,
      name: "Alignment Drift",
      paragraphs: [
        paragraphWithBodyStyle("Align A", { alignment: "left" }),
        paragraphWithBodyStyle("Align B", { alignment: "left" }),
        paragraphWithBodyStyle("Align C", { alignment: "center" }),
        paragraphWithBodyStyle("Align D", { alignment: "left" })
      ]
    }),
    buildShapeXml({
      id: 6,
      name: "Line Spacing Drift",
      paragraphs: [
        paragraphWithBodyStyle("Line A", { lineSpacingPct: 120 }),
        paragraphWithBodyStyle("Line B", { lineSpacingPct: 120 }),
        paragraphWithBodyStyle("Line C", { lineSpacingPct: 140 }),
        paragraphWithBodyStyle("Line D", { lineSpacingPct: 120 })
      ]
    }),
    buildShapeXml({
      id: 7,
      name: "Bullet Drift",
      paragraphs: [
        paragraphWithBodyStyle("Root alpha", { bullet: true, bulletLevel: 0, alignment: "left" }),
        paragraphWithBodyStyle("Root beta", { bullet: true, bulletLevel: 0, alignment: "left" }),
        paragraphWithBodyStyle("Unexpected nested", { bullet: true, bulletLevel: 1, alignment: "left" }),
        paragraphWithBodyStyle("Root gamma", { bullet: true, bulletLevel: 0, alignment: "left" }),
        paragraphWithBodyStyle("Divider"),
        paragraphWithBodyStyle("Another list", { bullet: true, bulletLevel: 0, alignment: "left" }),
        paragraphWithBodyStyle("Jumped nested", { bullet: true, bulletLevel: 2, alignment: "left" })
      ]
    }),
    buildShapeXml({
      id: 8,
      name: "Body Group A",
      paragraphs: [
        paragraphWithBodyStyle("Body A1", {
          spacingBeforePt: 6,
          spacingAfterPt: 12,
          lineSpacingPct: 120,
          alignment: "left"
        }),
        paragraphWithBodyStyle("Body A2", {
          spacingBeforePt: 6,
          spacingAfterPt: 12,
          lineSpacingPct: 120,
          alignment: "left"
        })
      ]
    }),
    buildShapeXml({
      id: 9,
      name: "Body Group B",
      paragraphs: [
        paragraphWithBodyStyle("Body B1", {
          spacingBeforePt: 6,
          spacingAfterPt: 12,
          lineSpacingPct: 120,
          alignment: "left"
        }),
        paragraphWithBodyStyle("Body B2", {
          spacingBeforePt: 6,
          spacingAfterPt: 12,
          lineSpacingPct: 120,
          alignment: "left"
        })
      ]
    }),
    buildShapeXml({
      id: 10,
      name: "Body Target",
      paragraphs: [
        paragraphWithBodyStyle("Body Target 1", {
          spacingBeforePt: 12,
          spacingAfterPt: 24,
          lineSpacingPct: 140,
          alignment: "center"
        }),
        paragraphWithBodyStyle("Body Target 2", {
          spacingBeforePt: 12,
          spacingAfterPt: 24,
          lineSpacingPct: 140,
          alignment: "center"
        })
      ]
    })
  ]));
  zip.file("ppt/slides/slide2.xml", buildSlideXml([
    buildShapeXml({
      id: 2,
      name: "Stable Body",
      paragraphs: [
        paragraphWithBodyStyle("Stable 1"),
        paragraphWithBodyStyle("Stable 2")
      ]
    })
  ]));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(filePath, buffer);
  return filePath;
}

function paragraphWithBodyStyle(
  text: string,
  options: {
    spacingBeforePt?: number;
    spacingAfterPt?: number;
    bullet?: boolean;
    bulletLevel?: number;
    lineSpacingPt?: number;
    lineSpacingPct?: number;
    alignment?: "left" | "center" | "right" | "justify";
  } = {}
): ParagraphDefinition {
  return {
    ...options,
    runs: [
      {
        text,
        fontFamily: "Calibri",
        fontSize: 2400
      }
    ]
  };
}

async function extractAllSlideTextTokens(filePath: string): Promise<string[][]> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const slideEntries = Object.keys(archive.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    .sort((left, right) => {
      const leftIndex = Number.parseInt(left.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      const rightIndex = Number.parseInt(right.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      return leftIndex - rightIndex;
    });

  return Promise.all(
    slideEntries.map(async (entryPath) => {
      const xml = await archive.file(entryPath)?.async("string");
      assert.ok(xml, `Missing archive entry ${entryPath}`);
      return [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((match) => match[1]);
    })
  );
}

interface ParagraphDefinition {
  runs: Array<{
    text: string;
    fontFamily?: string;
    fontSize?: number;
  }>;
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  bullet?: boolean;
  bulletLevel?: number;
  lineSpacingPt?: number;
  lineSpacingPct?: number;
  alignment?: "left" | "center" | "right" | "justify";
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
  paragraphs: ParagraphDefinition[];
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const paragraphs = options.paragraphs
    .map((paragraph) => {
      const paragraphProperties = buildParagraphPropertiesXml(paragraph);
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
  spacingBeforePt?: number;
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

  if (options.spacingBeforePt !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${options.spacingBeforePt * 100}"/></a:spcBef>`);
  }

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
