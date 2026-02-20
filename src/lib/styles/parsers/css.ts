/**
 * CSS custom property parser.
 * Extracts --var-name: value from CSS and SCSS files.
 */

import type { ExtractedValue, SourceLocation } from "./types.js";

/**
 * Extract CSS custom properties (--name: value) from file content.
 * Handles :root, [data-theme], and other selectors.
 */
export function parseCssCustomProperties(
  content: string,
  filePath: string,
): ExtractedValue[] {
  const results: ExtractedValue[] = [];
  const lines = content.split(/\r?\n/);

  let currentSelector = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detect rule block start: :root {, [data-theme=dark] {, etc.
    const selectorMatch = line.match(/\s*([^{]+)\s*\{/);
    if (selectorMatch) {
      currentSelector = selectorMatch[1].trim();
    }

    // Match --var-name: value; (greedy capture to get full value)
    const customPropRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+)\s*;?/g;
    let match: RegExpExecArray | null;
    while ((match = customPropRegex.exec(line)) !== null) {
      const name = match[1];
      const value = match[2].trim();
      const source: SourceLocation = { file: filePath, line: lineNum };
      results.push({
        name: name.replace(/-/g, "."),
        value,
        selector: currentSelector || undefined,
        source,
        sourceType: "css-custom-property",
      });
    }

    // Reset selector on closing brace
    if (line.includes("}")) {
      currentSelector = "";
    }
  }

  return results;
}
