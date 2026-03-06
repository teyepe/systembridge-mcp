/**
 * Output mode types and formatting helpers for context-efficient responses.
 *
 * Heavy tools support three output modes:
 *   - compact:  Terse, machine-oriented. Metrics + minimal token lines. Saves context.
 *   - summary:  Mid-tier. Key findings + counts, brief per-item detail.
 *   - full:     Verbose markdown (backward-compatible default).
 */

/** Controls how tool output is formatted for the LLM context window. */
export type OutputMode = "compact" | "summary" | "full";

/**
 * Resolve the effective output mode from explicit arg, config default, or fallback.
 */
export function resolveOutputMode(
  explicit?: string,
  configDefault?: string,
): OutputMode {
  const val = explicit ?? configDefault;
  if (val === "compact" || val === "summary" || val === "full") return val;
  return "full";
}

/**
 * Format a token as a single compact line: `path: value`
 */
export function compactTokenLine(token: {
  path: string;
  value?: unknown;
  resolvedValue?: unknown;
}): string {
  const val = token.resolvedValue ?? token.value;
  return `${token.path}: ${JSON.stringify(val)}`;
}

/**
 * Format a token as a summary line: `path: value (type) — description`
 */
export function summaryTokenLine(token: {
  path: string;
  value?: unknown;
  resolvedValue?: unknown;
  type?: string;
  description?: string;
}): string {
  const val = token.resolvedValue ?? token.value;
  const parts = [`${token.path}: ${JSON.stringify(val)}`];
  if (token.type) parts.push(`(${token.type})`);
  if (token.description) {
    const desc =
      token.description.length > 60
        ? token.description.slice(0, 57) + "..."
        : token.description;
    parts.push(`— ${desc}`);
  }
  return parts.join(" ");
}

/**
 * Generate a truncation hint when results are capped.
 */
export function truncationHint(
  shown: number,
  total: number,
  toolName: string,
  limitParam: string = "limit",
): string {
  if (shown >= total) return "";
  return `[${shown}/${total} shown. Use ${toolName}(${limitParam}: ${total}) for all.]`;
}
