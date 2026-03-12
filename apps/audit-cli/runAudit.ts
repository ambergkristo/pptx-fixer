import { writeFile } from "node:fs/promises";
import path from "node:path";

import { analyzeSlides, loadPresentation } from "../../packages/audit/pptxAudit.ts";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node runAudit.js <presentation.pptx>");
    process.exitCode = 1;
    return;
  }

  const presentation = await loadPresentation(inputPath);
  const report = analyzeSlides(presentation);
  const outputPath = path.resolve("audit-report.json");

  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Audit report for ${presentation.sourcePath}`);
  console.log(`Slides: ${report.slideCount}`);
  for (const slide of report.slides) {
    const title = slide.title ?? "(no title)";
    console.log(`- Slide ${slide.index}: ${title} | text boxes: ${slide.textBoxCount}`);
  }

  console.log("Fonts detected:");
  if (report.fontsUsed.length === 0) {
    console.log("- none");
  } else {
    for (const font of report.fontsUsed) {
      console.log(`- ${font.fontFamily} (${font.usageCount} uses)`);
    }
  }

  console.log("Font sizes detected:");
  if (report.fontSizesUsed.length === 0) {
    console.log("- none");
  } else {
    for (const size of report.fontSizesUsed) {
      console.log(`- ${size.sizePt}pt (${size.usageCount} uses)`);
    }
  }

  const dominantFont = report.fontDrift.dominantFont ?? "(none)";
  console.log(`Dominant font: ${dominantFont}`);
  if (report.fontDrift.driftRuns.length === 0) {
    console.log("Font drift: none");
  } else {
    console.log("Slides with font drift:");
    for (const driftRun of report.fontDrift.driftRuns) {
      console.log(`- Slide ${driftRun.slide}: ${driftRun.fontFamily} (${driftRun.count} runs)`);
    }
  }

  const dominantFontSize = report.fontSizeDrift.dominantSizePt === null
    ? "(none)"
    : `${report.fontSizeDrift.dominantSizePt}pt`;
  console.log(`Dominant font size: ${dominantFontSize}`);
  if (report.fontSizeDrift.driftRuns.length === 0) {
    console.log("Font size drift: none");
  } else {
    console.log("Slides with size drift:");
    for (const driftRun of report.fontSizeDrift.driftRuns) {
      console.log(`- Slide ${driftRun.slide}: ${driftRun.sizePt}pt (${driftRun.count} runs)`);
    }
  }

  console.log(`JSON report written to ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
