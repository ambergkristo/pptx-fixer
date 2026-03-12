import { normalizeFontSizes } from "../../packages/fix/fontSizeFix.ts";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error("Usage: node runFontSizeFix.js <input.pptx> <output.pptx>");
    process.exitCode = 1;
    return;
  }

  const report = await normalizeFontSizes(inputPath, outputPath);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
