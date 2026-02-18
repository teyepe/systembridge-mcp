/**
 * Type definitions for the mathematical scale system.
 *
 * This module defines the core abstractions for generating, analyzing, and
 * transforming design token scales (spacing, typography, sizing, etc.).
 */

/**
 * Scale generation strategies based on mathematical progressions.
 */
export type ScaleStrategy =
  | "linear" // Constant step: 0, 4, 8, 12, 16...
  | "exponential" // Power progression: 4, 8, 16, 32, 64...
  | "modular" // Geometric/ratio-based: base × ratio^n
  | "fibonacci" // Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8...
  | "golden" // Golden ratio (φ ≈ 1.618) based
  | "harmonic" // Harmonic series: 1/n
  | "linear-then-exponential" // Hybrid: linear for small values, exponential beyond
  | "hybrid" // Hybrid scales (e.g., Tailwind)
  | "custom"; // User-defined values

/**
 * Configuration for generating a scale.
 */
export interface ScaleConfig {
  /** Scale generation strategy */
  strategy: ScaleStrategy;

  /** Base value (starting point) */
  base: number;

  /** Ratio for modular/geometric scales (e.g., 1.25, 1.618) */
  ratio?: number;

  /** Step size for linear scales */
  step?: number;

  /** Number of values to generate */
  count?: number;

  /** Custom values (for 'custom' strategy) */
  steps?: number[];

  /** CSS unit to append (px, rem, em, or empty string) */
  unit?: "px" | "rem" | "em" | "";

  /** Minimum value (clamp floor) */
  min?: number;

  /** Maximum value (clamp ceiling) */
  max?: number;

  /** Linear step count before switching to exponential (for hybrid) */
  linearUpTo?: number;

  /** Responsive/fluid configuration */
  responsive?: ResponsiveScaleConfig;

  /** Rounding strategy */
  rounding?: RoundingStrategy;
}

/**
 * Responsive scale configuration for viewport-aware sizing.
 */
export interface ResponsiveScaleConfig {
  /** Minimum viewport width (px) */
  minViewport: number;

  /** Maximum viewport width (px) */
  maxViewport: number;

  /** Scale factor at minimum viewport (e.g., 0.8 = 80% of base) */
  minScale?: number;

  /** Scale factor at maximum viewport (e.g., 1.2 = 120% of base) */
  maxScale?: number;

  /** Fluid growth factor (percentage, e.g., 0.1 = 10% growth) */
  fluidFactor?: number;

  /** Generate CSS clamp() values */
  useClamp?: boolean;
}

/**
 * Rounding strategy for generated values.
 */
export type RoundingStrategy =
  | "none" // No rounding (preserve decimals)
  | "integer" // Round to nearest integer
  | "quarter" // Round to nearest 0.25
  | "half" // Round to nearest 0.5
  | "grid-4" // Round to nearest 4 (4px grid alignment)
  | "grid-8"; // Round to nearest 8 (8px grid alignment)

/**
 * Generated scale with values and metadata.
 */
export interface Scale {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name?: string;

  /** Which dimension this scale applies to */
  dimension: ScaleDimension;

  /** Configuration used to generate this scale */
  config: ScaleConfig;

  /** Generated numeric values */
  values: number[];

  /** Labels/names for each value (e.g., 'xs', 'sm', 'base', 'lg') */
  labels: string[];

  /** Optional token paths if this scale is for tokens */
  tokens?: string[];

  /** CSS clamp() values (if responsive) */
  fluidValues?: string[];

  /** Metadata */
  metadata?: {
    /** When this scale was generated */
    generatedAt?: string;
    /** Mathematical formula used */
    formula?: string;
    /** Additional notes */
    notes?: string;
  };
}

/**
 * Which design dimension the scale applies to.
 */
export type ScaleDimension =
  | "spacing" // Margin, padding, gap
  | "fontSize" // Font sizes
  | "lineHeight" // Line heights
  | "letterSpacing" // Letter spacing / tracking
  | "radius" // Border radius
  | "size" // Width, height
  | "borderWidth" // Border widths
  | "shadow" // Shadow sizes
  | "opacity" // Opacity values
  | "duration" // Animation durations
  | "custom"; // Custom dimension

/**
 * Analysis result from detecting a scale's mathematical pattern.
 */
export interface ScaleAnalysis {
  /** Detected strategy with highest confidence */
  detectedStrategy: ScaleStrategy;

  /** Confidence score (0-1) for the detection */
  confidence: number;

  /** Base value (if applicable) */
  base?: number;

  /** Ratio (for modular scales) */
  ratio?: number;

  /** Step size (for linear scales) */
  step?: number;

  /** Exponent (for exponential scales) */
  exponent?: number;

  /** Detected parameters (consolidated) */
  parameters?: {
    base?: number;
    ratio?: number;
    step?: number;
    exponent?: number;
  };

  /** Values that don't fit the detected pattern */
  outliers: Array<{
    /** Index in the scale */
    index: number;
    /** The actual value */
    value: number;
    /** What the pattern predicts */
    expected?: number;
    /** Absolute deviation */
    deviation?: number;
    /** Relative deviation (percentage) */
    relativeDeviation?: number;
    /** Human-readable reason */
    reason?: string;
  }>;

  /** Actionable suggestions for improvement */
  suggestions: string[];

  /** Alternative strategies that also fit (lower confidence) */
  alternatives?: Array<{
    strategy: ScaleStrategy;
    confidence: number;
    base?: number;
    ratio?: number;
    step?: number;
  }>;

  /** Statistical metrics */
  metrics?: {
    /** Mean value */
    mean: number;
    /** Median value */
    median: number;
    /** Standard deviation */
    stdDev: number;
    /** Range (max - min) */
    range: number;
    /** Coefficient of variation */
    cv: number;
  };
}

/**
 * Density transformation configuration.
 */
export interface DensityTransformConfig {
  /** Source density mode (baseline) */
  sourceDensity?: string;

  /** Target density mode to generate */
  targetDensity: "compact" | "spacious";

  /** Transformation factor (overrides default) */
  factor?: number;

  /** Constraints to apply during transformation */
  constraints?: {
    /** Minimum touch target size (WCAG: 44px) */
    minTouchTarget?: number;

    /** Preserve interactive element sizes */
    preserveInteractive?: boolean;

    /** Preserve line heights */
    preserveLineHeight?: boolean;

    /** Preserve zero values */
    preserveZero?: boolean;

    /** Minimum value (don't scale below this) */
    minValue?: number;

    /** Maximum value (don't scale above this) */
    maxValue?: number;

    /** Paths to exclude from transformation */
    excludePaths?: string[];

    /** Paths to force transformation (override preserves) */
    forcePaths?: string[];

    /** Rounding strategy */
    roundTo?: "integer" | "half" | "quarter" | "none";
  };

  /** Rounding after transformation */
  rounding?: RoundingStrategy;
}

/**
 * Result of a density transformation.
 */
export interface DensityTransformResult {
  /** Transformed token map */
  tokens: Map<string, any>;

  /** Summary of changes */
  summary: {
    /** Total tokens processed */
    totalTokens: number;

    /** Tokens transformed */
    transformedTokens: number;

    /** Tokens preserved (skipped) */
    preservedTokens: number;

    /** Tokens clamped to constraints */
    clampedTokens: number;

    /** Average transformation factor applied */
    averageFactor: number;
  };

  /** Tokens that were clamped to constraints */
  clampedPaths: Array<{
    path: string;
    originalValue: number;
    transformedValue: number;
    clampedValue: number;
    reason: string;
  }>;
}

/**
 * Scale compliance audit configuration.
 */
export interface ScaleComplianceConfig {
  /** Design system to check against */
  standard?:
    | "wcag-2.1"
    | "wcag-2.2"
    | "material-design"
    | "ios-hig"
    | "custom";

  /** Custom compliance rules */
  rules?: ComplianceRule[];

  /** Token paths to audit */
  tokenPaths?: string[];

  /** Severity threshold (only report at or above this level) */
  severityThreshold?: "error" | "warning" | "info";
}

/**
 * Compliance rule definition.
 */
export interface ComplianceRule {
  /** Rule identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Rule severity */
  severity: "error" | "warning" | "info";

  /** Which dimension this rule applies to */
  dimension: ScaleDimension | "all";

  /** Validation function */
  validate: (value: number, context: ComplianceContext) => ComplianceViolation | null;
}

/**
 * Context passed to compliance validators.
 */
export interface ComplianceContext {
  /** Token path being validated */
  path: string;

  /** Token type */
  type?: string;

  /** All tokens (for cross-reference checks) */
  allTokens?: Map<string, any>;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Compliance violation.
 */
export interface ComplianceViolation {
  /** Rule ID that was violated */
  ruleId: string;

  /** Severity level */
  severity: "error" | "warning" | "info";

  /** Human-readable message */
  message: string;

  /** Token path */
  path: string;

  /** Actual value that violated the rule */
  actualValue: number;

  /** Expected value or range */
  expectedValue?: number | string;

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Result of a compliance audit.
 */
export interface ScaleComplianceResult {
  /** Overall compliance status */
  status: "pass" | "fail";

  /** Total tokens audited */
  totalTokens: number;

  /** Tokens that passed all rules */
  passedTokens: number;

  /** Tokens with violations */
  violatedTokens: number;

  /** All violations found */
  violations: ComplianceViolation[];

  /** Violations grouped by severity */
  violationsBySeverity: {
    error: ComplianceViolation[];
    warning: ComplianceViolation[];
    info: ComplianceViolation[];
  };

  /** Summary by rule */
  rulesSummary: Array<{
    ruleId: string;
    ruleName: string;
    violationCount: number;
    affectedPaths: string[];
  }>;
}
