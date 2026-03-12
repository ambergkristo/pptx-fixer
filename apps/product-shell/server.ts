import path from "node:path";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";

import express from "express";

import { createAuditRoute } from "./routes/auditRoute.ts";
import { createFixRoute } from "./routes/fixRoute.ts";
import type { CleanupMode, RunFixesByModeReport } from "../../packages/fix/runFixesByMode.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageRoot = path.join(__dirname, "storage");

interface ProductShellOptions {
  tempStorageDirectory?: string;
  outputStorageDirectory?: string;
  runFixesByModeImpl?: (
    mode: CleanupMode,
    inputPath: string,
    outputPath: string
  ) => Promise<RunFixesByModeReport>;
}

export function createProductShellApp(options: ProductShellOptions = {}): express.Express {
  const app = express();
  const tempStorageDirectory = options.tempStorageDirectory ?? path.join(storageRoot, "tmp");
  const outputStorageDirectory = options.outputStorageDirectory ?? path.join(storageRoot, "output");

  app.use("/audit", createAuditRoute(tempStorageDirectory));
  app.use("/fix", createFixRoute({
    tempStorageDirectory,
    outputStorageDirectory,
    runFixesByModeImpl: options.runFixesByModeImpl
  }));

  app.get("/download/:file", async (req, res, next) => {
    try {
      const fileName = path.basename(req.params.file);
      const filePath = path.join(outputStorageDirectory, fileName);
      await access(filePath, constants.F_OK);
      res.download(filePath);
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = resolveStatusCode(message);
    res.status(statusCode).json({ error: message });
  });

  return app;
}

export async function startProductShellServer(port = 3000): Promise<void> {
  const tempStorageDirectory = path.join(storageRoot, "tmp");
  const outputStorageDirectory = path.join(storageRoot, "output");
  await mkdir(tempStorageDirectory, { recursive: true });
  await mkdir(outputStorageDirectory, { recursive: true });

  const app = createProductShellApp({
    tempStorageDirectory,
    outputStorageDirectory
  });
  app.listen(port, () => {
    console.log(`PPTX Fixer product shell listening on http://localhost:${port}`);
  });
}

function resolveStatusCode(message: string): number {
  if (message === "file must be .pptx" || message === "LIMIT_UNEXPECTED_FILE") {
    return 400;
  }

  if (message === "mode must be minimal or standard" || message === "file is required") {
    return 400;
  }

  if (message === "export validation failed") {
    return 500;
  }

  if (message.includes("no such file") || message.includes("ENOENT")) {
    return 404;
  }

  return 500;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startProductShellServer(Number.parseInt(process.env.PORT ?? "3000", 10));
}
