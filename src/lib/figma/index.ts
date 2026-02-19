/**
 * Figma integration module — public API.
 */
export {
  inferFigmaMappings,
  figmaSelectionToCoordinates,
  coordinatesToFigmaSelection,
  parseTokensStudioThemes,
  generateFigmaExport,
  type FigmaCollectionMapping,
  type FigmaVariableExport,
} from "./collections.js";

export {
  parseFigmaVariables,
  mapVariablesToTokens,
  analyzeVariableUsage,
  analyzeComponentCoverage,
  correlateTokensWithFigma,
  type FigmaUsageMap,
  type FigmaVariable,
  type VariableMapping,
  type UsageMetrics,
  type ComponentTokenCoverage,
  type HardcodedProperty,
  type CrossReferenceReport,
  type NamingDiscrepancy,
} from "./usage-analyzer.js";
