import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("runAllFixes normalizes clear bullet outliers and obvious jumps, then becomes no-op on second pass", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            buildBulletParagraph("Root alpha", 0),
            buildBulletParagraph("Root beta", 0),
            buildBulletParagraph("Unexpected nested", 1),
            buildBulletParagraph("Root gamma", 0),
            buildPlainParagraph("Divider"),
            buildBulletParagraph("Jump root", 0),
            buildBulletParagraph("Jumped nested", 2)
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "bullet-fixed.pptx");
  const secondOutputPath = path.join(path.dirname(inputPath), "bullet-fixed-second-pass.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.noOp, false);
  assert.deepEqual(report.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 0
    },
    {
      name: "fontSizeFix",
      changedRuns: 0
    },
    {
      name: "spacingFix",
      changedParagraphs: 0
    },
    {
      name: "bulletFix",
      changedParagraphs: 2
    },
    {
      name: "alignmentFix",
      changedParagraphs: 0
    },
    {
      name: "lineSpacingFix",
      changedParagraphs: 0
    },
    {
      name: "dominantBodyStyleFix",
      changedParagraphs: 0
    },
      {
        name: "dominantFontFamilyFix",
        changedParagraphs: 0
      },
      {
        name: "dominantFontSizeFix",
        changedParagraphs: 0
      }
  ]);
  assert.deepEqual(report.totals, {
    fontFamilyChanges: 0,
    fontSizeChanges: 0,
    spacingChanges: 0,
    bulletChanges: 2,
    alignmentChanges: 0,
    lineSpacingChanges: 0,
    dominantBodyStyleChanges: 0,
    dominantFontFamilyChanges: 0,
    dominantFontSizeChanges: 0
  });
  assert.deepEqual(report.changesBySlide, [
    {
      slide: 1,
      slideFontUsage: {
        fontFamilyHistogram: {
          Calibri: 7
        },
        fontSizeHistogram: {
          24: 7
        }
      },
      slideQaSummary: {
        brandScore: 96,
        qualityLabel: "good",
        summaryLine: "Slide is mostly consistent with minor formatting drift.",
        keyIssues: [
          "Bullet formatting inconsistency detected"
        ]
      },
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 2,
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
  ]);
  assert.deepEqual(report.verification, {
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 0,
    fontSizeDriftAfter: 0,
    spacingDriftBefore: 0,
    spacingDriftAfter: 0,
    bulletIndentDriftBefore: 2,
    bulletIndentDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.equal(outputAudit.bulletIndentDriftCount, 0);
  assert.deepEqual(
    await extractAllSlideTextTokens(inputPath),
    await extractAllSlideTextTokens(outputPath)
  );
  const slideXml = await readSlideXml(outputPath, 1);
  assert.match(slideXml, /<a:pPr lvl="0"><a:buChar/);
  assert.match(slideXml, /<a:pPr lvl="1"><a:buChar/);
  assert.doesNotMatch(slideXml, /<a:pPr lvl="2"><a:buChar/);

  const secondReport = await runAllFixes(outputPath, secondOutputPath);
  assert.equal(secondReport.applied, false);
  assert.equal(secondReport.noOp, true);
  assert.deepEqual(secondReport.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 0
    },
    {
      name: "fontSizeFix",
      changedRuns: 0
    },
    {
      name: "spacingFix",
      changedParagraphs: 0
    },
    {
      name: "bulletFix",
      changedParagraphs: 0
    },
    {
      name: "alignmentFix",
      changedParagraphs: 0
    },
    {
      name: "lineSpacingFix",
      changedParagraphs: 0
    },
    {
      name: "dominantBodyStyleFix",
      changedParagraphs: 0
    },
      {
        name: "dominantFontFamilyFix",
        changedParagraphs: 0
      },
      {
        name: "dominantFontSizeFix",
        changedParagraphs: 0
      }
  ]);
  assert.deepEqual(secondReport.verification, {
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 0,
    fontSizeDriftAfter: 0,
    spacingDriftBefore: 0,
    spacingDriftAfter: 0,
    bulletIndentDriftBefore: 0,
    bulletIndentDriftAfter: 0,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });
  assert.deepEqual(await readFile(outputPath), await readFile(secondOutputPath));
});

test("runAllFixes normalizes a safe bullet-symbol outlier without changing bullet levels", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            buildBulletParagraph("Root alpha", 0, "*"),
            buildBulletParagraph("Root beta", 0, "*"),
            buildBulletParagraph("Unexpected symbol", 0, "-"),
            buildBulletParagraph("Root gamma", 0, "*")
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "bullet-symbol-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.bulletChanges, 1);
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "bullet_indentation"),
    {
      category: "bullet_indentation",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.verification.bulletIndentDriftBefore, 1);
  assert.equal(report.verification.bulletIndentDriftAfter, 0);
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.equal(outputAudit.bulletIndentDriftCount, 0);
  const slideXml = await readSlideXml(outputPath, 1);
  assert.match(slideXml, /<a:buChar char="\*"/);
  assert.doesNotMatch(slideXml, /<a:buChar char="-"/);
});

test("runAllFixes normalizes an isolated deep bullet jump bracketed by same-level siblings", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            buildBulletParagraph("Root alpha", 0),
            buildBulletParagraph("Root beta", 0),
            buildBulletParagraph("Unexpected deep jump", 2),
            buildBulletParagraph("Root gamma", 0)
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "bullet-indent-jump-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.totals.bulletChanges, 1);
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "bullet_indentation"),
    {
      category: "bullet_indentation",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.verification.bulletIndentDriftBefore, 1);
  assert.equal(report.verification.bulletIndentDriftAfter, 0);

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.equal(outputAudit.bulletIndentDriftCount, 0);
  const slideXml = await readSlideXml(outputPath, 1);
  assert.doesNotMatch(slideXml, /<a:pPr lvl="2"><a:buChar/);
  assert.match(slideXml, /<a:pPr lvl="0"><a:buChar/);
});

test("runAllFixes normalizes a trailing bullet level outlier after marker convergence", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            buildBulletParagraph("Root alpha", 0, "*"),
            buildBulletParagraph("Root beta", 0, "*"),
            buildBulletParagraph("Root gamma", 0, "*"),
            buildAutoNumberParagraph("Trailing numbered outlier", 1, "romanLcPeriod")
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "bullet-tail-outlier-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.ok(report.totals.bulletChanges >= 1);
  assert.ok(report.verification.bulletIndentDriftBefore >= 1);
  assert.equal(report.verification.bulletIndentDriftAfter, 0);
  assert.equal(analyzeSlides(await loadPresentation(outputPath)).bulletIndentDriftCount, 0);
  const slideXml = await readSlideXml(outputPath, 1);
  assert.match(slideXml, /Trailing numbered outlier/);
  assert.match(slideXml, /<a:pPr lvl="0"><a:buChar char="\*"/);
  assert.doesNotMatch(slideXml, /<a:pPr lvl="1"><a:buAutoNum type="romanLcPeriod"/);
});

test("runAllFixes skips ambiguous bullet jump structures safely", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            buildBulletParagraph("Root alpha", 0),
            buildBulletParagraph("Ambiguous deep item", 2),
            buildBulletParagraph("Nested follow-up", 1)
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "bullet-ambiguous-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, false);
  assert.equal(report.noOp, true);
  assert.deepEqual(report.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 0
    },
    {
      name: "fontSizeFix",
      changedRuns: 0
    },
    {
      name: "spacingFix",
      changedParagraphs: 0
    },
    {
      name: "bulletFix",
      changedParagraphs: 0
    },
    {
      name: "alignmentFix",
      changedParagraphs: 0
    },
    {
      name: "lineSpacingFix",
      changedParagraphs: 0
    },
    {
      name: "dominantBodyStyleFix",
      changedParagraphs: 0
    },
      {
        name: "dominantFontFamilyFix",
        changedParagraphs: 0
      },
      {
        name: "dominantFontSizeFix",
        changedParagraphs: 0
      }
  ]);
  assert.deepEqual(report.totals, {
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
  assert.deepEqual(report.verification, {
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 0,
    fontDriftAfter: 0,
    fontSizeDriftBefore: 0,
    fontSizeDriftAfter: 0,
    spacingDriftBefore: 0,
    spacingDriftAfter: 0,
    bulletIndentDriftBefore: 1,
    bulletIndentDriftAfter: 1,
    alignmentDriftBefore: 0,
    alignmentDriftAfter: 0,
    lineSpacingDriftBefore: 0,
    lineSpacingDriftAfter: 0
  });
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "bullet_indentation"),
    {
      category: "bullet_indentation",
      detectedBefore: 1,
      fixed: 0,
      remaining: 1,
      status: "unchanged"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "manualReviewRecommended");
  assert.equal(report.deckReadinessSummary.readinessReason, "cleanupDidNotImprove");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
  assert.deepEqual(await readFile(inputPath), await readFile(outputPath));
});

test("runAllFixes normalizes a mixed bullet-marker outlier when the list has a clear anchored marker", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            buildBulletParagraph("Root alpha", 0, "*"),
            buildBulletParagraph("Root beta", 0, "*"),
            buildAutoNumberParagraph("Numbered outlier", 0, "arabicPeriod"),
            buildBulletParagraph("Root gamma", 0, "*")
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "bullet-symbol-mixed-kind-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);

  assert.equal(report.applied, true);
  assert.equal(report.noOp, false);
  assert.equal(report.totals.bulletChanges, 1);
  assert.equal(report.verification.bulletIndentDriftBefore, 1);
  assert.equal(report.verification.bulletIndentDriftAfter, 0);
  assert.deepEqual(
    report.issueCategorySummary.find((entry) => entry.category === "bullet_indentation"),
    {
      category: "bullet_indentation",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    }
  );
  assert.equal(report.deckReadinessSummary.readinessLabel, "ready");
  assert.equal(report.deckReadinessSummary.readinessReason, "noRemainingIssues");
  assert.equal(report.reportConsistencySummary.consistencyLabel, "consistent");
  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.equal(outputAudit.bulletIndentDriftCount, 0);
  assert.notDeepEqual(await readFile(inputPath), await readFile(outputPath));
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-bullet-fixture-"));
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

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(filePath, buffer);
  return filePath;
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

async function readSlideXml(filePath: string, slideIndex: number): Promise<string> {
  const archive = await JSZip.loadAsync(await readFile(filePath));
  const xml = await archive.file(`ppt/slides/slide${slideIndex}.xml`)?.async("string");
  assert.ok(xml, `Missing slide ${slideIndex}`);
  return xml;
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
}): string {
  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${options.id}" name="${options.name}"/>
    <p:cNvSpPr/>
    <p:nvPr></p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    ${options.paragraphs.join("")}
  </p:txBody>
</p:sp>`;
}

function buildBulletParagraph(text: string, level: number, bulletChar = "•"): string {
  return `<a:p>
      <a:pPr lvl="${level}"><a:buChar char="${bulletChar}"/></a:pPr>
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>${text}</a:t></a:r>
    </a:p>`;
}

function buildAutoNumberParagraph(text: string, level: number, autoNumberType: string): string {
  return `<a:p>
      <a:pPr lvl="${level}"><a:buAutoNum type="${autoNumberType}"/></a:pPr>
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>${text}</a:t></a:r>
    </a:p>`;
}

function buildPlainParagraph(text: string): string {
  return `<a:p>
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>${text}</a:t></a:r>
    </a:p>`;
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
