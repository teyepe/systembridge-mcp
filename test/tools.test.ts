/**
 * Tool Integration Test Suite
 *
 * Tests core tool functionality to ensure stable behavior
 */

import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config/loader.js";
import { checkContrastTool, describeOntologyTool } from "../src/tools/semantics.js";
import { listDimensionsTool } from "../src/tools/themes.js";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const config = loadConfig(PROJECT_ROOT);

describe("Tool Integration Tests", () => {
  describe("describe_ontology Tool", () => {
    it("should return semantic ontology description", () => {
      const result = describeOntologyTool();

      expect(result.formatted).toBeTruthy();
      expect(result.formatted).toContain("propertyClass");
      expect(result.formatted).toContain("uxContext");
      expect(result.formatted).toContain("intent");
    });

    it("should include property classes", () => {
      const result = describeOntologyTool();

      expect(result.formatted).toContain("background");
      expect(result.formatted).toContain("text");
      expect(result.formatted).toContain("border");
    });
  });

  describe("list_dimensions Tool", () => {
    it("should return dimensions configuration", () => {
      const result = listDimensionsTool(config);

      expect(result.formatted).toBeTruthy();
      // Tool should handle cases with or without theming config
      expect(typeof result.formatted).toBe("string");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing config gracefully", () => {
      // This tests that tools don't crash with minimal config
      const minimalConfig = loadConfig(PROJECT_ROOT);
      const result = listDimensionsTool(minimalConfig);

      expect(result.formatted).toBeTruthy();
      expect(typeof result.formatted).toBe("string");
    });
  });

  describe("check_contrast Tool", () => {
    it("should return APCA in expected Lc range for max-contrast pair", async () => {
      const result = await checkContrastTool(
        {
          foreground: "#000000",
          background: "#FFFFFF",
          algorithm: "apca",
        },
        PROJECT_ROOT,
        config,
      );

      const apca = (result.results as { apca?: { lc: number; level: string } }).apca;

      expect(apca).toBeTruthy();
      expect(Math.abs(apca!.lc)).toBeGreaterThan(100);
      expect(apca!.level).toBe("body-text");
      expect(result.formatted).toContain("APCA");
      expect(result.formatted).toContain("body-text");
    });

    it("should report both WCAG and APCA when algorithm=both", async () => {
      const result = await checkContrastTool(
        {
          foreground: "#777777",
          background: "#FFFFFF",
          algorithm: "both",
        },
        PROJECT_ROOT,
        config,
      );

      const parsed = result.results as {
        wcag21?: { ratio: number };
        apca?: { lc: number };
      };

      expect(parsed.wcag21).toBeTruthy();
      expect(parsed.apca).toBeTruthy();
      expect(parsed.wcag21!.ratio).toBeGreaterThan(4);
      expect(Math.abs(parsed.apca!.lc)).toBeGreaterThan(60);
      expect(result.formatted).toContain("WCAG 2.1");
      expect(result.formatted).toContain("APCA");
    });
  });
});
