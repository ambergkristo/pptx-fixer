import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import express from "express";
import multer from "multer";

import { analyzeSlides, loadPresentation } from "../../../packages/audit/pptxAudit.ts";

export function createAuditRoute(storageDirectory: string): express.Router {
  const router = express.Router();
  const upload = multer({
    storage: createDiskStorage(storageDirectory),
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

      const report = analyzeSlides(await loadPresentation(req.file.path));
      res.json({
        slideCount: report.slideCount,
        fontDrift: countDriftSlides(report.fontDrift.driftRuns),
        fontSizeDrift: countDriftSlides(report.fontSizeDrift.driftRuns)
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

function countDriftSlides(driftRuns: Array<{ slide: number }>): number {
  return new Set(driftRuns.map((driftRun) => driftRun.slide)).size;
}
