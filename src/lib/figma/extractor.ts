/**
 * Figma Token Extractor
 *
 * Extracts Figma variables from Figma MCP output and converts them to
 * standardized token formats (W3C, Tokens Studio, Style Dictionary).
 */

import type { DesignToken, TokenFormat, TokenType } from "../types.js";
import type {
  FigmaTokenExtractionOptions,
  FigmaTokenExtractionResult,
  FigmaCollectionMapping,
} from "./types.js";
import { parseFigmaVariables } from "./usage-analyzer.js";

// ---------------------------------------------------------------------------
// Main Extraction Function
// ---------------------------------------------------------------------------

/**
 * Extract Figma variables and convert to standard token format.
 *
 * @param options Extraction options
 * @returns Extraction result with tokens and metadata
 */
export async function extractFigmaTokens(
  options: FigmaTokenExtractionOptions,
): Promise<FigmaTokenExtractionResult> {
  const warnings: string[] = [];
  const tokens: DesignToken[] = [];
  const mappings: FigmaCollectionMapping[] = [];

  // Parse Figma variable definitions
  const figmaVars = parseFigmaVariables(
    options.figmaVariableDefs as Record<string, string>
  );

  if (figmaVars.length === 0) {
    warnings.push("No Figma variables found in provided data");
  }

  // Group by collection (inferred from path structure)
  const byCollection = groupByCollection(figmaVars);

  // Convert each collection
  for (const [collectionName, variables] of byCollection) {
    // Skip if filtering by collections
    if (options.collections && !options.collections.includes(collectionName)) {
      continue;
    }

    const collectionTokens: DesignToken[] = [];
    const tokenPaths: string[] = [];

    for (const variable of variables) {
      const token = convertToDesignToken(
        variable,
        collectionName,
        options.format,
        options.includeMetadata
      );

      if (token) {
        collectionTokens.push(token);
        tokenPaths.push(token.path);
      } else {
        warnings.push(`Could not convert variable: ${variable.name}`);
      }
    }

    tokens.push(...collectionTokens);

    // Add mapping metadata
    mappings.push({
      collectionId: `figma-collection-${collectionName.toLowerCase().replace(/\s+/g, "-")}`,
      collectionName,
      tokenPaths,
      modes: [], // Would need additional Figma data to populate
    });
  }

  // Calculate summary statistics
  const byType: Record<string, number> = {};
  const byCollectionSummary: Record<string, number> = {};

  for (const token of tokens) {
    const type = token.type || "unknown";
    byType[type] = (byType[type] || 0) + 1;

    // Extract collection from source or path
    const collection = extractCollectionFromPath(token.path);
    byCollectionSummary[collection] = (byCollectionSummary[collection] || 0) + 1;
  }

  return {
    tokens,
    summary: {
      total: tokens.length,
      byType,
      byCollection: byCollectionSummary,
    },
    mappings,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

interface FigmaVariableSimple {
  name: string;
  value: string;
}

/**
 * Group variables by collection (inferred from path structure).
 * Example: "color/primary/500" → collection "color"
 */
function groupByCollection(
  variables: FigmaVariableSimple[]
): Map<string, FigmaVariableSimple[]> {
  const collections = new Map<string, FigmaVariableSimple[]>();

  for (const variable of variables) {
    const parts = variable.name.split("/");
    const collectionName = parts[0] || "default";

    const existing = collections.get(collectionName) || [];
    existing.push(variable);
    collections.set(collectionName, existing);
  }

  return collections;
}

/**
 * Convert a Figma variable to a DesignToken.
 */
function convertToDesignToken(
  variable: FigmaVariableSimple,
  collectionName: string,
  format: TokenFormat,
  includeMetadata: boolean
): DesignToken | null {
  // Normalize path: convert / to .
  const path = variable.name.replace(/\//g, ".");

  // Infer token type from value or path
  const type = inferTokenType(variable.value, path);

  const token: DesignToken = {
    path,
    value: parseValue(variable.value, type),
    type,
    source: `figma:${collectionName}`,
    sourceFormat: format,
  };

  // Add Figma metadata if requested
  if (includeMetadata) {
    token.extensions = {
      "com.systembridge-mcp.figma": {
        originalName: variable.name,
        collection: collectionName,
        rawValue: variable.value,
      },
    };
  }

  return token;
}

/**
 * Infer token type from value and path.
 */
function inferTokenType(value: string, path: string): TokenType {
  // Check path for hints
  const lowerPath = path.toLowerCase();

  if (lowerPath.includes("color") || lowerPath.includes("background") || 
      lowerPath.includes("border") || lowerPath.includes("fill") ||
      lowerPath.includes("stroke")) {
    return "color";
  }

  if (lowerPath.includes("spacing") || lowerPath.includes("gap") || 
      lowerPath.includes("padding") || lowerPath.includes("margin")) {
    return "dimension";
  }

  if (lowerPath.includes("font") || lowerPath.includes("text") || 
      lowerPath.includes("typography")) {
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

  // Check value format
  if (isColorValue(value)) {
    return "color";
  }

  if (isDimensionValue(value)) {
    return "dimension";
  }

  if (isDurationValue(value)) {
    return "duration";
  }

  // Default to string
  return "string";
}

/**
 * Check if value looks like a color (hex, rgb, hsl, etc.).
 */
function isColorValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("hsl") ||
    trimmed.startsWith("color(") ||
    /^[a-z]+$/i.test(trimmed) // CSS color names
  );
}

/**
 * Check if value looks like a dimension (px, rem, em, etc.).
 */
function isDimensionValue(value: string): boolean {
  return /^\d+(\.\d+)?(px|rem|em|%|vh|vw|pt)$/.test(value.trim());
}

/**
 * Check if value looks like a duration (ms, s).
 */
function isDurationValue(value: string): boolean {
  return /^\d+(\.\d+)?(ms|s)$/.test(value.trim());
}

/**
 * Parse value based on type.
 */
function parseValue(value: string, type: TokenType): unknown {
  // For numbers (dimensions), try to parse
  if (type === "dimension" || type === "number") {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return value; // Keep original format with units
    }
  }

  // For durations
  if (type === "duration") {
    return value; // Keep with units
  }

  // Everything else as string
  return value;
}

/**
 * Extract collection name from token path.
 */
function extractCollectionFromPath(path: string): string {
  const parts = path.split(".");
  return parts[0] || "default";
}

//-------------------------------------------------------------------
// Format-Specific Output (for future use)
// ---------------------------------------------------------------------------

/**
 * Convert tokens to W3C format structure.
 */
export function tokensToW3C(tokens: DesignToken[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const token of tokens) {
    const parts = token.path.split(".");
    let current = result;

    // Navigate/create nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue;
      
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    // Set leaf value
    const leafName = parts[parts.length - 1];
    if (leafName) {
      current[leafName] = {
        $value: token.value,
        $type: token.type,
        ...(token.description && { $description: token.description }),
        ...(token.extensions && { $extensions: token.extensions }),
      };
    }
  }

  return result;
}

/**
 * Convert tokens to Tokens Studio format.
 */
export function tokensToTokensStudio(tokens: DesignToken[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const token of tokens) {
    const parts = token.path.split(".");
    let current = result;

    // Navigate/create nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue;
      
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    // Set leaf value (Tokens Studio uses "value" not "$value")
    const leafName = parts[parts.length - 1];
    if (leafName) {
      current[leafName] = {
        value: token.value,
        type: token.type,
        ...(token.description && { description: token.description }),
      };
    }
  }

  return result;
}
