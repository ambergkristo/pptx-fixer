import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  ["--test", "tests/corpusRegression.test.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PPTX_FIXER_EXTENDED_CORPUS: "1"
    }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
