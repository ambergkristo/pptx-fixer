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

  console.log("Running PPTX Fixer");
  console.log("");
  console.log(`Font family fixes applied: ${report.totals.fontFamilyChanges}`);
  console.log(`Font size fixes applied: ${report.totals.fontSizeChanges}`);
  console.log(`Paragraph spacing fixes applied: ${report.totals.spacingChanges}`);
  console.log(`Bullet indentation fixes applied: ${report.totals.bulletChanges}`);
  console.log(`Alignment fixes applied: ${report.totals.alignmentChanges}`);
  console.log(`Line spacing fixes applied: ${report.totals.lineSpacingChanges}`);
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
  console.log("");
  console.log(`Output written to ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
