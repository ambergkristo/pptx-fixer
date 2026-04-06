import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { summarizeRoleBasedSpacingResidual } from "../packages/fix/roleBasedSpacingFix.ts";
import { summarizeRoleBasedTypographyResidual } from "../packages/fix/roleBasedTypographyFix.ts";
import { runFixesByMode } from "../packages/fix/runFixesByMode.ts";
import { createProductShellApp } from "../apps/product-shell/server.ts";

const tempPaths: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = path.join(repoRoot, "pptx-fixer");

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((entry) => rm(entry, { recursive: true, force: true })));
});

test("normalize mode closes title-role font and size drift that standard mode preserves", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 3",
          placeholderType: "title",
          runs: [{ text: "Hiring plan", fontFamily: "Arial", fontSize: 2600 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 3",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });
  const standardOutputPath = path.join(path.dirname(inputPath), "standard-output.pptx");
  const normalizeOutputPath = path.join(path.dirname(inputPath), "normalize-output.pptx");

  const standardReport = await runFixesByMode("standard", inputPath, standardOutputPath);
  const normalizeReport = await runFixesByMode("normalize", inputPath, normalizeOutputPath);

  assert.equal(standardReport.mode, "standard");
  assert.equal(standardReport.processingModeSummary.processingModeLabel, "all");
  assert.equal(standardReport.verification.fontDriftBefore, 3);
  assert.equal(standardReport.verification.fontDriftAfter, 3);
  assert.equal(standardReport.verification.fontSizeDriftBefore, 0);
  assert.equal(standardReport.verification.fontSizeDriftAfter, 0);

  assert.equal(normalizeReport.mode, "normalize");
  assert.equal(normalizeReport.processingModeSummary.processingModeLabel, "normalize");
  assert.equal(normalizeReport.verification.fontDriftBefore, 1);
  assert.equal(normalizeReport.verification.fontDriftAfter, 0);
  assert.equal(normalizeReport.verification.fontSizeDriftBefore, 1);
  assert.equal(normalizeReport.verification.fontSizeDriftAfter, 0);
  assert.equal(normalizeReport.totals.fontFamilyChanges > standardReport.totals.fontFamilyChanges, true);
  assert.equal(normalizeReport.totals.fontSizeChanges > standardReport.totals.fontSizeChanges, true);

  const normalizedAudit = analyzeSlides(await loadPresentation(normalizeOutputPath));
  assert.deepEqual(summarizeRoleBasedTypographyResidual(normalizedAudit), {
    fontFamilyDriftCount: 0,
    fontSizeDriftCount: 0
  });
});

test("normalize mode applies an explicit brand font across eligible roles", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "normalize-brand-font-output.pptx");

  const inputAudit = analyzeSlides(await loadPresentation(inputPath));
  assert.deepEqual(
    summarizeRoleBasedTypographyResidual(inputAudit, {
      preferredFontFamily: "IBM Plex Sans"
    }),
    {
      fontFamilyDriftCount: 4,
      fontSizeDriftCount: 0
    }
  );

  const report = await runFixesByMode("normalize", inputPath, outputPath, {
    normalizeBrandFontFamily: "IBM Plex Sans"
  });

  assert.equal(report.verification.fontDriftBefore, 4);
  assert.equal(report.verification.fontDriftAfter, 0);
  assert.equal(report.verification.fontSizeDriftBefore, 0);
  assert.equal(report.verification.fontSizeDriftAfter, 0);

  const normalizedAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.deepEqual(
    summarizeRoleBasedTypographyResidual(normalizedAudit, {
      preferredFontFamily: "IBM Plex Sans"
    }),
    {
      fontFamilyDriftCount: 0,
      fontSizeDriftCount: 0
    }
  );
});

test("normalize mode applies a brand preset across eligible roles", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "normalize-brand-preset-output.pptx");

  const report = await runFixesByMode("normalize", inputPath, outputPath, {
    normalizeBrandPresetId: "modern_sans"
  });

  assert.equal(report.verification.fontDriftBefore, 4);
  assert.equal(report.verification.fontDriftAfter, 0);
  assert.equal(report.verification.fontSizeDriftBefore, 0);
  assert.equal(report.verification.fontSizeDriftAfter, 0);
});

test("normalize mode rejects unsupported brand presets", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Title 1",
        placeholderType: "title",
        runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "normalize-invalid-preset-output.pptx");

  await assert.rejects(
    runFixesByMode("normalize", inputPath, outputPath, {
      normalizeBrandPresetId: "not_real"
    }),
    /normalizeBrandPresetId is not a supported preset/
  );
});

test("normalize mode closes title-role paragraph and line spacing drift that standard mode preserves", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Title 1",
        placeholderType: "title",
        spacingBeforePt: 6,
        spacingAfterPt: 18,
        lineSpacingPct: 120,
        runs: [{ text: "North America", fontFamily: "Calibri", fontSize: 3200 }]
      }),
      buildShapeXml({
        id: 3,
        name: "Title 2",
        placeholderType: "title",
        spacingBeforePt: 6,
        spacingAfterPt: 18,
        lineSpacingPct: 120,
        runs: [{ text: "Europe", fontFamily: "Calibri", fontSize: 3200 }]
      }),
      buildShapeXml({
        id: 4,
        name: "Title 3",
        placeholderType: "title",
        spacingBeforePt: 18,
        spacingAfterPt: 36,
        lineSpacingPct: 140,
        runs: [{ text: "Asia", fontFamily: "Calibri", fontSize: 3200 }]
      })
    ]]
  });
  const standardOutputPath = path.join(path.dirname(inputPath), "standard-spacing-output.pptx");
  const normalizeOutputPath = path.join(path.dirname(inputPath), "normalize-spacing-output.pptx");

  const standardReport = await runFixesByMode("standard", inputPath, standardOutputPath);
  const normalizeReport = await runFixesByMode("normalize", inputPath, normalizeOutputPath);

  assert.equal(standardReport.totals.spacingChanges, 0);
  assert.equal(standardReport.totals.lineSpacingChanges, 0);
  assert.deepEqual(await readFile(inputPath), await readFile(standardOutputPath));

  assert.equal(normalizeReport.verification.spacingDriftBefore, 1);
  assert.equal(normalizeReport.verification.spacingDriftAfter, 0);
  assert.equal(normalizeReport.verification.lineSpacingDriftBefore, 1);
  assert.equal(normalizeReport.verification.lineSpacingDriftAfter, 0);
  assert.equal(normalizeReport.totals.spacingChanges > 0, true);
  assert.equal(normalizeReport.totals.lineSpacingChanges > 0, true);

  const normalizedAudit = analyzeSlides(await loadPresentation(normalizeOutputPath));
  assert.deepEqual(summarizeRoleBasedSpacingResidual(normalizedAudit), {
    spacingDriftCount: 0,
    lineSpacingDriftCount: 0
  });
});

test("normalize mode closes body and bullet role spacing drift that standard mode preserves", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          paragraphs: [
            { text: "The operating model is now standardized across finance, revenue, and operations teams.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 12, lineSpacingPct: 120 },
            { text: "Weekly business reviews now follow the same cadence, owners, and escalation structure in every market.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 12, lineSpacingPct: 120 },
            { text: "This removes local formatting drift from executive updates and makes cross-slide reading materially easier.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 12, lineSpacingPct: 120 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Bullets 1",
          paragraphs: [
            { text: "Consolidated weekly KPI review", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 10, lineSpacingPct: 110, bulletLevel: 0 },
            { text: "One format for action owners", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 10, lineSpacingPct: 110, bulletLevel: 0 }
          ]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Body 2",
          paragraphs: [
            { text: "The operating model is now standardized across finance, revenue, and operations teams.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 12, lineSpacingPct: 120 },
            { text: "Weekly business reviews now follow the same cadence, owners, and escalation structure in every market.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 12, lineSpacingPct: 120 },
            { text: "This removes local formatting drift from executive updates and makes cross-slide reading materially easier.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 12, lineSpacingPct: 120 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Bullets 2",
          paragraphs: [
            { text: "Consolidated weekly KPI review", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 10, lineSpacingPct: 110, bulletLevel: 0 },
            { text: "One format for action owners", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 10, lineSpacingPct: 110, bulletLevel: 0 }
          ]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Body 3",
          paragraphs: [
            { text: "The operating model is now standardized across finance, revenue, and operations teams.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 24, lineSpacingPct: 145 },
            { text: "Weekly business reviews now follow the same cadence, owners, and escalation structure in every market.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 24, lineSpacingPct: 145 },
            { text: "This removes local formatting drift from executive updates and makes cross-slide reading materially easier.", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 24, lineSpacingPct: 145 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Bullets 3",
          paragraphs: [
            { text: "Consolidated weekly KPI review", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 18, lineSpacingPct: 135, bulletLevel: 0 },
            { text: "One format for action owners", fontFamily: "Aptos", fontSize: 1200, spacingAfterPt: 18, lineSpacingPct: 135, bulletLevel: 0 }
          ]
        })
      ]
    ]
  });
  const standardOutputPath = path.join(path.dirname(inputPath), "standard-body-bullet-spacing-output.pptx");
  const normalizeOutputPath = path.join(path.dirname(inputPath), "normalize-body-bullet-spacing-output.pptx");

  const inputAudit = analyzeSlides(await loadPresentation(inputPath));
  assert.deepEqual(summarizeRoleBasedSpacingResidual(inputAudit), {
    spacingDriftCount: 5,
    lineSpacingDriftCount: 5
  });

  const standardReport = await runFixesByMode("standard", inputPath, standardOutputPath);
  const normalizeReport = await runFixesByMode("normalize", inputPath, normalizeOutputPath);

  assert.equal(standardReport.totals.spacingChanges, 0);
  assert.equal(standardReport.totals.lineSpacingChanges, 0);
  assert.deepEqual(await readFile(inputPath), await readFile(standardOutputPath));

  assert.equal(normalizeReport.verification.spacingDriftBefore, 5);
  assert.equal(normalizeReport.verification.spacingDriftAfter, 0);
  assert.equal(normalizeReport.verification.lineSpacingDriftBefore, 5);
  assert.equal(normalizeReport.verification.lineSpacingDriftAfter, 0);
  assert.equal(normalizeReport.totals.spacingChanges > 0, true);
  assert.equal(normalizeReport.totals.lineSpacingChanges > 0, true);

  const normalizedAudit = analyzeSlides(await loadPresentation(normalizeOutputPath));
  assert.deepEqual(summarizeRoleBasedSpacingResidual(normalizedAudit), {
    spacingDriftCount: 0,
    lineSpacingDriftCount: 0
  });
});

test("product shell fix route accepts normalize mode and returns normalize report metadata", async () => {
  const harness = await createHarness();
  await using _server = harness;
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Hiring plan", fontFamily: "Arial", fontSize: 2600 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 3",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 3",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });

  const response = await uploadFile(`${harness.baseUrl}/fix`, {
    fileName: "normalize-sample.pptx",
    fileBuffer: await readFile(inputPath),
    fields: { mode: "normalize" }
  });

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.report.mode, "normalize");
  assert.equal(json.report.processingModeSummary.processingModeLabel, "normalize");
  assert.equal(json.report.verification.fontDriftAfter, 0);
  assert.equal(json.report.verification.fontSizeDriftAfter, 0);
});

test("product shell fix route accepts an explicit normalize brand font", async () => {
  const harness = await createHarness();
  await using _server = harness;
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });

  const response = await uploadFile(`${harness.baseUrl}/fix`, {
    fileName: "normalize-brand-font.pptx",
    fileBuffer: await readFile(inputPath),
    fields: {
      mode: "normalize",
      normalizeBrandFontFamily: "IBM Plex Sans"
    }
  });

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.report.mode, "normalize");
  assert.equal(json.report.verification.fontDriftBefore, 4);
  assert.equal(json.report.verification.fontDriftAfter, 0);
});

test("product shell fix route accepts a normalize brand preset", async () => {
  const harness = await createHarness();
  await using _server = harness;
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });

  const response = await uploadFile(`${harness.baseUrl}/fix`, {
    fileName: "normalize-brand-preset.pptx",
    fileBuffer: await readFile(inputPath),
    fields: {
      mode: "normalize",
      normalizeBrandPresetId: "modern_sans"
    }
  });

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.report.mode, "normalize");
  assert.equal(json.report.verification.fontDriftBefore, 4);
  assert.equal(json.report.verification.fontDriftAfter, 0);
});

test("CLI fix normalize runs successfully and writes a normalize-mode report", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Hiring plan", fontFamily: "Arial", fontSize: 2600 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 3",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 3",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "normalize-fixed.pptx");
  const reportPath = path.join(path.dirname(inputPath), "normalize-fixed.report.json");

  const result = await runNodeProcess([cliEntry, "fix", "normalize", inputPath, outputPath], path.dirname(inputPath));

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Mode: normalize/);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.mode, "normalize");
  assert.equal(report.processingModeSummary.processingModeLabel, "normalize");
  assert.equal(report.verification.fontDriftAfter, 0);
  assert.equal(report.verification.fontSizeDriftAfter, 0);
});

test("CLI fix normalize accepts an explicit brand font", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "normalize-brand-font-fixed.pptx");
  const reportPath = path.join(path.dirname(inputPath), "normalize-brand-font-fixed.report.json");

  const result = await runNodeProcess(
    [cliEntry, "fix", "normalize", inputPath, outputPath, "--brand-font", "IBM Plex Sans"],
    path.dirname(inputPath)
  );

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Mode: normalize/);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.mode, "normalize");
  assert.equal(report.verification.fontDriftBefore, 4);
  assert.equal(report.verification.fontDriftAfter, 0);
});

test("CLI fix normalize accepts a brand preset", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Aptos", fontSize: 2000 }]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "normalize-brand-preset-fixed.pptx");
  const reportPath = path.join(path.dirname(inputPath), "normalize-brand-preset-fixed.report.json");

  const result = await runNodeProcess(
    [cliEntry, "fix", "normalize", inputPath, outputPath, "--brand-preset", "modern_sans"],
    path.dirname(inputPath)
  );

  assert.equal(result.exitCode, 0, result.stderr);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.mode, "normalize");
  assert.equal(report.verification.fontDriftBefore, 4);
  assert.equal(report.verification.fontDriftAfter, 0);
});

test("template mode applies preset typography plus a deterministic brand shell", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [{ text: "Body copy", fontFamily: "Arial", fontSize: 2000 }]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Title 2",
          placeholderType: "title",
          runs: [{ text: "Revenue outlook", fontFamily: "Aptos", fontSize: 3200 }]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 2",
          runs: [{ text: "Body copy", fontFamily: "Calibri", fontSize: 2000 }]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "template-output.pptx");

  const report = await runFixesByMode("template", inputPath, outputPath, {
    templateBrandPresetId: "modern_sans",
    templateLogoPosition: "bottom_left",
    templateFooterStyle: "minimal"
  });

  assert.equal(report.mode, "template");
  assert.equal(report.processingModeSummary.processingModeLabel, "template");
  assert.equal(report.totals.templateShellChanges, 4);
  assert.equal(report.totals.fontFamilyChanges > 0, true);

  const archive = await JSZip.loadAsync(await readFile(outputPath));
  const slide1Xml = await archive.file("ppt/slides/slide1.xml")?.async("string");
  assert.equal(typeof slide1Xml, "string");
  assert.match(slide1Xml ?? "", /CleanDeck Brand Mark/);
  assert.match(slide1Xml ?? "", /CleanDeck Template Footer/);
  assert.match(slide1Xml ?? "", />MS<\/a:t>/);
  assert.match(slide1Xml ?? "", />Modern Sans<\/a:t>/);
});

test("product shell fix route accepts template mode and returns template report metadata", async () => {
  const harness = await createHarness();
  await using _server = harness;
  const fileBuffer = await readFile(await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Title 1",
        placeholderType: "title",
        runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 1",
        runs: [{ text: "Body copy", fontFamily: "Arial", fontSize: 2000 }]
      })
    ]]
  }));

  const response = await uploadFile(`${harness.baseUrl}/fix`, {
    fileName: "template-sample.pptx",
    fileBuffer,
    fields: {
      mode: "template",
      templateBrandPresetId: "modern_sans",
      templateLogoPosition: "top_right",
      templateFooterStyle: "brand_footer"
    }
  });

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.report.mode, "template");
  assert.equal(json.report.processingModeSummary.processingModeLabel, "template");
  assert.equal(json.report.totals.templateShellChanges > 0, true);
});

test("CLI fix template accepts preset and shell options", async () => {
  const inputPath = await createFixturePptx({
    slides: [[
      buildShapeXml({
        id: 2,
        name: "Title 1",
        placeholderType: "title",
        runs: [{ text: "Quarterly update", fontFamily: "Calibri", fontSize: 3200 }]
      }),
      buildShapeXml({
        id: 3,
        name: "Body 1",
        runs: [{ text: "Body copy", fontFamily: "Arial", fontSize: 2000 }]
      })
    ]]
  });
  const outputPath = path.join(path.dirname(inputPath), "template-fixed.pptx");
  const reportPath = path.join(path.dirname(inputPath), "template-fixed.report.json");

  const result = await runNodeProcess(
    [
      cliEntry,
      "fix",
      "template",
      inputPath,
      outputPath,
      "--brand-preset",
      "modern_sans",
      "--logo-position",
      "bottom_right",
      "--footer-style",
      "minimal"
    ],
    path.dirname(inputPath)
  );

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Mode: template/);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.mode, "template");
  assert.equal(report.processingModeSummary.processingModeLabel, "template");
  assert.equal(report.totals.templateShellChanges > 0, true);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-normalize-"));
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

async function createHarness() {
  const rootDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-normalize-shell-"));
  tempPaths.push(rootDir);

  const app = createProductShellApp({
    tempStorageDirectory: path.join(rootDir, "tmp"),
    outputStorageDirectory: path.join(rootDir, "output")
  });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind normalize product shell harness");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async [Symbol.asyncDispose]() {
      server.close();
      await once(server, "close");
    }
  };
}

async function uploadFile(
  url: string,
  options: {
    fileName: string;
    fileBuffer: Buffer;
    fields?: Record<string, string>;
  }
): Promise<Response> {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([options.fileBuffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    }),
    options.fileName
  );

  for (const [key, value] of Object.entries(options.fields ?? {})) {
    formData.append(key, value);
  }

  return fetch(url, {
    method: "POST",
    body: formData
  });
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
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  lineSpacingPct?: number;
  paragraphs?: Array<{
    text: string;
    fontSize?: number;
    fontFamily?: string;
    spacingBeforePt?: number;
    spacingAfterPt?: number;
    lineSpacingPct?: number;
    bulletLevel?: number;
  }>;
  runs?: Array<{
    text: string;
    fontSize?: number;
    fontFamily?: string;
  }>;
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType ? `<p:ph type="${options.placeholderType}"/>` : "";
  const paragraphs = options.paragraphs?.map((paragraph) => buildParagraphXml({
    text: paragraph.text,
    fontSize: paragraph.fontSize,
    fontFamily: paragraph.fontFamily,
    spacingBeforePt: paragraph.spacingBeforePt,
    spacingAfterPt: paragraph.spacingAfterPt,
    lineSpacingPct: paragraph.lineSpacingPct,
    bulletLevel: paragraph.bulletLevel
  })) ?? [buildParagraphXml({
    runs: options.runs,
    spacingBeforePt: options.spacingBeforePt,
    spacingAfterPt: options.spacingAfterPt,
    lineSpacingPct: options.lineSpacingPct
  })];

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
    ${paragraphs.join("\n")}
  </p:txBody>
</p:sp>`;
}

function buildParagraphXml(options: {
  text?: string;
  runs?: Array<{
    text: string;
    fontSize?: number;
    fontFamily?: string;
  }>;
  fontSize?: number;
  fontFamily?: string;
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  lineSpacingPct?: number;
  bulletLevel?: number;
}): string {
  const runs = (options.runs ?? [{
    text: options.text ?? "",
    fontSize: options.fontSize,
    fontFamily: options.fontFamily
  }]).map((run) => {
    const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
    const latinNode = run.fontFamily ? `<a:latin typeface="${run.fontFamily}"/>` : "";
    return `<a:r>
        <a:rPr${sizeAttribute}>
          ${latinNode}
        </a:rPr>
        <a:t>${run.text}</a:t>
      </a:r>`;
  }).join("");
  const paragraphProperties = buildParagraphPropertiesXml({
    spacingBeforePt: options.spacingBeforePt,
    spacingAfterPt: options.spacingAfterPt,
    lineSpacingPct: options.lineSpacingPct,
    bulletLevel: options.bulletLevel
  });

  return `<a:p>
      ${paragraphProperties}
      ${runs}
    </a:p>`;
}

function buildParagraphPropertiesXml(options: {
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  lineSpacingPct?: number;
  bulletLevel?: number;
}): string {
  const children: string[] = [];

  if (options.bulletLevel !== undefined) {
    children.push(`<a:buChar char="•"/>`);
  }

  if (options.spacingBeforePt !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${options.spacingBeforePt * 100}"/></a:spcBef>`);
  }

  if (options.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${options.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (options.lineSpacingPct !== undefined) {
    children.push(`<a:lnSpc><a:spcPct val="${options.lineSpacingPct * 1000}"/></a:lnSpc>`);
  }

  const levelAttribute = options.bulletLevel !== undefined ? ` lvl="${options.bulletLevel}"` : "";
  return children.length > 0 ? `<a:pPr${levelAttribute}>${children.join("")}</a:pPr>` : "";
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

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
