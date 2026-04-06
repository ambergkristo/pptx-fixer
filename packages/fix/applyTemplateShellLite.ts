import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { AuditReport, LoadedPresentation } from "../audit/pptxAudit.ts";
import type {
  BrandFooterStyle,
  BrandLogoPosition
} from "./brandPresetCatalog.ts";
import type { TemplateShellSourceDefinition } from "./templateShellSource.ts";
import {
  assertSlideXmlSafety,
  assertSlideTextFidelity,
  findChildElements,
  findElements,
  getAttributes,
  getElementChildren,
  getElementName,
  type OrderedXmlDocument,
  type OrderedXmlNode
} from "./textFidelity.ts";

export interface ChangedTemplateShellSummary {
  slide: number;
  kind: "brandMark" | "footer";
  count: number;
}

export interface TemplateShellLiteReport {
  applied: boolean;
  changedShapes: ChangedTemplateShellSummary[];
  skipped: Array<{
    reason: string;
  }>;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  trimValues: false,
  processEntities: false,
  preserveOrder: true
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  processEntities: false,
  suppressEmptyNode: false,
  preserveOrder: true
});

const DEFAULT_SLIDE_WIDTH = 9144000;
const DEFAULT_SLIDE_HEIGHT = 6858000;
const EDGE_PADDING = 228600;
const CORNER_MARK_WIDTH = 731520;
const CORNER_MARK_HEIGHT = 274320;
const CORNER_MARK_BOTTOM_CLEARANCE = 594360;
const FOOTER_MINIMAL_WIDTH = 1828800;
const FOOTER_BRAND_WIDTH = 2743200;
const FOOTER_HEIGHT = 274320;
const FOOTER_BASELINE_Y = 6355080;
const BRAND_MARK_SHAPE_NAME = "CleanDeck Brand Mark";
const FOOTER_SHAPE_NAME = "CleanDeck Template Footer";

export async function applyTemplateShellLiteToArchive(
  archive: JSZip,
  presentation: LoadedPresentation,
  auditReport: AuditReport,
  options: {
    source: TemplateShellSourceDefinition;
    logoPosition: BrandLogoPosition;
    footerStyle: BrandFooterStyle;
  }
): Promise<TemplateShellLiteReport> {
  const changedShapes = new Map<string, number>();

  for (const slide of presentation.slides) {
    const entry = archive.file(slide.archivePath);
    if (!entry) {
      continue;
    }

    const slideXml = await entry.async("string");
    const parsedSlide = xmlParser.parse(slideXml) as OrderedXmlDocument;
    const originalSlide = structuredClone(parsedSlide);
    const slideAudit = auditReport.slides.find((candidate) => candidate.index === slide.index) ?? null;
    const changedInSlide = applyTemplateShellToSlide(parsedSlide, slide.index, slideAudit, options, changedShapes);

    if (changedInSlide > 0) {
      const strippedAfterSlide = stripTemplateShellShapes(parsedSlide);
      assertSlideXmlSafety(originalSlide, strippedAfterSlide, slide.index);
      assertSlideTextFidelity(originalSlide, strippedAfterSlide, slide.index);
      archive.file(slide.archivePath, xmlBuilder.build(parsedSlide));
    }
  }

  if (changedShapes.size === 0) {
    return {
      applied: false,
      changedShapes: [],
      skipped: [{ reason: "no safe template shell changes" }]
    };
  }

  return {
    applied: true,
    changedShapes: summarizeChangedShapes(changedShapes),
    skipped: []
  };
}

function applyTemplateShellToSlide(
  slideXml: OrderedXmlDocument,
  slideIndex: number,
  slideAudit: AuditReport["slides"][number] | null,
  options: {
    source: TemplateShellSourceDefinition;
    logoPosition: BrandLogoPosition;
    footerStyle: BrandFooterStyle;
  },
  changedShapes: Map<string, number>
): number {
  const shapeTree = findSlideShapeTree(slideXml);
  if (!shapeTree) {
    return 0;
  }

  const existingShapeNames = new Set(findShapeNames(shapeTree));
  const nextShapeId = findNextShapeId(shapeTree);
  let shapeId = nextShapeId;
  let changedCount = 0;
  const roleCounts = slideAudit?.textRoleSummary.roleCounts;
  const hasFooterRole = Boolean(roleCounts && roleCounts.footer > 0);

  if (!existingShapeNames.has(BRAND_MARK_SHAPE_NAME)) {
    getElementChildren(shapeTree).push(
      parseShapeSnippet(buildBrandMarkShapeXml({
        id: shapeId,
        name: BRAND_MARK_SHAPE_NAME,
        text: buildBrandMarkText(options.source.label),
        fontFamily: options.source.normalizeFontFamily,
        position: options.logoPosition
      }))
    );
    shapeId += 1;
    changedCount += 1;
    appendChangedShape(changedShapes, slideIndex, "brandMark");
  }

  if (
    options.footerStyle !== "none" &&
    !hasFooterRole &&
    !existingShapeNames.has(FOOTER_SHAPE_NAME)
  ) {
    getElementChildren(shapeTree).push(
      parseShapeSnippet(buildFooterShapeXml({
        id: shapeId,
        name: FOOTER_SHAPE_NAME,
        text: options.source.label,
        fontFamily: options.source.normalizeFontFamily,
        logoPosition: options.logoPosition,
        footerStyle: options.footerStyle
      }))
    );
    changedCount += 1;
    appendChangedShape(changedShapes, slideIndex, "footer");
  }

  return changedCount;
}

function findSlideShapeTree(slideXml: OrderedXmlDocument): OrderedXmlNode | null {
  for (const slideNode of findElements(slideXml, "p:sld")) {
    for (const contentSlide of findChildElements(slideNode, "p:cSld")) {
      const shapeTree = findChildElements(contentSlide, "p:spTree")[0];
      if (shapeTree) {
        return shapeTree;
      }
    }
  }

  return null;
}

function findShapeNames(shapeTree: OrderedXmlNode): string[] {
  return findChildElements(shapeTree, "p:sp")
    .map((shape) => extractShapeName(shape))
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

function stripTemplateShellShapes(slideXml: OrderedXmlDocument): OrderedXmlDocument {
  const cloned = structuredClone(slideXml);
  const shapeTree = findSlideShapeTree(cloned);
  if (!shapeTree) {
    return cloned;
  }

  const filteredChildren = getElementChildren(shapeTree).filter((child) => {
    if (getElementName(child) !== "p:sp") {
      return true;
    }

    const shapeName = extractShapeName(child);
    return shapeName !== BRAND_MARK_SHAPE_NAME && shapeName !== FOOTER_SHAPE_NAME;
  });
  shapeTree["p:spTree"] = filteredChildren;
  return cloned;
}

function findNextShapeId(shapeTree: OrderedXmlNode): number {
  let maxId = 1;

  for (const shape of findChildElements(shapeTree, "p:sp")) {
    const nonVisual = findChildElements(shape, "p:nvSpPr")[0];
    const candidate = findChildElements(nonVisual ?? {}, "p:cNvPr")[0];
    const rawId = getAttributes(candidate ?? {})["@_id"];
    const numericId = typeof rawId === "string" ? Number(rawId) : typeof rawId === "number" ? rawId : NaN;
    if (Number.isFinite(numericId)) {
      maxId = Math.max(maxId, numericId);
    }
  }

  return maxId + 1;
}

function extractShapeName(shape: OrderedXmlNode): string | null {
  const nonVisual = findChildElements(shape, "p:nvSpPr")[0];
  const candidate = findChildElements(nonVisual ?? {}, "p:cNvPr")[0];
  const name = getAttributes(candidate ?? {})["@_name"];
  return typeof name === "string" && name.trim().length > 0 ? name : null;
}

function appendChangedShape(
  changedShapes: Map<string, number>,
  slideIndex: number,
  kind: ChangedTemplateShellSummary["kind"]
): void {
  const key = `${slideIndex}::${kind}`;
  changedShapes.set(key, (changedShapes.get(key) ?? 0) + 1);
}

function summarizeChangedShapes(changedShapes: Map<string, number>): ChangedTemplateShellSummary[] {
  return [...changedShapes.entries()]
    .map(([key, count]) => {
      const [slideText, kind] = key.split("::");
      return {
        slide: Number(slideText),
        kind: kind as ChangedTemplateShellSummary["kind"],
        count
      };
    })
    .sort((left, right) => left.slide - right.slide || left.kind.localeCompare(right.kind));
}

function parseShapeSnippet(shapeXml: string): OrderedXmlNode {
  const parsed = xmlParser.parse(shapeXml) as OrderedXmlDocument;
  return parsed[0] ?? {};
}

function buildBrandMarkText(label: string): string {
  const initials = label
    .split(/\s+/)
    .map((token) => token[0] ?? "")
    .join("")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

  return initials.slice(0, 3) || "CD";
}

function buildBrandMarkShapeXml(options: {
  id: number;
  name: string;
  text: string;
  fontFamily: string;
  position: BrandLogoPosition;
}): string {
  const horizontalAlign = options.position.endsWith("right") ? "r" : "l";
  const { x, y } = resolveBrandMarkPlacement(options.position);

  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${options.id}" name="${xmlEscape(options.name)}"/>
    <p:cNvSpPr txBox="1"/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${CORNER_MARK_WIDTH}" cy="${CORNER_MARK_HEIGHT}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:noFill/>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  <p:txBody>
    <a:bodyPr wrap="none" anchor="ctr"/>
    <a:lstStyle/>
    <a:p>
      <a:pPr algn="${horizontalAlign}"/>
      <a:r>
        <a:rPr lang="en-US" sz="1200" b="1">
          <a:latin typeface="${xmlEscape(options.fontFamily)}"/>
        </a:rPr>
        <a:t>${xmlEscape(options.text)}</a:t>
      </a:r>
      <a:endParaRPr lang="en-US" sz="1200">
        <a:latin typeface="${xmlEscape(options.fontFamily)}"/>
      </a:endParaRPr>
    </a:p>
  </p:txBody>
</p:sp>`;
}

function buildFooterShapeXml(options: {
  id: number;
  name: string;
  text: string;
  fontFamily: string;
  logoPosition: BrandLogoPosition;
  footerStyle: Exclude<BrandFooterStyle, "none">;
}): string {
  const alignRight = options.logoPosition.endsWith("right");
  const width = options.footerStyle === "brand_footer" ? FOOTER_BRAND_WIDTH : FOOTER_MINIMAL_WIDTH;
  const x = alignRight
    ? DEFAULT_SLIDE_WIDTH - EDGE_PADDING - width
    : EDGE_PADDING;
  const fontSize = options.footerStyle === "brand_footer" ? 1100 : 900;
  const fontWeight = options.footerStyle === "brand_footer" ? ` b="1"` : "";
  const alignment = alignRight ? "r" : "l";
  const footerText = options.footerStyle === "brand_footer"
    ? `${options.text.toUpperCase()}`
    : options.text;

  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${options.id}" name="${xmlEscape(options.name)}"/>
    <p:cNvSpPr txBox="1"/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${x}" y="${FOOTER_BASELINE_Y}"/>
      <a:ext cx="${width}" cy="${FOOTER_HEIGHT}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:noFill/>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  <p:txBody>
    <a:bodyPr wrap="none" anchor="b"/>
    <a:lstStyle/>
    <a:p>
      <a:pPr algn="${alignment}"/>
      <a:r>
        <a:rPr lang="en-US" sz="${fontSize}"${fontWeight}>
          <a:latin typeface="${xmlEscape(options.fontFamily)}"/>
        </a:rPr>
        <a:t>${xmlEscape(footerText)}</a:t>
      </a:r>
      <a:endParaRPr lang="en-US" sz="${fontSize}">
        <a:latin typeface="${xmlEscape(options.fontFamily)}"/>
      </a:endParaRPr>
    </a:p>
  </p:txBody>
</p:sp>`;
}

function resolveBrandMarkPlacement(position: BrandLogoPosition): { x: number; y: number } {
  const leftX = EDGE_PADDING;
  const rightX = DEFAULT_SLIDE_WIDTH - EDGE_PADDING - CORNER_MARK_WIDTH;
  const topY = EDGE_PADDING;
  const bottomY = DEFAULT_SLIDE_HEIGHT - CORNER_MARK_BOTTOM_CLEARANCE - CORNER_MARK_HEIGHT;

  switch (position) {
    case "top_left":
      return { x: leftX, y: topY };
    case "top_right":
      return { x: rightX, y: topY };
    case "bottom_left":
      return { x: leftX, y: bottomY };
    case "bottom_right":
      return { x: rightX, y: bottomY };
  }
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
