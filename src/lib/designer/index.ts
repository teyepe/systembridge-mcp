/**
 * Designer Module — barrel export
 *
 * Re-exports all designer-centric utilities for use by the MCP tools.
 */

export {
  type UIPattern,
  type PatternCategory,
  COMMON_UI_PATTERNS,
  getPattern,
  getPatternsByCategory,
  getUniqueComponents,
  getUniqueIntents,
  getUniqueContexts,
} from "./patterns.js";

export {
  type MatchResult,
  type PatternMatch,
  matchDescription,
} from "./component-matcher.js";

export {
  type TokenSurfaceResolution,
  type ContextTokenSurface,
  type GapAnalysis,
  type TokenSlot,
  resolveTokenSurface,
  analyzeGaps,
} from "./token-resolver.js";

export {
  type ColorMatch,
  deltaE2000,
  classifyDistance,
  findClosestTokenColors,
} from "./color-distance.js";
