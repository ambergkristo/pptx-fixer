export type OrderedXmlNode = Record<string, unknown>;
export type OrderedXmlDocument = OrderedXmlNode[];

interface TextTokenLocation {
  shapeIndex: number;
  paragraphIndex: number;
  runIndex: number;
  text: string;
}

interface TextBodyStructure {
  shapeIndex: number;
  paragraphs: Array<{
    paragraphIndex: number;
    runCount: number;
  }>;
}

export function assertSlideXmlSafety(
  beforeSlideXml: OrderedXmlDocument,
  afterSlideXml: OrderedXmlDocument,
  slideIndex: number
): void {
  const beforeShapeTreeSize = countShapeTreeItems(beforeSlideXml);
  const afterShapeTreeSize = countShapeTreeItems(afterSlideXml);

  if (beforeShapeTreeSize !== afterShapeTreeSize) {
    throw new Error(
      `XML safety check failed on slide ${slideIndex}: shape tree size changed (${beforeShapeTreeSize} -> ${afterShapeTreeSize}).`
    );
  }

  const beforeStructures = extractTextBodyStructures(beforeSlideXml);
  const afterStructures = extractTextBodyStructures(afterSlideXml);

  if (beforeStructures.length !== afterStructures.length) {
    throw new Error(
      `XML safety check failed on slide ${slideIndex}: text body count changed (${beforeStructures.length} -> ${afterStructures.length}).`
    );
  }

  for (let bodyIndex = 0; bodyIndex < beforeStructures.length; bodyIndex += 1) {
    const beforeBody = beforeStructures[bodyIndex];
    const afterBody = afterStructures[bodyIndex];

    if (beforeBody.paragraphs.length !== afterBody.paragraphs.length) {
      throw new Error(
        `XML safety check failed on slide ${slideIndex}, shape ${beforeBody.shapeIndex}: paragraph count changed (${beforeBody.paragraphs.length} -> ${afterBody.paragraphs.length}).`
      );
    }

    for (let paragraphIndex = 0; paragraphIndex < beforeBody.paragraphs.length; paragraphIndex += 1) {
      const beforeParagraph = beforeBody.paragraphs[paragraphIndex];
      const afterParagraph = afterBody.paragraphs[paragraphIndex];

      if (beforeParagraph.runCount !== afterParagraph.runCount) {
        throw new Error(
          `XML safety check failed on slide ${slideIndex}, shape ${beforeBody.shapeIndex}, paragraph ${beforeParagraph.paragraphIndex}: run count changed (${beforeParagraph.runCount} -> ${afterParagraph.runCount}).`
        );
      }
    }
  }
}

export function assertSlideTextFidelity(
  beforeSlideXml: OrderedXmlDocument,
  afterSlideXml: OrderedXmlDocument,
  slideIndex: number
): void {
  const beforeTokens = extractSlideTextTokens(beforeSlideXml);
  const afterTokens = extractSlideTextTokens(afterSlideXml);

  if (beforeTokens.length !== afterTokens.length) {
    throw new Error(
      `Text fidelity check failed on slide ${slideIndex}: text run count changed (${beforeTokens.length} -> ${afterTokens.length}).`
    );
  }

  for (let index = 0; index < beforeTokens.length; index += 1) {
    if (beforeTokens[index].text !== afterTokens[index].text) {
      const token = beforeTokens[index];
      throw new Error(
        `Text fidelity check failed on slide ${slideIndex}, shape ${token.shapeIndex}, paragraph ${token.paragraphIndex}, run ${token.runIndex}: text content changed.`
      );
    }
  }
}

function countShapeTreeItems(slideXml: OrderedXmlDocument): number {
  let count = 0;

  for (const slideNode of findElements(slideXml, "p:sld")) {
    for (const contentSlide of findChildElements(slideNode, "p:cSld")) {
      for (const shapeTree of findChildElements(contentSlide, "p:spTree")) {
        for (const child of getElementChildren(shapeTree)) {
          const name = getElementName(child);
          if (!name || name === "p:nvGrpSpPr" || name === "p:grpSpPr") {
            continue;
          }

          count += 1;
        }
      }
    }
  }

  return count;
}

function extractTextBodyStructures(slideXml: OrderedXmlDocument): TextBodyStructure[] {
  const structures: TextBodyStructure[] = [];
  let shapeIndex = 0;

  for (const slideNode of findElements(slideXml, "p:sld")) {
    for (const contentSlide of findChildElements(slideNode, "p:cSld")) {
      for (const shapeTree of findChildElements(contentSlide, "p:spTree")) {
        for (const shape of findChildElements(shapeTree, "p:sp")) {
          shapeIndex += 1;

          for (const textBody of findChildElements(shape, "p:txBody")) {
            const paragraphs = findChildElements(textBody, "a:p").map((paragraph, index) => ({
              paragraphIndex: index + 1,
              runCount: countParagraphRuns(paragraph)
            }));

            structures.push({
              shapeIndex,
              paragraphs
            });
          }
        }
      }
    }
  }

  return structures;
}

function countParagraphRuns(paragraph: OrderedXmlNode): number {
  let count = 0;

  for (const child of getElementChildren(paragraph)) {
    const name = getElementName(child);
    if (name === "a:r" || name === "a:fld") {
      count += 1;
    }
  }

  return count;
}

function extractSlideTextTokens(slideXml: OrderedXmlDocument): TextTokenLocation[] {
  const tokens: TextTokenLocation[] = [];
  let shapeIndex = 0;

  for (const slideNode of findElements(slideXml, "p:sld")) {
    for (const contentSlide of findChildElements(slideNode, "p:cSld")) {
      for (const shapeTree of findChildElements(contentSlide, "p:spTree")) {
        for (const shape of findChildElements(shapeTree, "p:sp")) {
          shapeIndex += 1;

          for (const textBody of findChildElements(shape, "p:txBody")) {
            const paragraphs = findChildElements(textBody, "a:p");

            for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
              let runIndex = 0;
              for (const child of getElementChildren(paragraphs[paragraphIndex])) {
                const name = getElementName(child);
                if (name === "a:r" || name === "a:fld") {
                  runIndex += 1;
                  const textNode = findChildElements(child, "a:t")[0];
                  const textValue = extractTextValue(textNode);
                  if (textValue !== undefined) {
                    tokens.push({
                      shapeIndex,
                      paragraphIndex: paragraphIndex + 1,
                      runIndex,
                      text: textValue
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return tokens;
}

function extractTextValue(textNode: OrderedXmlNode | undefined): string | undefined {
  if (!textNode) {
    return undefined;
  }

  for (const child of getElementChildren(textNode)) {
    if (typeof child["#text"] === "string") {
      return child["#text"];
    }

    if (typeof child["#text"] === "number") {
      return child["#text"].toString();
    }
  }

  return undefined;
}

export function findElements(
  nodes: OrderedXmlDocument,
  name: string
): OrderedXmlNode[] {
  return nodes.filter((node) => getElementName(node) === name);
}

export function findChildElements(
  node: OrderedXmlNode,
  childName: string
): OrderedXmlNode[] {
  return findElements(getElementChildren(node), childName);
}

export function getElementChildren(node: OrderedXmlNode): OrderedXmlDocument {
  const elementName = getElementName(node);
  if (!elementName) {
    return [];
  }

  const children = node[elementName];
  return Array.isArray(children) ? (children as OrderedXmlDocument) : [];
}

export function getElementName(node: OrderedXmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text");
}

export function getAttributes(node: OrderedXmlNode): Record<string, unknown> {
  const attributes = node[":@"];
  return typeof attributes === "object" && attributes !== null
    ? (attributes as Record<string, unknown>)
    : {};
}
