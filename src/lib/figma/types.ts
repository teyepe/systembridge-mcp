/**
 * Figma Integration Types
 *
 * Additional type definitions for Figma-token extraction, validation,
 * and documentation generation.
 */

import type { DesignToken, TokenFormat } from "../types.js";

// ---------------------------------------------------------------------------
// Token Extraction
// ---------------------------------------------------------------------------

export interface FigmaTokenExtractionOptions {
  /** Figma variable definitions (from mcp_figma_get_variable_defs) */
  figmaVariableDefs: Record<string, unknown>;
  /** Output format */
  format: TokenFormat;
  /** Include Figma-specific metadata (collection IDs, scopes) */
  includeMetadata: boolean;
  /** Filter to specific collections */
  collections?: string[];
}

export interface FigmaTokenExtractionResult {
  /** Extracted tokens in requested format */
  tokens: DesignToken[];
  /** Token count by type */
  summary: {
    total: number;
    byType: Record<string, number>;
    byCollection: Record<string, number>;
  };
  /** Mapping metadata: Figma collection ID → token paths */
  mappings: FigmaCollectionMapping[];
  /** Warnings encountered during extraction */
  warnings: string[];
}

export interface FigmaCollectionMapping {
  /** Figma collection ID */
  collectionId: string;
  /** Figma collection name */
  collectionName: string;
  /** Token paths extracted from this collection */
  tokenPaths: string[];
  /** Figma variable modes in this collection */
  modes: string[];
}

// ---------------------------------------------------------------------------
// Token Validation
// ---------------------------------------------------------------------------

export interface FigmaTokenValidationOptions {
  /** Figma variable definitions (from mcp_figma_get_variable_defs) */
  figmaVariableDefs: Record<string, unknown>;
  /** Local tokens to validate against */
  localTokens: Map<string, DesignToken>;
  /** Strict mode: fail on any mismatch */
  strict: boolean;
}

export interface FigmaTokenValidationResult {
  /** Overall validation status */
  valid: boolean;
  /** Sync status between Figma and local tokens */
  syncStatus: "synced" | "partial" | "diverged";
  /** Sync score (0-1) */
  syncScore: number;
  /** Validation errors (must fix) */
  errors: ValidationIssue[];
  /** Validation warnings (should fix) */
  warnings: ValidationIssue[];
  /** Statistics */
  stats: {
    totalFigmaVariables: number;
    totalLocalTokens: number;
    matched: number;
    mismatched: number;
    missingInFigma: number;
    missingLocally: number;
  };
}

export interface ValidationIssue {
  /** Issue severity */
  severity: "error" | "warning";
  /** Issue category */
  category: "naming" | "type" | "value" | "missing" | "unused";
  /** Figma variable name (if applicable) */
  figmaVariable?: string;
  /** Local token path (if applicable) */
  localToken?: string;
  /** Human-readable message */
  message: string;
  /** Suggested fix */
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Component Documentation
// ---------------------------------------------------------------------------

export interface ComponentDocumentationOptions {
  /** Component names to document */
  componentNames: string[];
  /** Figma component data (from mcp_figma_get_component_details) */
  figmaComponentData?: Record<string, FigmaComponentData>;
  /** Local tokens */
  localTokens: Map<string, DesignToken>;
  /** Include token reference tables */
  includeTokenRefs: boolean;
  /** Include code examples */
  includeCodeExamples: boolean;
  /** Output format */
  format: DocumentationFormat;
  /** Target language for code examples */
  codeLanguage?: "jsx" | "tsx" | "html" | "vue" | "svelte";
}

export type DocumentationFormat = "markdown-llm" | "mdx" | "json-schema";

export interface ComponentDocumentationResult {
  /** Generated documentation by component */
  docs: ComponentDocumentation[];
  /** Summary statistics */
  summary: {
    componentsDocumented: number;
    tokensReferenced: number;
    examplesGenerated: number;
  };
}

export interface ComponentDocumentation {
  /** Component name */
  name: string;
  /** Generated documentation string */
  content: string;
  /** Structured metadata */
  metadata: ComponentMetadata;
}

export interface ComponentMetadata {
  /** Component category */
  category: string;
  /** Description */
  description: string;
  /** Tokens used by this component */
  tokens: ComponentTokenReference[];
  /** Figma information */
  figma?: {
    nodeId: string;
    variants: string[];
    properties: string[];
  };
  /** Accessibility information */
  accessibility: {
    role: string;
    wcag: "A" | "AA" | "AAA";
    keyboardSupport: boolean;
    ariaAttributes: string[];
  };
}

export interface ComponentTokenReference {
  /** Token path */
  path: string;
  /** Token type */
  type: string;
  /** Resolved value */
  value: string;
  /** Purpose/usage context */
  purpose: string;
  /** Which component property uses this token */
  property: string;
}

// ---------------------------------------------------------------------------
// Figma Component Data (from Figma MCP)
// ---------------------------------------------------------------------------

export interface FigmaComponentData {
  /** Component ID */
  id: string;
  /** Component name */
  name: string;
  /** Component type */
  type: "COMPONENT" | "COMPONENT_SET";
  /** Description */
  description?: string;
  /** Component properties (for component sets) */
  properties?: FigmaComponentProperty[];
  /** Variants (for component sets) */
  variants?: FigmaComponentVariant[];
  /** Bound variables */
  boundVariables?: FigmaBoundVariable[];
  /** Documentation URL */
  documentationUrl?: string;
}

export interface FigmaComponentProperty {
  /** Property name */
  name: string;
  /** Property type */
  type: "VARIANT" | "BOOLEAN" | "TEXT" | "INSTANCE_SWAP";
  /** Default value */
  defaultValue?: string;
  /** Possible values (for VARIANT) */
  values?: string[];
}

export interface FigmaComponentVariant {
  /** Variant name */
  name: string;
  /** Property values that define this variant */
  properties: Record<string, string>;
  /** Node ID */
  nodeId: string;
}

export interface FigmaBoundVariable {
  /** Property bound to a variable */
  property: string;
  /** Variable name/ID */
  variableId: string;
  /** Variable name */
  variableName: string;
}
