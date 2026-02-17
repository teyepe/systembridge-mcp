/**
 * Factory module — public API.
 */
export {
  loadTemplates,
  generateFromTemplate,
  type GeneratedTokenFile,
  type GenerationResult,
} from "./generator.js";
export {
  generateTonalPalette,
  generateModularScale,
  generateLinearScale,
  generateContrastPair,
} from "./algorithms.js";
