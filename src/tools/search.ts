/**
 * search_tokens tool — deep token search & discovery.
 *
 * Allows querying tokens by name, type, value pattern, deprecation status,
 * lifecycle state, and free-text search across paths and descriptions.
 */
import type {
  DesignToken,
  McpDsConfig,
  TokenSearchQuery,
  TokenSearchResult,
  TokenLifecycle,
  TokenExample,
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

    // Lifecycle filter — smart defaults like Dialtone
    // Default behavior: exclude draft tokens (only show active/deprecated)
    // Set lifecycle='all' to include draft tokens
    if (query.lifecycle !== "all") {
      const tokenLifecycle = token.lifecycle || "active"; // default to active if not specified
      
      if (query.lifecycle) {
        // Explicit lifecycle filter requested
        if (tokenLifecycle !== query.lifecycle) continue;
        reasons.push(`lifecycle is "${query.lifecycle}"`);
      } else {
        // Default: exclude draft tokens (smart filtering for production usage)
        if (tokenLifecycle === "draft") continue;
      }
    }

    // Value pattern (regex)
    if (query.valuePattern) {
      const re = new RegExp(query.valuePattern, "i");
      const valStr = String(token.resolvedValue ?? token.value);
      if (!re.test(valStr)) continue;
      reasons.push(`value matches pattern /${query.valuePattern}/`);
    }

    // Private token filter — exclude by default (like lifecycle drafts)
    // Set includePrivate=true to show private/internal tokens
    if (!query.includePrivate && token.private === true) {
      continue; // Skip private tokens unless explicitly requested
    }

    // Category filter
    if (query.category) {
      if (token.category !== query.category) continue;
      reasons.push(`category is "${query.category}"`);
    }

    // Format usage examples if present
    const formattedExamples = token.examples
      ? formatExamples(token.examples, token.path)
      : undefined;

    results.push({
      token,
      matchReason: reasons.join("; ") || "matches all criteria",
      formattedExamples,
    });
  }

  return results;
}

/**
 * Format usage examples for display in search results.
 */
function formatExamples(examples: TokenExample[], tokenPath: string): string[] {
  return examples.map((example) => {
    const lines: string[] = [];
    const header = example.description
      ? `${example.framework.toUpperCase()} - ${example.description}`
      : `${example.framework.toUpperCase()}`;
    lines.push(header);
    lines.push(`\`\`\`${example.framework}`);
    lines.push(example.code.trim());
    lines.push("```");
    return lines.join("\n");
  });
}

/**
 * Render search results as a human-readable summary for the MCP response.
 */
export function formatSearchResults(results: TokenSearchResult[]): string {
  if (results.length === 0) {
    return "No tokens matched the search criteria.";
  }

  const lines: string[] = [`Found ${results.length} token(s):\n`];

  for (const { token, matchReason, formattedExamples } of results) {
    const parts = [`  **${token.path}**`];
    parts.push(`    Value: ${JSON.stringify(token.value)}`);
    if (
      token.resolvedValue !== undefined &&
      token.resolvedValue !== token.value
    ) {
      parts.push(`    Resolved: ${JSON.stringify(token.resolvedValue)}`);
    }
    if (token.type) parts.push(`    Type: ${token.type}`);
    if (token.category) parts.push(`    Category: ${token.category}`);
    if (token.description) parts.push(`    Description: ${token.description}`);
    if (token.lifecycle) parts.push(`    Lifecycle: ${token.lifecycle}`);
    if (token.private) parts.push(`    🔒 Private (internal use only)`);
    if (token.deprecated) {
      parts.push(
        `    ⚠ DEPRECATED: ${token.deprecated.message}` +
          (token.deprecated.alternative
            ? ` → use ${token.deprecated.alternative}`
            : ""),
      );
    }
    
    // Add usage examples inline (Dialtone-style)
    if (formattedExamples && formattedExamples.length > 0) {
      parts.push(`\n    Usage Examples:`);
      for (const exampleText of formattedExamples) {
        const indented = exampleText
          .split("\n")
          .map((line) => `      ${line}`)
          .join("\n");
        parts.push(indented);
      }
    }
    
    if (token.source) parts.push(`\n    Source: ${token.source}`);
    parts.push(`    Match: ${matchReason}`);
    lines.push(parts.join("\n"));
  }

  return lines.join("\n\n");
}
