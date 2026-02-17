/**
 * Color Utility Module
 *
 * Provides color parsing, contrast computation (WCAG 2.1 + APCA),
 * and format conversion utilities.
 *
 * WCAG 2.1 and APCA algorithms are implemented using pure math
 * (no external dependency), operating on hex color strings.
 */

import type { DesignToken, TokenMap } from "../types.js";

// ---------------------------------------------------------------------------
// Color parsing (hex-only sync; advanced formats async via colorjs.io)
// ---------------------------------------------------------------------------

/**
 * Normalise a hex color string to #RRGGBB (uppercase).
 * Returns null for non-hex or unresolved reference values.
 */
export function normalizeHex(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  raw = raw.trim();

  // Skip unresolved references like {color.blue.500}
  if (raw.includes("{") && raw.includes("}")) return null;

  // #RGB or #RGBA shorthand → full form
  const short = raw.match(/^#([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i);
  if (short) {
    const [, r, g, b] = short;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  // #RRGGBB or #RRGGBBAA
  if (/^#[a-f\d]{6}([a-f\d]{2})?$/i.test(raw)) {
    return raw.substring(0, 7).toUpperCase();
  }

  return null;
}

// ---------------------------------------------------------------------------
// Contrast computation
// ---------------------------------------------------------------------------

/** WCAG 2.1 contrast level. */
export type WcagLevel = "AAA" | "AA" | "fail";

/** APCA descriptive usage level. */
export type ApcaLevel =
  | "body-text"
  | "large-text"
  | "sub-fluent"
  | "non-text"
  | "decorative"
  | "fail";

/** Result of a WCAG 2.1 contrast check. */
export interface Wcag21Result {
  algorithm: "wcag21";
  /** Contrast ratio, e.g. 4.72 */
  ratio: number;
  /** Level achieved for normal text */
  levelNormal: WcagLevel;
  /** Level achieved for large text */
  levelLarge: WcagLevel;
  /** Level achieved for UI components (non-text) */
  levelComponent: WcagLevel;
}

/** Result of an APCA contrast check. */
export interface ApcaResult {
  algorithm: "apca";
  /** Lightness contrast value (Lc). Absolute value used for thresholds. */
  lc: number;
  /** Descriptive level based on |Lc| */
  level: ApcaLevel;
}

/** Combined contrast result (may contain WCAG 2.1, APCA, or both). */
export interface ContrastResult {
  wcag21?: Wcag21Result | null;
  apca?: ApcaResult | null;
}

// WCAG 2.1 thresholds
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3;
const WCAG_AAA_NORMAL = 7;
const WCAG_AAA_LARGE = 4.5;
const WCAG_AA_COMPONENT = 3;

// APCA thresholds (|Lc| values)
const APCA_BODY_TEXT = 75;
const APCA_LARGE_TEXT = 60;
const APCA_SUB_FLUENT = 45;
const APCA_NON_TEXT = 30;
const APCA_DECORATIVE = 15;

// APCA-W3 constants (0.0.98G-4g)
const APCA = {
  normBG: 0.56,
  normTXT: 0.57,
  revBG: 0.65,
  revTXT: 0.62,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  loClip: 0.1,
  deltaYmin: 0.0005,
} as const;

/** Linearise a single sRGB channel (0-255 → linear 0-1). */
function srgbLinearize(chan: number): number {
  const v = chan / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Compute WCAG 2.1 contrast ratio between foreground and background hex colors.
 */
export function computeWcag21(fg: string, bg: string): Wcag21Result | null {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return null;

  const fgLum = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLum = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const ratio = Math.round(contrastRatio(fgLum, bgLum) * 100) / 100;

  return {
    algorithm: "wcag21",
    ratio,
    levelNormal:
      ratio >= WCAG_AAA_NORMAL ? "AAA" : ratio >= WCAG_AA_NORMAL ? "AA" : "fail",
    levelLarge:
      ratio >= WCAG_AAA_LARGE ? "AAA" : ratio >= WCAG_AA_LARGE ? "AA" : "fail",
    levelComponent:
      ratio >= WCAG_AA_COMPONENT ? "AA" : "fail",
  };
}

/**
 * Compute APCA lightness contrast (Lc) between foreground and background hex colors.
 * Implements APCA-W3 0.0.98G-4g algorithm.
 */
export function computeApca(fg: string, bg: string): ApcaResult | null {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return null;

  // Compute luminance (Y) using sRGB linearisation + BT.709 coefficients
  const Ybg =
    0.2126729 * srgbLinearize(bgRgb.r) +
    0.7151522 * srgbLinearize(bgRgb.g) +
    0.0721750 * srgbLinearize(bgRgb.b);
  const Ytxt =
    0.2126729 * srgbLinearize(fgRgb.r) +
    0.7151522 * srgbLinearize(fgRgb.g) +
    0.0721750 * srgbLinearize(fgRgb.b);

  // Soft clamp near-black
  const Rbg =
    Ybg > APCA.blkThrs
      ? Ybg
      : Ybg + Math.pow(APCA.blkThrs - Ybg, APCA.blkClmp);
  const Rtxt =
    Ytxt > APCA.blkThrs
      ? Ytxt
      : Ytxt + Math.pow(APCA.blkThrs - Ytxt, APCA.blkClmp);

  // Compute Lc with polarity detection
  let lc: number;
  if (Math.abs(Ybg - Ytxt) < APCA.deltaYmin) {
    lc = 0;
  } else if (Rbg > Rtxt) {
    // Normal polarity: light background, dark text
    const sapc =
      (Math.pow(Rbg, APCA.normBG) - Math.pow(Rtxt, APCA.normTXT)) *
      APCA.scaleBoW;
    lc = sapc < APCA.loClip ? 0 : sapc - APCA.loBoWoffset;
  } else {
    // Reverse polarity: dark background, light text
    const sapc =
      (Math.pow(Rbg, APCA.revBG) - Math.pow(Rtxt, APCA.revTXT)) *
      APCA.scaleWoB;
    lc = sapc > -APCA.loClip ? 0 : sapc + APCA.loWoBoffset;
  }

  lc = Math.round(lc * 10) / 10;
  const absLc = Math.abs(lc);

  let level: ApcaLevel;
  if (absLc >= APCA_BODY_TEXT) level = "body-text";
  else if (absLc >= APCA_LARGE_TEXT) level = "large-text";
  else if (absLc >= APCA_SUB_FLUENT) level = "sub-fluent";
  else if (absLc >= APCA_NON_TEXT) level = "non-text";
  else if (absLc >= APCA_DECORATIVE) level = "decorative";
  else level = "fail";

  return { algorithm: "apca", lc, level };
}

/**
 * Compute contrast using the specified algorithm(s).
 */
export function computeContrast(
  fg: string,
  bg: string,
  algorithm: "wcag21" | "apca" | "both" = "both",
): ContrastResult {
  const result: ContrastResult = {};

  if (algorithm === "wcag21" || algorithm === "both") {
    result.wcag21 = computeWcag21(fg, bg);
  }
  if (algorithm === "apca" || algorithm === "both") {
    result.apca = computeApca(fg, bg);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Token-aware color resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a design token to a hex color string.
 *
 * Tries `resolvedValue` first, then `value`. Returns null if the value
 * can't be parsed as a hex color (e.g. still an unresolved reference).
 */
export function resolveTokenColor(
  token: DesignToken,
  _allTokens?: TokenMap,
): string | null {
  const raw = String(token.resolvedValue ?? token.value ?? "");
  return normalizeHex(raw);
}

// ---------------------------------------------------------------------------
// Low-level color conversions (extracted from factory/algorithms.ts)
// ---------------------------------------------------------------------------

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }

  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
