/**
 * Type declarations for @adobe/leonardo-contrast-colors
 *
 * This is an optional peer dependency. The dynamic import in leonardo.ts
 * will fail gracefully at runtime if the package is not installed.
 */
declare module "@adobe/leonardo-contrast-colors" {
  export class Color {
    constructor(opts: {
      name: string;
      colorKeys: string[];
      ratios: number[];
      colorspace?: string;
      smooth?: boolean;
    });
  }

  export class BackgroundColor {
    constructor(opts: {
      name: string;
      colorKeys: string[];
      ratios?: number[];
    });
  }

  export class Theme {
    colors: Array<{
      name: string;
      values: Array<{ value: string }>;
    }>;
    constructor(opts: {
      colors: unknown[];
      backgroundColor: unknown;
      lightness: number;
    });
  }
}
