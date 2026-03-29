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
  assert.equal(report.slides.length, 2);
  assert.deepEqual(report.slides.map((slide) => slide.title), [
    "Quarterly Review",
    null
  ]);
  assert.deepEqual(report.slides.map((slide) => slide.textBoxCount), [2, 1]);
  assert.deepEqual(report.slides[0]?.paragraphGroups, [
    {
      type: "title",
      paragraphCount: 1,
      startParagraphIndex: 0,
      endParagraphIndex: 0,
      styleSignature: {
        fontFamily: "Calibri",
        fontSize: 24,
        spacingBefore: null,
        spacingAfter: null,
        alignment: null,
        lineSpacing: null,
        bulletLevel: null
      }
    },
    {
      type: "standalone",
      paragraphCount: 1,
      startParagraphIndex: 0,
      endParagraphIndex: 0,
      styleSignature: {
        fontFamily: "Arial",
        fontSize: 18,
        spacingBefore: null,
        spacingAfter: "12pt",
        alignment: null,
        lineSpacing: null,
        bulletLevel: null
      }
    },
    {
      type: "standalone",
      paragraphCount: 1,
      startParagraphIndex: 1,
      endParagraphIndex: 1,
      styleSignature: {
        fontFamily: null,
        fontSize: null,
        spacingBefore: null,
        spacingAfter: "24pt",
        alignment: null,
        lineSpacing: null,
        bulletLevel: null
      }
    }
  ]);
  assert.deepEqual(report.slides[1]?.paragraphGroups, [
    {
      type: "standalone",
      paragraphCount: 1,
      startParagraphIndex: 0,
      endParagraphIndex: 0,
      styleSignature: {
        fontFamily: "Calibri",
        fontSize: 20,
        spacingBefore: null,
        spacingAfter: null,
        alignment: null,
        lineSpacing: null,
        bulletLevel: null
      }
    },
    {
      type: "bulletList",
      paragraphCount: 4,
      startParagraphIndex: 1,
      endParagraphIndex: 4,
      styleSignature: {
        fontFamily: null,
        fontSize: null,
        spacingBefore: null,
        spacingAfter: null,
        alignment: "left",
        lineSpacing: null,
        bulletLevel: null
      }
    },
    {
      type: "standalone",
      paragraphCount: 1,
      startParagraphIndex: 5,
      endParagraphIndex: 5,
      styleSignature: {
        fontFamily: null,
        fontSize: null,
        spacingBefore: null,
        spacingAfter: null,
        alignment: null,
        lineSpacing: null,
        bulletLevel: null
      }
    },
    {
      type: "bulletList",
      paragraphCount: 2,
      startParagraphIndex: 6,
      endParagraphIndex: 7,
      styleSignature: {
        fontFamily: null,
        fontSize: null,
        spacingBefore: null,
        spacingAfter: null,
        alignment: null,
        lineSpacing: null,
        bulletLevel: null
      }
    }
  ]);
  assert.deepEqual(report.slides[0]?.slideFontUsage, {
    fontFamilyHistogram: {
      Arial: 1,
      Calibri: 1
    },
    fontSizeHistogram: {
      24: 1,
      18: 1
    }
  });
  assert.deepEqual(report.slides[1]?.slideFontUsage, {
    fontFamilyHistogram: {
      Calibri: 1
    },
    fontSizeHistogram: {
      20: 1
    }
  });
  assert.deepEqual(report.slides[0]?.dominantBodyStyle, {
    fontFamily: null,
    fontSize: null,
    spacingBefore: null,
    spacingAfter: null,
    alignment: null,
    lineSpacing: null
  });
  assert.deepEqual(report.slides[1]?.dominantBodyStyle, {
    fontFamily: null,
    fontSize: null,
    spacingBefore: null,
    spacingAfter: null,
    alignment: null,
    lineSpacing: null
  });
  assert.equal(report.slides[0]?.severityScore, 2);
  assert.equal(report.slides[0]?.severityLabel, "low");
  assert.deepEqual(report.slides[0]?.slideQaSummary, {
    brandScore: 98,
    qualityLabel: "good",
    summaryLine: "Slide is mostly consistent with minor formatting drift.",
    keyIssues: [
      "Paragraph spacing drift detected"
    ]
  });
  assert.equal(report.slides[1]?.severityScore, 6);
  assert.equal(report.slides[1]?.severityLabel, "medium");
  assert.deepEqual(report.slides[1]?.slideQaSummary, {
    brandScore: 94,
    qualityLabel: "good",
    summaryLine: "Slide is mostly consistent with minor formatting drift.",
    keyIssues: [
      "Bullet formatting inconsistency detected",
      "Alignment inconsistency detected",
      "Line spacing inconsistency detected"
    ]
  });
  assert.deepEqual(report.slides[0]?.fontsUsed, [
    {
      fontFamily: "Arial",
      usageCount: 1
    },
    {
      fontFamily: "Calibri",
      usageCount: 1
    }
  ]);
  assert.deepEqual(report.slides[0]?.fontSizesUsed, [
    {
      sizePt: 24,
      usageCount: 1
    },
    {
      sizePt: 18,
      usageCount: 1
    }
  ]);
  assert.deepEqual(report.slides[1]?.fontsUsed, [
    {
      fontFamily: "Calibri",
      usageCount: 1
    }
  ]);
  assert.deepEqual(report.slides[1]?.fontSizesUsed, [
    {
      sizePt: 20,
      usageCount: 1
    }
  ]);
  assert.deepEqual(report.deckFontUsage, {
    fontFamilyHistogram: {
      Calibri: 2,
      Arial: 1
    },
    fontSizeHistogram: {
      24: 1,
      20: 1,
      18: 1
    },
    dominantFontFamilyCoverage: 66.67,
    dominantFontSizeCoverage: 33.33
  });
  assert.deepEqual(report.deckStyleFingerprint, {
    fontFamily: "Calibri",
    fontSize: null,
    alignment: null,
    lineSpacing: null,
    spacingBefore: null,
    spacingAfter: null
  });
  assert.equal(report.fontDriftSeverity, "high");
  assert.deepEqual(report.deckQaSummary, {
    brandScore: 92,
    qualityLabel: "good",
    summaryLine: "Deck is mostly consistent with minor formatting drift.",
    keyIssues: [
      "Paragraph spacing drift detected",
      "Bullet formatting inconsistency detected",
      "Alignment inconsistency detected"
    ],
    fixImpact: {
      changedSlides: 0,
      totalChanges: 0
    }
  });
  assert.deepEqual(report.topProblemSlides, [
    {
      slideIndex: 2,
      brandScore: 94,
      qualityLabel: "good",
      summaryLine: "Slide is mostly consistent with minor formatting drift.",
      keyIssues: [
        "Bullet formatting inconsistency detected",
        "Alignment inconsistency detected",
        "Line spacing inconsistency detected"
      ]
    },
    {
      slideIndex: 1,
      brandScore: 98,
      qualityLabel: "good",
      summaryLine: "Slide is mostly consistent with minor formatting drift.",
      keyIssues: [
        "Paragraph spacing drift detected"
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
    driftRuns: []
  });
  assert.deepEqual(report.fontSizeDrift, {
    dominantSizePt: 24,
    driftRuns: []
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
  assert.deepEqual(report.lineSpacingDrift, {
    driftParagraphs: [
      {
        slide: 2,
        paragraph: 8,
        lineSpacing: "140%"
      }
    ]
  });
  assert.equal(report.lineSpacingDriftCount, 1);
  assert.deepEqual(report.alignmentDrift, {
    driftParagraphs: [
      {
        slide: 2,
        paragraph: 8,
        alignment: "center"
      }
    ]
  });
  assert.equal(report.alignmentDriftCount, 1);
});

test("analyzeSlides excludes protected paragraph-level font-family roles from unresolved drift counts", async () => {
  const fixturePath = await createProtectedFontRoleAuditFixturePptx();

  const presentation = await loadPresentation(fixturePath);
  const report = analyzeSlides(presentation);

  assert.deepEqual(report.fontsUsed, [
    {
      fontFamily: "Calibri",
      usageCount: 3
    },
    {
      fontFamily: "Georgia",
      usageCount: 1
    }
  ]);
  assert.deepEqual(report.fontDrift, {
    dominantFont: "Calibri",
    driftRuns: []
  });
  assert.equal(report.deckQaSummary.keyIssues.includes("Font family drift detected"), false);
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
  assert.match(result.stdout, /Font drift: none/);
  assert.match(result.stdout, /Dominant font size: 24pt/);
  assert.match(result.stdout, /Font size drift: none/);
  assert.match(result.stdout, /Spacing drift: 2 paragraphs/);
  assert.match(result.stdout, /- Slide 1, paragraph 1: before=inherit, after=12pt, line=inherit/);
  assert.match(result.stdout, /- Slide 1, paragraph 2: before=inherit, after=24pt, line=inherit/);
  assert.match(result.stdout, /Bullet drift: 2 paragraphs/);
  assert.match(result.stdout, /- Slide 2, paragraph 4: lvl=1 \(outlier lvl=1 in list dominated by lvl=0\)/);
  assert.match(result.stdout, /- Slide 2, paragraph 8: lvl=2 \(jump from lvl=0 to lvl=2\)/);
  assert.match(result.stdout, /Line spacing drift: 1 paragraphs/);
  assert.match(result.stdout, /- Slide 2, paragraph 8: 140%/);
  assert.match(result.stdout, /Alignment drift: 1 paragraphs/);
  assert.match(result.stdout, /- Slide 2, paragraph 8: center/);

  const outputPath = path.join(workDir, "audit-report.json");
  const output = JSON.parse(await readFile(outputPath, "utf8"));

  assert.equal(output.file, fixturePath);
  assert.equal(output.slideCount, 2);
  assert.deepEqual(output.fontSizeDrift, {
    dominantSizePt: 24,
    driftRuns: []
  });
  assert.equal(output.slides[0]?.severityScore, 2);
  assert.equal(output.slides[0]?.severityLabel, "low");
  assert.deepEqual(output.slides[0]?.slideQaSummary, {
    brandScore: 98,
    qualityLabel: "good",
    summaryLine: "Slide is mostly consistent with minor formatting drift.",
    keyIssues: [
      "Paragraph spacing drift detected"
    ]
  });
  assert.equal(output.slides[1]?.severityScore, 6);
  assert.equal(output.slides[1]?.severityLabel, "medium");
  assert.deepEqual(output.slides[1]?.slideQaSummary, {
    brandScore: 94,
    qualityLabel: "good",
    summaryLine: "Slide is mostly consistent with minor formatting drift.",
    keyIssues: [
      "Bullet formatting inconsistency detected",
      "Alignment inconsistency detected",
      "Line spacing inconsistency detected"
    ]
  });
  assert.equal(output.deckQaSummary.brandScore, 92);
  assert.deepEqual(output.deckQaSummary.keyIssues, [
    "Paragraph spacing drift detected",
    "Bullet formatting inconsistency detected",
    "Alignment inconsistency detected"
  ]);
  assert.deepEqual(output.topProblemSlides, [
    {
      slideIndex: 2,
      brandScore: 94,
      qualityLabel: "good",
      summaryLine: "Slide is mostly consistent with minor formatting drift.",
      keyIssues: [
        "Bullet formatting inconsistency detected",
        "Alignment inconsistency detected",
        "Line spacing inconsistency detected"
      ]
    },
    {
      slideIndex: 1,
      brandScore: 98,
      qualityLabel: "good",
      summaryLine: "Slide is mostly consistent with minor formatting drift.",
      keyIssues: [
        "Paragraph spacing drift detected"
      ]
    }
  ]);
  assert.deepEqual(output.alignmentDrift, {
    driftParagraphs: [
      {
        slide: 2,
        paragraph: 8,
        alignment: "center"
      }
    ]
  });
});

test("analyzeSlides counts eligible dominant-body-style alignment drift as alignment evidence", async () => {
  const fixturePath = await createDominantAlignmentAuditFixturePptx();

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.alignmentDrift, {
    driftParagraphs: [
      {
        slide: 1,
        paragraph: 5,
        alignment: "center"
      },
      {
        slide: 1,
        paragraph: 6,
        alignment: "center"
      }
    ]
  });
  assert.equal(report.alignmentDriftCount, 2);
});

test("analyzeSlides counts explicit bullet-symbol drift inside a repeated list", async () => {
  const fixturePath = await createBulletSymbolAuditFixturePptx();

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.bulletIndentDrift, {
    driftParagraphs: [
      {
        slide: 1,
        paragraph: 3,
        level: 0,
        reason: "marker mismatch char:- vs char:*",
        markerSignature: "char:-"
      }
    ]
  });
  assert.equal(report.bulletIndentDriftCount, 1);
});

test("analyzeSlides adds dominant font cleanup candidates to body paragraph groups only", async () => {
  const fixturePath = await createDominantFontCandidateFixturePptx();

  const report = analyzeSlides(await loadPresentation(fixturePath));
  const bodyGroups = report.slides[0].paragraphGroups.filter((group) => group.type === "body");

  assert.equal(bodyGroups.length, 3);
  assert.deepEqual(
    bodyGroups.map((group) => ({
      startParagraphIndex: group.startParagraphIndex,
      endParagraphIndex: group.endParagraphIndex,
      dominantFontFamilyCleanupCandidate: group.dominantFontFamilyCleanupCandidate,
      dominantFontSizeCleanupCandidate: group.dominantFontSizeCleanupCandidate
    })),
    [
      {
        startParagraphIndex: 0,
        endParagraphIndex: 1,
        dominantFontFamilyCleanupCandidate: {
          eligible: false,
          reasons: ["matches_dominant_font_family"]
        },
        dominantFontSizeCleanupCandidate: {
          eligible: false,
          reasons: ["matches_dominant_font_size"]
        }
      },
      {
        startParagraphIndex: 0,
        endParagraphIndex: 1,
        dominantFontFamilyCleanupCandidate: {
          eligible: false,
          reasons: ["matches_dominant_font_family"]
        },
        dominantFontSizeCleanupCandidate: {
          eligible: false,
          reasons: ["matches_dominant_font_size"]
        }
      },
      {
        startParagraphIndex: 0,
        endParagraphIndex: 1,
        dominantFontFamilyCleanupCandidate: {
          eligible: true,
          reasons: ["group_differs_from_dominant_font_family"]
        },
        dominantFontSizeCleanupCandidate: {
          eligible: true,
          reasons: ["group_differs_from_dominant_font_size"]
        }
      }
    ]
  );
  assert.ok(
    report.slides[0].paragraphGroups
      .filter((group) => group.type !== "body")
      .every((group) =>
        !("dominantFontFamilyCleanupCandidate" in group) &&
        !("dominantFontSizeCleanupCandidate" in group)
      )
  );
});

test("font telemetry marks a single-font deck as low severity", async () => {
  const fixturePath = await createFontTelemetryFixturePptx([
    { fontFamily: "Calibri", fontSize: 24 },
    { fontFamily: "Calibri", fontSize: 24 }
  ]);

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.deckFontUsage, {
    fontFamilyHistogram: {
      Calibri: 4
    },
    fontSizeHistogram: {
      24: 4
    },
    dominantFontFamilyCoverage: 100,
    dominantFontSizeCoverage: 100
  });
  assert.equal(report.fontDriftSeverity, "low");
});

test("font telemetry marks a two-font deck with strong dominant coverage as medium severity", async () => {
  const fixturePath = await createFontTelemetryFixturePptx([
    { fontFamily: "Calibri", fontSize: 24 },
    { fontFamily: "Calibri", fontSize: 24 },
    { fontFamily: "Calibri", fontSize: 24 },
    { fontFamily: "Arial", fontSize: 24 }
  ]);

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.deckFontUsage.fontFamilyHistogram, {
    Calibri: 6,
    Arial: 2
  });
  assert.equal(report.deckFontUsage.dominantFontFamilyCoverage, 75);
  assert.equal(report.fontDriftSeverity, "medium");
});

test("font telemetry marks multi-font drift as high severity and exposes slide-level histograms", async () => {
  const fixturePath = await createFontTelemetryFixturePptx([
    { fontFamily: "Calibri", fontSize: 24 },
    { fontFamily: "Arial", fontSize: 20 },
    { fontFamily: "Verdana", fontSize: 18 }
  ]);

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.deckFontUsage.fontFamilyHistogram, {
    Arial: 2,
    Calibri: 2,
    Verdana: 2
  });
  assert.equal(report.deckFontUsage.dominantFontFamilyCoverage, 33.33);
  assert.equal(report.fontDriftSeverity, "high");
  assert.deepEqual(report.slides[0].slideFontUsage, {
    fontFamilyHistogram: {
      Arial: 2,
      Calibri: 2,
      Verdana: 2
    },
    fontSizeHistogram: {
      24: 2,
      20: 2,
      18: 2
    }
  });
});

test("font telemetry output is deterministic across repeated analysis", async () => {
  const fixturePath = await createFontTelemetryFixturePptx([
    { fontFamily: "Calibri", fontSize: 24 },
    { fontFamily: "Arial", fontSize: 20 },
    { fontFamily: "Calibri", fontSize: 24 }
  ]);

  const presentation = await loadPresentation(fixturePath);
  const first = analyzeSlides(presentation);
  const second = analyzeSlides(presentation);

  assert.deepEqual(first.deckFontUsage, second.deckFontUsage);
  assert.equal(first.fontDriftSeverity, second.fontDriftSeverity);
  assert.deepEqual(
    first.slides.map((slide) => slide.slideFontUsage),
    second.slides.map((slide) => slide.slideFontUsage)
  );
  assert.deepEqual(first.deckStyleFingerprint, second.deckStyleFingerprint);
});

test("deck style fingerprint exposes a full deterministic fingerprint for a clean deck", async () => {
  const fixturePath = await createDeckStyleFingerprintFixturePptx([
    [
      {
        fontFamily: "Calibri",
        fontSize: 24,
        spacingBeforePt: 6,
        spacingAfterPt: 12,
        alignment: "left",
        lineSpacingPct: 120
      },
      {
        fontFamily: "Calibri",
        fontSize: 24,
        spacingBeforePt: 6,
        spacingAfterPt: 12,
        alignment: "left",
        lineSpacingPct: 120
      }
    ]
  ]);

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.deckStyleFingerprint, {
    fontFamily: "Calibri",
    fontSize: 24,
    alignment: "left",
    lineSpacing: 120,
    spacingBefore: 6,
    spacingAfter: 12
  });
});

test("deck style fingerprint exposes partial values for a mixed deck", async () => {
  const fixturePath = await createDeckStyleFingerprintFixturePptx([
    [
      {
        fontFamily: "Calibri",
        fontSize: 24,
        spacingBeforePt: 6,
        spacingAfterPt: 12,
        alignment: "left",
        lineSpacingPct: 120
      }
    ],
    [
      {
        fontFamily: "Calibri",
        fontSize: 24,
        spacingBeforePt: 6,
        spacingAfterPt: 12,
        alignment: "center",
        lineSpacingPct: 140
      }
    ]
  ]);

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.deckStyleFingerprint, {
    fontFamily: "Calibri",
    fontSize: 24,
    alignment: null,
    lineSpacing: null,
    spacingBefore: 6,
    spacingAfter: 12
  });
});

test("deck style fingerprint returns nulls when no safe dominant values exist", async () => {
  const fixturePath = await createDeckStyleFingerprintFixturePptx([
    [
      {
        fontFamily: "Calibri",
        fontSize: 24
      }
    ],
    [
      {
        fontFamily: "Arial",
        fontSize: 18
      }
    ]
  ]);

  const report = analyzeSlides(await loadPresentation(fixturePath));

  assert.deepEqual(report.deckStyleFingerprint, {
    fontFamily: null,
    fontSize: null,
    alignment: null,
    lineSpacing: null,
    spacingBefore: null,
    spacingAfter: null
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
          alignment: "left",
          runs: [
            {
              text: "Root alpha"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 0,
          alignment: "left",
          runs: [
            {
              text: "Root beta"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 1,
          alignment: "left",
          runs: [
            {
              text: "Unexpected nested"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 0,
          alignment: "left",
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
          alignment: "left",
          runs: [
            {
              text: "Another list"
            }
          ]
        },
        {
          bullet: true,
          bulletLevel: 2,
          alignment: "center",
          lineSpacingPct: 140,
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

async function createProtectedFontRoleAuditFixturePptx(): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-protected-font-role-audit-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "protected-font-role-audit-sample.pptx");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", CONTENT_TYPES_XML_SINGLE_SLIDE);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", PRESENTATION_SINGLE_SLIDE_XML);
  zip.file("ppt/_rels/presentation.xml.rels", PRESENTATION_SINGLE_SLIDE_RELS_XML);
  zip.file("ppt/slides/slide1.xml", buildSlideXml([
    buildShapeXml({
      id: 2,
      name: "Title 1",
      placeholderType: "title",
      paragraphs: [
        {
          runs: [
            {
              text: "Quarterly Review",
              fontFamily: "Calibri",
              fontSize: 2800
            }
          ]
        }
      ]
    }),
    buildShapeXml({
      id: 3,
      name: "Body 1",
      paragraphs: [
        {
          spacingAfterPt: 18,
          runs: [
            {
              text: "Body alpha",
              fontFamily: "Calibri",
              fontSize: 2000
            }
          ]
        },
        {
          spacingAfterPt: 18,
          runs: [
            {
              text: "Intentional Georgia callout",
              fontFamily: "Georgia",
              fontSize: 2000
            }
          ]
        },
        {
          spacingAfterPt: 18,
          runs: [
            {
              text: "Body beta",
              fontFamily: "Calibri",
              fontSize: 2000
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

async function createDominantFontCandidateFixturePptx(): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-font-candidate-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "font-candidate-sample.pptx");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", CONTENT_TYPES_XML_SINGLE_SLIDE);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", PRESENTATION_SINGLE_SLIDE_XML);
  zip.file("ppt/_rels/presentation.xml.rels", PRESENTATION_SINGLE_SLIDE_RELS_XML);
  zip.file("ppt/slides/slide1.xml", buildSlideXml([
    buildShapeXml({
      id: 2,
      name: "Body A",
      paragraphs: [
        {
          spacingAfterPt: 12,
          runs: [
            {
              text: "Alpha",
              fontFamily: "Calibri",
              fontSize: 1800
            }
          ]
        },
        {
          spacingAfterPt: 12,
          runs: [
            {
              text: "Beta",
              fontFamily: "Calibri",
              fontSize: 1800
            }
          ]
        }
      ]
    }),
    buildShapeXml({
      id: 3,
      name: "Body B",
      paragraphs: [
        {
          spacingAfterPt: 12,
          runs: [
            {
              text: "Gamma",
              fontFamily: "Calibri",
              fontSize: 1800
            }
          ]
        },
        {
          spacingAfterPt: 12,
          runs: [
            {
              text: "Delta",
              fontFamily: "Calibri",
              fontSize: 1800
            }
          ]
        }
      ]
    }),
    buildShapeXml({
      id: 4,
      name: "Body Target",
      paragraphs: [
        {
          spacingAfterPt: 12,
          runs: [
            {
              text: "Epsilon",
              fontFamily: "Arial",
              fontSize: 2000
            }
          ]
        },
        {
          spacingAfterPt: 12,
          runs: [
            {
              text: "Zeta",
              fontFamily: "Arial",
              fontSize: 2000
            }
          ]
        }
      ]
    }),
    buildShapeXml({
      id: 5,
      name: "Standalone divider",
      paragraphs: [
        {
          spacingAfterPt: 24,
          runs: [
            {
              text: "Divider",
              fontFamily: "Calibri",
              fontSize: 1800
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

async function createDominantAlignmentAuditFixturePptx(): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-alignment-audit-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "alignment-audit-sample.pptx");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", CONTENT_TYPES_XML_SINGLE_SLIDE);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", PRESENTATION_SINGLE_SLIDE_XML);
  zip.file("ppt/_rels/presentation.xml.rels", PRESENTATION_SINGLE_SLIDE_RELS_XML);
  zip.file("ppt/slides/slide1.xml", buildSlideXml([
    buildShapeXml({
      id: 2,
      name: "Body A",
      paragraphs: [
        {
          alignment: "left",
          spacingAfterPt: 12,
          runs: [
            {
              text: "Alpha",
              fontFamily: "Calibri",
              fontSize: 2400
            }
          ]
        },
        {
          alignment: "left",
          spacingAfterPt: 12,
          runs: [
            {
              text: "Beta",
              fontFamily: "Calibri",
              fontSize: 2400
            }
          ]
        }
      ]
    }),
    buildShapeXml({
      id: 3,
      name: "Body B",
      paragraphs: [
        {
          alignment: "left",
          spacingAfterPt: 12,
          runs: [
            {
              text: "Gamma",
              fontFamily: "Calibri",
              fontSize: 2400
            }
          ]
        },
        {
          alignment: "left",
          spacingAfterPt: 12,
          runs: [
            {
              text: "Delta",
              fontFamily: "Calibri",
              fontSize: 2400
            }
          ]
        }
      ]
    }),
    buildShapeXml({
      id: 4,
      name: "Body Target",
      paragraphs: [
        {
          alignment: "center",
          spacingAfterPt: 12,
          runs: [
            {
              text: "Epsilon",
              fontFamily: "Calibri",
              fontSize: 2400
            }
          ]
        },
        {
          alignment: "center",
          spacingAfterPt: 12,
          runs: [
            {
              text: "Zeta",
              fontFamily: "Calibri",
              fontSize: 2400
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

async function createBulletSymbolAuditFixturePptx(): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-bullet-symbol-audit-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "bullet-symbol-audit-sample.pptx");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", CONTENT_TYPES_XML_SINGLE_SLIDE);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", PRESENTATION_SINGLE_SLIDE_XML);
  zip.file("ppt/_rels/presentation.xml.rels", PRESENTATION_SINGLE_SLIDE_RELS_XML);
  zip.file("ppt/slides/slide1.xml", buildSlideXml([
    `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="2" name="Body 1"/>
    <p:cNvSpPr/>
    <p:nvPr></p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:pPr lvl="0"><a:buChar char="*"/></a:pPr>
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>Alpha</a:t></a:r>
    </a:p>
    <a:p>
      <a:pPr lvl="0"><a:buChar char="*"/></a:pPr>
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>Beta</a:t></a:r>
    </a:p>
    <a:p>
      <a:pPr lvl="0"><a:buChar char="-"/></a:pPr>
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>Gamma</a:t></a:r>
    </a:p>
    <a:p>
      <a:pPr lvl="0"><a:buChar char="*"/></a:pPr>
      <a:r><a:rPr sz="2400"><a:latin typeface="Calibri"/></a:rPr><a:t>Delta</a:t></a:r>
    </a:p>
  </p:txBody>
</p:sp>`
  ]));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFixture(filePath, buffer);
  return filePath;
}

async function createFontTelemetryFixturePptx(
  groups: Array<{ fontFamily: string; fontSize: number }>
): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-font-telemetry-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "font-telemetry-sample.pptx");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", CONTENT_TYPES_XML_SINGLE_SLIDE);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", PRESENTATION_SINGLE_SLIDE_XML);
  zip.file("ppt/_rels/presentation.xml.rels", PRESENTATION_SINGLE_SLIDE_RELS_XML);
  zip.file("ppt/slides/slide1.xml", buildSlideXml(
    groups.map((group, index) =>
      buildShapeXml({
        id: index + 2,
        name: `Body ${index + 1}`,
        paragraphs: [
          {
            spacingAfterPt: 12,
            runs: [
              {
                text: `${group.fontFamily} A`,
                fontFamily: group.fontFamily,
                fontSize: group.fontSize * 100
              }
            ]
          },
          {
            spacingAfterPt: 12,
            runs: [
              {
                text: `${group.fontFamily} B`,
                fontFamily: group.fontFamily,
                fontSize: group.fontSize * 100
              }
            ]
          }
        ]
      })
    )
  ));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFixture(filePath, buffer);
  return filePath;
}

async function createDeckStyleFingerprintFixturePptx(
  slides: Array<
    Array<{
      fontFamily: string;
      fontSize: number;
      spacingBeforePt?: number;
      spacingAfterPt?: number;
      lineSpacingPt?: number;
      lineSpacingPct?: number;
      alignment?: "left" | "center" | "right" | "justify";
    }>
  >
): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-deck-fingerprint-"));
  tempPaths.push(workDir);

  const filePath = path.join(workDir, "deck-fingerprint-sample.pptx");
  const zip = new JSZip();

  const contentTypesOverrides = slides
    .map(
      (_, index) =>
        `  <Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    )
    .join("\n");
  const slideIds = slides
    .map(
      (_, index) =>
        `    <p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`
    )
    .join("\n");
  const slideRelationships = slides
    .map(
      (_, index) =>
        `  <Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`
    )
    .join("\n");

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
${contentTypesOverrides}
</Types>`);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
${slideIds}
  </p:sldIdLst>
</p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${slideRelationships}
</Relationships>`);

  slides.forEach((groups, slideIndex) => {
    zip.file(
      `ppt/slides/slide${slideIndex + 1}.xml`,
      buildSlideXml(
        groups.map((group, groupIndex) =>
          buildShapeXml({
            id: groupIndex + 2,
            name: `Body ${slideIndex + 1}-${groupIndex + 1}`,
            paragraphs: [
              {
                spacingBeforePt: group.spacingBeforePt,
                spacingAfterPt: group.spacingAfterPt,
                lineSpacingPt: group.lineSpacingPt,
                lineSpacingPct: group.lineSpacingPct,
                alignment: group.alignment,
                runs: [
                  {
                    text: `${group.fontFamily} A`,
                    fontFamily: group.fontFamily,
                    fontSize: group.fontSize * 100
                  }
                ]
              },
              {
                spacingBeforePt: group.spacingBeforePt,
                spacingAfterPt: group.spacingAfterPt,
                lineSpacingPt: group.lineSpacingPt,
                lineSpacingPct: group.lineSpacingPct,
                alignment: group.alignment,
                runs: [
                  {
                    text: `${group.fontFamily} B`,
                    fontFamily: group.fontFamily,
                    fontSize: group.fontSize * 100
                  }
                ]
              }
            ]
          })
        )
      )
    );
  });

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
    spacingBeforePt?: number;
    spacingAfterPt?: number;
    bullet?: boolean;
    bulletLevel?: number;
    lineSpacingPt?: number;
    lineSpacingPct?: number;
    alignment?: "left" | "center" | "right" | "justify";
  }>;
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const paragraphs = (options.paragraphs ?? [{ runs: options.runs ?? [] }])
    .map((paragraph) => {
      const paragraphProperties = buildParagraphPropertiesXml({
        spacingBeforePt: paragraph.spacingBeforePt,
        spacingAfterPt: paragraph.spacingAfterPt,
        bullet: paragraph.bullet,
        bulletLevel: paragraph.bulletLevel,
        lineSpacingPt: paragraph.lineSpacingPt,
        lineSpacingPct: paragraph.lineSpacingPct,
        alignment: paragraph.alignment
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

const CONTENT_TYPES_XML_SINGLE_SLIDE = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`;

const PRESENTATION_SINGLE_SLIDE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
  </p:sldIdLst>
</p:presentation>`;

const PRESENTATION_SINGLE_SLIDE_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`;
