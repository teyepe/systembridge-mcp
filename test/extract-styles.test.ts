import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseCssCustomProperties,
  parseScssVariables,
  extractStyles,
  parseColorValue,
  parseDimensionValue,
  isColorValue,
  isDimensionValue,
} from "../src/lib/styles/index.js";
import { extractStylesTool } from "../src/tools/styles.js";
import { loadConfig } from "../src/config/loader.js";

describe("extract_styles", () => {
  describe("value-extractor", () => {
    it("parseColorValue normalizes hex", () => {
      expect(parseColorValue("#fff")).toBe("#ffffff");
      expect(parseColorValue("#007bff")).toBe("#007bff");
    });
    it("parseColorValue handles rgb", () => {
      expect(parseColorValue("rgb(0, 123, 255)")).toBe("#007bff");
    });
    it("parseColorValue handles named colors", () => {
      expect(parseColorValue("blue")).toBe("#0000ff");
    });
    it("parseDimensionValue parses px and rem", () => {
      expect(parseDimensionValue("16px")).toEqual({ value: 16, unit: "px" });
      expect(parseDimensionValue("1.5rem")).toEqual({ value: 1.5, unit: "rem" });
    });
    it("isColorValue detects colors", () => {
      expect(isColorValue("#fff")).toBe(true);
      expect(isColorValue("rgb(0,0,0)")).toBe(true);
      expect(isColorValue("16px")).toBe(false);
    });
    it("isDimensionValue detects dimensions", () => {
      expect(isDimensionValue("16px")).toBe(true);
      expect(isDimensionValue("1.5rem")).toBe(true);
      expect(isDimensionValue("#fff")).toBe(false);
    });
  });

  describe("parseCssCustomProperties", () => {
    it("extracts CSS custom properties from :root", () => {
      const css = `
:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --spacing-m: 16px;
}
`;
      const result = parseCssCustomProperties(css, "styles/vars.css");
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: "color.primary",
        value: "#007bff",
        sourceType: "css-custom-property",
      });
      expect(result[1]).toMatchObject({
        name: "color.secondary",
        value: "#6c757d",
      });
      expect(result[2]).toMatchObject({
        name: "spacing.m",
        value: "16px",
      });
    });

    it("handles theme selector context", () => {
      const css = `
[data-theme="dark"] {
  --color-primary: #58a6ff;
}
`;
      const result = parseCssCustomProperties(css, "theme.css");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "color.primary",
        value: "#58a6ff",
        selector: '[data-theme="dark"]',
      });
    });

    it("returns empty array for empty content", () => {
      const result = parseCssCustomProperties("", "empty.css");
      expect(result).toHaveLength(0);
    });
  });

  describe("parseScssVariables", () => {
    it("extracts SCSS variables", () => {
      const scss = `
$color-primary: #007bff;
$spacing-m: 16px;
$font-family-base: "Inter", sans-serif;
`;
      const result = parseScssVariables(scss, "vars.scss");
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: "color.primary",
        value: "#007bff",
        sourceType: "scss-variable",
      });
      expect(result[1]).toMatchObject({
        name: "spacing.m",
        value: "16px",
      });
    });

    it("skips comment lines", () => {
      const scss = `
// $ignored: red;
$active: blue;
`;
      const result = parseScssVariables(scss, "test.scss");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("active");
    });

    it("strips trailing comments", () => {
      const scss = `$primary: #007bff; // main brand color`;
      const result = parseScssVariables(scss, "test.scss");
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("#007bff");
    });
  });

  describe("extractStyles", () => {
    it("extracts tokens from CSS and SCSS files", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "extract-styles-"));
      try {
        const cssPath = path.join(tmpDir, "vars.css");
        fs.writeFileSync(
          cssPath,
          `:root { --color-primary: #007bff; --spacing-m: 16px; }`,
          "utf-8",
        );
        const scssPath = path.join(tmpDir, "more.scss");
        fs.writeFileSync(
          scssPath,
          `$font-family-base: "Inter"; $border-radius: 8px;`,
          "utf-8",
        );

        const result = await extractStyles({
          projectRoot: tmpDir,
          stylePaths: ["**/*.css", "**/*.scss"],
        });

        expect(result.summary.filesScanned).toBe(2);
        expect(result.tokens.length).toBeGreaterThanOrEqual(4);

        const paths = result.tokens.map((t) => t.path);
        expect(paths).toContain("color.primary");
        expect(paths).toContain("spacing.m");
        expect(paths).toContain("font.family.base");
        expect(paths).toContain("border.radius");

        const colorToken = result.tokens.find((t) => t.path === "color.primary");
        expect(colorToken?.type).toBe("color");
        expect(colorToken?.value).toBe("#007bff");
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it("gracefully handles empty stylePaths", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "extract-empty-"));
      try {
        const result = await extractStyles({
          projectRoot: tmpDir,
          stylePaths: ["**/*.css"],
        });

        expect(result.summary.filesScanned).toBe(0);
        expect(result.tokens).toHaveLength(0);
        expect(result.warnings).toBeDefined();
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it("excludes node_modules", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "extract-exclude-"));
      try {
        const nodeModulesCss = path.join(tmpDir, "node_modules", "pkg", "style.css");
        fs.mkdirSync(path.dirname(nodeModulesCss), { recursive: true });
        fs.writeFileSync(
          nodeModulesCss,
          ":root { --ignored: red; }",
          "utf-8",
        );
        const srcCss = path.join(tmpDir, "src", "vars.css");
        fs.mkdirSync(path.dirname(srcCss), { recursive: true });
        fs.writeFileSync(srcCss, ":root { --color-primary: blue; }", "utf-8");

        const result = await extractStyles({
          projectRoot: tmpDir,
          stylePaths: ["**/*.css"],
          excludePaths: ["node_modules", "dist"],
        });

        expect(result.summary.filesScanned).toBe(1);
        const token = result.tokens.find((t) => t.path === "color.primary");
        expect(token?.value).toBe("blue");
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it("prefers CSS custom properties over SCSS when both define same path", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "extract-dedupe-"));
      try {
        const cssPath = path.join(tmpDir, "vars.css");
        fs.writeFileSync(
          cssPath,
          ":root { --color-primary: #007bff; }",
          "utf-8",
        );
        const scssPath = path.join(tmpDir, "vars.scss");
        fs.writeFileSync(
          scssPath,
          "$color-primary: #999999;",
          "utf-8",
        );

        const result = await extractStyles({
          projectRoot: tmpDir,
          stylePaths: ["**/*.css", "**/*.scss"],
        });

        const token = result.tokens.find((t) => t.path === "color.primary");
        expect(token).toBeDefined();
        expect(token?.value).toBe("#007bff");
        expect(token?.extensions?.["com.systembridge-mcp.styles"]?.sourceType).toBe("css-custom-property");
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it("handles var() reference values as string", async () => {
      const css = `
:root {
  --color-base: #007bff;
  --color-primary: var(--color-base);
}
`;
      const result = parseCssCustomProperties(css, "theme.css");
      expect(result).toHaveLength(2);
      const primary = result.find((r) => r.name === "color.primary");
      expect(primary?.value).toBe("var(--color-base)");
    });

    it("handles unreadable file gracefully", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "extract-error-"));
      try {
        const badPath = path.join(tmpDir, "bad.css");
        fs.writeFileSync(badPath, "");
        fs.chmodSync(badPath, 0o000);

        const result = await extractStyles({
          projectRoot: tmpDir,
          stylePaths: ["**/*.css"],
        });

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some((w) => w.includes("Failed to read"))).toBe(true);
      } finally {
        try {
          fs.chmodSync(path.join(tmpDir, "bad.css"), 0o644);
        } catch {
          // ignore
        }
        fs.rmSync(tmpDir, { recursive: true });
      }
    });
  });

  describe("extractStylesTool", () => {
    it("returns formatted output with token summary", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tool-test-"));
      try {
        fs.writeFileSync(
          path.join(tmpDir, "vars.css"),
          ":root { --color-primary: #007bff; }",
          "utf-8",
        );
        fs.writeFileSync(path.join(tmpDir, ".systembridge-mcp.json"), JSON.stringify({
          tokenPaths: ["tokens/**/*.json"],
          stylePaths: ["**/*.css"],
        }));

        const config = loadConfig(tmpDir);
        const result = await extractStylesTool(
          { stylePaths: ["**/*.css"] },
          tmpDir,
          config,
        );

        expect(result.formatted).toContain("# Style Token Extraction");
        expect(result.formatted).toContain("**Total Tokens:** 1");
        expect(result.json.tokens).toHaveLength(1);
        expect(result.json.tokens[0].path).toBe("color.primary");
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it("writeToTokens creates file when requested", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tool-write-"));
      try {
        const tokensDir = path.join(tmpDir, "tokens");
        fs.mkdirSync(tokensDir, { recursive: true });
        fs.writeFileSync(
          path.join(tmpDir, "vars.css"),
          ":root { --color-primary: #007bff; }",
          "utf-8",
        );
        fs.writeFileSync(path.join(tmpDir, ".systembridge-mcp.json"), JSON.stringify({
          tokenPaths: ["tokens/**/*.json"],
          stylePaths: ["**/*.css"],
        }));

        const config = loadConfig(tmpDir);
        const result = await extractStylesTool(
          { stylePaths: ["**/*.css"], writeToTokens: true },
          tmpDir,
          config,
        );

        expect(result.json.filesWritten).toBeDefined();
        expect(result.json.filesWritten!.length).toBeGreaterThan(0);
        const writtenPath = path.join(tmpDir, result.json.filesWritten![0]);
        expect(fs.existsSync(writtenPath)).toBe(true);
        const content = JSON.parse(fs.readFileSync(writtenPath, "utf-8"));
        expect(content).toHaveProperty("color");
        expect(content.color).toHaveProperty("primary");
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });
  });
});
