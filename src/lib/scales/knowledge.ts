/**
 * Knowledge base for mathematical scales in design systems.
 *
 * This module encodes design principles, industry standards, and mathematical
 * formulas used across design systems (Material Design, iOS HIG, Swiss style,
 * financial UIs, etc.). AI assistants use this knowledge to recommend scales
 * and validate designs.
 */

import type { ScaleConfig, ScaleDimension, ComplianceRule } from "./types.js";

// ---------------------------------------------------------------------------
// Musical Ratios (Classic Typography Scales)
// ---------------------------------------------------------------------------

/**
 * Musical ratios borrowed from music theory for harmonious typographic scales.
 * These create visually balanced hierarchies based on mathematical relationships.
 *
 * Reference: https://type-scale.com/
 */
export const MUSICAL_RATIOS = {
  "minor-second": {
    ratio: 1.067,
    interval: "15:16",
    description: "Subtle, refined hierarchy. Conservative.",
    useCases: ["Dense content", "Data tables", "Financial interfaces"],
  },
  "major-second": {
    ratio: 1.125,
    interval: "8:9",
    description: "Traditional book typography. Gentle contrast.",
    useCases: ["Documentation", "Long-form reading", "Swiss-style design"],
  },
  "minor-third": {
    ratio: 1.2,
    interval: "5:6",
    description: "Gentle, readable scale. Popular for body-heavy content.",
    useCases: ["Blogs", "Articles", "Educational content"],
  },
  "major-third": {
    ratio: 1.25,
    interval: "4:5",
    description: "Most common web scale. Balanced contrast.",
    useCases: ["Marketing sites", "Web apps", "General purpose"],
  },
  "perfect-fourth": {
    ratio: 1.333,
    interval: "3:4",
    description: "Strong typographic hierarchy. Clear distinction.",
    useCases: ["Landing pages", "Editorial design", "Bold statements"],
  },
  "augmented-fourth": {
    ratio: 1.414,
    interval: "1:√2",
    description: "Tritone. Dramatic tension. Rarely used.",
    useCases: ["Experimental design", "High contrast displays"],
  },
  "perfect-fifth": {
    ratio: 1.5,
    interval: "2:3",
    description: "Dramatic hierarchy. Large jumps between sizes.",
    useCases: ["Hero sections", "Display typography", "Marketing"],
  },
  "golden-ratio": {
    ratio: 1.618,
    interval: "φ (phi)",
    description: "Natural, organic feel. Based on Fibonacci.",
    useCases: ["Art-directed sites", "Portfolio", "Organic layouts"],
  },
} as const;

// ---------------------------------------------------------------------------
// Design Principles & Philosophies
// ---------------------------------------------------------------------------

/**
 * Codified design principles from various schools of thought.
 * Used by AI to recommend scales based on design goals.
 */
export const DESIGN_PRINCIPLES = {
  "swiss-style": {
    name: "Swiss/International Typography",
    description:
      "Mathematical precision, grid-based, objective clarity over decoration",
    recommendedRatios: [1.125, 1.2], // Major second, Minor third
    maxSteps: 7,
    spacing: {
      strategy: "linear" as const,
      base: 8,
      gridAlignment: 4,
    },
    typography: {
      lineHeight: 1.5,
      emphasis: "hierarchy-through-scale",
    },
    philosophy:
      "Limited hierarchy with precise mathematical relationships. Every element serves a purpose.",
    references: [
      "Josef Müller-Brockmann",
      "Karl Gerstner",
      "Helvetica typeface",
    ],
  },

  "financial-ui": {
    name: "Financial/Data-Dense UI",
    description: "High information density, scannable, compact spacing",
    recommendedRatios: [1.067, 1.125], // Minor second, Major second
    maxSteps: 6,
    spacing: {
      strategy: "linear" as const,
      base: 4,
      gridAlignment: 4,
    },
    typography: {
      baseSize: 12,
      lineHeight: 1.25,
      emphasis: "minimal-visual-noise",
    },
    density: "compact",
    philosophy:
      "Maximize information per pixel. Tight spacing, smaller type, reduced visual weight.",
    constraints: {
      minTouchTarget: 36, // Relaxed for mouse-heavy interfaces
      preferKeyboard: true,
    },
    examples: ["Bloomberg Terminal", "Trading platforms", "Analytics dashboards"],
  },

  "material-design": {
    name: "Material Design (Google)",
    description: "8dp grid system, elevation-based hierarchy",
    recommendedRatios: [1.25], // Major third (loosely applied)
    spacing: {
      strategy: "linear" as const,
      base: 8,
      step: 8,
      gridAlignment: 8,
    },
    typography: {
      baseSize: 16,
      lineHeight: 1.5,
      scale: [10, 12, 14, 16, 20, 24, 34, 45, 57, 96], // Custom scale
    },
    touchTargets: {
      minimum: 48, // 48dp × 48dp
      spacing: 8,
    },
    philosophy:
      "Physical metaphor. Everything aligns to 8dp grid. Tactile, elevation-based.",
    references: ["Material Design 3", "Android UI Guidelines"],
  },

  "ios-hig": {
    name: "iOS Human Interface Guidelines (Apple)",
    description: "8pt grid, SF Pro font system, clarity and deference",
    recommendedRatios: [1.125, 1.2],
    spacing: {
      strategy: "linear" as const,
      base: 8,
      step: 8,
      gridAlignment: 8,
    },
    typography: {
      baseSize: 17, // SF Pro Text default
      lineHeight: 1.4,
      dynamicType: true, // SF Pro Dynamic Type support
      scale: [11, 13, 15, 17, 20, 28, 34], // iOS standard sizes
    },
    touchTargets: {
      minimum: 44, // 44pt × 44pt
    },
    philosophy:
      "Clarity, deference, depth. Content takes priority. Gestures over buttons.",
    references: ["iOS HIG", "SF Pro font family", "Human Interface Guidelines"],
  },

  "tailwind-css": {
    name: "Tailwind CSS Utility System",
    description: "Pragmatic, permissive scale. Linear then doubling.",
    spacing: {
      strategy: "linear-then-exponential" as const,
      base: 0.25, // 0.25rem = 4px
      step: 0.25,
      linearUpTo: 12,
      unit: "rem" as const,
    },
    typography: {
      baseSize: 16,
      scale: [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128],
    },
    philosophy:
      "Utility-first. Every value is accessible. Pragmatic over dogmatic.",
    references: ["Tailwind CSS", "Utility-first CSS"],
  },

  "bootstrap": {
    name: "Bootstrap Framework",
    description: "Spacing utilities with rem-based scale",
    spacing: {
      strategy: "custom" as const,
      steps: [0, 0.25, 0.5, 1, 1.5, 3], // rem values
      unit: "rem" as const,
    },
    typography: {
      baseSize: 16,
      lineHeight: 1.5,
      scale: [16, 20, 24, 28, 32, 40], // h6 through h1
    },
    philosophy: "Pragmatic defaults for rapid prototyping.",
    references: ["Bootstrap 5", "Responsive design framework"],
  },

  "minimalist": {
    name: "Minimalist/Brutalist Design",
    description: "Extreme reduction. Limited scale, high contrast.",
    recommendedRatios: [1.5, 1.618], // Perfect fifth, Golden ratio
    maxSteps: 4,
    spacing: {
      strategy: "exponential" as const,
      base: 8,
    },
    typography: {
      baseSize: 16,
      lineHeight: 1.2, // Tighter
      emphasis: "extreme-contrast",
    },
    philosophy:
      "Remove everything unnecessary. What remains must be perfect.",
    examples: ["Portfolio sites", "Art galleries", "Experimental work"],
  },
} as const;

// ---------------------------------------------------------------------------
// Industry-Standard Scale Presets
// ---------------------------------------------------------------------------

/**
 * Pre-built scale configurations matching industry standards.
 * AI can use these as starting points or references.
 */
export const SCALE_PRESETS: Record<string, ScaleConfig> = {
  // ----- Spacing Scales -----

  "material-spacing": {
    strategy: "linear",
    base: 8,
    step: 8,
    count: 13,
    unit: "px",
    rounding: "grid-8",
  },

  "ios-spacing": {
    strategy: "linear",
    base: 8,
    step: 8,
    count: 13,
    unit: "px",
    rounding: "grid-8",
  },

  "tailwind-spacing": {
    strategy: "linear-then-exponential",
    base: 0.25,
    step: 0.25,
    linearUpTo: 12,
    count: 20,
    unit: "rem",
    rounding: "quarter",
  },

  "compact-spacing": {
    strategy: "linear",
    base: 4,
    step: 4,
    count: 16,
    unit: "px",
    rounding: "grid-4",
  },

  "fibonacci-spacing": {
    strategy: "fibonacci",
    base: 4,
    count: 10,
    unit: "px",
    rounding: "grid-4",
  },

  // ----- Typography Scales -----

  "modular-major-third": {
    strategy: "modular",
    base: 16,
    ratio: 1.25,
    count: 9,
    unit: "px",
    rounding: "integer",
  },

  "modular-perfect-fourth": {
    strategy: "modular",
    base: 16,
    ratio: 1.333,
    count: 8,
    unit: "px",
    rounding: "integer",
  },

  "modular-golden-ratio": {
    strategy: "modular",
    base: 16,
    ratio: 1.618,
    count: 7,
    unit: "px",
    rounding: "integer",
  },

  "linear-type-scale": {
    strategy: "linear",
    base: 12,
    step: 2,
    count: 10,
    unit: "px",
    rounding: "integer",
  },

  // ----- Radius Scales -----

  "border-radius-scale": {
    strategy: "exponential",
    base: 2,
    count: 6,
    unit: "px",
    max: 9999, // "full" radius
    rounding: "integer",
  },

  // ----- Shadow Scales -----

  "elevation-scale": {
    strategy: "exponential",
    base: 2,
    count: 5,
    unit: "px",
    rounding: "integer",
  },
};

// ---------------------------------------------------------------------------
// WCAG & Accessibility Standards
// ---------------------------------------------------------------------------

/**
 * Web Content Accessibility Guidelines (WCAG) compliance rules.
 */
export const WCAG_COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "wcag-2.2-touch-target-size",
    name: "Touch Target Size (WCAG 2.2 Level AAA)",
    severity: "error",
    dimension: "size",
    validate: (value, context) => {
      // Check if this is a touch target (button, interactive element)
      const isTouchTarget =
        context.path.includes("button") ||
        context.path.includes("touch-target") ||
        context.path.includes("min-height") ||
        context.path.includes("min-width");

      if (!isTouchTarget) return null;

      const MIN_SIZE = 44; // 44px minimum

      if (value < MIN_SIZE) {
        return {
          ruleId: "wcag-2.2-touch-target-size",
          severity: "error",
          message: `Touch target size ${value}px is below WCAG 2.2 minimum`,
          path: context.path,
          actualValue: value,
          expectedValue: `≥ ${MIN_SIZE}px`,
          suggestion: `Increase to at least ${MIN_SIZE}px for accessibility compliance`,
        };
      }

      return null;
    },
  },

  {
    id: "wcag-line-height-minimum",
    name: "Line Height Minimum (WCAG 2.1 SC 1.4.12)",
    severity: "warning",
    dimension: "lineHeight",
    validate: (value, context) => {
      const MIN_LINE_HEIGHT = 1.5;

      if (value < MIN_LINE_HEIGHT) {
        return {
          ruleId: "wcag-line-height-minimum",
          severity: "warning",
          message: `Line height ${value} is below recommended minimum`,
          path: context.path,
          actualValue: value,
          expectedValue: `≥ ${MIN_LINE_HEIGHT}`,
          suggestion: `Increase to at least ${MIN_LINE_HEIGHT} for better readability`,
        };
      }

      return null;
    },
  },

  {
    id: "material-grid-alignment",
    name: "Material Design 8dp Grid Alignment",
    severity: "info",
    dimension: "spacing",
    validate: (value, context) => {
      if (value === 0) return null;

      const isAligned = value % 8 === 0;

      if (!isAligned) {
        return {
          ruleId: "material-grid-alignment",
          severity: "info",
          message: `Value ${value}px is not aligned to 8dp grid`,
          path: context.path,
          actualValue: value,
          expectedValue: "Multiple of 8",
          suggestion: `Round to ${Math.round(value / 8) * 8}px for grid alignment`,
        };
      }

      return null;
    },
  },

  {
    id: "ios-grid-alignment",
    name: "iOS 8pt Grid Alignment",
    severity: "info",
    dimension: "spacing",
    validate: (value, context) => {
      if (value === 0) return null;

      const isAligned = value % 8 === 0;

      if (!isAligned) {
        return {
          ruleId: "ios-grid-alignment",
          severity: "info",
          message: `Value ${value}pt is not aligned to 8pt grid`,
          path: context.path,
          actualValue: value,
          expectedValue: "Multiple of 8",
          suggestion: `Round to ${Math.round(value / 8) * 8}pt for grid alignment`,
        };
      }

      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// Semantic Label Generation
// ---------------------------------------------------------------------------

/**
 * Generate semantic labels for scale values based on convention.
 */
export function generateScaleLabels(
  count: number,
  dimension: ScaleDimension,
): string[] {
  // Typography: xs, sm, base, lg, xl, 2xl, 3xl...
  if (dimension === "fontSize") {
    const labels: string[] = [];
    if (count >= 1) labels.push("xs");
    if (count >= 2) labels.push("sm");
    if (count >= 3) labels.push("base");
    if (count >= 4) labels.push("lg");
    if (count >= 5) labels.push("xl");
    for (let i = 6; i <= count; i++) {
      labels.push(`${i - 4}xl`);
    }
    return labels;
  }

  // Spacing: numeric (0, 1, 2, 3, 4, 6, 8, 10, 12...)
  if (dimension === "spacing") {
    // Tailwind-style: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16...
    const labels: string[] = [];
    for (let i = 0; i < Math.min(count, 7); i++) {
      labels.push(String(i));
    }
    if (count > 7) labels.push("8");
    if (count > 8) labels.push("10");
    if (count > 9) labels.push("12");
    if (count > 10) labels.push("16");
    if (count > 11) labels.push("20");
    if (count > 12) labels.push("24");
    if (count > 13) labels.push("32");
    if (count > 14) labels.push("40");
    return labels;
  }

  // Radius: none, sm, md, lg, xl, 2xl, full
  if (dimension === "radius") {
    const labels = ["none", "sm", "md", "lg", "xl", "2xl", "full"];
    return labels.slice(0, count);
  }

  // Default: numeric
  return Array.from({ length: count }, (_, i) => String(i));
}

// ---------------------------------------------------------------------------
// Scale Metadata & Formulas
// ---------------------------------------------------------------------------

/**
 * Get the mathematical formula for a scale strategy.
 */
export function getScaleFormula(strategy: string, config: Partial<ScaleConfig>): string {
  switch (strategy) {
    case "linear":
      return `a(n) = ${config.base ?? "base"} + n × ${config.step ?? "step"}`;
    case "exponential":
      return `a(n) = ${config.base ?? "base"} × 2^n`;
    case "modular":
      return `a(n) = ${config.base ?? "base"} × ${config.ratio ?? "ratio"}^n`;
    case "fibonacci":
      return `F(n) = F(n-1) + F(n-2), scaled by ${config.base ?? "base"}`;
    case "golden":
      return `a(n) = ${config.base ?? "base"} × φ^n (where φ ≈ 1.618)`;
    case "harmonic":
      return `a(n) = ${config.base ?? "base"} / n`;
    case "linear-then-exponential":
      return `Linear up to ${config.linearUpTo ?? 12}, then exponential`;
    default:
      return "Custom scale";
  }
}

/**
 * Get design principle recommendation based on use case.
 */
export function getPrincipleForUseCase(useCase: string): string | null {
  const lowerCase = useCase.toLowerCase();

  if (
    lowerCase.includes("financial") ||
    lowerCase.includes("trading") ||
    lowerCase.includes("data-dense") ||
    lowerCase.includes("analytics")
  ) {
    return "financial-ui";
  }

  if (
    lowerCase.includes("editorial") ||
    lowerCase.includes("blog") ||
    lowerCase.includes("article") ||
    lowerCase.includes("documentation")
  ) {
    return "swiss-style";
  }

  if (
    lowerCase.includes("marketing") ||
    lowerCase.includes("landing") ||
    lowerCase.includes("hero")
  ) {
    return "minimalist";
  }

  if (lowerCase.includes("mobile app") || lowerCase.includes("ios")) {
    return "ios-hig";
  }

  if (lowerCase.includes("android") || lowerCase.includes("material")) {
    return "material-design";
  }

  return null;
}
