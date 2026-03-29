import path from "node:path";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  renderProductImprovementMarkdown,
  runMasterAcceptanceValidation
} from "../packages/validation/masterAcceptanceValidation.ts";
import {
  resolveMasterAcceptanceDeckPath,
  resolveRepoRoot
} from "../packages/validation/masterAcceptance.ts";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = resolveRepoRoot();
const artifactDirectory = path.join(repoRoot, ".tmp", "master_acceptance_validation");

async function main(): Promise<void> {
  await mkdir(artifactDirectory, { recursive: true });

  const masterDeckPath = await resolveMasterAcceptanceDeckPath();
  try {
    await access(masterDeckPath, constants.F_OK);
  } catch {
    throw new Error(
      `Master acceptance deck is missing at ${masterDeckPath}. Run node scripts/generateMasterAcceptanceDeck.ts first.`
    );
  }

  const revisionLabel = await readRevisionLabel();
  const report = await runMasterAcceptanceValidation(artifactDirectory);

  console.log("MASTER ACCEPTANCE VALIDATION");
  console.log(`Revision: ${revisionLabel}`);
  console.log(`Master deck: ${masterDeckPath}`);
  console.log(`Artifacts: ${artifactDirectory}`);
  console.log("");
  console.log(renderProductImprovementMarkdown(report, revisionLabel));
}

async function readRevisionLabel(): Promise<string> {
  try {
    const { stdout: gitSha } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "--short", "HEAD"]);
    const { stdout: gitStatus } = await execFileAsync("git", ["-C", repoRoot, "status", "--short"]);
    return gitStatus.trim().length > 0
      ? `${gitSha.trim()} (dirty)`
      : gitSha.trim();
  } catch {
    return "unknown";
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
