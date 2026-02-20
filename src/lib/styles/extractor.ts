/**
 * Style Extractor
 *
 * Reverse-engineers design tokens from CSS and SCSS files.
 * Extracts CSS custom properties and SCSS variables, converts to DesignToken format.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import type { DesignToken, TokenType } from "../types.js";
import type { ExtractedValue } from "./parsers/types.js";
import { parseCssCustomProperties } from "./parsers/css.js";
import { parseScssVariables } from "./parsers/scss.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractStylesOptions {
  /** Project root (absolute path). */
  projectRoot: string;
  /** Glob patterns for style files (default from config). */
  stylePaths: string[];
  /** Exclude paths (e.g. node_modules). */
  excludePaths?: string[];
}

export interface ExtractStylesResult {
  tokens: DesignToken[];
  summary: {
    total: number;
    byType: Record<string, number>;
    byCollection: Record<string, number>;
    filesScanned: number;
  };
  collections: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Main Extraction
// ---------------------------------------------------------------------------

/**
 * Extract design tokens from CSS and SCSS files.
 */
export async function extractStyles(
  options: ExtractStylesOptions,
): Promise<ExtractStylesResult> {
  const warnings: string[] = [];
  const extracted = new Map<string, ExtractedValue>(); // path -> extracted (last wins for dedupe)
  const exclude = options.excludePaths ?? ["node_modules", "dist", "build", ".git"];
  const ignore = exclude.map((p) => `**/${p}/**`);

  const files = await fg(options.stylePaths, {
    cwd: options.projectRoot,
    absolute: true,
    onlyFiles: true,
    ignore,
  });

  for (const filePath of files.sort()) {
    const relPath = path.relative(options.projectRoot, filePath);
    const ext = path.extname(filePath).toLowerCase();

    try {
      const content = fs.readFileSync(filePath, "utf-8");

      if (ext === ".css" || ext === ".scss") {
        const cssVars = parseCssCustomProperties(content, relPath);
        for (const ev of cssVars) {
          const tokenPath = ev.name;
          const existing = extracted.get(tokenPath);
          if (!existing || ev.sourceType === "css-custom-property") {
            extracted.set(tokenPath, ev);
          }
        }
      }

      if (ext === ".scss") {
        const scssVars = parseScssVariables(content, relPath);
        for (const ev of scssVars) {
          const tokenPath = ev.name;
          const existing = extracted.get(tokenPath);
          if (!existing || existing.sourceType !== "css-custom-property") {
            extracted.set(tokenPath, ev);
          }
        }
      }
    } catch (err) {
      warnings.push(`Failed to read ${relPath}: ${(err as Error).message}`);
    }
  }

  const tokens: DesignToken[] = [];
  const byType: Record<string, number> = {};
  const byCollection: Record<string, number> = {};

  for (const ev of extracted.values()) {
    const token = convertedToDesignToken(ev);
    if (token) {
      tokens.push(token);
      const t = token.type ?? "string";
      byType[t] = (byType[t] || 0) + 1;
      const collection = ev.name.split(".")[0] ?? "default";
      byCollection[collection] = (byCollection[collection] || 0) + 1;
    }
  }

  const collections = [...new Set(tokens.map((t) => t.path.split(".")[0]).filter(Boolean))];

  if (tokens.length === 0 && files.length > 0) {
    warnings.push("No design tokens found in scanned style files");
  }

  return {
    tokens,
    summary: {
      total: tokens.length,
      byType,
      byCollection,
      filesScanned: files.length,
    },
    collections,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertedToDesignToken(ev: ExtractedValue): DesignToken | null {
  const type = inferTokenType(ev.value, ev.name);
  const parsedValue = parseTokenValue(ev.value, type);

  return {
    path: ev.name,
    value: parsedValue,
    type,
    source: ev.source?.file,
    sourceFormat: "w3c-design-tokens",
    extensions: {
      "com.systembridge-mcp.styles": {
        sourceType: ev.sourceType,
        selector: ev.selector,
        rawValue: ev.value,
      },
    },
  };
}

function inferTokenType(value: string, path: string): TokenType {
  const lowerPath = path.toLowerCase();

  if (
    lowerPath.includes("color") ||
    lowerPath.includes("background") ||
    lowerPath.includes("border") ||
    lowerPath.includes("fill") ||
    lowerPath.includes("stroke")
  ) {
    return "color";
  }
  if (
    lowerPath.includes("spacing") ||
    lowerPath.includes("gap") ||
    lowerPath.includes("padding") ||
    lowerPath.includes("margin") ||
    lowerPath.includes("size")
  ) {
    return "dimension";
  }
  if (
    lowerPath.includes("font") ||
    lowerPath.includes("text") ||
    lowerPath.includes("typography")
  ) {
    if (lowerPath.includes("size")) return "dimension";
    if (lowerPath.includes("weight")) return "fontWeight";
    if (lowerPath.includes("family")) return "fontFamily";
    return "typography";
  }
  if (lowerPath.includes("radius") || lowerPath.includes("rounded")) {
    return "dimension";
  }
  if (lowerPath.includes("shadow") || lowerPath.includes("elevation")) {
    return "shadow";
  }
  if (lowerPath.includes("duration") || lowerPath.includes("timing")) {
    return "duration";
  }

  if (isColorValue(value)) return "color";
  if (isDimensionValue(value)) return "dimension";
  if (isDurationValue(value)) return "duration";

  return "string";
}

function isColorValue(value: string): boolean {
  const t = value.trim();
  return (
    t.startsWith("#") ||
    t.startsWith("rgb") ||
    t.startsWith("hsl") ||
    /^[a-z]+$/i.test(t)
  );
}

function isDimensionValue(value: string): boolean {
  return /^-?[\d.]+(px|rem|em|%|vh|vw|pt)?$/.test(value.trim());
}

function isDurationValue(value: string): boolean {
  return /^\d+(\.\d+)?(ms|s)$/.test(value.trim());
}

function parseTokenValue(value: string, type: TokenType): unknown {
  const t = value.trim();

  if (type === "dimension" || type === "number") {
    const num = parseFloat(t);
    if (!isNaN(num)) return t;
  }
  if (type === "duration") return t;
  if (type === "color") {
    const hex = tryParseColorToHex(t);
    if (hex) return hex;
  }
  return t;
}

function tryParseColorToHex(value: string): string | null {
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return value.length === 4
      ? "#" + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]
      : value.toLowerCase();
  }
  const rgb = value.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const r = parseInt(rgb[1], 10);
    const g = parseInt(rgb[2], 10);
    const b = parseInt(rgb[3], 10);
    return (
      "#" +
      [r, g, b]
        .map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0"))
        .join("")
    ).toLowerCase();
  }
  return null;
}
