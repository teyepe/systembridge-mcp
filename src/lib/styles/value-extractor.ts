/**
 * Value extraction helpers for parsing CSS/SCSS values into canonical forms.
 */

/**
 * Parse and normalize a color value to hex format.
 * Supports: hex (#fff, #ffffff), rgb, rgba, hsl, hsla, named CSS colors.
 */
export function parseColorValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Hex short or long
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return normalizeHex(trimmed);
  }

  // rgb/rgba
  const rgbMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return rgbToHex(r, g, b);
  }

  // hsl/hsla - convert to hex (simplified, assumes s=100% or 0 for grays)
  const hslMatch = trimmed.match(/^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%(?:\s*,\s*[\d.]+)?\s*\)$/i);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10);
    const s = parseInt(hslMatch[2], 10) / 100;
    const l = parseInt(hslMatch[3], 10) / 100;
    return hslToHex(h, s, l);
  }

  // Named CSS colors - common subset
  const named = NAMED_COLORS[trimmed.toLowerCase()];
  if (named) return named;

  return null;
}

/** Simple named color map (common colors). */
const NAMED_COLORS: Record<string, string> = {
  transparent: "transparent",
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  maroon: "#800000",
  olive: "#808000",
  lime: "#00ff00",
  aqua: "#00ffff",
  teal: "#008080",
  navy: "#000080",
  fuchsia: "#ff00ff",
  purple: "#800080",
  orange: "#ffa500",
  yellow: "#ffff00",
};

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const h = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("")
  );
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  );
}

function normalizeHex(hex: string): string {
  const m = hex.slice(1).match(/^([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (m) {
    return (
      "#" +
      m[1] +
      m[1] +
      m[2] +
      m[2] +
      m[3] +
      m[3]
    ).toLowerCase();
  }
  return hex.toLowerCase();
}

/**
 * Parse a dimension value (px, rem, em, %).
 */
export function parseDimensionValue(
  value: string,
): { value: number; unit: string } | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(-?[\d.]+)\s*(px|rem|em|%|vh|vw|pt)?$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;
  return {
    value: num,
    unit: match[2] || "",
  };
}

/**
 * Check if a value looks like a color.
 */
export function isColorValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("hsl") ||
    trimmed.startsWith("color(") ||
    /^[a-z]+$/i.test(trimmed)
  );
}

/**
 * Check if a value looks like a dimension.
 */
export function isDimensionValue(value: string): boolean {
  return /^-?[\d.]+(px|rem|em|%|vh|vw|pt)?$/.test(value.trim());
}
