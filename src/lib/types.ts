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

/** Token lifecycle state for smart filtering */
export type TokenLifecycle = "draft" | "active" | "deprecated";

/** Framework/language for usage examples */
export type ExampleFramework = "css" | "scss" | "react" | "vue" | "svelte" | "html" | "tailwind" | "swift" | "kotlin";

/** Usage example showing how to apply a token */
export interface TokenExample {
  /** Framework or language this example is for */
  framework: ExampleFramework;
  /** Code snippet showing token usage */
  code: string;
  /** Optional description or context */
  description?: string;
}

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
  /** Lifecycle state: draft (experimental), active (production-ready), deprecated (being phased out). */
  lifecycle?: TokenLifecycle;
  /** Usage examples showing how to apply this token in different frameworks */
  examples?: TokenExample[];
  /** Whether this token is private/internal (not for public consumption) */
  private?: boolean;
  /** Category for grouping (e.g., "spacing", "colors", "typography") */
  category?: string;
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

  // -- Extensibility (Phase 2 & 3) ----------------------------------------

  /** Search defaults for team consistency (Phase 3). */
  search?: {
    /** Include private tokens by default (default: false). */
    includePrivate?: boolean;
    /** Include draft tokens by default (default: false). */
    includeDraft?: boolean;
    /** Default categories to show (omit to show all). */
    defaultCategories?: string[];
    /** Show usage examples in search results (default: true). */
    showExamples?: boolean;
    /** Max results to return from search_tokens (default: 50). Overridable per-call. */
    defaultLimit?: number;
  };

  /** Default limits for tools that return large result sets. Reduces context/token usage. */
  limits?: {
    /** search_tokens max results (default: 50). */
    search?: number;
    /** resolve_theme max tokens (default: 100). */
    resolveTheme?: number;
    /** resolve_brand max tokens (default: 100). */
    resolveBrand?: number;
    /** plan_flow max UI patterns to suggest (default: 5). */
    planFlowMaxPatterns?: number;
    /** analyze_ui max color matches per input color (default: 5). */
    analyzeUiMaxColorMatches?: number;
  };

  /** Multi-dimensional theming configuration. */
  theming?: DimensionsConfig;

  /** Multi-brand configuration. */
  brands?: BrandsConfig;

  /** System factory / template configuration. */
  factory?: FactoryConfig;
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
  /** Filter by lifecycle state. If omitted, excludes draft tokens by default (like Dialtone). Set to 'all' to include everything. */
  lifecycle?: TokenLifecycle | "all";
  /** Include private/internal tokens. By default, private tokens are excluded. */
  includePrivate?: boolean;
  /** Filter by category (e.g., "spacing", "colors"). */
  category?: string;
  /** Return only tokens whose value matches this pattern (regex string). */
  valuePattern?: string;
  /** Max results to return. Falls back to config search.defaultLimit or limits.search, then 50. */
  limit?: number;
}

export interface TokenSearchResult {
  token: DesignToken;
  /** Why this result matched (which field matched the query). */
  matchReason: string;
  /** Formatted usage examples for display */
  formattedExamples?: string[];
}

// ---------------------------------------------------------------------------
// Dimensions & Themes
// ---------------------------------------------------------------------------

/**
 * A "dimension" is an axis along which tokens can vary.
 * Examples: color-scheme (light/dark), density (compact/comfortable/spacious),
 * contrast (standard/high), brand (alpha/beta).
 *
 * This is the core abstraction that unifies theming, branding, density,
 * contrast, and any future axis of variation.
 */
export interface TokenDimension {
  /** Unique identifier, e.g. "color-scheme", "density", "brand". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Description for tooling / docs. */
  description?: string;
  /** All possible values on this axis. */
  values: string[];
  /** The value to use when no explicit coordinate is provided. */
  defaultValue: string;
  /**
   * Priority for resolution ordering — lower = resolved first.
   * Useful when one dimension's values depend on another.
   */
  priority?: number;
  /**
   * Optional mapping to Figma variable collection modes.
   * Enables roundtrip with Figma's variable collections.
   */
  figmaCollection?: string;
}

/**
 * A coordinate pins a single dimension to a specific value.
 * A full "theme" is a set of coordinates — one per dimension.
 */
export interface ThemeCoordinate {
  /** Dimension id. */
  dimension: string;
  /** Chosen value for that dimension. */
  value: string;
}

/**
 * A named theme — a named set of coordinates.
 * E.g. "Dark Compact" = [{ dimension: "color-scheme", value: "dark" },
 *                         { dimension: "density", value: "compact" }]
 */
export interface ThemeDefinition {
  /** Unique theme id, e.g. "dark-compact". */
  id: string;
  /** Display name. */
  name: string;
  description?: string;
  /** The dimensional coordinates that define this theme. */
  coordinates: ThemeCoordinate[];
}

/**
 * A conditional token value — ties a value to a set of dimensional
 * coordinates.  When multiple conditions exist for a token, the one
 * whose coordinates best match the active theme is used.
 *
 * Stored in the W3C `$extensions` under `com.systembridge-mcp.conditions`.
 */
export interface ConditionalTokenValue {
  /** Coordinates that must be active for this value to apply. */
  when: ThemeCoordinate[];
  /** The token value to use when the condition matches. */
  value: unknown;
}

/**
 * A "token set" is a named collection of token files that represents
 * one point on one or more dimensions.
 *
 * Tokens Studio uses this concept natively. For W3C tokens we infer
 * sets from file organization or `$extensions`.
 */
export interface TokenSet {
  /** Unique set id, e.g. "global", "dark", "brand-beta". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** File globs that belong to this set. */
  paths: string[];
  /**
   * Which dimensional coordinates this set provides values for.
   * An empty array means it's the "base" set (always active).
   */
  coordinates: ThemeCoordinate[];
}

// ---------------------------------------------------------------------------
// Multi-Brand
// ---------------------------------------------------------------------------

/**
 * Brand configuration — a named identity with its own token sources,
 * dimension defaults, and generation options.
 */
export interface BrandConfig {
  /** Unique brand id. */
  id: string;
  /** Display name. */
  name: string;
  /** Optional description. */
  description?: string;
  /**
   * Glob patterns for brand-specific token files.
   * Loaded on top of the base token paths.
   */
  tokenPaths?: string[];
  /**
   * Which token sets to enable for this brand.
   */
  tokenSets?: string[];
  /**
   * Default dimensional overrides for this brand.
   * E.g. brand "Beta" might default to a different color-scheme.
   */
  dimensionDefaults?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// System Factory / Templates
// ---------------------------------------------------------------------------

/** Algorithm used to generate a set of tokens from seed values. */
export type GenerationAlgorithm =
  | "tonal-palette"     // Generate a tonal scale from a key color
  | "modular-scale"     // Generate sizes using a ratio
  | "linear-scale"      // Generate sizes with even steps
  | "contrast-pair"     // Generate accessible color pairs
  | "custom";           // User-provided function

/**
 * A parameter that a template expects the user to provide.
 */
export interface TemplateParameter {
  /** Parameter id, e.g. "keyColor", "baseSize". */
  id: string;
  /** Display name. */
  name: string;
  description?: string;
  /** Expected type. */
  type: "color" | "number" | "string" | "boolean" | "dimension";
  /** Default if the user doesn't provide one. */
  defaultValue?: unknown;
  /** Validation constraints. */
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

/**
 * A system template — a blueprint that can generate a full or partial
 * token system from a set of seed parameters.
 */
export interface SystemTemplate {
  /** Template id. */
  id: string;
  /** Display name. */
  name: string;
  description?: string;
  /** Parameters the template requires. */
  parameters: TemplateParameter[];
  /** Dimensions the template can produce tokens for. */
  dimensions?: string[];
  /** The generation algorithms the template uses. */
  algorithms: GenerationAlgorithm[];
  /**
   * Path to the template module (relative to config root).
   * The module must export a `generate(params)` function.
   */
  modulePath?: string;
}

// ---------------------------------------------------------------------------
// Extended Config
// ---------------------------------------------------------------------------

export interface DimensionsConfig {
  /** Dimension definitions. */
  dimensions: TokenDimension[];
  /** Named themes (pre-composed coordinate sets). */
  themes?: ThemeDefinition[];
  /** Token sets and their dimensional mappings. */
  tokenSets?: TokenSet[];
}

export interface BrandsConfig {
  /** Available brands. */
  brands: BrandConfig[];
  /** Default brand id. */
  defaultBrand?: string;
}

export interface FactoryConfig {
  /** Paths to template definition files (JSON/YAML). */
  templatePaths?: string[];
  /** Inline template definitions. */
  templates?: SystemTemplate[];
}
