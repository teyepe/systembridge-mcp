/**
 * W3C Design Tokens Community Group format adapter.
 *
 * Spec: https://design-tokens.github.io/community-group/format/
 * Uses `$value`, `$type`, `$description` with `$` prefix convention.
 *
 * Extended to parse `$extensions` structured metadata including:
 *   - `com.systembridge-mcp.conditions` — conditional values for multi-dimensional theming
 *   - `com.systembridge-mcp.brand-meta` — brand-specific metadata
 *   - `com.systembridge-mcp.density`    — density-specific metadata
 *   - `com.systembridge-mcp.factory`    — generation metadata for system templates
 *   - `com.systembridge-mcp.deprecated` — structured deprecation info
 *   - `com.systembridge-mcp.figma`      — Figma collection / variable mapping
 *
 * Also parses Phase 3 metadata fields:
 *   - `$lifecycle` — draft | active | deprecated
 *   - `$private` — boolean flag for internal tokens
 *   - `$category` — grouping category (e.g., "spacing", "colors")
 *   - `$examples` — array of usage examples in different frameworks
 */
import type {
  DesignToken,
  TokenFormatAdapter,
  TokenType,
  TokenLifecycle,
  TokenExample,
  ExampleFramework,
} from "../types.js";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTokenLeaf(obj: Record<string, unknown>): boolean {
  return "$value" in obj;
}

/**
 * Extract deprecation info from `$extensions` or `$deprecated`.
 */
function extractDeprecation(
  obj: Record<string, unknown>,
  extensions?: Record<string, unknown>,
): DesignToken["deprecated"] {
  // Check $extensions.com.systembridge-mcp.deprecated first (richest)
  const extDep = extensions?.["com.systembridge-mcp.deprecated"];
  if (isPlainObject(extDep)) {
    return {
      message: (extDep["message"] as string) ?? "Deprecated",
      alternative: extDep["alternative"] as string | undefined,
      removeBy: extDep["removeBy"] as string | undefined,
    };
  }

  // Then check $deprecated (W3C proposed)
  const dep = obj["$deprecated"];
  if (dep === true) {
    return { message: "Deprecated" };
  }
  if (typeof dep === "string") {
    return { message: dep };
  }
  if (isPlainObject(dep)) {
    return {
      message: (dep["message"] as string) ?? "Deprecated",
      alternative: dep["alternative"] as string | undefined,
      removeBy: dep["removeBy"] as string | undefined,
    };
  }

  return undefined;
}

/**
 * Extract lifecycle state from $lifecycle field.
 */
function extractLifecycle(obj: Record<string, unknown>): TokenLifecycle | undefined {
  const lifecycle = obj["$lifecycle"];
  if (lifecycle === "draft" || lifecycle === "active" || lifecycle === "deprecated") {
    return lifecycle;
  }
  return undefined;
}

/**
 * Extract usage examples from $examples array.
 */
function extractExamples(obj: Record<string, unknown>): TokenExample[] | undefined {
  const examples = obj["$examples"];
  if (!Array.isArray(examples)) return undefined;
  
  const parsed: TokenExample[] = [];
  for (const ex of examples) {
    if (!isPlainObject(ex)) continue;
    const framework = ex["framework"] as ExampleFramework | undefined;
    const code = ex["code"];
    if (!framework || typeof code !== "string") continue;
    
    parsed.push({
      framework,
      code,
      description: ex["description"] as string | undefined,
    });
  }
  
  return parsed.length > 0 ? parsed : undefined;
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
    const extensions = isPlainObject(obj["$extensions"])
      ? (obj["$extensions"] as Record<string, unknown>)
      : undefined;

    const token: DesignToken = {
      path: parentPath.join("."),
      value: obj["$value"],
      type: localType,
      description: obj["$description"] as string | undefined,
      source: sourcePath,
      sourceFormat: "w3c-design-tokens",
    };

    // Parse Phase 3 metadata
    const lifecycle = extractLifecycle(obj);
    if (lifecycle) token.lifecycle = lifecycle;
    
    const privateFlag = obj["$private"];
    if (privateFlag === true) token.private = true;
    
    const category = obj["$category"];
    if (typeof category === "string") token.category = category;
    
    const examples = extractExamples(obj);
    if (examples) token.examples = examples;

    if (extensions) {
      token.extensions = extensions;
    }

    const deprecated = extractDeprecation(obj, extensions);
    if (deprecated) {
      token.deprecated = deprecated;
    }

    tokens.push(token);
    return tokens;
  }

  const metaKeys = new Set([
    "$type",
    "$description",
    "$extensions",
    "$deprecated",
    "$lifecycle",
    "$private",
    "$category",
    "$examples",
  ]);
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
