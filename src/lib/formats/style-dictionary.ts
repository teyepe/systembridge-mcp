/**
 * Style Dictionary format adapter.
 *
 * Handles the nested JSON format used by Style Dictionary (v3 & v4).
 * Tokens are nested objects whose leaves contain a `value` (v3) or `$value`
 * (W3C-aligned / v4) property.
 */
import type {
  DesignToken,
  TokenFormatAdapter,
  TokenType,
} from "../types.js";

/** Recognised leaf-node keys that signal "this object is a token". */
const VALUE_KEYS = ["$value", "value"];
const TYPE_KEYS = ["$type", "type"];
const DESC_KEYS = ["$description", "description"];
const EXT_KEY = "$extensions";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTokenLeaf(obj: Record<string, unknown>): boolean {
  return VALUE_KEYS.some((k) => k in obj);
}

function extractType(obj: Record<string, unknown>): TokenType | undefined {
  for (const k of TYPE_KEYS) {
    if (typeof obj[k] === "string") return obj[k] as TokenType;
  }
  return undefined;
}

function extractDescription(obj: Record<string, unknown>): string | undefined {
  for (const k of DESC_KEYS) {
    if (typeof obj[k] === "string") return obj[k] as string;
  }
  return undefined;
}

/**
 * Recursively walk a nested token tree and flatten into a list.
 *
 * Inherited `$type` is propagated down the tree per the W3C spec.
 */
function flattenTokens(
  obj: Record<string, unknown>,
  parentPath: string[],
  inheritedType: TokenType | undefined,
  sourcePath: string,
): DesignToken[] {
  const tokens: DesignToken[] = [];

  // Resolve the type that applies at this level.
  const localType = extractType(obj) ?? inheritedType;

  if (isTokenLeaf(obj)) {
    const value = obj["$value"] ?? obj["value"];
    const token: DesignToken = {
      path: parentPath.join("."),
      value,
      type: localType,
      description: extractDescription(obj),
      source: sourcePath,
      sourceFormat: "style-dictionary",
    };
    if (isPlainObject(obj[EXT_KEY])) {
      token.extensions = obj[EXT_KEY] as Record<string, unknown>;
    }
    // Detect deprecated extension
    if (
      token.extensions?.["deprecated"] ||
      (isPlainObject(obj["deprecated"]))
    ) {
      const dep = (token.extensions?.["deprecated"] ?? obj["deprecated"]) as Record<string, unknown>;
      token.deprecated = {
        message: (dep["message"] as string) ?? "Deprecated",
        alternative: dep["alternative"] as string | undefined,
        removeBy: dep["removeBy"] as string | undefined,
      };
    }
    tokens.push(token);
    return tokens;
  }

  // Not a leaf — recurse into child keys, skipping meta-keys.
  const metaKeys = new Set([...VALUE_KEYS, ...TYPE_KEYS, ...DESC_KEYS, EXT_KEY]);
  for (const [key, child] of Object.entries(obj)) {
    if (metaKeys.has(key)) continue;
    if (isPlainObject(child)) {
      tokens.push(
        ...flattenTokens(child, [...parentPath, key], localType, sourcePath),
      );
    }
  }

  return tokens;
}

export const styleDictionaryAdapter: TokenFormatAdapter = {
  format: "style-dictionary",

  detect(data: unknown): boolean {
    // SD files are nested objects.  We look for at least one leaf that has
    // `value` or `$value`.
    if (!isPlainObject(data)) return false;
    const json = JSON.stringify(data);
    return json.includes('"value"') || json.includes('"$value"');
  },

  parse(data: unknown, sourcePath: string): DesignToken[] {
    if (!isPlainObject(data)) return [];
    return flattenTokens(data, [], undefined, sourcePath);
  },
};
