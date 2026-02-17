/**
 * W3C Design Tokens Community Group format adapter.
 *
 * Spec: https://design-tokens.github.io/community-group/format/
 * Uses `$value`, `$type`, `$description` with `$` prefix convention.
 * Very close to Style Dictionary v4 but with stricter rules.
 */
import type {
  DesignToken,
  TokenFormatAdapter,
  TokenType,
} from "../types.js";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTokenLeaf(obj: Record<string, unknown>): boolean {
  return "$value" in obj;
}

function flattenW3C(
  obj: Record<string, unknown>,
  parentPath: string[],
  inheritedType: TokenType | undefined,
  sourcePath: string,
): DesignToken[] {
  const tokens: DesignToken[] = [];
  const localType = (obj["$type"] as TokenType | undefined) ?? inheritedType;

  if (isTokenLeaf(obj)) {
    const token: DesignToken = {
      path: parentPath.join("."),
      value: obj["$value"],
      type: localType,
      description: obj["$description"] as string | undefined,
      source: sourcePath,
      sourceFormat: "w3c-design-tokens",
    };
    if (isPlainObject(obj["$extensions"])) {
      token.extensions = obj["$extensions"] as Record<string, unknown>;
    }
    tokens.push(token);
    return tokens;
  }

  const metaKeys = new Set(["$type", "$description", "$extensions"]);
  for (const [key, child] of Object.entries(obj)) {
    if (metaKeys.has(key)) continue;
    if (isPlainObject(child)) {
      tokens.push(
        ...flattenW3C(child, [...parentPath, key], localType, sourcePath),
      );
    }
  }

  return tokens;
}

export const w3cDesignTokensAdapter: TokenFormatAdapter = {
  format: "w3c-design-tokens",

  detect(data: unknown): boolean {
    if (!isPlainObject(data)) return false;
    // W3C format exclusively uses `$value` and often has a top-level `$type`.
    const json = JSON.stringify(data);
    return json.includes('"$value"');
  },

  parse(data: unknown, sourcePath: string): DesignToken[] {
    if (!isPlainObject(data)) return [];
    return flattenW3C(data, [], undefined, sourcePath);
  },
};
