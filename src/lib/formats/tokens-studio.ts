/**
 * Tokens Studio (formerly Figma Tokens) format adapter.
 *
 * Tokens Studio uses a slightly different structure:
 * - Top-level keys are "token sets" (e.g. "global", "dark", "light")
 * - Inside each set, tokens are nested objects with `value` and `type`
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
  return "value" in obj && "type" in obj;
}

function flattenSet(
  obj: Record<string, unknown>,
  parentPath: string[],
  sourcePath: string,
): DesignToken[] {
  const tokens: DesignToken[] = [];

  if (isTokenLeaf(obj)) {
    const token: DesignToken = {
      path: parentPath.join("."),
      value: obj["value"],
      type: obj["type"] as TokenType | undefined,
      description: obj["description"] as string | undefined,
      source: sourcePath,
      sourceFormat: "tokens-studio",
    };
    tokens.push(token);
    return tokens;
  }

  for (const [key, child] of Object.entries(obj)) {
    if (key.startsWith("$")) continue; // skip meta keys like $themes, $metadata
    if (isPlainObject(child)) {
      tokens.push(...flattenSet(child, [...parentPath, key], sourcePath));
    }
  }

  return tokens;
}

export const tokensStudioAdapter: TokenFormatAdapter = {
  format: "tokens-studio",

  detect(data: unknown): boolean {
    if (!isPlainObject(data)) return false;
    // Tokens Studio files often have `$themes` or `$metadata` keys, or
    // sets with nested `value` + `type` pairs.
    return "$themes" in data || "$metadata" in data;
  },

  parse(data: unknown, sourcePath: string): DesignToken[] {
    if (!isPlainObject(data)) return [];
    const tokens: DesignToken[] = [];

    for (const [setName, setData] of Object.entries(data)) {
      if (setName.startsWith("$")) continue; // skip $themes, $metadata
      if (isPlainObject(setData)) {
        tokens.push(...flattenSet(setData, [setName], sourcePath));
      }
    }

    return tokens;
  },
};
