/**
 * search_tokens tool — deep token search & discovery.
 *
 * Allows querying tokens by name, type, value pattern, deprecation status,
 * and free-text search across paths and descriptions.
 */
import type {
  DesignToken,
  McpDsConfig,
  TokenSearchQuery,
  TokenSearchResult,
} from "../lib/types.js";
import { loadAllTokens, resolveReferences } from "../lib/parser.js";

function matchesText(token: DesignToken, text: string): string | null {
  const lower = text.toLowerCase();
  if (token.path.toLowerCase().includes(lower)) return "path";
  if (token.description?.toLowerCase().includes(lower)) return "description";
  if (String(token.value).toLowerCase().includes(lower)) return "value";
  if (
    token.resolvedValue !== undefined &&
    String(token.resolvedValue).toLowerCase().includes(lower)
  )
    return "resolvedValue";
  return null;
}

export async function searchTokens(
  query: TokenSearchQuery,
  projectRoot: string,
  config: McpDsConfig,
): Promise<TokenSearchResult[]> {
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);

  const results: TokenSearchResult[] = [];

  for (const token of tokenMap.values()) {
    const reasons: string[] = [];

    // Free-text filter
    if (query.text) {
      const match = matchesText(token, query.text);
      if (!match) continue;
      reasons.push(`text matched in ${match}`);
    }

    // Type filter
    if (query.type) {
      if (token.type !== query.type) continue;
      reasons.push(`type is "${query.type}"`);
    }

    // Path prefix filter
    if (query.pathPrefix) {
      if (!token.path.startsWith(query.pathPrefix)) continue;
      reasons.push(`path starts with "${query.pathPrefix}"`);
    }

    // Deprecated filter
    if (query.deprecated !== undefined) {
      const isDeprecated = !!token.deprecated;
      if (isDeprecated !== query.deprecated) continue;
      reasons.push(query.deprecated ? "is deprecated" : "is not deprecated");
    }

    // Value pattern (regex)
    if (query.valuePattern) {
      const re = new RegExp(query.valuePattern, "i");
      const valStr = String(token.resolvedValue ?? token.value);
      if (!re.test(valStr)) continue;
      reasons.push(`value matches pattern /${query.valuePattern}/`);
    }

    results.push({
      token,
      matchReason: reasons.join("; ") || "matches all criteria",
    });
  }

  return results;
}

/**
 * Render search results as a human-readable summary for the MCP response.
 */
export function formatSearchResults(results: TokenSearchResult[]): string {
  if (results.length === 0) {
    return "No tokens matched the search criteria.";
  }

  const lines: string[] = [`Found ${results.length} token(s):\n`];

  for (const { token, matchReason } of results) {
    const parts = [`  **${token.path}**`];
    parts.push(`    Value: ${JSON.stringify(token.value)}`);
    if (
      token.resolvedValue !== undefined &&
      token.resolvedValue !== token.value
    ) {
      parts.push(`    Resolved: ${JSON.stringify(token.resolvedValue)}`);
    }
    if (token.type) parts.push(`    Type: ${token.type}`);
    if (token.description) parts.push(`    Description: ${token.description}`);
    if (token.deprecated) {
      parts.push(
        `    ⚠ DEPRECATED: ${token.deprecated.message}` +
          (token.deprecated.alternative
            ? ` → use ${token.deprecated.alternative}`
            : ""),
      );
    }
    if (token.source) parts.push(`    Source: ${token.source}`);
    parts.push(`    Match: ${matchReason}`);
    lines.push(parts.join("\n"));
  }

  return lines.join("\n\n");
}
