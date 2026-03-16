import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repoRoot, "testdata", "corpus", "manifest.json");

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const tierCounts = countBy(manifest, "tier");
  const categoryCounts = countBy(manifest, "category");
  const producerCounts = countBy(manifest, "producer");
  const totalSlides = manifest.reduce((sum, entry) => sum + Number(entry.slideCount ?? 0), 0);

  console.log("Corpus summary");
  console.log("");

  for (const tier of orderedKeys(tierCounts, ["core", "extended"])) {
    console.log(`${tier}: ${tierCounts[tier]} decks`);
  }

  console.log("");
  console.log("categories:");
  for (const category of orderedKeys(categoryCounts)) {
    console.log(`${category}: ${categoryCounts[category]}`);
  }

  console.log("");
  console.log("producers:");
  for (const producer of orderedKeys(producerCounts)) {
    console.log(`${producer}: ${producerCounts[producer]}`);
  }

  console.log("");
  console.log(`total slides: ${totalSlides}`);
}

function countBy(entries, field) {
  return entries.reduce((counts, entry) => {
    const key = entry[field];
    if (typeof key !== "string" || key.length === 0) {
      return counts;
    }

    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function orderedKeys(counts, preferredOrder = []) {
  const preferred = preferredOrder.filter((key) => key in counts);
  const remainder = Object.keys(counts)
    .filter((key) => !preferred.includes(key))
    .sort((left, right) => left.localeCompare(right));

  return [...preferred, ...remainder];
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
