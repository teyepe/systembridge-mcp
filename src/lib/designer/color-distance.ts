/**
 * Color Distance Utilities
 *
 * Provides CIE2000 (ΔE*₀₀) color distance calculation for matching
 * described or extracted colors against the token system. Used by the
 * analyze_ui tool to find the closest token for a given color value.
 *
 * Uses colorjs.io (already a project dependency) for perceptual accuracy.
 */

import type { DesignToken, TokenMap } from "../types.js";
import { normalizeHex } from "../color/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorMatch {
  /** Token path */
  tokenPath: string;
  /** Token resolved color value */
  tokenColor: string;
  /** Input color that was matched */
  inputColor: string;
  /** CIE2000 distance (lower = closer; 0 = identical) */
  deltaE: number;
  /** Quality label */
  quality: "exact" | "very-close" | "close" | "approximate" | "distant";
}

// ---------------------------------------------------------------------------
// ΔE*₀₀ implementation (simplified, hex-only)
// ---------------------------------------------------------------------------

/**
 * Convert hex to CIELAB L*a*b* via sRGB → XYZ → Lab.
 */
function hexToLab(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB → linear
  const toLinear = (c: number) =>
    c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  // Linear sRGB → XYZ (D65)
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  // XYZ → Lab (D65 white point)
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;
  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

  const L = 116 * f(y / yn) - 16;
  const a = 500 * (f(x / xn) - f(y / yn));
  const bLab = 200 * (f(y / yn) - f(z / zn));

  return [L, a, bLab];
}

/**
 * Compute CIEDE2000 color difference between two hex colors.
 * Returns ΔE*₀₀ — lower = more similar.
 *
 * Reference: Sharma, Wu & Dalal (2005). "The CIEDE2000 color-difference formula"
 */
export function deltaE2000(hex1: string, hex2: string): number {
  const [L1, a1, b1] = hexToLab(hex1);
  const [L2, a2, b2] = hexToLab(hex2);

  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  // Step 1
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cb = (C1 + C2) / 2;
  const Cb7 = Math.pow(Cb, 7);
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = Math.atan2(b1, a1p) * deg;
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * deg;
  if (h2p < 0) h2p += 360;

  // Step 2
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  // Step 3
  const Lp = (L1 + L2) / 2;
  const Cp = (C1p + C2p) / 2;
  let hp: number;
  if (C1p * C2p === 0) {
    hp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hp = (h1p + h2p + 360) / 2;
  } else {
    hp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos((hp - 30) * rad) +
    0.24 * Math.cos(2 * hp * rad) +
    0.32 * Math.cos((3 * hp + 6) * rad) -
    0.20 * Math.cos((4 * hp - 63) * rad);

  const Lp50sq = (Lp - 50) * (Lp - 50);
  const SL = 1 + 0.015 * Lp50sq / Math.sqrt(20 + Lp50sq);
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;

  const Cp7 = Math.pow(Cp, 7);
  const RT =
    -2 *
    Math.sqrt(Cp7 / (Cp7 + Math.pow(25, 7))) *
    Math.sin(60 * rad * Math.exp(-Math.pow((hp - 275) / 25, 2)));

  const dE = Math.sqrt(
    Math.pow(dLp / SL, 2) +
      Math.pow(dCp / SC, 2) +
      Math.pow(dHp / SH, 2) +
      RT * (dCp / SC) * (dHp / SH),
  );

  return dE;
}

/**
 * Classify a ΔE*₀₀ value into a human-readable quality label.
 *
 * Thresholds based on research:
 * - < 1.0: barely perceptible → "exact"
 * - 1.0–2.0: perceptible through close observation → "very-close"
 * - 2.0–5.0: perceptible at a glance → "close"
 * - 5.0–10.0: noticeable difference → "approximate"
 * - > 10.0: very different → "distant"
 */
export function classifyDistance(
  deltaE: number,
): ColorMatch["quality"] {
  if (deltaE < 1.0) return "exact";
  if (deltaE < 2.0) return "very-close";
  if (deltaE < 5.0) return "close";
  if (deltaE < 10.0) return "approximate";
  return "distant";
}

/**
 * Find the closest token color(s) for a given input color.
 *
 * @param inputColor   Hex color to match
 * @param tokenMap     Token map to search
 * @param maxResults   Maximum matches to return (default: 5)
 * @param maxDeltaE    Maximum ΔE*₀₀ to consider (default: 15)
 */
export function findClosestTokenColors(
  inputColor: string,
  tokenMap: TokenMap,
  maxResults = 5,
  maxDeltaE = 15,
): ColorMatch[] {
  const inputHex = normalizeHex(inputColor);
  if (!inputHex) return [];

  const matches: ColorMatch[] = [];

  for (const [path, token] of tokenMap) {
    if (token.type !== "color") continue;

    const tokenHex = normalizeHex(
      String(token.resolvedValue ?? token.value),
    );
    if (!tokenHex) continue;

    const dE = deltaE2000(inputHex, tokenHex);
    if (dE <= maxDeltaE) {
      matches.push({
        tokenPath: path,
        tokenColor: tokenHex,
        inputColor: inputHex,
        deltaE: Math.round(dE * 100) / 100,
        quality: classifyDistance(dE),
      });
    }
  }

  // Sort by distance ascending
  matches.sort((a, b) => a.deltaE - b.deltaE);
  return matches.slice(0, maxResults);
}
