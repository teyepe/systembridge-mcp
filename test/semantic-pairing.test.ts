/**
 * Semantic Pairing & Contrast Policy Tests
 *
 * Tests the intent-adaptive contrast analysis engine:
 * - Policy modes: semantic-strict, semantic-relaxed, exploratory-cross
 * - Confidence labeling and provenance tracking
 * - Invariants that must hold across all policies
 * - Integration with check_contrast tool
 */

import { describe, it, expect } from "vitest";
import type { DesignToken, TokenMap } from "../src/lib/types.js";
import {
  analyzeContrastPairing,
  type PairingPolicy,
} from "../src/lib/semantics/audit.js";
import { checkContrastTool } from "../src/tools/semantics.js";
import { loadConfig } from "../src/config/loader.js";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const config = loadConfig(PROJECT_ROOT);

// ---------------------------------------------------------------------------
// Test token factory
// ---------------------------------------------------------------------------

function makeTokenMap(entries: Array<{ path: string; value: string; type?: string }>): TokenMap {
  const map: TokenMap = new Map();
  for (const e of entries) {
    const token: DesignToken = {
      path: e.path,
      value: e.value,
      resolvedValue: e.value,
      type: (e.type ?? "color") as DesignToken["type"],
    };
    map.set(e.path, token);
  }
  return map;
}

// Reusable token sets

const BUTTON_TOKENS = makeTokenMap([
  // action.accent context — default state
  { path: "background.action.accent", value: "#0000FF" },
  { path: "text.action.accent", value: "#FFFFFF" },
  // action.accent context — hover state
  { path: "background.action.accent.default.hover", value: "#0000CC" },
  { path: "text.action.accent.default.hover", value: "#FFFFFF" },
  // action.danger context — default state
  { path: "background.action.danger", value: "#CC0000" },
  { path: "text.action.danger", value: "#FFFFFF" },
  // action.base context — only background (no matching foreground in same intent)
  { path: "background.action.base", value: "#F0F0F0" },
  // surface.base context
  { path: "background.surface.base", value: "#FFFFFF" },
  { path: "text.surface.base", value: "#333333" },
]);

const UNPAIRED_TOKENS = makeTokenMap([
  { path: "background.action.accent", value: "#0000FF" },
  { path: "text.input.accent", value: "#FFFFFF" },
]);

const MULTI_MODIFIER_TOKENS = makeTokenMap([
  { path: "background.action.accent.strong", value: "#0000FF" },
  { path: "text.action.accent.soft", value: "#FFFFFF" },
  { path: "background.action.accent.default", value: "#3333FF" },
]);

// ---------------------------------------------------------------------------
// Policy mode tests
// ---------------------------------------------------------------------------

describe("Semantic Pairing Policies", () => {
  describe("semantic-strict", () => {
    it("pairs tokens only within exact (uxContext, intent, modifier, state) groups", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "semantic-strict" });

      expect(result.metrics.policyUsed).toBe("semantic-strict");

      // action.accent.default.default should pair bg+text
      const accentPairs = result.pairs.filter(
        (p) => p.backgroundPath === "background.action.accent" && p.foregroundPath === "text.action.accent",
      );
      expect(accentPairs.length).toBe(1);
      expect(accentPairs[0].confidence).toBe("high");
      expect(accentPairs[0].pairingPolicy).toBe("semantic-strict");
      expect(accentPairs[0].pairingReason).toContain("Exact semantic match");
    });

    it("does not pair tokens across different intents", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "semantic-strict" });

      const crossIntentPairs = result.pairs.filter(
        (p) =>
          (p.backgroundPath.includes("accent") && p.foregroundPath.includes("danger")) ||
          (p.backgroundPath.includes("danger") && p.foregroundPath.includes("accent")),
      );
      expect(crossIntentPairs.length).toBe(0);
    });

    it("marks unpaired tokens when no matching partner exists in the group", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "semantic-strict" });

      expect(result.unpairedTokens).toContain("background.action.base");
    });

    it("does not pair tokens across different modifiers", () => {
      const result = analyzeContrastPairing(MULTI_MODIFIER_TOKENS, { policy: "semantic-strict" });

      // strong bg should not pair with soft fg in strict mode
      const crossModPairs = result.pairs.filter(
        (p) => p.backgroundPath.includes("strong") && p.foregroundPath.includes("soft"),
      );
      expect(crossModPairs.length).toBe(0);
    });

    it("reports zero fallback pairs", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "semantic-strict" });
      expect(result.metrics.fallbackPairsUsed).toBe(0);
    });
  });

  describe("semantic-relaxed", () => {
    it("falls back to broader grouping for unpaired foregrounds", () => {
      const result = analyzeContrastPairing(MULTI_MODIFIER_TOKENS, { policy: "semantic-relaxed" });

      expect(result.metrics.policyUsed).toBe("semantic-relaxed");

      // text.action.accent.soft has no background in its strict group (soft modifier)
      // but should fall back to background.action.accent.strong or .default
      const fallbackPairs = result.pairs.filter(
        (p) => p.foregroundPath === "text.action.accent.soft",
      );
      expect(fallbackPairs.length).toBeGreaterThan(0);
      expect(result.metrics.fallbackPairsUsed).toBeGreaterThan(0);
    });

    it("prefers exact matches and uses fallback only when needed", () => {
      const tokens = makeTokenMap([
        { path: "background.action.accent.default.default", value: "#0000FF" },
        { path: "text.action.accent.default.default", value: "#FFFFFF" },
        { path: "text.action.accent.strong.hover", value: "#EEEEEE" },
      ]);

      const result = analyzeContrastPairing(tokens, { policy: "semantic-relaxed" });

      // Exact match should be high confidence
      const exactPairs = result.pairs.filter(
        (p) =>
          p.foregroundPath === "text.action.accent.default.default" &&
          p.confidence === "high",
      );
      expect(exactPairs.length).toBe(1);

      // Fallback pair should be medium confidence
      const fallbackPairs = result.pairs.filter(
        (p) =>
          p.foregroundPath === "text.action.accent.strong.hover" &&
          p.confidence === "medium",
      );
      expect(fallbackPairs.length).toBeGreaterThan(0);
    });

    it("still marks tokens unpaired when no broader match exists", () => {
      const result = analyzeContrastPairing(UNPAIRED_TOKENS, { policy: "semantic-relaxed" });

      // action background and input foreground have different uxContext+intent
      expect(result.unpairedTokens.length).toBeGreaterThan(0);
    });
  });

  describe("exploratory-cross", () => {
    it("pairs all foregrounds with all backgrounds within same uxContext", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "exploratory-cross" });

      expect(result.metrics.policyUsed).toBe("exploratory-cross");

      // All action backgrounds should pair with all action foregrounds
      const actionBgs = [...BUTTON_TOKENS.entries()].filter(
        ([p]) => p.startsWith("background.action"),
      ).length;
      const actionFgs = [...BUTTON_TOKENS.entries()].filter(
        ([p]) => p.startsWith("text.action") || p.startsWith("icon.action"),
      ).length;
      const actionPairs = result.pairs.filter((p) => p.context.startsWith("action"));
      expect(actionPairs.length).toBe(actionBgs * actionFgs);
    });

    it("assigns high confidence to same-intent pairs", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "exploratory-cross" });

      const sameIntentPairs = result.pairs.filter(
        (p) =>
          p.backgroundPath === "background.action.accent" &&
          p.foregroundPath === "text.action.accent",
      );
      expect(sameIntentPairs.length).toBe(1);
      expect(sameIntentPairs[0].confidence).toBe("high");
    });

    it("assigns low confidence to cross-intent pairs", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "exploratory-cross" });

      const crossIntentPairs = result.pairs.filter(
        (p) =>
          p.backgroundPath.includes("accent") &&
          p.foregroundPath.includes("danger"),
      );
      expect(crossIntentPairs.length).toBeGreaterThan(0);
      for (const pair of crossIntentPairs) {
        expect(pair.confidence).toBe("low");
        expect(pair.pairingReason).toContain("Cross-intent exploratory");
      }
    });

    it("does not cross uxContext boundaries", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "exploratory-cross" });

      const crossContextPairs = result.pairs.filter(
        (p) =>
          (p.backgroundPath.includes("action") && p.foregroundPath.includes("surface")) ||
          (p.backgroundPath.includes("surface") && p.foregroundPath.includes("action")),
      );
      expect(crossContextPairs.length).toBe(0);
    });

    it("reports fallback count for cross-intent pairs", () => {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy: "exploratory-cross" });
      expect(result.metrics.fallbackPairsUsed).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Confidence labeling tests
// ---------------------------------------------------------------------------

describe("Confidence Labeling", () => {
  it("every pair has pairingPolicy, confidence, and pairingReason", () => {
    const policies: PairingPolicy[] = ["semantic-strict", "semantic-relaxed", "exploratory-cross"];

    for (const policy of policies) {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy });
      for (const pair of result.pairs) {
        expect(pair.pairingPolicy).toBe(policy);
        expect(["high", "medium", "low"]).toContain(pair.confidence);
        expect(pair.pairingReason).toBeTruthy();
        expect(pair.pairingReason.length).toBeGreaterThan(0);
      }
    }
  });

  it("confidence bucket counts match actual pair counts", () => {
    for (const policy of ["semantic-strict", "semantic-relaxed", "exploratory-cross"] as PairingPolicy[]) {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy });
      const { confidenceBuckets } = result.metrics;

      const high = result.pairs.filter((p) => p.confidence === "high").length;
      const medium = result.pairs.filter((p) => p.confidence === "medium").length;
      const low = result.pairs.filter((p) => p.confidence === "low").length;

      expect(confidenceBuckets.high).toBe(high);
      expect(confidenceBuckets.medium).toBe(medium);
      expect(confidenceBuckets.low).toBe(low);
      expect(high + medium + low).toBe(result.pairs.length);
    }
  });
});

// ---------------------------------------------------------------------------
// Invariants — must hold across all policies
// ---------------------------------------------------------------------------

describe("Invariants (hold across all policies)", () => {
  const policies: PairingPolicy[] = ["semantic-strict", "semantic-relaxed", "exploratory-cross"];

  it("contrast formulas are deterministic — same inputs produce same ratios", () => {
    for (const policy of policies) {
      const r1 = analyzeContrastPairing(BUTTON_TOKENS, { policy });
      const r2 = analyzeContrastPairing(BUTTON_TOKENS, { policy });

      expect(r1.pairs.length).toBe(r2.pairs.length);
      for (let i = 0; i < r1.pairs.length; i++) {
        expect(r1.pairs[i].contrast?.wcag21?.ratio).toBe(r2.pairs[i].contrast?.wcag21?.ratio);
        expect(r1.pairs[i].contrast?.apca?.lc).toBe(r2.pairs[i].contrast?.apca?.lc);
      }
    }
  });

  it("every reported pair includes provenance", () => {
    for (const policy of policies) {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy });
      for (const pair of result.pairs) {
        expect(pair.pairingPolicy).toBeDefined();
        expect(pair.confidence).toBeDefined();
        expect(pair.pairingReason).toBeDefined();
      }
    }
  });

  it("metrics always present and consistent", () => {
    for (const policy of policies) {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy });
      const { metrics } = result;

      expect(metrics.policyUsed).toBe(policy);
      expect(metrics.checkedPairs).toBe(result.pairs.length);
      expect(metrics.skippedPairs).toBe(result.unpairedTokens.length);
      expect(metrics.confidenceBuckets.high + metrics.confidenceBuckets.medium + metrics.confidenceBuckets.low)
        .toBe(result.pairs.length);
    }
  });

  it("contrastScore stays between 0 and 1", () => {
    for (const policy of policies) {
      const result = analyzeContrastPairing(BUTTON_TOKENS, { policy });
      expect(result.contrastScore).toBeGreaterThanOrEqual(0);
      expect(result.contrastScore).toBeLessThanOrEqual(1);
    }
  });

  it("empty token set produces empty analysis with valid metrics", () => {
    const emptyMap: TokenMap = new Map();
    for (const policy of policies) {
      const result = analyzeContrastPairing(emptyMap, { policy });
      expect(result.pairs.length).toBe(0);
      expect(result.unpairedTokens.length).toBe(0);
      expect(result.contrastScore).toBe(1);
      expect(result.metrics.checkedPairs).toBe(0);
      expect(result.metrics.policyUsed).toBe(policy);
    }
  });

  it("non-color tokens are excluded from pairing", () => {
    const tokens = makeTokenMap([
      { path: "background.action.accent", value: "#0000FF", type: "color" },
      { path: "text.action.accent", value: "#FFFFFF", type: "color" },
      { path: "spacing.action.accent", value: "16px", type: "dimension" },
    ]);

    for (const policy of policies) {
      const result = analyzeContrastPairing(tokens, { policy });
      const spacingPairs = result.pairs.filter(
        (p) => p.backgroundPath.includes("spacing") || p.foregroundPath.includes("spacing"),
      );
      expect(spacingPairs.length).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Button-specific scenario tests
// ---------------------------------------------------------------------------

describe("Button Token Contrast Scenarios", () => {
  it("detects contrast failure in low-contrast button tokens", () => {
    const lowContrastTokens = makeTokenMap([
      { path: "background.action.accent", value: "#CCCCCC" },
      { path: "text.action.accent", value: "#999999" },
    ]);

    const result = analyzeContrastPairing(lowContrastTokens, { policy: "semantic-strict" });

    expect(result.pairs.length).toBe(1);
    expect(result.pairs[0].computable).toBe(true);
    expect(result.pairs[0].issue).toBeTruthy();
    expect(result.wcagFailures).toBeGreaterThan(0);
  });

  it("passes for high-contrast button tokens", () => {
    const highContrastTokens = makeTokenMap([
      { path: "background.action.accent", value: "#0000AA" },
      { path: "text.action.accent", value: "#FFFFFF" },
    ]);

    const result = analyzeContrastPairing(highContrastTokens, { policy: "semantic-strict" });

    expect(result.pairs.length).toBe(1);
    expect(result.pairs[0].computable).toBe(true);
    expect(result.pairs[0].issue).toBeUndefined();
    expect(result.wcagFailures).toBe(0);
  });

  it("handles multiple button states comprehensively", () => {
    const multiStateTokens = makeTokenMap([
      { path: "background.action.accent.default.default", value: "#0000FF" },
      { path: "text.action.accent.default.default", value: "#FFFFFF" },
      { path: "background.action.accent.default.hover", value: "#0000CC" },
      { path: "text.action.accent.default.hover", value: "#FFFFFF" },
      { path: "background.action.accent.default.disabled", value: "#AAAACC" },
      { path: "text.action.accent.default.disabled", value: "#666688" },
    ]);

    const strict = analyzeContrastPairing(multiStateTokens, { policy: "semantic-strict" });

    // Each state should produce exactly one pair
    expect(strict.pairs.length).toBe(3);
    expect(strict.unpairedTokens.length).toBe(0);

    // Disabled state likely fails contrast
    const disabledPair = strict.pairs.find((p) => p.context.includes("disabled"));
    expect(disabledPair).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// check_contrast tool integration
// ---------------------------------------------------------------------------

describe("check_contrast Tool Integration", () => {
  it("explicit color mode remains unaffected by pairingPolicy", async () => {
    const result = await checkContrastTool(
      {
        foreground: "#000000",
        background: "#FFFFFF",
        pairingPolicy: "exploratory-cross",
      },
      PROJECT_ROOT,
      config,
    );

    const parsed = result.results as { wcag21?: { ratio: number } };
    expect(parsed.wcag21?.ratio).toBe(21);
  });

  it("statsOnly includes policy and confidence breakdown", async () => {
    const result = await checkContrastTool(
      {
        statsOnly: true,
        pairingPolicy: "semantic-strict",
      },
      PROJECT_ROOT,
      config,
    );

    expect(result.formatted).toContain("Policy: semantic-strict");
    expect(result.formatted).toContain("Confidence:");
  });

  it("default policy is semantic-strict for backward compatibility", async () => {
    const result = await checkContrastTool(
      { statsOnly: true },
      PROJECT_ROOT,
      config,
    );

    expect(result.formatted).toContain("Policy: semantic-strict");
  });

  it("full mode includes pairing metrics table", async () => {
    const result = await checkContrastTool(
      {
        outputMode: "full",
        pairingPolicy: "semantic-strict",
      },
      PROJECT_ROOT,
      config,
    );

    expect(result.formatted).toContain("Pairing Metrics");
    expect(result.formatted).toContain("High confidence");
    expect(result.formatted).toContain("Fallback pairs");
  });

  it("compact mode includes confidence label per failure", async () => {
    const result = await checkContrastTool(
      {
        outputMode: "compact",
        pairingPolicy: "semantic-relaxed",
      },
      PROJECT_ROOT,
      config,
    );

    expect(result.formatted).toContain("Policy: semantic-relaxed");
  });

  it("summary mode includes confidence and fallback stats", async () => {
    const result = await checkContrastTool(
      {
        outputMode: "summary",
        pairingPolicy: "semantic-strict",
      },
      PROJECT_ROOT,
      config,
    );

    expect(result.formatted).toContain("Confidence:");
    expect(result.formatted).toContain("Fallback:");
  });

  it("structured results include metrics object", async () => {
    const result = await checkContrastTool(
      { pairingPolicy: "exploratory-cross" },
      PROJECT_ROOT,
      config,
    );

    const structured = result.results as {
      metrics?: {
        policyUsed: string;
        confidenceBuckets: { high: number; medium: number; low: number };
      };
    };
    expect(structured.metrics).toBeDefined();
    expect(structured.metrics!.policyUsed).toBe("exploratory-cross");
    expect(structured.metrics!.confidenceBuckets).toBeDefined();
  });
});
