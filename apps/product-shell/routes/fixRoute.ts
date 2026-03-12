import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import express from "express";
import multer from "multer";

import { runFixesByMode, type CleanupMode, type RunFixesByModeReport } from "../../../packages/fix/runFixesByMode.ts";

interface FixRouteOptions {
  tempStorageDirectory: string;
  outputStorageDirectory: string;
  runFixesByModeImpl?: (
    mode: CleanupMode,
    inputPath: string,
    outputPath: string
  ) => Promise<RunFixesByModeReport>;
}

export function createFixRoute(options: FixRouteOptions): express.Router {
  const router = express.Router();
  const runFixes = options.runFixesByModeImpl ?? runFixesByMode;
  const upload = multer({
    storage: createDiskStorage(options.tempStorageDirectory),
    fileFilter: (_req, file, callback) => {
      if (path.extname(file.originalname).toLowerCase() !== ".pptx") {
        callback(new Error("file must be .pptx"));
        return;
      }

      callback(null, true);
    }
  });

  router.post("/", upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "file is required" });
        return;
      }

      const mode = req.body?.mode;
      if (mode !== "minimal" && mode !== "standard") {
        res.status(400).json({ error: "mode must be minimal or standard" });
        return;
      }

      await mkdir(options.outputStorageDirectory, { recursive: true });
      const outputFileName = `${sanitizeBaseName(req.file.originalname)}-fixed-${randomUUID()}.pptx`;
      const outputPath = path.join(options.outputStorageDirectory, outputFileName);
      const report = await runFixes(mode, req.file.path, outputPath);

      if (!Object.values(report.validation).every(Boolean)) {
        throw new Error("export validation failed");
      }

      res.json({
        report,
        downloadUrl: `/download/${outputFileName}`
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function createDiskStorage(storageDirectory: string): multer.StorageEngine {
  return multer.diskStorage({
    destination: async (_req, _file, callback) => {
      try {
        await mkdir(storageDirectory, { recursive: true });
        callback(null, storageDirectory);
      } catch (error) {
        callback(error as Error, storageDirectory);
      }
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${sanitizeBaseName(file.originalname)}-${randomUUID()}${extension || ".pptx"}`);
    }
  });
}

function sanitizeBaseName(fileName: string): string {
  const baseName = path.parse(fileName).name.toLowerCase();
  const sanitized = baseName.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "upload";
}
