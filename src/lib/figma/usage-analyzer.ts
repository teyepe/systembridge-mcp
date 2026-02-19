/**
 * Figma Usage Analyzer
 *
 * Analyzes token usage patterns in Figma designs by querying Figma MCP tools.
 * Maps Figma variables → local tokens and analyzes component-token relationships.
 */

import type { DesignToken } from "../types.js";
import { parseSemanticPath } from "../semantics/ontology.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FigmaUsageMap {
  /** File key */
  fileKey: string;
  /** Node ID analyzed */
  nodeId: string;
  /** Variables found in Figma */
  variables: FigmaVariable[];
  /** Mapping: Figma variable name → local token path */
  variableMapping: VariableMapping[];
  /** Summary metrics */
  metrics: UsageMetrics;
}

export interface FigmaVariable {
  /** Figma variable name (e.g., "icon/default/secondary") */
  name: string;
  /** Resolved value in Figma */
  value: string;
  /** Mapped local token path (if found) */
  localTokenPath?: string;
  /** Confidence of mapping (0-1) */
  mappingConfidence?: number;
}

export interface VariableMapping {
  /** Figma variable name */
  figmaVariable: string;
  /** Local token path */
  localToken: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Matching strategy used */
  strategy: "exact" | "normalized" | "semantic" | "value";
  /** Explanation */
  reason: string;
}

export interface UsageMetrics {
  /** Total Figma variables found */
  totalFigmaVariables: number;
  /** Variables mapped to local tokens */
  mappedVariables: number;
  /** Variables not mapped */
  unmappedVariables: number;
  /** Mapping success rate */
  mappingRate: number;
}

export interface ComponentTokenCoverage {
  /** Component name/ID */
  componentName: string;
  /** Figma node ID */
  nodeId: string;
  /** Expected tokens for this component (from ontology) */
  expectedTokens: string[];
  /** Tokens actually bound in Figma */
  boundTokens: string[];
  /** Tokens missing from Figma */
  missingTokens: string[];
  /** Properties using hardcoded values instead of tokens */
  hardcodedProperties: HardcodedProperty[];
  /** Coverage score (bound / expected) */
  coverageScore: number;
}

export interface HardcodedProperty {
  /** Property name (e.g., "fill", "stroke") */
  property: string;
  /** Hardcoded value */
  value: string;
  /** Suggested token to use */
  suggestedToken?: string;
}

export interface CrossReferenceReport {
  /** Tokens defined locally but not used in Figma */
  unusedInFigma: string[];
  /** Figma variables without local token definitions */
  missingLocalDefinitions: string[];
  /** Naming discrepancies (similar but not exact matches) */
  namingDiscrepancies: NamingDiscrepancy[];
  /** Sync status */
  syncStatus: "synced" | "partial" | "diverged";
  /** Sync score (0-1) */
  syncScore: number;
}

export interface NamingDiscrepancy {
  /** Figma variable name */
  figmaName: string;
  /** Local token path that's similar */
  localToken: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Suggested action */
  action: "rename-figma" | "rename-local" | "create-alias";
}

// ---------------------------------------------------------------------------
// Figma Variable Fetching (via MCP tools)
// ---------------------------------------------------------------------------

/**
 * NOTE: This module expects the Figma MCP tools to be available.
 * The actual MCP tool calls should be made from the tool layer (tools/designer.ts)
 * This module provides the analysis logic that processes the data returned by those calls.
 */

/**
 * Parse Figma variable definitions returned from mcp_figma_get_variable_defs
 * Expected format: { "variable/path/name": "#949494", ... }
 */
export function parseFigmaVariables(
  variableDefs: Record<string, string>,
): FigmaVariable[] {
  const variables: FigmaVariable[] = [];
  
  for (const [name, value] of Object.entries(variableDefs)) {
    variables.push({
      name,
      value,
    });
  }
  
  return variables;
}

/**
 * Map Figma variables to local token paths using multiple strategies
 */
export function mapVariablesToTokens(
  figmaVariables: FigmaVariable[],
  localTokens: Map<string, DesignToken>,
): VariableMapping[] {
  const mappings: VariableMapping[] = [];
  const tokenPaths = Array.from(localTokens.keys());
  
  for (const variable of figmaVariables) {
    // Strategy 1: Exact match
    const exactMatch = tokenPaths.find(path => path === variable.name);
    if (exactMatch) {
      mappings.push({
        figmaVariable: variable.name,
        localToken: exactMatch,
        confidence: 1.0,
        strategy: "exact",
        reason: "Exact path match",
      });
      continue;
    }
    
    // Strategy 2: Normalized match (handle separator differences: / vs .)
    const normalized = normalizeVariableName(variable.name);
    const normalizedMatch = tokenPaths.find(path => 
      normalizeVariableName(path) === normalized
    );
    if (normalizedMatch) {
      mappings.push({
        figmaVariable: variable.name,
        localToken: normalizedMatch,
        confidence: 0.95,
        strategy: "normalized",
        reason: "Matched after normalizing separators (/ ↔ .)",
      });
      continue;
    }
    
    // Strategy 3: Semantic match (parse both as semantic tokens and compare)
    const semanticMatch = findSemanticMatch(variable.name, tokenPaths);
    if (semanticMatch) {
      mappings.push({
        figmaVariable: variable.name,
        localToken: semanticMatch.path,
        confidence: semanticMatch.confidence,
        strategy: "semantic",
        reason: `Matched by semantic structure: ${semanticMatch.reason}`,
      });
      continue;
    }
    
    // Strategy 4: Value match (same resolved value)
    const valueMatch = findValueMatch(variable.value, localTokens);
    if (valueMatch) {
      mappings.push({
        figmaVariable: variable.name,
        localToken: valueMatch.path,
        confidence: 0.7,
        strategy: "value",
        reason: `Matched by value: both resolve to "${variable.value}"`,
      });
      continue;
    }
  }
  
  return mappings;
}

/**
 * Analyze usage patterns: which Figma variables are used, how they map to local tokens
 */
export function analyzeVariableUsage(
  figmaVariables: FigmaVariable[],
  localTokens: Map<string, DesignToken>,
  mappings: VariableMapping[],
): FigmaUsageMap {
  // Apply mappings to variables
  const mappingMap = new Map(
    mappings.map(m => [m.figmaVariable, { path: m.localToken, confidence: m.confidence }])
  );
  
  for (const variable of figmaVariables) {
    const mapping = mappingMap.get(variable.name);
    if (mapping) {
      variable.localTokenPath = mapping.path;
      variable.mappingConfidence = mapping.confidence;
    }
  }
  
  const metrics: UsageMetrics = {
    totalFigmaVariables: figmaVariables.length,
    mappedVariables: mappings.length,
    unmappedVariables: figmaVariables.length - mappings.length,
    mappingRate: figmaVariables.length > 0 ? mappings.length / figmaVariables.length : 0,
  };
  
  return {
    fileKey: "", // Set by caller
    nodeId: "", // Set by caller
    variables: figmaVariables,
    variableMapping: mappings,
    metrics,
  };
}

/**
 * Analyze component-token coverage by comparing expected tokens to bound tokens
 */
export function analyzeComponentCoverage(
  componentName: string,
  nodeId: string,
  boundVariables: string[],
  expectedSurface: string[], // From COMPONENT_TOKEN_SURFACES
): ComponentTokenCoverage {
  const boundSet = new Set(boundVariables);
  const expectedSet = new Set(expectedSurface);
  
  const missingTokens = expectedSurface.filter(token => !boundSet.has(token));
  const boundTokens = boundVariables.filter(token => expectedSet.has(token));
  
  // Detect hardcoded properties (variables that don't match expected pattern)
  const hardcodedProperties: HardcodedProperty[] = [];
  for (const bound of boundVariables) {
    if (!expectedSet.has(bound)) {
      // This might be a hardcoded value or a token we don't expect
      hardcodedProperties.push({
        property: bound,
        value: "unknown", // Would need actual property inspection
      });
    }
  }
  
  const coverageScore = expectedSurface.length > 0
    ? boundTokens.length / expectedSurface.length
    : 1;
  
  return {
    componentName,
    nodeId,
    expectedTokens: expectedSurface,
    boundTokens,
    missingTokens,
    hardcodedProperties,
    coverageScore,
  };
}

/**
 * Cross-reference local tokens with Figma variables to find sync issues
 */
export function correlateTokensWithFigma(
  localTokens: Map<string, DesignToken>,
  figmaVariables: FigmaVariable[],
  mappings: VariableMapping[],
): CrossReferenceReport {
  const figmaVariableNames = new Set(figmaVariables.map(v => v.name));
  const mappedLocalTokens = new Set(mappings.map(m => m.localToken));
  
  // Find tokens not used in Figma
  const unusedInFigma: string[] = [];
  for (const [path] of localTokens) {
    // Only check semantic tokens (skip primitives)
    if (parseSemanticPath(path) && !mappedLocalTokens.has(path)) {
      unusedInFigma.push(path);
    }
  }
  
  // Find Figma variables without local definitions
  const missingLocalDefinitions: string[] = [];
  for (const variable of figmaVariables) {
    if (!variable.localTokenPath) {
      missingLocalDefinitions.push(variable.name);
    }
  }
  
  // Find naming discrepancies
  const namingDiscrepancies = findNamingDiscrepancies(
    missingLocalDefinitions,
    unusedInFigma,
  );
  
  // Determine sync status
  const totalIssues = unusedInFigma.length + missingLocalDefinitions.length;
  const totalItems = localTokens.size + figmaVariables.length;
  const syncScore = totalItems > 0 ? 1 - (totalIssues / totalItems) : 1;
  
  let syncStatus: "synced" | "partial" | "diverged";
  if (syncScore >= 0.95) {
    syncStatus = "synced";
  } else if (syncScore >= 0.7) {
    syncStatus = "partial";
  } else {
    syncStatus = "diverged";
  }
  
  return {
    unusedInFigma,
    missingLocalDefinitions,
    namingDiscrepancies,
    syncStatus,
    syncScore,
  };
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Normalize variable name for comparison (convert separators, lowercase)
 */
function normalizeVariableName(name: string): string {
  return name
    .toLowerCase()
    .replace(new RegExp("[/\\\\]", "g"), ".") // Convert / and \ to .
    .replace(/[-_]/g, ".") // Convert - and _ to .
    .replace(/\.+/g, "."); // Collapse multiple dots
}

/**
 * Find semantic match by parsing both as semantic tokens
 */
function findSemanticMatch(
  figmaVariable: string,
  tokenPaths: string[],
): { path: string; confidence: number; reason: string } | null {
  // Try to parse Figma variable as semantic token
  const figmaParsed = parseSemanticPath(normalizeVariableName(figmaVariable));
  if (!figmaParsed) return null;
  
  // Find tokens with matching semantic structure
  for (const path of tokenPaths) {
    const localParsed = parseSemanticPath(path);
    if (!localParsed) continue;
    
    // Compare semantic components
    let matches = 0;
    let total = 0;
    
    if (figmaParsed.propertyClass === localParsed.propertyClass) matches++;
    total++;
    
    if (figmaParsed.uxContext === localParsed.uxContext) matches++;
    total++;
    
    if (figmaParsed.intent === localParsed.intent) matches++;
    total++;
    
    if (figmaParsed.state === localParsed.state) matches++;
    total++;
    
    const confidence = matches / total;
    
    if (confidence >= 0.75) {
      return {
        path,
        confidence,
        reason: `${matches}/${total} semantic components match`,
      };
    }
  }
  
  return null;
}

/**
 * Find token with matching resolved value
 */
function findValueMatch(
  value: string,
  localTokens: Map<string, DesignToken>,
): { path: string } | null {
  for (const [path, token] of localTokens) {
    const resolvedValue = String(token.resolvedValue ?? token.value);
    if (resolvedValue === value) {
      return { path };
    }
  }
  return null;
}

/**
 * Find potential naming discrepancies using fuzzy matching
 */
function findNamingDiscrepancies(
  figmaVariables: string[],
  localTokens: string[],
): NamingDiscrepancy[] {
  const discrepancies: NamingDiscrepancy[] = [];
  
  for (const figmaName of figmaVariables) {
    const normalized = normalizeVariableName(figmaName);
    
    for (const localToken of localTokens) {
      const localNormalized = normalizeVariableName(localToken);
      const similarity = calculateSimilarity(normalized, localNormalized);
      
      if (similarity >= 0.7 && similarity < 1.0) {
        // Close but not exact match
        const action = determineAction(figmaName, localToken, similarity);
        
        discrepancies.push({
          figmaName,
          localToken,
          similarity,
          action,
        });
        break; // Only match once
      }
    }
  }
  
  return discrepancies;
}

/**
 * Calculate string similarity (Levenshtein distance based)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLength;
}

/**
 * Levenshtein distance (edit distance between two strings)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Determine recommended action for naming discrepancy
 */
function determineAction(
  figmaName: string,
  localToken: string,
  similarity: number,
): "rename-figma" | "rename-local" | "create-alias" {
  // Heuristic: if Figma name uses "/" and local uses ".", suggest Figma rename
  if (figmaName.includes("/") && localToken.includes(".")) {
    return "rename-figma";
  }
  
  // If very similar (>0.9), suggest alias
  if (similarity > 0.9) {
    return "create-alias";
  }
  
  // Default: suggest renaming whichever is less standard
  const figmaParsed = parseSemanticPath(normalizeVariableName(figmaName));
  const localParsed = parseSemanticPath(localToken);
  
  if (localParsed && !figmaParsed) {
    return "rename-figma";
  } else if (figmaParsed && !localParsed) {
    return "rename-local";
  }
  
  return "create-alias";
}
