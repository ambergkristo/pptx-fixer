import type { LineSpacingStyleSignature, ParagraphGroupWithStyleSignature } from "./styleSignatureAudit.ts";

export interface DominantBodyStyle {
  fontFamily: string | null;
  fontSize: number | null;
  spacingBefore: number | null;
  spacingAfter: number | null;
  alignment: string | null;
  lineSpacing: LineSpacingStyleSignature | null;
}

export function summarizeDominantBodyStyle(
  groups: ParagraphGroupWithStyleSignature[]
): DominantBodyStyle {
  const bodyGroups = groups.filter((group) => group.type === "body");

  return {
    fontFamily: resolveStrictMajority(bodyGroups, (group) => group.styleSignature.fontFamily),
    fontSize: resolveStrictMajority(bodyGroups, (group) => group.styleSignature.fontSize),
    spacingBefore: resolveStrictMajority(bodyGroups, (group) => numericSpacingValue(group.styleSignature.spacingBefore)),
    spacingAfter: resolveStrictMajority(bodyGroups, (group) => numericSpacingValue(group.styleSignature.spacingAfter)),
    alignment: resolveStrictMajority(bodyGroups, (group) => group.styleSignature.alignment),
    lineSpacing: resolveStrictMajority(bodyGroups, (group) => group.styleSignature.lineSpacing, serializeLineSpacing)
  };
}

function resolveStrictMajority<T>(
  groups: ParagraphGroupWithStyleSignature[],
  selector: (group: ParagraphGroupWithStyleSignature) => T | null,
  keyForValue: (value: T) => string = defaultKeyForValue
): T | null {
  if (groups.length === 0) {
    return null;
  }

  const countsByKey = new Map<string, { count: number; value: T }>();
  for (const group of groups) {
    const value = selector(group);
    if (value === null) {
      continue;
    }

    const key = keyForValue(value);
    const existing = countsByKey.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    countsByKey.set(key, {
      count: 1,
      value
    });
  }

  const sortedCounts = [...countsByKey.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return keyForValue(left.value).localeCompare(keyForValue(right.value));
  });

  const topValue = sortedCounts[0];
  if (!topValue) {
    return null;
  }

  const nextValue = sortedCounts[1];
  if (topValue.count <= groups.length / 2 || (nextValue && nextValue.count === topValue.count)) {
    return null;
  }

  return topValue.value;
}

function numericSpacingValue(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  return Number.parseFloat(match[0]);
}

function serializeLineSpacing(value: LineSpacingStyleSignature): string {
  return `${value.kind ?? "null"}:${value.value ?? "null"}`;
}

function defaultKeyForValue(value: string | number | LineSpacingStyleSignature): string {
  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "string") {
    return value;
  }

  return serializeLineSpacing(value);
}
