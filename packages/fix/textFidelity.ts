export type OrderedXmlNode = Record<string, unknown>;
export type OrderedXmlDocument = OrderedXmlNode[];

export function assertSlideTextFidelity(
  beforeSlideXml: OrderedXmlDocument,
  afterSlideXml: OrderedXmlDocument,
  slideIndex: number
): void {
  const beforeTokens = extractSlideTextTokens(beforeSlideXml);
  const afterTokens = extractSlideTextTokens(afterSlideXml);

  if (beforeTokens.length !== afterTokens.length) {
    throw new Error(
      `Text fidelity check failed on slide ${slideIndex}: text run count changed.`
    );
  }

  for (let index = 0; index < beforeTokens.length; index += 1) {
    if (beforeTokens[index] !== afterTokens[index]) {
      throw new Error(
        `Text fidelity check failed on slide ${slideIndex}: text content changed.`
      );
    }
  }
}

function extractSlideTextTokens(slideXml: OrderedXmlDocument): string[] {
  const tokens: string[] = [];
  const slideNodes = findElements(slideXml, "p:sld");

  for (const slideNode of slideNodes) {
    for (const contentSlide of findChildElements(slideNode, "p:cSld")) {
      for (const shapeTree of findChildElements(contentSlide, "p:spTree")) {
        for (const shape of findChildElements(shapeTree, "p:sp")) {
          for (const textBody of findChildElements(shape, "p:txBody")) {
            for (const paragraph of findChildElements(textBody, "a:p")) {
              for (const child of getElementChildren(paragraph)) {
                const name = getElementName(child);
                if (name === "a:r" || name === "a:fld") {
                  const textNode = findChildElements(child, "a:t")[0];
                  const textValue = extractTextValue(textNode);
                  if (textValue !== undefined) {
                    tokens.push(textValue);
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
