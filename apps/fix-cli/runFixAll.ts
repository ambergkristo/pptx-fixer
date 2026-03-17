import { runAllFixes } from "../../packages/fix/runAllFixes.ts";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error("Usage: node runFixAll.js <input.pptx> <output.pptx>");
    process.exitCode = 1;
    return;
  }

  const report = await runAllFixes(inputPath, outputPath);
  const validationPassed = Object.values(report.validation).every(Boolean);
  const dominantBodyStyleEligibleGroups = report.changesBySlide.reduce(
    (total, slide) => total + slide.dominantBodyStyleEligibleGroups,
    0
  );
  const dominantBodyStyleTouchedGroups = report.changesBySlide.reduce(
    (total, slide) => total + slide.dominantBodyStyleTouchedGroups,
    0
  );
  const dominantBodyStyleSkippedGroups = report.changesBySlide.reduce(
    (total, slide) => total + slide.dominantBodyStyleSkippedGroups,
    0
  );

  console.log("Running PPTX Fixer");
  console.log("");
  console.log(`Font family fixes applied: ${report.totals.fontFamilyChanges}`);
  console.log(`Font size fixes applied: ${report.totals.fontSizeChanges}`);
  console.log(`Paragraph spacing fixes applied: ${report.totals.spacingChanges}`);
  console.log(`Bullet indentation fixes applied: ${report.totals.bulletChanges}`);
  console.log(`Alignment fixes applied: ${report.totals.alignmentChanges}`);
  console.log(`Line spacing fixes applied: ${report.totals.lineSpacingChanges}`);
  console.log(`Dominant body style fixes applied: ${report.totals.dominantBodyStyleChanges}`);
  console.log(`Dominant body font-family fixes applied: ${report.totals.dominantFontFamilyChanges}`);
  console.log(`Dominant body font-size fixes applied: ${report.totals.dominantFontSizeChanges}`);
  console.log(
    `Dominant body style groups: eligible ${dominantBodyStyleEligibleGroups}, touched ${dominantBodyStyleTouchedGroups}, skipped ${dominantBodyStyleSkippedGroups}`
  );
  console.log(`Changed slides: ${report.changesBySlide.length}`);
  if (report.noOp) {
    console.log("No safe changes applied");
  }
  console.log(
    `Output validation: ${validationPassed ? "passed" : "failed"}`
  );
  console.log(
    `Font drift: ${report.verification.fontDriftBefore} -> ${report.verification.fontDriftAfter ?? "n/a"}`
  );
  console.log(
    `Font size drift: ${report.verification.fontSizeDriftBefore} -> ${report.verification.fontSizeDriftAfter ?? "n/a"}`
  );
  console.log(
    `Spacing drift: ${report.verification.spacingDriftBefore} -> ${report.verification.spacingDriftAfter ?? "n/a"}`
  );
  console.log(
    `Bullet drift: ${report.verification.bulletIndentDriftBefore} -> ${report.verification.bulletIndentDriftAfter ?? "n/a"}`
  );
  console.log(
    `Alignment drift: ${report.verification.alignmentDriftBefore} -> ${report.verification.alignmentDriftAfter ?? "n/a"}`
  );
  console.log(
    `Line spacing drift: ${report.verification.lineSpacingDriftBefore} -> ${report.verification.lineSpacingDriftAfter ?? "n/a"}`
  );
  console.log(`Cleanup outcome: ${report.cleanupOutcomeSummary.summaryLine}`);
  console.log(
    `Recommended action: ${report.recommendedActionSummary.primaryAction} - ${report.recommendedActionSummary.actionReason}`
  );
  console.log(
    `Brand score: ${report.brandScoreImprovementSummary.brandScoreBefore} -> ${report.brandScoreImprovementSummary.brandScoreAfter} (${report.brandScoreImprovementSummary.improvementLabel})`
  );
  console.log(`Remaining issues: ${report.remainingIssuesSummary.summaryLine}`);
  console.log(`Deck readiness: ${report.deckReadinessSummary.summaryLine}`);
  console.log(`Report consistency: ${report.reportConsistencySummary.summaryLine}`);
  console.log(`Package validation: ${report.outputPackageValidation.summaryLine}`);
  console.log("");
  console.log(`Output written to ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
