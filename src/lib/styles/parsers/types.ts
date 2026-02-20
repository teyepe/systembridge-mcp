/**
 * Types for style extraction parsers.
 */

export interface SourceLocation {
  file: string;
  line?: number;
  column?: number;
}

export interface ExtractedValue {
  /** Variable/token name (e.g. "color-primary" or "spacing-m") */
  name: string;
  /** Raw value string (e.g. "#007bff", "16px", "var(--other)") */
  value: string;
  /** CSS selector where found (e.g. ":root", "[data-theme=dark]") */
  selector?: string;
  /** Source file and location */
  source?: SourceLocation;
  /** Source type: css custom property or scss variable */
  sourceType: "css-custom-property" | "scss-variable";
}
