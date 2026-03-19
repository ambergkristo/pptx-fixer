import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { runAllFixes } from "../packages/fix/runAllFixes.ts";

const tempPaths: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixAllCliEntry = path.join(repoRoot, "apps", "fix-cli", "runFixAll.js");

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((entry) =>
      rm(entry, { recursive: true, force: true })
    )
  );
});

test("runs font family fix first and font size fix second in one output flow", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Title", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [
            { text: "Change font", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Body 2",
          runs: [
            { text: "Body 2", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "combined-fixed.pptx");

  const report = await runAllFixes(inputPath, outputPath);
  const inputStats = await stat(inputPath);
  const outputStats = await stat(outputPath);

  assert.deepEqual(report, {
    applied: true,
    noOp: false,
    steps: [
      {
        name: "fontFamilyFix",
        changedRuns: 1
      },
      {
        name: "fontSizeFix",
        changedRuns: 1
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
    ],
    totals: {
      fontFamilyChanges: 1,
      fontSizeChanges: 1,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    deckFontUsage: {
      fontFamilyHistogram: {
        Calibri: 2
      },
      fontSizeHistogram: {
        24: 2
      },
      dominantFontFamilyCoverage: 100,
      dominantFontSizeCoverage: 100
    },
    deckStyleFingerprint: {
      fontFamily: "Calibri",
      fontSize: 24,
      alignment: null,
      lineSpacing: null,
      spacingBefore: null,
      spacingAfter: null
    },
    fontDriftSeverity: "low",
    deckQaSummary: {
      brandScore: 98,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [
        "Font family drift detected",
        "Font size drift detected"
      ],
      fixImpact: {
        changedSlides: 1,
        totalChanges: 2
      }
    },
    topProblemSlides: [
      {
        slideIndex: 1,
        brandScore: 98,
        qualityLabel: "good",
        summaryLine: "Slide is mostly consistent with minor formatting drift.",
        keyIssues: [
          "Font family drift detected",
          "Font size drift detected"
        ]
      }
    ],
    cleanupOutcomeSummary: {
      changedSlides: 1,
      totalChanges: 2,
      appliedStages: [
        "fontFamilyFix",
        "fontSizeFix"
      ],
      remainingDrift: {
        fontDrift: 0,
        fontSizeDrift: 0,
        spacingDriftCount: 0,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 0,
        lineSpacingDriftCount: 0
      },
      summaryLine: "Cleanup applied successfully with no remaining detected drift."
    },
    recommendedActionSummary: {
      primaryAction: "review",
      actionReason: "Automatic cleanup resolved most detected drift.",
      focusAreas: [
        "font consistency",
        "font size consistency",
        "problem slides review"
      ]
    },
    issueCategorySummary: [
      {
        category: "font_consistency",
        detectedBefore: 1,
        fixed: 1,
        remaining: 0,
        status: "improved"
      },
      {
        category: "font_size_consistency",
        detectedBefore: 1,
        fixed: 1,
        remaining: 0,
        status: "improved"
      },
      {
        category: "paragraph_spacing",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      },
      {
        category: "bullet_indentation",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      },
      {
        category: "alignment",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      },
      {
        category: "line_spacing",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      }
    ],
    categoryReductionReportingSummary: {
      cleanCategories: [
        "paragraph_spacing",
        "bullet_indentation",
        "alignment",
        "line_spacing"
      ],
      resolvedCategories: [
        "font_consistency",
        "font_size_consistency"
      ],
      partiallyReducedCategories: [],
      unchangedCategories: [],
      deckBoundary: "eligibleCleanupBoundary",
      claimScope: "deckSpecificReductionOnly",
      closureClaimBlocked: true,
      runtimeReportOnlyLabelAvailable: false,
      summaryLine: "Category reduction reporting is limited to deck-specific reduction on the current eligible-cleanup boundary; it does not imply category closure."
    },
    complianceOrientedReportSummary: buildExpectedComplianceOrientedReportSummary({
      fontConsistency: { detectedBefore: 1, fixed: 1, remaining: 0, runtimeStatus: "resolved" },
      fontSizeConsistency: { detectedBefore: 1, fixed: 1, remaining: 0, runtimeStatus: "resolved" },
      paragraphSpacing: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      bulletIndentation: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      alignment: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      lineSpacing: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      deckBoundary: "eligibleCleanupBoundary",
      readinessLabel: "ready",
      manualReviewRequired: false,
      partiallyReducedCategoryCount: 0,
      unchangedCategoryCount: 0
    }),
    brandScoreImprovementSummary: {
      brandScoreBefore: 98,
      brandScoreAfter: 100,
      scoreDelta: 2,
      improvementLabel: "minor",
      summaryLine: "Cleanup produced a small brand consistency improvement."
    },
    remainingIssuesSummary: {
      remainingIssueCount: 0,
      remainingSeverityLabel: "none",
      topRemainingIssueCategories: [],
      summaryLine: "No remaining formatting issues were detected after cleanup."
    },
    deckReadinessSummary: {
      readinessLabel: "ready",
      readinessReason: "noRemainingIssues",
      summaryLine: "This deck appears ready after cleanup with no remaining formatting issues detected."
    },
    reportConsistencySummary: {
      consistencyLabel: "consistent",
      consistencyFlags: [],
      summaryLine: "Report outputs are internally consistent."
    },
    reportShapeParitySummary: buildExpectedReportShapeParitySummary(),
    pipelineFailureSummary: buildExpectedPipelineFailureSummary(),
    endToEndRunSummary: buildExpectedEndToEndRunSummary({
      runStatus: "success",
      outputStatus: "valid",
      reportStatus: "consistent",
      deckStatus: "ready"
    }),
    outputPackageValidation: {
      validationLabel: "valid",
      checks: {
        fileExists: true,
        nonEmptyFile: true,
        readableZip: true,
        hasContentTypes: true,
        hasRootRels: true,
        hasPresentationPart: true
      },
      summaryLine: "Output PPTX package validation passed."
    },
    outputFileMetadataSummary: buildExpectedOutputFileMetadataSummary(
      outputPath,
      outputStats.size
    ),
    inputFileLimitsSummary: buildExpectedInputFileLimitsSummary(
      inputPath,
      inputStats.size
    ),
    outputOverwriteSafetySummary: buildExpectedOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: true
    }),
    inputOutputPathRelationshipSummary: buildExpectedInputOutputPathRelationshipSummary({
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: false
    }),
    processingModeSummary: buildExpectedProcessingModeSummary("all"),
    reportCoverageSummary: buildExpectedReportCoverageSummary(),
    changesBySlide: [
      {
        slide: 1,
        slideFontUsage: {
          fontFamilyHistogram: {
            Calibri: 1
          },
          fontSizeHistogram: {
            24: 1
          }
        },
        slideQaSummary: {
          brandScore: 98,
          qualityLabel: "good",
          summaryLine: "Slide is mostly consistent with minor formatting drift.",
          keyIssues: [
            "Font family drift detected",
            "Font size drift detected"
          ]
        },
        fontFamilyChanges: 1,
        fontSizeChanges: 1,
        spacingChanges: 0,
        bulletChanges: 0,
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
    ],
    validation: {
      outputExists: true,
      isZip: true,
      coreEntriesPresent: true,
      reloadable: true,
      slideCountMatches: true
    },
    verification: {
      inputSlideCount: 2,
      outputSlideCount: 2,
      fontDriftBefore: 1,
      fontDriftAfter: 0,
      fontSizeDriftBefore: 1,
      fontSizeDriftAfter: 0,
      spacingDriftBefore: 0,
      spacingDriftAfter: 0,
      bulletIndentDriftBefore: 0,
      bulletIndentDriftAfter: 0,
      alignmentDriftBefore: 0,
      alignmentDriftAfter: 0,
      lineSpacingDriftBefore: 0,
      lineSpacingDriftAfter: 0
    }
  });

  const outputAudit = analyzeSlides(await loadPresentation(outputPath));
  assert.deepEqual(outputAudit.fontDrift, {
    dominantFont: "Calibri",
    driftRuns: []
  });
  assert.deepEqual(outputAudit.fontSizeDrift, {
    dominantSizePt: 24,
    driftRuns: []
  });
});

test("handles single-fix scenarios deterministically", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "Change font only", fontFamily: "Arial", fontSize: 2400 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "single-fix.pptx");

  const report = await runAllFixes(inputPath, outputPath);
  const inputStats = await stat(inputPath);
  const outputStats = await stat(outputPath);

  assert.deepEqual(report.steps, [
    {
      name: "fontFamilyFix",
      changedRuns: 1
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
    fontFamilyChanges: 1,
    fontSizeChanges: 0,
    spacingChanges: 0,
    bulletChanges: 0,
    alignmentChanges: 0,
    lineSpacingChanges: 0,
    dominantBodyStyleChanges: 0,
    dominantFontFamilyChanges: 0,
    dominantFontSizeChanges: 0
  });
  assert.deepEqual(report.deckFontUsage, {
    fontFamilyHistogram: {},
    fontSizeHistogram: {
      24: 1
    },
    dominantFontFamilyCoverage: 0,
    dominantFontSizeCoverage: 100
  });
  assert.deepEqual(report.deckStyleFingerprint, {
    fontFamily: null,
    fontSize: 24,
    alignment: null,
    lineSpacing: null,
    spacingBefore: null,
    spacingAfter: null
  });
  assert.equal(report.fontDriftSeverity, "low");
  assert.deepEqual(report.deckQaSummary, {
    brandScore: 99,
    qualityLabel: "good",
    summaryLine: "Deck is mostly consistent with minor formatting drift.",
    keyIssues: [
      "Font family drift detected"
    ],
    fixImpact: {
      changedSlides: 1,
      totalChanges: 1
    }
  });
  assert.deepEqual(report.topProblemSlides, [
    {
      slideIndex: 1,
      brandScore: 99,
      qualityLabel: "good",
      summaryLine: "Slide is mostly consistent with minor formatting drift.",
      keyIssues: [
        "Font family drift detected"
      ]
    }
  ]);
  assert.deepEqual(report.cleanupOutcomeSummary, {
    changedSlides: 1,
    totalChanges: 1,
    appliedStages: [
      "fontFamilyFix"
    ],
    remainingDrift: {
      fontDrift: 0,
      fontSizeDrift: 0,
      spacingDriftCount: 0,
      bulletIndentDriftCount: 0,
      alignmentDriftCount: 0,
      lineSpacingDriftCount: 0
    },
    summaryLine: "Cleanup applied successfully with no remaining detected drift."
  });
  assert.deepEqual(report.recommendedActionSummary, {
    primaryAction: "review",
    actionReason: "Automatic cleanup resolved most detected drift.",
    focusAreas: [
      "font consistency",
      "problem slides review"
    ]
  });
  assert.deepEqual(report.issueCategorySummary, [
    {
      category: "font_consistency",
      detectedBefore: 1,
      fixed: 1,
      remaining: 0,
      status: "improved"
    },
    {
      category: "font_size_consistency",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "paragraph_spacing",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "bullet_indentation",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "alignment",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    },
    {
      category: "line_spacing",
      detectedBefore: 0,
      fixed: 0,
      remaining: 0,
      status: "clean"
    }
  ]);
  assert.deepEqual(report.brandScoreImprovementSummary, {
    brandScoreBefore: 99,
    brandScoreAfter: 100,
    scoreDelta: 1,
    improvementLabel: "minor",
    summaryLine: "Cleanup produced a small brand consistency improvement."
  });
  assert.deepEqual(report.complianceOrientedReportSummary, buildExpectedComplianceOrientedReportSummary({
    fontConsistency: { detectedBefore: 1, fixed: 1, remaining: 0, runtimeStatus: "resolved" },
    fontSizeConsistency: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
    paragraphSpacing: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
    bulletIndentation: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
    alignment: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
    lineSpacing: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
    deckBoundary: "eligibleCleanupBoundary",
    readinessLabel: "ready",
    manualReviewRequired: false,
    partiallyReducedCategoryCount: 0,
    unchangedCategoryCount: 0
  }));
  assert.deepEqual(report.remainingIssuesSummary, {
    remainingIssueCount: 0,
    remainingSeverityLabel: "none",
    topRemainingIssueCategories: [],
    summaryLine: "No remaining formatting issues were detected after cleanup."
  });
  assert.deepEqual(report.deckReadinessSummary, {
    readinessLabel: "ready",
    readinessReason: "noRemainingIssues",
    summaryLine: "This deck appears ready after cleanup with no remaining formatting issues detected."
  });
  assert.deepEqual(report.reportConsistencySummary, {
    consistencyLabel: "consistent",
    consistencyFlags: [],
    summaryLine: "Report outputs are internally consistent."
  });
  assert.deepEqual(
    report.reportShapeParitySummary,
    buildExpectedReportShapeParitySummary()
  );
  assert.deepEqual(
    report.pipelineFailureSummary,
    buildExpectedPipelineFailureSummary()
  );
  assert.deepEqual(
    report.endToEndRunSummary,
    buildExpectedEndToEndRunSummary({
      runStatus: "success",
      outputStatus: "valid",
      reportStatus: "consistent",
      deckStatus: "ready"
    })
  );
  assert.deepEqual(report.outputPackageValidation, {
    validationLabel: "valid",
    checks: {
      fileExists: true,
      nonEmptyFile: true,
      readableZip: true,
      hasContentTypes: true,
      hasRootRels: true,
      hasPresentationPart: true
    },
    summaryLine: "Output PPTX package validation passed."
  });
  assert.deepEqual(
    report.outputFileMetadataSummary,
    buildExpectedOutputFileMetadataSummary(outputPath, outputStats.size)
  );
  assert.deepEqual(
    report.inputFileLimitsSummary,
    buildExpectedInputFileLimitsSummary(inputPath, inputStats.size)
  );
  assert.deepEqual(
    report.outputOverwriteSafetySummary,
    buildExpectedOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: true
    })
  );
  assert.deepEqual(
    report.inputOutputPathRelationshipSummary,
    buildExpectedInputOutputPathRelationshipSummary({
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: false
    })
  );
  assert.deepEqual(
    report.processingModeSummary,
    buildExpectedProcessingModeSummary("all")
  );
  assert.deepEqual(
    report.reportCoverageSummary,
    buildExpectedReportCoverageSummary()
  );
  assert.deepEqual(report.changesBySlide, [
    {
      slide: 1,
      slideFontUsage: {
        fontFamilyHistogram: {},
        fontSizeHistogram: {
          24: 1
        }
      },
      slideQaSummary: {
        brandScore: 99,
        qualityLabel: "good",
        summaryLine: "Slide is mostly consistent with minor formatting drift.",
        keyIssues: [
          "Font family drift detected"
        ]
      },
      fontFamilyChanges: 1,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
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
  assert.equal(report.noOp, false);
  assert.equal(report.validation.reloadable, true);
  assert.equal(report.validation.slideCountMatches, true);
  assert.deepEqual(report.verification, {
    inputSlideCount: 1,
    outputSlideCount: 1,
    fontDriftBefore: 1,
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
});

test("creates a no-op copy when no safe fixes exist", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "No explicit font", fontSize: 1800 },
            { text: "No explicit size", fontFamily: "Calibri" }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "no-op-combined.pptx");

  const report = await runAllFixes(inputPath, outputPath);
  const inputStats = await stat(inputPath);
  const outputStats = await stat(outputPath);

  assert.deepEqual(report, {
    applied: false,
    noOp: true,
    steps: [
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
    ],
    totals: {
      fontFamilyChanges: 0,
      fontSizeChanges: 0,
      spacingChanges: 0,
      bulletChanges: 0,
      alignmentChanges: 0,
      lineSpacingChanges: 0,
      dominantBodyStyleChanges: 0,
      dominantFontFamilyChanges: 0,
      dominantFontSizeChanges: 0
    },
    deckFontUsage: {
      fontFamilyHistogram: {},
      fontSizeHistogram: {},
      dominantFontFamilyCoverage: 0,
      dominantFontSizeCoverage: 0
    },
    deckStyleFingerprint: {
      fontFamily: null,
      fontSize: null,
      alignment: null,
      lineSpacing: null,
      spacingBefore: null,
      spacingAfter: null
    },
    fontDriftSeverity: "low",
    deckQaSummary: {
      brandScore: 100,
      qualityLabel: "good",
      summaryLine: "Deck is mostly consistent with minor formatting drift.",
      keyIssues: [],
      fixImpact: {
        changedSlides: 0,
        totalChanges: 0
      }
    },
    topProblemSlides: [],
    cleanupOutcomeSummary: {
      changedSlides: 0,
      totalChanges: 0,
      appliedStages: [],
      remainingDrift: {
        fontDrift: 0,
        fontSizeDrift: 0,
        spacingDriftCount: 0,
        bulletIndentDriftCount: 0,
        alignmentDriftCount: 0,
        lineSpacingDriftCount: 0
      },
      summaryLine: "No cleanup changes were applied."
    },
    recommendedActionSummary: {
      primaryAction: "none",
      actionReason: "No significant formatting issues remain.",
      focusAreas: []
    },
    issueCategorySummary: [
      {
        category: "font_consistency",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      },
      {
        category: "font_size_consistency",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      },
      {
        category: "paragraph_spacing",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      },
      {
        category: "bullet_indentation",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      },
      {
        category: "alignment",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      },
      {
        category: "line_spacing",
        detectedBefore: 0,
        fixed: 0,
        remaining: 0,
        status: "clean"
      }
    ],
    categoryReductionReportingSummary: {
      cleanCategories: [
        "font_consistency",
        "font_size_consistency",
        "paragraph_spacing",
        "bullet_indentation",
        "alignment",
        "line_spacing"
      ],
      resolvedCategories: [],
      partiallyReducedCategories: [],
      unchangedCategories: [],
      deckBoundary: "eligibleCleanupBoundary",
      claimScope: "deckSpecificReductionOnly",
      closureClaimBlocked: true,
      runtimeReportOnlyLabelAvailable: false,
      summaryLine: "Category reduction reporting is limited to deck-specific reduction on the current eligible-cleanup boundary; it does not imply category closure."
    },
    complianceOrientedReportSummary: buildExpectedComplianceOrientedReportSummary({
      fontConsistency: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      fontSizeConsistency: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      paragraphSpacing: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      bulletIndentation: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      alignment: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      lineSpacing: { detectedBefore: 0, fixed: 0, remaining: 0, runtimeStatus: "clean" },
      deckBoundary: "eligibleCleanupBoundary",
      readinessLabel: "ready",
      manualReviewRequired: false,
      partiallyReducedCategoryCount: 0,
      unchangedCategoryCount: 0
    }),
    brandScoreImprovementSummary: {
      brandScoreBefore: 100,
      brandScoreAfter: 100,
      scoreDelta: 0,
      improvementLabel: "none",
      summaryLine: "Cleanup did not improve the overall brand score."
    },
    remainingIssuesSummary: {
      remainingIssueCount: 0,
      remainingSeverityLabel: "none",
      topRemainingIssueCategories: [],
      summaryLine: "No remaining formatting issues were detected after cleanup."
    },
    deckReadinessSummary: {
      readinessLabel: "ready",
      readinessReason: "noRemainingIssues",
      summaryLine: "This deck appears ready after cleanup with no remaining formatting issues detected."
    },
    reportConsistencySummary: {
      consistencyLabel: "minorMismatch",
      consistencyFlags: [
        "readinessWithoutImprovement"
      ],
      summaryLine: "Report outputs are mostly consistent, with one detected mismatch."
    },
    reportShapeParitySummary: buildExpectedReportShapeParitySummary(),
    pipelineFailureSummary: buildExpectedDegradedPipelineFailureSummary(),
    endToEndRunSummary: buildExpectedEndToEndRunSummary({
      runStatus: "warning",
      outputStatus: "valid",
      reportStatus: "inconsistent",
      deckStatus: "ready"
    }),
    outputPackageValidation: {
      validationLabel: "valid",
      checks: {
        fileExists: true,
        nonEmptyFile: true,
        readableZip: true,
        hasContentTypes: true,
        hasRootRels: true,
        hasPresentationPart: true
      },
      summaryLine: "Output PPTX package validation passed."
    },
    outputFileMetadataSummary: buildExpectedOutputFileMetadataSummary(
      outputPath,
      outputStats.size
    ),
    inputFileLimitsSummary: buildExpectedInputFileLimitsSummary(
      inputPath,
      inputStats.size
    ),
    outputOverwriteSafetySummary: buildExpectedOutputOverwriteSafetySummary({
      outputExistedBeforeWrite: false,
      outputPresentAfterWrite: true
    }),
    inputOutputPathRelationshipSummary: buildExpectedInputOutputPathRelationshipSummary({
      inputPathAvailable: true,
      outputPathAvailable: true,
      samePath: false
    }),
    processingModeSummary: buildExpectedProcessingModeSummary("all"),
    reportCoverageSummary: buildExpectedReportCoverageSummary(),
    changesBySlide: [],
    validation: {
      outputExists: true,
      isZip: true,
      coreEntriesPresent: true,
      reloadable: true,
      slideCountMatches: true
    },
    verification: {
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
    }
  });
  assert.deepEqual(await readFile(outputPath), await readFile(inputPath));
});

test("CLI reports both steps and output remains a valid pptx", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Title", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }),
        buildShapeXml({
          id: 3,
          name: "Body 1",
          runs: [
            { text: "Change both", fontFamily: "Arial", fontSize: 1800 },
            { text: "Stable", fontFamily: "Calibri", fontSize: 2400 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "cli-combined-fixed.pptx");

  const result = await runNodeProcess([fixAllCliEntry, inputPath, outputPath], path.dirname(inputPath));

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Running PPTX Fixer/);
  assert.match(result.stdout, /Font family fixes applied: 1/);
  assert.match(result.stdout, /Font size fixes applied: 1/);
  assert.match(result.stdout, /Paragraph spacing fixes applied: 0/);
  assert.match(result.stdout, /Bullet formatting fixes applied: 0/);
  assert.match(result.stdout, /Alignment fixes applied: 0/);
  assert.match(result.stdout, /Line spacing fixes applied: 0/);
  assert.match(result.stdout, /Dominant body style fixes applied: 0/);
  assert.match(result.stdout, /Dominant body font-family fixes applied: 0/);
  assert.match(result.stdout, /Dominant body font-size fixes applied: 0/);
  assert.match(result.stdout, /Dominant body style groups: eligible 0, touched 0, skipped 0/);
  assert.match(result.stdout, /Changed slides: 1/);
  assert.match(result.stdout, /Output validation: passed/);
  assert.match(result.stdout, /Font drift: 1 -> 0/);
  assert.match(result.stdout, /Font size drift: 1 -> 0/);
  assert.match(result.stdout, /Spacing drift: 0 -> 0/);
  assert.match(result.stdout, /Bullet drift: 0 -> 0/);
  assert.match(result.stdout, /Alignment drift: 0 -> 0/);
  assert.match(result.stdout, /Line spacing drift: 0 -> 0/);
  assert.match(result.stdout, /Cleanup outcome: Cleanup applied successfully with no remaining detected drift\./);
  assert.match(result.stdout, /Recommended action: review - Automatic cleanup resolved most detected drift\./);
  assert.match(result.stdout, /Brand score: 98 -> 100 \(minor\)/);
  assert.match(result.stdout, /Remaining issues: No remaining formatting issues were detected after cleanup\./);
  assert.match(result.stdout, /Deck readiness: This deck appears ready after cleanup with no remaining formatting issues detected\./);
  assert.match(result.stdout, /Report consistency: Report outputs are internally consistent\./);
  assert.match(result.stdout, /Pipeline outcome: Pipeline completed successfully and produced a validated output package\./);
  assert.match(result.stdout, /Package validation: Output PPTX package validation passed\./);
  assert.match(result.stdout, /Output file metadata: Output file metadata captured successfully\./);
  assert.match(result.stdout, /Output written to/);

  const auditReport = analyzeSlides(await loadPresentation(outputPath));
  assert.equal(auditReport.slideCount, 1);
});

test("preserves slide text content across the full cleanup pipeline", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Title 1",
          placeholderType: "title",
          runs: [
            { text: "Quarterly Review", fontFamily: "Calibri", fontSize: 2400 }
          ]
        }),
        buildComplexTextShapeXml()
      ],
      [
        buildShapeXml({
          id: 2,
          name: "Body 2",
          runs: [
            { text: "Appendix", fontFamily: "Calibri", fontSize: 2400 },
            { text: "Details", fontFamily: "Arial", fontSize: 1800 }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "text-fidelity-fixed.pptx");

  await runAllFixes(inputPath, outputPath);

  assert.deepEqual(
    await extractAllSlideTextTokens(inputPath),
    await extractAllSlideTextTokens(outputPath)
  );
});

test("reports explicit no-op status in CLI output", async () => {
  const inputPath = await createFixturePptx({
    slides: [
      [
        buildShapeXml({
          id: 2,
          name: "Body 1",
          runs: [
            { text: "No explicit font", fontSize: 1800 },
            { text: "No explicit size", fontFamily: "Calibri" }
          ]
        })
      ]
    ]
  });
  const outputPath = path.join(path.dirname(inputPath), "cli-no-op-combined.pptx");

  const result = await runNodeProcess([fixAllCliEntry, inputPath, outputPath], path.dirname(inputPath));

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Changed slides: 0/);
  assert.match(result.stdout, /No safe changes applied/);
  assert.match(result.stdout, /Cleanup outcome: No cleanup changes were applied\./);
  assert.match(result.stdout, /Recommended action: none - No significant formatting issues remain\./);
  assert.match(result.stdout, /Brand score: 100 -> 100 \(none\)/);
  assert.match(result.stdout, /Remaining issues: No remaining formatting issues were detected after cleanup\./);
  assert.match(result.stdout, /Deck readiness: This deck appears ready after cleanup with no remaining formatting issues detected\./);
  assert.match(result.stdout, /Report consistency: Report outputs are mostly consistent, with one detected mismatch\./);
  assert.match(result.stdout, /Pipeline outcome: Pipeline completed and produced an output file, but report consistency concerns were detected\./);
  assert.match(result.stdout, /Package validation: Output PPTX package validation passed\./);
  assert.match(result.stdout, /Output file metadata: Output file metadata captured successfully\./);
});

async function createFixturePptx(options: { slides: string[][] }): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "pptx-fixer-run-all-fixture-"));
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
  runs: Array<{
    text: string;
    fontSize?: number;
    fontFamily?: string;
  }>;
  placeholderType?: string;
}): string {
  const placeholder = options.placeholderType
    ? `<p:ph type="${options.placeholderType}"/>`
    : "";
  const runs = options.runs
    .map((run) => {
      const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
      const latinNode = run.fontFamily
        ? `<a:latin typeface="${run.fontFamily}"/>`
        : "";
      return `<a:r>
        <a:rPr${sizeAttribute}>
          ${latinNode}
        </a:rPr>
        <a:t>${run.text}</a:t>
      </a:r>`;
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
    <a:p>
      ${runs}
    </a:p>
  </p:txBody>
</p:sp>`;
}

function buildComplexTextShapeXml(): string {
  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="3" name="Body Complex"/>
    <p:cNvSpPr/>
    <p:nvPr></p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:r>
        <a:rPr sz="1800">
          <a:latin typeface="Arial"/>
        </a:rPr>
        <a:t xml:space="preserve"> Leading text</a:t>
      </a:r>
      <a:br/>
      <a:fld id="{00000000-0000-0000-0000-000000000000}" type="slidenum">
        <a:rPr lang="en-US"/>
        <a:t>8</a:t>
      </a:fld>
      <a:r>
        <a:rPr sz="2400">
          <a:latin typeface="Calibri"/>
        </a:rPr>
        <a:t>Trailing text</a:t>
      </a:r>
      <a:endParaRPr lang="en-US"/>
    </a:p>
  </p:txBody>
</p:sp>`;
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

function buildExpectedOutputFileMetadataSummary(outputPath: string, outputFileSizeBytes: number) {
  return {
    outputFileName: path.basename(outputPath),
    outputExtension: path.extname(outputPath).toLowerCase(),
    outputFileSizeBytes,
    outputFilePresent: true,
    summaryLine: "Output file metadata captured successfully."
  };
}

function buildExpectedInputFileLimitsSummary(inputPath: string, inputFileSizeBytes: number) {
  void inputPath;
  return {
    inputFilePresent: true,
    inputFileSizeBytes,
    sizeLimitBytes: 52428800,
    warningThresholdBytes: 41943040,
    limitsLabel: "withinLimit",
    summaryLine: "Input file size is within the configured basic limit."
  };
}

function buildExpectedOutputOverwriteSafetySummary(options: {
  outputExistedBeforeWrite: boolean | null;
  outputPresentAfterWrite: boolean;
}) {
  const overwriteSafetyLabel = options.outputPresentAfterWrite === false
    ? "missingOutput"
    : options.outputExistedBeforeWrite === true
    ? "overwroteExistingFile"
    : options.outputExistedBeforeWrite === false
    ? "newFile"
    : "unknown";

  return {
    overwriteSafetyLabel,
    outputExistedBeforeWrite: options.outputExistedBeforeWrite,
    outputPresentAfterWrite: options.outputPresentAfterWrite,
    summaryLine: overwriteSafetyLabel === "missingOutput"
      ? "Output overwrite status could not be determined because the output file is missing."
      : overwriteSafetyLabel === "overwroteExistingFile"
      ? "Output file path existed before write and was overwritten."
      : overwriteSafetyLabel === "newFile"
      ? "Output file path did not exist before write and a new file was produced."
      : "Output overwrite status could not be determined from the available machine-readable signals."
  };
}

function buildExpectedInputOutputPathRelationshipSummary(options: {
  inputPathAvailable: boolean;
  outputPathAvailable: boolean;
  samePath: boolean | null;
}) {
  const pathRelationshipLabel = options.inputPathAvailable === false || options.outputPathAvailable === false
    ? "unknown"
    : options.samePath
    ? "samePath"
    : "differentPath";

  return {
    pathRelationshipLabel,
    inputPathAvailable: options.inputPathAvailable,
    outputPathAvailable: options.outputPathAvailable,
    samePath: options.inputPathAvailable === false || options.outputPathAvailable === false
      ? null
      : options.samePath,
    summaryLine: pathRelationshipLabel === "samePath"
      ? "Input and output paths resolve to the same file path."
      : pathRelationshipLabel === "differentPath"
      ? "Input and output paths resolve to different file paths."
      : "Input and output path relationship could not be determined from the available machine-readable signals."
  };
}

function buildExpectedProcessingModeSummary(processingModeLabel: "all" | "fix" | "audit" | "unknown") {
  return {
    processingModeLabel,
    processingModeAvailable: processingModeLabel !== "unknown",
    summaryLine: processingModeLabel === "all"
      ? "Processing mode was captured as full pipeline mode."
      : processingModeLabel === "fix"
      ? "Processing mode was captured as fix mode."
      : processingModeLabel === "audit"
      ? "Processing mode was captured as audit mode."
      : "Processing mode could not be determined from the available machine-readable signals."
  };
}

function buildExpectedReportCoverageSummary() {
  return {
    expectedFieldCount: 20,
    presentFieldCount: 20,
    missingFieldCount: 0,
    coverageLabel: "complete",
    missingFields: [],
    summaryLine: "Report coverage is complete for the expected summary field set."
  };
}

function buildExpectedComplianceOrientedReportSummary(options: {
  fontConsistency: { detectedBefore: number; fixed: number; remaining: number; runtimeStatus: "clean" | "resolved" | "partiallyReduced" | "unchanged" };
  fontSizeConsistency: { detectedBefore: number; fixed: number; remaining: number; runtimeStatus: "clean" | "resolved" | "partiallyReduced" | "unchanged" };
  paragraphSpacing: { detectedBefore: number; fixed: number; remaining: number; runtimeStatus: "clean" | "resolved" | "partiallyReduced" | "unchanged" };
  bulletIndentation: { detectedBefore: number; fixed: number; remaining: number; runtimeStatus: "clean" | "resolved" | "partiallyReduced" | "unchanged" };
  alignment: { detectedBefore: number; fixed: number; remaining: number; runtimeStatus: "clean" | "resolved" | "partiallyReduced" | "unchanged" };
  lineSpacing: { detectedBefore: number; fixed: number; remaining: number; runtimeStatus: "clean" | "resolved" | "partiallyReduced" | "unchanged" };
  deckBoundary: "eligibleCleanupBoundary" | "manualReviewBoundary";
  readinessLabel: "ready" | "mostlyReady" | "manualReviewRecommended";
  manualReviewRequired: boolean;
  partiallyReducedCategoryCount: number;
  unchangedCategoryCount: number;
}) {
  return {
    claimScope: "taxonomyTranslationFromCurrentRuntimeEvidenceOnly",
    hostileEvidenceConstraint: "partialHostileEvidenceOnly",
    fullBrandSystemComplianceScoringAvailable: false,
    runtimeEvidencedGroups: [
      {
        taxonomyCategory: "textStyleConsistencyDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "fontFamilyDrift",
            sourceIssueCategories: ["font_consistency"],
            implementationCoverage: "directCurrentRuntimeSignal",
            ...options.fontConsistency
          },
          {
            taxonomySubcategory: "fontSizeDrift",
            sourceIssueCategories: ["font_size_consistency"],
            implementationCoverage: "directCurrentRuntimeSignal",
            ...options.fontSizeConsistency
          }
        ]
      },
      {
        taxonomyCategory: "textBlockStructureDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "paragraphAlignmentDrift",
            sourceIssueCategories: ["alignment"],
            implementationCoverage: "directCurrentRuntimeSignal",
            ...options.alignment
          },
          {
            taxonomySubcategory: "bulletListMarkerAndIndentDrift",
            sourceIssueCategories: ["bullet_indentation"],
            implementationCoverage: "combinedCurrentRuntimeSignal",
            ...options.bulletIndentation
          }
        ]
      },
      {
        taxonomyCategory: "rhythmAndSpacingDrift",
        truthState: "currentlyRuntimeEvidenced",
        signals: [
          {
            taxonomySubcategory: "lineSpacingDrift",
            sourceIssueCategories: ["line_spacing"],
            implementationCoverage: "directCurrentRuntimeSignal",
            ...options.lineSpacing
          },
          {
            taxonomySubcategory: "paragraphSpacingDrift",
            sourceIssueCategories: ["paragraph_spacing"],
            implementationCoverage: "directCurrentRuntimeSignal",
            ...options.paragraphSpacing
          }
        ]
      }
    ],
    boundaryEvidencedGroups: [
      {
        taxonomyCategory: "templateAndSemanticStructureDrift",
        truthState: "currentlyBoundaryEvidencedOnly",
        signals: [
          { taxonomySubcategory: "placeholderMisuse", runtimeImplemented: false, signalStatus: "boundaryOnly" },
          { taxonomySubcategory: "masterLayoutDeviation", runtimeImplemented: false, signalStatus: "boundaryOnly" },
          { taxonomySubcategory: "groupedShapeStructureRisk", runtimeImplemented: false, signalStatus: "boundaryOnly" },
          { taxonomySubcategory: "fieldNodeSensitiveStructure", runtimeImplemented: false, signalStatus: "boundaryOnly" }
        ]
      },
      {
        taxonomyCategory: "boundaryAndSafetyClassification",
        truthState: "currentlyBoundaryEvidencedOnly",
        signals: [
          {
            taxonomySubcategory: "eligibleCleanupBoundary",
            runtimeImplemented: true,
            signalStatus: options.deckBoundary === "eligibleCleanupBoundary" ? "activeBoundary" : "notTriggered"
          },
          {
            taxonomySubcategory: "manualReviewBoundary",
            runtimeImplemented: true,
            signalStatus: options.deckBoundary === "manualReviewBoundary" ? "activeBoundary" : "notTriggered"
          },
          {
            taxonomySubcategory: "reportOnlyIneligibleBoundary",
            runtimeImplemented: false,
            signalStatus: "runtimeLabelUnavailable"
          }
        ]
      }
    ],
    futureTaxonomyGroups: [
      {
        taxonomyCategory: "brandSystemComplianceDrift",
        truthState: "futureTaxonomyOnly",
        signals: [
          { taxonomySubcategory: "approvedTypographyCompliance", runtimeImplemented: false, signalStatus: "futureOnly" },
          { taxonomySubcategory: "spacingSystemCompliance", runtimeImplemented: false, signalStatus: "futureOnly" },
          { taxonomySubcategory: "hierarchyCompliance", runtimeImplemented: false, signalStatus: "futureOnly" },
          { taxonomySubcategory: "templateConformance", runtimeImplemented: false, signalStatus: "futureOnly" }
        ]
      }
    ],
    deckGovernanceView: {
      deckBoundary: options.deckBoundary,
      readinessLabel: options.readinessLabel,
      manualReviewRequired: options.manualReviewRequired,
      partiallyReducedCategoryCount: options.partiallyReducedCategoryCount,
      unchangedCategoryCount: options.unchangedCategoryCount
    },
    summaryLine: "Compliance-oriented reporting translates current runtime evidence into governance-friendly brand-drift signals without implying full brand-system compliance scoring."
  };
}

function buildExpectedReportShapeParitySummary() {
  return {
    parityLabel: "parityOk",
    cliHasAllRequiredFields: true,
    apiHasAllRequiredFields: true,
    missingInCli: [],
    missingInApi: [],
    summaryLine: "CLI and API report shapes are aligned for all required summary fields."
  };
}

function buildExpectedPipelineFailureSummary() {
  return {
    pipelineOutcomeLabel: "success",
    pipelineOutcomeReason: "outputValidated",
    summaryLine: "Pipeline completed successfully and produced a validated output package."
  };
}

function buildExpectedDegradedPipelineFailureSummary() {
  return {
    pipelineOutcomeLabel: "degradedSuccess",
    pipelineOutcomeReason: "outputProducedWithReportConcerns",
    summaryLine: "Pipeline completed and produced an output file, but report consistency concerns were detected."
  };
}

function buildExpectedEndToEndRunSummary(options: {
  runStatus: "success" | "warning" | "failure";
  outputStatus: "valid" | "invalid";
  reportStatus: "consistent" | "inconsistent";
  deckStatus: "ready" | "mostlyReady" | "needsReview";
}) {
  return {
    ...options,
    summaryLine: options.runStatus === "success"
      ? "Pipeline run completed successfully with a valid output and consistent report."
      : options.runStatus === "warning"
      ? "Pipeline run completed with warnings; review output and report details."
      : "Pipeline run failed to produce a valid output."
  };
}
