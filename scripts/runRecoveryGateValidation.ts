import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runRecoveryGateValidation } from "../packages/validation/recoveryGateValidation.ts";

async function main(): Promise<void> {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  execSync("node scripts/generateChaosDeck.ts", {
    cwd: repoRoot,
    stdio: "inherit"
  });
  execSync("node scripts/generateMixedHardBoundaryDeck.ts", {
    cwd: repoRoot,
    stdio: "inherit"
  });

  const artifactDirectory = path.join(repoRoot, ".tmp", "recovery_gate_validation");
  const report = await runRecoveryGateValidation(artifactDirectory);
  console.log(report.realOutputJudgment.summary);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
