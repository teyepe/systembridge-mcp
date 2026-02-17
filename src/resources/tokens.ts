/**
 * MCP Resources — token data exposed as MCP resources.
 *
 * These let the LLM read token data without calling tools, enabling
 * natural-language questions like "What color tokens do we have?"
 */
import type { McpDsConfig, DesignToken } from "../lib/types.js";
import { loadAllTokens, resolveReferences } from "../lib/parser.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByCategory(
  tokens: DesignToken[],
): Record<string, DesignToken[]> {
  const groups: Record<string, DesignToken[]> = {};
  for (const token of tokens) {
    const category = token.path.split(".")[0] ?? "uncategorized";
    if (!groups[category]) groups[category] = [];
    groups[category].push(token);
  }
  return groups;
}

function tokenToJson(token: DesignToken): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    path: token.path,
    value: token.value,
  };
  if (token.resolvedValue !== undefined && token.resolvedValue !== token.value) {
    obj.resolvedValue = token.resolvedValue;
  }
  if (token.type) obj.type = token.type;
  if (token.description) obj.description = token.description;
  if (token.deprecated) obj.deprecated = token.deprecated;
  if (token.source) obj.source = token.source;
  return obj;
}

// ---------------------------------------------------------------------------
// Resource handlers
// ---------------------------------------------------------------------------

export interface ResourceListItem {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

/**
 * List all available token resources.
 * Scans the token files and returns one resource per top-level category
 * (e.g. "color", "spacing", "typography") plus an "all" resource.
 */
export async function listTokenResources(
  projectRoot: string,
  config: McpDsConfig,
): Promise<ResourceListItem[]> {
  const tokenMap = await loadAllTokens(projectRoot, config);
  const tokens = Array.from(tokenMap.values());
  const groups = groupByCategory(tokens);

  const resources: ResourceListItem[] = [
    {
      uri: "tokens://all",
      name: "All Design Tokens",
      description: `All ${tokens.length} design tokens across ${Object.keys(groups).length} categories`,
      mimeType: "application/json",
    },
  ];

  for (const [category, catTokens] of Object.entries(groups).sort()) {
    resources.push({
      uri: `tokens://${category}`,
      name: `${category} tokens`,
      description: `${catTokens.length} tokens in the "${category}" category`,
      mimeType: "application/json",
    });
  }

  return resources;
}

/**
 * Read a specific token resource.
 *
 * URIs:
 *   tokens://all           — all tokens
 *   tokens://{category}    — tokens in a category (first path segment)
 */
export async function readTokenResource(
  uri: string,
  projectRoot: string,
  config: McpDsConfig,
): Promise<ResourceContent> {
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);

  const tokens = Array.from(tokenMap.values());
  const category = uri.replace("tokens://", "");

  let filtered: DesignToken[];
  if (category === "all") {
    filtered = tokens;
  } else {
    filtered = tokens.filter((t) => t.path.startsWith(category + ".") || t.path === category);
  }

  const output = {
    uri,
    category: category === "all" ? "all" : category,
    count: filtered.length,
    tokens: filtered.map(tokenToJson),
  };

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(output, null, 2),
  };
}
