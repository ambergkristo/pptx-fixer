import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import express from "express";
import multer from "multer";

import { resolveBrandPreset } from "../../../packages/fix/brandPresetCatalog.ts";
import { runFixesByMode, type CleanupMode, type RunFixesByModeOptions, type RunFixesByModeReport } from "../../../packages/fix/runFixesByMode.ts";

interface FixRouteOptions {
  tempStorageDirectory: string;
  outputStorageDirectory: string;
  runFixesByModeImpl?: (
    mode: CleanupMode,
    inputPath: string,
    outputPath: string,
    options?: RunFixesByModeOptions
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
      if (mode !== "minimal" && mode !== "standard" && mode !== "normalize" && mode !== "template") {
        res.status(400).json({ error: "mode must be minimal, standard, normalize, or template" });
        return;
      }

      const normalizeBrandFontFamily = parseNormalizeBrandFontFamily(req.body?.normalizeBrandFontFamily);
      const normalizeBrandPresetId = parseNormalizeBrandPresetId(req.body?.normalizeBrandPresetId);
      const templateBrandPresetId = parseTemplateBrandPresetId(req.body?.templateBrandPresetId);
      const templateLogoPosition = parseTemplateLogoPosition(req.body?.templateLogoPosition);
      const templateFooterStyle = parseTemplateFooterStyle(req.body?.templateFooterStyle);
      if (mode === "template" && !templateBrandPresetId) {
        res.status(400).json({ error: "templateBrandPresetId is required for template mode" });
        return;
      }

      await mkdir(options.outputStorageDirectory, { recursive: true });
      const outputFileStem = `${sanitizeBaseName(req.file.originalname)}-fixed-${randomUUID()}`;
      const outputFileName = `${outputFileStem}.pptx`;
      const reportFileName = `${outputFileStem}.report.json`;
      const outputPath = path.join(options.outputStorageDirectory, outputFileName);
      const reportPath = path.join(options.outputStorageDirectory, reportFileName);
      const report = await runFixes(mode, req.file.path, outputPath, {
        normalizeBrandFontFamily,
        normalizeBrandPresetId,
        templateBrandPresetId,
        templateLogoPosition,
        templateFooterStyle
      });

      if (!Object.values(report.validation).every(Boolean)) {
        throw new Error("export validation failed");
      }

      await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

      res.json({
        report,
        downloadUrl: `/download/${outputFileName}`,
        reportDownloadUrl: `/download/${reportFileName}`,
        reportFileName
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function parseNormalizeBrandFontFamily(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > 80) {
    throw new Error("normalizeBrandFontFamily must be 80 characters or fewer");
  }

  if (/[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error("normalizeBrandFontFamily contains unsupported control characters");
  }

  return normalized;
}

function parseNormalizeBrandPresetId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (!resolveBrandPreset(normalized)) {
    throw new Error("normalizeBrandPresetId is not a supported preset");
  }

  return normalized;
}

function parseTemplateBrandPresetId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (!resolveBrandPreset(normalized)) {
    throw new Error("templateBrandPresetId is not a supported preset");
  }

  return normalized;
}

function parseTemplateLogoPosition(value: unknown): "top_left" | "top_right" | "bottom_left" | "bottom_right" | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (
    normalized !== "top_left" &&
    normalized !== "top_right" &&
    normalized !== "bottom_left" &&
    normalized !== "bottom_right"
  ) {
    throw new Error("templateLogoPosition must be top_left, top_right, bottom_left, or bottom_right");
  }

  return normalized;
}

function parseTemplateFooterStyle(value: unknown): "none" | "minimal" | "brand_footer" | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (
    normalized !== "none" &&
    normalized !== "minimal" &&
    normalized !== "brand_footer"
  ) {
    throw new Error("templateFooterStyle must be none, minimal, or brand_footer");
  }

  return normalized;
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
