/**
 * Style extraction module.
 *
 * Extracts design tokens from CSS and SCSS files.
 */

export { extractStyles } from "./extractor.js";
export type { ExtractStylesOptions, ExtractStylesResult } from "./extractor.js";
export { parseCssCustomProperties } from "./parsers/css.js";
export { parseScssVariables } from "./parsers/scss.js";
export type { ExtractedValue, SourceLocation } from "./parsers/types.js";
export {
  parseColorValue,
  parseDimensionValue,
  isColorValue,
  isDimensionValue,
} from "./value-extractor.js";
