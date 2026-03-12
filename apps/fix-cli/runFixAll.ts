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
  const fontFamilyStep = report.steps.find((step) => step.name === "fontFamilyFix");
  const fontSizeStep = report.steps.find((step) => step.name === "fontSizeFix");

  console.log("Running PPTX Fixer");
  console.log("");
  console.log(`Font family fixes applied: ${fontFamilyStep?.changedRuns ?? 0}`);
  console.log(`Font size fixes applied: ${fontSizeStep?.changedRuns ?? 0}`);
  console.log("");
  console.log(`Output written to ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
