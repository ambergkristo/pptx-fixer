import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import JSZip from "jszip";

type Alignment = "left" | "center" | "right" | "justify";

type RunDefinition = {
  text: string;
  fontFamily?: string;
  fontSize?: number;
};

type ParagraphDefinition = {
  runs: RunDefinition[];
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  bullet?: boolean;
  bulletLevel?: number;
  lineSpacingPt?: number;
  lineSpacingPct?: number;
  alignment?: Alignment;
};

type ShapeDefinition = {
  id: number;
  name: string;
  paragraphs?: ParagraphDefinition[];
  runs?: RunDefinition[];
  placeholderType?: string;
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const baseDeckPath = path.join(
  repoRoot,
  "testdata",
  "corpus",
  "large-decks",
  "extended-multi-slide.pptx"
);
const generatedOutputDirectory = path.join(repoRoot, "testdata", "generated");
const generatedOutputDeckPath = path.join(generatedOutputDirectory, "cleandeck-chaos-deck.pptx");
const corpusOutputDirectory = path.join(repoRoot, "testdata", "corpus", "hostile");
const corpusOutputDeckPath = path.join(corpusOutputDirectory, "cleandeck-chaos-gate-v1.pptx");

async function main(): Promise<void> {
  await mkdir(generatedOutputDirectory, { recursive: true });
  await mkdir(corpusOutputDirectory, { recursive: true });

  const archive = await JSZip.loadAsync(await readFile(baseDeckPath));

  for (let slideIndex = 1; slideIndex <= 12; slideIndex += 1) {
    archive.file(`ppt/slides/slide${slideIndex}.xml`, buildSlideXml(buildChaosSlide(slideIndex)));
  }

  const buffer = await archive.generateAsync({ type: "nodebuffer" });
  await writeFile(generatedOutputDeckPath, buffer);
  await writeFile(corpusOutputDeckPath, buffer);

  console.log(`Generated hostile recovery deck: ${corpusOutputDeckPath}`);
  console.log(`Generated local copy: ${generatedOutputDeckPath}`);
}

function buildChaosSlide(slideIndex: number): ShapeDefinition[] {
  const patternIndex = (slideIndex - 1) % 6;

  if (patternIndex === 0) {
    return [
      {
        id: 2,
        name: "Title Placeholder 1",
        placeholderType: "title",
        runs: [
          { text: `Chaos ${slideIndex}: Brand Drift`, fontFamily: "Calibri", fontSize: 2800 }
        ]
      },
      {
        id: 3,
        name: "Content Placeholder 2",
        paragraphs: [
          {
            spacingAfterPt: 12,
            runs: [{ text: "Normal body paragraph used as the local baseline.", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            spacingAfterPt: 12,
            runs: [{ text: "Second baseline paragraph confirms the local style.", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            spacingAfterPt: 30,
            runs: [{ text: "Arial body outlier with larger text and spacing.", fontFamily: "Arial", fontSize: 2200 }]
          },
          {
            spacingAfterPt: 12,
            runs: [{ text: "Back to baseline after the outlier paragraph.", fontFamily: "Calibri", fontSize: 2000 }]
          }
        ]
      }
    ];
  }

  if (patternIndex === 1) {
    return [
      {
        id: 2,
        name: "Title Placeholder 1",
        placeholderType: "title",
        runs: [{ text: `Chaos ${slideIndex}: Bullet Ladder`, fontFamily: "Calibri", fontSize: 2800 }]
      },
      {
        id: 3,
        name: "Content Placeholder 2",
        paragraphs: [
          {
            lineSpacingPct: 120,
            runs: [{ text: "List below mixes levels, alignment, and line spacing.", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            bullet: true,
            bulletLevel: 0,
            alignment: "left",
            lineSpacingPct: 120,
            runs: [{ text: "Root bullet alpha", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            bullet: true,
            bulletLevel: 0,
            alignment: "left",
            lineSpacingPct: 120,
            runs: [{ text: "Root bullet beta", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            bullet: true,
            bulletLevel: 1,
            alignment: "left",
            lineSpacingPct: 120,
            runs: [{ text: "Unexpected nested item", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            bullet: true,
            bulletLevel: 0,
            alignment: "left",
            lineSpacingPct: 120,
            runs: [{ text: "Root bullet gamma", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            lineSpacingPct: 120,
            runs: [{ text: "Divider paragraph between lists", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            bullet: true,
            bulletLevel: 0,
            alignment: "left",
            lineSpacingPct: 120,
            runs: [{ text: "Second list begins normally", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            bullet: true,
            bulletLevel: 2,
            alignment: "center",
            lineSpacingPct: 150,
            runs: [{ text: "Jumped two levels and centered text", fontFamily: "Calibri", fontSize: 2000 }]
          }
        ]
      }
    ];
  }

  if (patternIndex === 2) {
    return [
      {
        id: 2,
        name: "Title Placeholder 1",
        placeholderType: "title",
        runs: [{ text: `Chaos ${slideIndex}: Spacing Soup`, fontFamily: "Calibri", fontSize: 2800 }]
      },
      {
        id: 3,
        name: "Content Placeholder 2",
        paragraphs: [
          {
            spacingBeforePt: 6,
            spacingAfterPt: 18,
            runs: [{ text: "Opening paragraph with modest spacing.", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            spacingBeforePt: 6,
            spacingAfterPt: 18,
            runs: [{ text: "Second paragraph matches the intended rhythm.", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            spacingBeforePt: 0,
            spacingAfterPt: 40,
            runs: [{ text: "Third paragraph breaks spacing hard to stress the fixer.", fontFamily: "Calibri", fontSize: 1800 }]
          },
          {
            spacingBeforePt: 6,
            spacingAfterPt: 18,
            runs: [{ text: "Fourth paragraph returns to the expected spacing.", fontFamily: "Calibri", fontSize: 2000 }]
          }
        ]
      }
    ];
  }

  if (patternIndex === 3) {
    return [
      {
        id: 2,
        name: "Title Placeholder 1",
        placeholderType: "title",
        runs: [{ text: `Chaos ${slideIndex}: Line Spacing Spike`, fontFamily: "Calibri", fontSize: 2800 }]
      },
      {
        id: 3,
        name: "Content Placeholder 2",
        paragraphs: [
          {
            lineSpacingPct: 120,
            runs: [{ text: "Percent-based line spacing baseline.", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            lineSpacingPct: 120,
            runs: [{ text: "Second paragraph keeps the same spacing.", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            lineSpacingPct: 145,
            runs: [{ text: "Third paragraph spikes line spacing for a clear outlier.", fontFamily: "Tahoma", fontSize: 2000 }]
          },
          {
            lineSpacingPct: 120,
            runs: [{ text: "Fourth paragraph returns to the local baseline.", fontFamily: "Calibri", fontSize: 2000 }]
          }
        ]
      }
    ];
  }

  if (patternIndex === 4) {
    return [
      {
        id: 2,
        name: "Title Placeholder 1",
        placeholderType: "title",
        runs: [{ text: `Chaos ${slideIndex}: Run Salad`, fontFamily: "Calibri", fontSize: 2800 }]
      },
      {
        id: 3,
        name: "Content Placeholder 2",
        paragraphs: [
          {
            spacingAfterPt: 12,
            runs: [
              { text: "Quarterly ", fontFamily: "Calibri", fontSize: 2000 },
              { text: "results ", fontFamily: "Arial", fontSize: 2200 },
              { text: "still ", fontFamily: "Calibri", fontSize: 1800 },
              { text: "need ", fontFamily: "Georgia", fontSize: 2400 },
              { text: "cleanup ", fontFamily: "Calibri", fontSize: 2000 },
              { text: "before review.", fontFamily: "Verdana", fontSize: 2100 }
            ]
          },
          {
            spacingAfterPt: 24,
            runs: [{ text: "Second paragraph keeps spacing noisy as well.", fontFamily: "Calibri", fontSize: 2000 }]
          },
          {
            spacingAfterPt: 12,
            runs: [{ text: "Third paragraph snaps back to the common spacing.", fontFamily: "Calibri", fontSize: 2000 }]
          }
        ]
      }
    ];
  }

  return [
    {
      id: 2,
      name: "Title Placeholder 1",
      placeholderType: "title",
      runs: [{ text: `Chaos ${slideIndex}: Alignment Trouble`, fontFamily: "Calibri", fontSize: 2800 }]
    },
    {
      id: 3,
      name: "Content Placeholder 2",
      paragraphs: [
        {
          alignment: "left",
          lineSpacingPct: 120,
          runs: [{ text: "Left aligned baseline paragraph.", fontFamily: "Calibri", fontSize: 2000 }]
        },
        {
          alignment: "left",
          lineSpacingPct: 120,
          runs: [{ text: "Second left aligned baseline paragraph.", fontFamily: "Calibri", fontSize: 2000 }]
        },
        {
          alignment: "center",
          lineSpacingPct: 120,
          runs: [{ text: "Centered outlier paragraph for alignment drift.", fontFamily: "Calibri", fontSize: 2000 }]
        },
        {
          alignment: "left",
          lineSpacingPct: 120,
          runs: [{ text: "Back to left alignment immediately after the outlier.", fontFamily: "Calibri", fontSize: 2000 }]
        },
        {
          alignment: "left",
          lineSpacingPct: 120,
          runs: [{ text: "Final paragraph stays left but changes size slightly.", fontFamily: "Calibri", fontSize: 1800 }]
        }
      ]
    }
  ];
}

function buildSlideXml(shapes: ShapeDefinition[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      ${shapes.map((shape) => buildShapeXml(shape)).join("\n")}
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function buildShapeXml(shape: ShapeDefinition): string {
  const placeholder = shape.placeholderType ? `<p:ph type="${shape.placeholderType}"/>` : "";
  const paragraphs = (shape.paragraphs ?? [{ runs: shape.runs ?? [] }])
    .map((paragraph) => buildParagraphXml(paragraph))
    .join("\n");

  return `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shape.id}" name="${escapeXml(shape.name)}"/>
    <p:cNvSpPr/>
    <p:nvPr>${placeholder}</p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    ${paragraphs}
  </p:txBody>
</p:sp>`;
}

function buildParagraphXml(paragraph: ParagraphDefinition): string {
  const paragraphProperties = buildParagraphPropertiesXml(paragraph);
  const runs = paragraph.runs.map((run) => buildRunXml(run)).join("\n");

  return `<a:p>
      ${paragraphProperties}
      ${runs}
    </a:p>`;
}

function buildRunXml(run: RunDefinition): string {
  const sizeAttribute = run.fontSize === undefined ? "" : ` sz="${run.fontSize}"`;
  const latinNode = run.fontFamily ? `<a:latin typeface="${escapeXml(run.fontFamily)}"/>` : "";

  return `<a:r>
        <a:rPr${sizeAttribute}>${latinNode}</a:rPr>
        <a:t>${escapeXml(run.text)}</a:t>
      </a:r>`;
}

function buildParagraphPropertiesXml(paragraph: ParagraphDefinition): string {
  const attributes = [
    paragraph.bulletLevel === undefined ? "" : `lvl="${paragraph.bulletLevel}"`,
    paragraph.alignment === undefined ? "" : `algn="${toOpenXmlAlignment(paragraph.alignment)}"`
  ]
    .filter((attribute) => attribute.length > 0)
    .join(" ");

  const children: string[] = [];

  if (paragraph.spacingBeforePt !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${paragraph.spacingBeforePt * 100}"/></a:spcBef>`);
  }

  if (paragraph.spacingAfterPt !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${paragraph.spacingAfterPt * 100}"/></a:spcAft>`);
  }

  if (paragraph.lineSpacingPt !== undefined) {
    children.push(`<a:lnSpc><a:spcPts val="${paragraph.lineSpacingPt * 100}"/></a:lnSpc>`);
  }

  if (paragraph.lineSpacingPct !== undefined) {
    children.push(`<a:lnSpc><a:spcPct val="${paragraph.lineSpacingPct * 1000}"/></a:lnSpc>`);
  }

  if (paragraph.bullet) {
    children.push(`<a:buChar char="&#8226;"/>`);
  }

  if (children.length === 0) {
    return "";
  }

  return `<a:pPr${attributes.length > 0 ? ` ${attributes}` : ""}>${children.join("")}</a:pPr>`;
}

function toOpenXmlAlignment(value: Alignment): string {
  if (value === "left") {
    return "l";
  }

  if (value === "center") {
    return "ctr";
  }

  if (value === "right") {
    return "r";
  }

  return "just";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
