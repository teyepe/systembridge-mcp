import { describe, it, expect } from "vitest";
import { generateFigmaMakeDocs } from "../src/lib/figma/make-guidelines.js";
import type { DesignToken, TokenMap } from "../src/lib/types.js";

describe("Figma Make Bridge", () => {
  it("generates master guidelines and token docs", () => {
    // 1. Setup mock tokens
    const tokens: TokenMap = new Map();
    const addToken = (path: string, type: any, value: any, desc?: string) => {
      const token: DesignToken = { path, type, value, description: desc };
      tokens.set(path, token);
    };

    addToken("color.semantic.action.accent.default", "color", "#0000FF", "Primary action");
    addToken("color.semantic.text.base", "color", "#333333", "Body text");
    addToken("spacing.4", "dimension", "16px");
    addToken("typography.body", "typography", { fontFamily: "Inter" });

    // 2. Generate docs
    const files = generateFigmaMakeDocs(tokens);

    // 3. Verify Master Guidelines
    const master = files.get("Guidelines.md");
    expect(master).toBeDefined();
    expect(master).toContain("# Design System Guidelines");
    expect(master).toContain("tokens/color.md");

    // 4. Verify Token Docs
    const colorDoc = files.get("tokens/color.md");
    expect(colorDoc).toBeDefined();
    expect(colorDoc).toContain("color.semantic.action.accent.default");
    expect(colorDoc).toContain("Primary action");

    const spacingDoc = files.get("tokens/spacing.md");
    expect(spacingDoc).toBeDefined();
    expect(spacingDoc).toContain("spacing.4");

    // 5. Verify Component Docs
    // Button should be auto-generated because it's in the ontology
    const buttonDoc = files.get("components/button.md");
    expect(buttonDoc).toBeDefined();
    expect(buttonDoc).toContain("# Button Component");
    expect(buttonDoc).toContain("background.action.accent"); // Derived from ontology
  });

  it("filters components when requested", () => {
    const tokens = new Map<string, DesignToken>();
    const files = generateFigmaMakeDocs(tokens, ["button"]);

    expect(files.has("components/button.md")).toBe(true);
    expect(files.has("components/input.md")).toBe(false); // Should be filtered out
  });
});
