/**
 * SCSS variable parser.
 * Extracts $variable: value from SCSS files using regex.
 * Does not resolve @import or computed expressions.
 */

import type { ExtractedValue, SourceLocation } from "./types.js";

/**
 * Extract SCSS variables ($var: value) from file content.
 * Handles simple assignments; var references and expressions yield raw string.
 */
export function parseScssVariables(
  content: string,
  filePath: string,
): ExtractedValue[] {
  const results: ExtractedValue[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;

    // Match $variable: value; or $variable: value (greedy capture for full value)
    const scssVarRegex = /\$([a-zA-Z0-9_-]+)\s*:\s*([^;]+)\s*;?/g;
    let match: RegExpExecArray | null;
    while ((match = scssVarRegex.exec(line)) !== null) {
      const name = match[1];
      const rawValue = match[2].trim();
      // Strip trailing comment and semicolon
      const value = rawValue
        .replace(/\s*\/\/.*$|\s*\/\*[\s\S]*?\*\/\s*$/g, "")
        .replace(/;\s*$/, "")
        .trim();
      const source: SourceLocation = { file: filePath, line: lineNum };
      results.push({
        name: name.replace(/-/g, "."),
        value,
        source,
        sourceType: "scss-variable",
      });
    }
  }

  return results;
}
