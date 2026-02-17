/**
 * Core type definitions for the Design System MCP.
 *
 * These types intentionally decouple the MCP from any single token format.
 * Adapters in lib/formats/ translate between vendor formats and this internal
 * representation so the rest of the system can work format-agnostically.
 */

// ---------------------------------------------------------------------------
// Token primitives
// ---------------------------------------------------------------------------

/** Supported token value types (W3C Design Tokens Community Group aligned). */
export type TokenType =
  | "color"
  | "dimension"
  | "fontFamily"
  | "fontWeight"
  | "fontStyle"
  | "duration"
  | "cubicBezier"
  | "number"
  | "string"
  | "boolean"
  | "shadow"
  | "border"
  | "gradient"
  | "typography"
  | "transition"
  | "custom";

/** A single resolved design token. */
export interface DesignToken {
  /** Fully-qualified path, e.g. "color.primary.500". */
  path: string;
  /** Raw value as authored (may be a reference like "{color.blue.500}"). */
  value: unknown;
  /** Resolved value after dereferencing aliases. */
  resolvedValue?: unknown;
  /** Token type hint. */
  type?: TokenType;
  /** Human-readable description / rationale. */
  description?: string;
  /** Arbitrary metadata the team wants to attach. */
  extensions?: Record<string, unknown>;
  /** Deprecation info if this token is being phased out. */
  deprecated?: {
    message: string;
    alternative?: string;
    removeBy?: string; // ISO date
  };
  /** Source file this token was read from. */
  source?: string;
  /** Original format the file was in. */
  sourceFormat?: TokenFormat;
}

/** A flat collection of tokens keyed by path. */
export type TokenMap = Map<string, DesignToken>;

// ---------------------------------------------------------------------------
// Token formats — adapters implement this interface
// ---------------------------------------------------------------------------

export type TokenFormat =
  | "style-dictionary"
  | "w3c-design-tokens"
  | "tokens-studio"
  | "custom";

/** Every format adapter must implement this. */
export interface TokenFormatAdapter {
  /** Identifier for the format. */
  readonly format: TokenFormat;
  /** Try to detect whether a parsed JSON/YAML object matches this format. */
  detect(data: unknown): boolean;
  /** Parse raw object into flat token list. */
  parse(data: unknown, sourcePath: string): DesignToken[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationResult {
  severity: ValidationSeverity;
  /** Rule identifier, e.g. "naming/kebab-case". */
  rule: string;
  /** Human-readable message. */
  message: string;
  /** Token path if applicable. */
  tokenPath?: string;
  /** Source file path if applicable. */
  file?: string;
  /** Suggested fix (actionable for migration). */
  suggestion?: string;
}

export interface ValidationRule {
  /** Unique rule id. */
  id: string;
  /** Short label for listing. */
  name: string;
  /** Longer description. */
  description: string;
  severity: ValidationSeverity;
  /** Return violations for the given token set. */
  validate(tokens: DesignToken[]): ValidationResult[];
}

export type ValidationPreset = "relaxed" | "recommended" | "strict";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface McpDsConfig {
  /** Glob patterns for token files. */
  tokenPaths: string[];
  /** Preferred token format (auto-detect if omitted). */
  tokenFormat?: TokenFormat;

  validation: {
    preset: ValidationPreset;
    /** Additional custom rule modules (future). */
    customRules?: string[];
    /** Rule overrides: ruleId → severity | false to disable. */
    overrides?: Record<string, ValidationSeverity | false>;
  };

  transformation: {
    /** Platforms to build for. */
    platforms: string[];
    /** Path to Style Dictionary config file or inline config. */
    styleDictionaryConfig?: string;
    /** Output directory for generated files. */
    buildPath?: string;
  };

  migration: {
    /** Glob patterns for files to update when tokens change. */
    updateCodePatterns: string[];
    /** Paths to exclude from code updates. */
    excludePaths: string[];
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface TokenSearchQuery {
  /** Free-text search against token path and description. */
  text?: string;
  /** Filter by token type. */
  type?: TokenType;
  /** Filter by path prefix (e.g. "color.semantic"). */
  pathPrefix?: string;
  /** Return only deprecated tokens. */
  deprecated?: boolean;
  /** Return only tokens whose value matches this pattern (regex string). */
  valuePattern?: string;
}

export interface TokenSearchResult {
  token: DesignToken;
  /** Why this result matched (which field matched the query). */
  matchReason: string;
}
