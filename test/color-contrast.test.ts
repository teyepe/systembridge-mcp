import { describe, expect, it } from "vitest";
import { computeApca, computeContrast, computeWcag21 } from "../src/lib/color/index.js";

describe("Color contrast math", () => {
  it("computes stable WCAG baseline for black on white", () => {
    const wcag = computeWcag21("#000000", "#FFFFFF");
    expect(wcag).not.toBeNull();
    expect(wcag?.ratio).toBe(21);
    expect(wcag?.levelNormal).toBe("AAA");
  });

  it("returns APCA Lc in the expected magnitude", () => {
    const apcaNormal = computeApca("#000000", "#FFFFFF");
    const apcaReverse = computeApca("#FFFFFF", "#000000");

    expect(apcaNormal).not.toBeNull();
    expect(apcaReverse).not.toBeNull();

    // APCA for max contrast pair should be in ~100 range, not ~1.
    expect(Math.abs(apcaNormal!.lc)).toBeGreaterThan(100);
    expect(Math.abs(apcaReverse!.lc)).toBeGreaterThan(100);
    expect(apcaNormal!.lc).toBeGreaterThan(0);
    expect(apcaReverse!.lc).toBeLessThan(0);
    expect(apcaNormal!.level).toBe("body-text");
    expect(apcaReverse!.level).toBe("body-text");
  });

  it("combines WCAG and APCA in computeContrast", () => {
    const result = computeContrast("#777777", "#FFFFFF", "both");
    expect(result.wcag21).toBeTruthy();
    expect(result.apca).toBeTruthy();
    expect(result.wcag21?.ratio).toBeCloseTo(4.48, 2);
    expect(result.apca?.lc).not.toBe(0);
  });
});
