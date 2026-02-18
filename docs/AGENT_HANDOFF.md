# Agent Handoff Documentation

> **Purpose:** This document enables LLMs and AI agents to understand, maintain, and extend the mcp-ds codebase autonomously. It provides deep architectural context, design rationale, and practical guidance for evolution.

**Last Updated:** 2026-02-18  
**Codebase Version:** 0.1.0  
**Target Audience:** LLMs, AI agents, autonomous coding systems

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Codebase Structure](#codebase-structure)
3. [Core Abstractions](#core-abstractions)
4. [Design Decisions & Rationale](#design-decisions--rationale)
5. [Extension Points](#extension-points)
6. [How to Add Features](#how-to-add-features)
7. [Testing Strategy](#testing-strategy)
8. [Known Limitations](#known-limitations)
9. [Future Directions](#future-directions)
10. [Code Patterns](#code-patterns)

---

## Architecture Overview

### System Design

**mcp-ds** is a stateless MCP server that provides AI assistants with domain knowledge about design tokens and design systems. It follows a **layered architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│  MCP Protocol Layer (src/index.ts)                          │
│  • Tool registration (22 tools)                             │
│  • Prompt registration (6 prompts)                          │
│  • Zod schema validation                                    │
│  • McpServer from @modelcontextprotocol/sdk                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│  Tools Layer (src/tools/)                                   │
│  • Designer-centric: plan_flow, audit_design, analyze_ui    │
│  • Search & validation: search_tokens, validate_tokens      │
│  • Semantics: scaffold, audit, coverage, ontology           │
│  • Colors: generate_palette, check_contrast                 │
│  • Themes: list/resolve brands, themes, dimensions          │
│  • Transform: transform_tokens, generate_system             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│  Library Layer (src/lib/)                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ semantics/         │ Ontology, scaffold, audit       │  │
│  │ designer/          │ Pattern matching, gap analysis  │  │
│  │ color/             │ WCAG, APCA, conversions         │  │
│  │ palette/           │ HSL, Leonardo, mapping          │  │
│  │ themes/            │ Multi-dimensional resolution    │  │
│  │ factory/           │ System generation algorithms    │  │
│  │ formats/           │ W3C, Tokens Studio, SD adapters │  │
│  │ validators/        │ Rule engine, presets            │  │
│  │ io/                │ File writing utilities          │  │
│  └──────────────────────────────────────────────────────┘  │
│  parser.ts      — Token file loading & resolution          │
│  types.ts       — Core type definitions (format-agnostic)  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input:** AI agent calls MCP tool with parameters (validated by Zod)
2. **Load:** Token files read from disk, parsed by format adapters
3. **Resolve:** References like `{color.blue.500}` dereferenced
4. **Process:** Business logic in library layer (ontology, algorithms)
5. **Output:** Formatted text (Markdown) + structured JSON returned to agent

### Key Principles

- **Format-agnostic:** Internal `DesignToken` interface, adapters for W3C/Tokens Studio/Style Dictionary
- **Immutable operations:** Never mutates loaded tokens, always returns new structures
- **Ontology-driven:** Semantic token structure based on CSS property classes + UX contexts
- **AI-first:** Tools designed for LLM consumption (detailed explanations, actionable output)
- **Designer-accessible:** High-level tools abstract technical complexity

---

## Codebase Structure

```
mcp-ds/
├── src/
│   ├── index.ts                    # MCP server entry point, tool registration
│   ├── config/
│   │   ├── defaults.ts             # Default configuration values
│   │   └── loader.ts               # Config file loading logic
│   ├── lib/
│   │   ├── types.ts                # Core type definitions
│   │   ├── parser.ts               # Token file loading & reference resolution
│   │   ├── color/
│   │   │   └── index.ts            # WCAG 2.1, APCA, color conversions
│   │   ├── designer/
│   │   │   ├── patterns.ts         # 22 UI patterns, keyword matching
│   │   │   ├── component-matcher.ts # NLP-based component matching
│   │   │   ├── token-resolver.ts   # Token surface resolution, gap analysis
│   │   │   ├── color-distance.ts   # CIEDE2000 perceptual color distance
│   │   │   └── index.ts            # Barrel export
│   │   ├── factory/
│   │   │   ├── algorithms.ts       # Token generation algorithms
│   │   │   ├── generator.ts        # Full system generation
│   │   │   └── index.ts
│   │   ├── figma/
│   │   │   ├── collections.ts      # Figma variable collection helpers
│   │   │   └── index.ts
│   │   ├── formats/
│   │   │   ├── style-dictionary.ts # Style Dictionary adapter
│   │   │   ├── w3c-dt.ts           # W3C DTCG adapter
│   │   │   ├── tokens-studio.ts    # Tokens Studio adapter
│   │   │   └── index.ts            # Format detection & parsing
│   │   ├── io/
│   │   │   └── writer.ts           # Token file writing utilities
│   │   ├── palette/
│   │   │   ├── types.ts            # Palette scale definitions
│   │   │   ├── mapping.ts          # Palette → semantic mapping
│   │   │   ├── strategies/
│   │   │   │   ├── hsl.ts          # HSL-based palette generation
│   │   │   │   ├── leonardo.ts     # Leonardo APCA-based palette
│   │   │   │   ├── manual.ts       # Manual palette input
│   │   │   │   └── import.ts       # Import existing palettes
│   │   │   └── index.ts
│   │   ├── semantics/
│   │   │   ├── ontology.ts         # (1350 lines) CORE KNOWLEDGE
│   │   │   ├── scaffold.ts         # Token scaffolding from components
│   │   │   ├── audit.ts            # Token compliance checking
│   │   │   ├── scoping.ts          # Scoping rule engine
│   │   │   └── index.ts
│   │   ├── style-dictionary-config.ts # SD transformation config
│   │   ├── themes/
│   │   │   ├── dimensions.ts       # Theme dimension definitions
│   │   │   ├── projection.ts       # Multi-dimensional token resolution
│   │   │   └── index.ts
│   │   └── validators/
│   │       ├── engine.ts           # Validation rule engine
│   │       └── presets.ts          # Pre-built validation presets
│   ├── prompts/                    # (empty, prompts in index.ts)
│   ├── resources/
│   │   └── tokens.ts               # Token resources for MCP
│   └── tools/
│       ├── brands.ts               # Brand management tools
│       ├── designer.ts             # Designer-centric tools (plan/audit/analyze)
│       ├── factory.ts              # System generation tools
│       ├── palette.ts              # Color palette tools
│       ├── search.ts               # Token search tool
│       ├── semantics.ts            # Semantic token tools
│       ├── themes.ts               # Theme management tools
│       ├── transform.ts            # Token transformation tools
│       └── validate.ts             # Validation tools
├── example-tokens/                 # Sample token files for testing
│   ├── core/                       # Primitive tokens (colors, spacing, etc.)
│   ├── semantic/                   # Semantic tokens
│   ├── component/                  # Component-specific tokens
│   └── themes/                     # Theme definitions
├── docs/
│   └── competitive-analysis.md     # Market research & feature gaps
├── mcp-ds.config.json              # Example configuration
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration (strict mode)
├── README.md                       # User-facing documentation
└── AGENT_HANDOFF.md                # This file
```

### File Size & Complexity

**Critical files** (read these first):

- `src/index.ts` (1148 lines) — MCP server, tool & prompt registration
- `src/lib/semantics/ontology.ts` (1350 lines) — **THE KNOWLEDGE CORE**
- `src/lib/types.ts` (394 lines) — Type system foundation
- `src/lib/parser.ts` (450 lines) — Token loading & resolution
- `src/tools/designer.ts` (818 lines) — Designer-centric intelligence

**High-impact modules:**

- `src/lib/semantics/` (3000+ lines total) — Semantic token intelligence
- `src/lib/designer/` (1300+ lines) — UI pattern matching & analysis
- `src/lib/palette/` (800+ lines) — Color palette generation

---

## Core Abstractions

### 1. `DesignToken` (src/lib/types.ts)

The internal representation of a design token, format-agnostic.

```typescript
interface DesignToken {
  path: string;              // "color.primary.500"
  value: unknown;            // "{color.blue.500}" or "#3B82F6"
  resolvedValue?: unknown;   // "#3B82F6" after reference resolution
  type?: TokenType;          // "color", "dimension", etc.
  description?: string;
  extensions?: Record<string, unknown>;
  deprecated?: {...};
  source?: string;           // File path
  sourceFormat?: TokenFormat;
}
```

### 2. `TokenMap` (src/lib/types.ts)

A `Map<string, DesignToken>` indexed by token path. This is the primary data structure passed between functions.

### 3. Semantic Token Ontology (src/lib/semantics/ontology.ts)

**The most important abstraction in the system.**

Semantic tokens follow this structure:

```
{propertyClass}.{uxContext}.{intent}[.{state}][.{modifier}]
```

**Components:**

- **PropertyClass** (11 types): `background`, `text`, `border`, `shadow`, `icon`, `width`, `size`, `radius`, `gap`, `weight`, `font`
- **UxContext** (6 types): `action`, `input`, `surface`, `feedback`, `navigation`, `data`
- **SemanticIntent** (8 types): `base`, `accent`, `danger`, `warning`, `success`, `info`, `muted`, `inverted`
- **InteractionState** (6 types): `default`, `hover`, `active`, `focus`, `disabled`, `selected`
- **EmphasisModifier** (4 types): `strong`, `subtle`, `inverted`, `high-contrast`

**Key exports:**

```typescript
// Component token surface definitions (22 components)
export const COMPONENT_TOKEN_SURFACES: ComponentTokenSurface[];

// Parse a semantic path into structured parts
export function parseSemanticPath(path: string): SemanticTokenName | null;
export function parseSemanticPathLenient(path: string): SemanticTokenName | null;

// Build a valid semantic path from parts
export function buildSemanticPath(parts: Partial<SemanticTokenName>): string;

// Get component surface definition
export function getComponentSurface(component: string): ComponentTokenSurface | undefined;

// Find which UX context owns a component
export function findComponentContext(component: string): UxContext | undefined;
```

### 4. `UIPattern` (src/lib/designer/patterns.ts)

Represents a screen-level UI pattern with associated components and token requirements.

```typescript
interface UIPattern {
  id: string;                  // "login-form"
  name: string;                // "Login Form"
  description: string;
  category: PatternCategory;   // "auth", "dashboard", etc.
  components: string[];        // ["button", "text-input", "card"]
  uxContexts: string[];        // ["action", "input", "surface"]
  intents: string[];           // ["base", "accent", "danger"]
  keywords: string[];          // ["login", "sign in", "email"]
  additionalTokenHints?: string[];
  screenExamples?: string[];   // ["Login", "Sign In"]
}
```

### 5. Token Format Adapters (src/lib/formats/)

Each format implements `TokenFormatAdapter`:

```typescript
interface TokenFormatAdapter {
  readonly format: TokenFormat;
  detect(data: unknown): boolean;
  parse(data: unknown, sourcePath: string): DesignToken[];
}
```

Adapters translate vendor formats → internal `DesignToken[]`.

---

## Design Decisions & Rationale

### Why Format-Agnostic?

**Problem:** Design token formats are fragmented (W3C DTCG, Tokens Studio, Style Dictionary, Figma Variables, each with different structures).

**Solution:** Define an internal `DesignToken` interface. Write adapters for each format. The rest of the codebase works with `DesignToken` and never touches raw JSON.

**Benefits:**
- Tools work across all formats
- Easy to add new formats (just implement `TokenFormatAdapter`)
- Future-proof against format evolution

### Why Semantic Naming?

**Problem:** Flat naming like `color-primary-500` doesn't capture intent. Designers ask "what blue for error states?" and the answer isn't obvious.

**Solution:** CSS property classes + UX contexts + intents. `background.action.danger` is self-documenting: "the background color for action elements (buttons) in danger state."

**Benefits:**
- Coverage matrix is computable (we know what slots need filling)
- Scaffolding is automatic (generate all combinations for a component)
- Accessibility pairing is built-in (`background.X.Y` → `text.X.Y`)

### Why UI Patterns?

**Problem:** Designers face "blank canvas syndrome" — they know what they need to build but not what tokens it requires.

**Solution:** Encode 22 common UI patterns (login, dashboard, data table, etc.) with their component inventories and token requirements. Match natural language descriptions → patterns → tokens.

**Benefits:**
- AI can plan token requirements from high-level descriptions
- Reduces "what do I need?" questions to pattern matching
- Extensible — add more patterns without changing the algorithm

### Why Pre-Built Prompts?

**Problem:** AI assistants are powerful but users don't know what sequences of tools to call.

**Solution:** Ship 6 orchestration prompts that encode best-practice workflows as multi-step tool call sequences.

**Benefits:**
- Lowers barrier to entry (one prompt vs. 5 manual tool calls)
- Encodes institutional knowledge (how to properly audit a design)
- Users can still call tools directly if needed

### Why CIEDE2000 for Color Matching?

**Problem:** Euclidean distance in RGB space doesn't match human perception. `#FF0000` and `#FE0000` are perceptually identical but Euclidean distance suggests they're different.

**Solution:** CIEDE2000 (ΔE*₀₀) is the industry-standard perceptual color distance metric. Implemented from scratch (no external lib) using the Sharma–Wu–Dalal (2005) formula.

**Benefits:**
- Accurate color matching ("which token matches this screenshot?")
- Industry-standard, well-documented algorithm
- Pure math, no async overhead

### Why Optimize `findMatchingToken`?

**Problem:** Original implementation: for each required slot (e.g., 116 slots for 3 components), scan the entire token map (1000+ tokens) and run lenient parsing on each. O(slots × tokens × parse_cost) = 116,000+ operations.

**Solution:** Pre-build a parsed index once (O(tokens)), then O(1) lookup per slot. Index keys are `"propertyClass|uxContext|intent|state"`.

**Benefits:**
- ~100x speedup for gap analysis on large token sets
- Scales to real-world token systems (5000+ tokens)
- No change to API surface

---

## Extension Points

### Adding a New Tool

**Steps:**

1. **Create tool function** in `src/tools/[category].ts`:

```typescript
export async function myNewTool(
  args: {
    // parameters
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{
  formatted: string;  // Markdown output for AI
  json: {             // Structured data
    // ...
  };
}> {
  // 1. Load tokens if needed
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);
  
  // 2. Business logic
  // ...
  
  // 3. Format output
  return {
    formatted: "Markdown here",
    json: { data: "here" }
  };
}
```

2. **Register in `src/index.ts`**:

```typescript
import { myNewTool } from "./tools/category.js";

server.tool(
  "my_new_tool",
  "Description of what the tool does",
  {
    param1: z.string().describe("Parameter description"),
    param2: z.number().optional().describe("Optional parameter"),
  },
  async (args) => {
    const { formatted } = await myNewTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);
```

3. **Build & test**:

```bash
npm run build
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"my_new_tool","arguments":{...}},"id":1}' | npm start
```

### Adding a UI Pattern

Edit `src/lib/designer/patterns.ts`:

```typescript
export const COMMON_UI_PATTERNS: UIPattern[] = [
  // ... existing patterns
  {
    id: "my-pattern",
    name: "My Pattern",
    description: "What this pattern is for",
    category: "form", // or "auth", "dashboard", etc.
    components: ["component-a", "component-b"],
    uxContexts: ["input", "action"],
    intents: ["base", "accent"],
    keywords: ["keyword1", "keyword2", "phrase"],
    screenExamples: ["Screen Name 1", "Screen Name 2"],
  },
];
```

No other code changes needed — `matchDescription()` automatically uses the updated registry.

### Adding a Component Token Surface

Edit `src/lib/semantics/ontology.ts`:

```typescript
export const COMPONENT_TOKEN_SURFACES: ComponentTokenSurface[] = [
  // ... existing components
  {
    component: "my-component",
    uxContext: "action", // or "input", "surface", etc.
    propertyClasses: ["background", "text", "border"],
    intents: ["base", "accent", "danger"],
    states: ["default", "hover", "active", "focus"],
    extraSlots: [], // optional
  },
];

// Also add to the UxContext component list:
export const UX_CONTEXTS: UxContext[] = [
  {
    id: "action",
    components: [
      "button", "icon-button", "link", "my-component", // <-- add here
    ],
    // ...
  },
  // ...
];
```

### Adding a Validation Rule

Edit `src/lib/validators/engine.ts`:

```typescript
export const VALIDATION_RULES: ValidationRule[] = [
  // ... existing rules
  {
    id: "my-rule-id",
    category: "naming", // or "structure", "accessibility", etc.
    severity: "warning",
    description: "What this rule checks",
    validate: (token: DesignToken) => {
      if (/* rule violated */) {
        return {
          severity: "warning",
          rule: "my-rule-id",
          message: "Specific violation message",
          tokenPath: token.path,
          suggestion: "How to fix",
        };
      }
      return null; // passes
    },
  },
];
```

Add to presets in `src/lib/validators/presets.ts`:

```typescript
export const PRESETS: Record<string, ValidationPreset> = {
  recommended: {
    rules: [
      "naming/kebab-case",
      "my-rule-id", // <-- add here
      // ...
    ],
  },
  // ...
};
```

### Adding a Palette Strategy

Create `src/lib/palette/strategies/my-strategy.ts`:

```typescript
import type { PaletteScale, ScaleConfig } from "../types.js";

export function generateMyStrategyPalette(
  config: ScaleConfig,
): PaletteScale {
  // Generate a scale of colors based on your algorithm
  const colors: string[] = [];
  
  for (let i = 0; i < 11; i++) {
    // Your color generation logic
    colors.push(`#...`);
  }
  
  return {
    id: config.id,
    name: config.name || config.id,
    hue: config.hue,
    colors,
    labels: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  };
}
```

Register in `src/lib/palette/index.ts`:

```typescript
export function generatePaletteScale(
  config: ScaleConfig,
): PaletteScale {
  switch (config.strategy) {
    case "hsl":
      return generateHslPalette(config);
    case "leonardo":
      return generateLeonardoPalette(config);
    case "my-strategy":
      return generateMyStrategyPalette(config);
    // ...
  }
}
```

### Adding a Token Format Adapter

Create `src/lib/formats/my-format.ts`:

```typescript
import type { DesignToken, TokenFormatAdapter } from "../types.js";

export const myFormatAdapter: TokenFormatAdapter = {
  format: "my-format",
  
  detect(data: unknown): boolean {
    // Return true if this looks like your format
    return (
      typeof data === "object" &&
      data !== null &&
      "myFormatMarker" in data
    );
  },
  
  parse(data: unknown, sourcePath: string): DesignToken[] {
    // Convert your format to DesignToken[]
    const tokens: DesignToken[] = [];
    
    // Your parsing logic
    
    return tokens;
  },
};
```

Register in `src/lib/formats/index.ts`:

```typescript
import { myFormatAdapter } from "./my-format.js";

export const ADAPTERS: TokenFormatAdapter[] = [
  w3cDesignTokensAdapter,
  tokensStudioAdapter,
  styleDictionaryAdapter,
  myFormatAdapter, // <-- add here
];
```

---

## How to Add Features

### Example: Add a "Token Diff" Tool

**Goal:** Show what tokens changed between two commits.

**Implementation:**

1. **Create the tool function:**

```typescript
// src/tools/diff.ts
import { execSync } from "child_process";
import { loadAllTokens } from "../lib/parser.js";
import type { McpDsConfig } from "../lib/types.js";

export async function diffTokensTool(
  args: {
    baseRef: string;
    headRef: string;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{
  formatted: string;
  json: {
    added: string[];
    removed: string[];
    modified: Array<{
      path: string;
      oldValue: unknown;
      newValue: unknown;
    }>;
  };
}> {
  // Checkout base ref, load tokens
  execSync(`git checkout ${args.baseRef}`, { cwd: projectRoot });
  const baseTokens = await loadAllTokens(projectRoot, config);
  
  // Checkout head ref, load tokens
  execSync(`git checkout ${args.headRef}`, { cwd: projectRoot });
  const headTokens = await loadAllTokens(projectRoot, config);
  
  // Compute diff
  const added: string[] = [];
  const removed: string[] = [];
  const modified: Array<{ path: string; oldValue: unknown; newValue: unknown }> = [];
  
  for (const [path, token] of headTokens) {
    if (!baseTokens.has(path)) {
      added.push(path);
    } else if (baseTokens.get(path)!.value !== token.value) {
      modified.push({
        path,
        oldValue: baseTokens.get(path)!.value,
        newValue: token.value,
      });
    }
  }
  
  for (const [path] of baseTokens) {
    if (!headTokens.has(path)) {
      removed.push(path);
    }
  }
  
  // Format output
  const lines: string[] = [];
  lines.push(`# Token Diff: ${args.baseRef}..${args.headRef}`);
  lines.push("");
  lines.push(`**${added.length}** added, **${removed.length}** removed, **${modified.length}** modified`);
  lines.push("");
  
  if (added.length > 0) {
    lines.push("## Added");
    for (const path of added) {
      lines.push(`- \`${path}\``);
    }
    lines.push("");
  }
  
  // ... similar for removed & modified
  
  return {
    formatted: lines.join("\n"),
    json: { added, removed, modified },
  };
}
```

2. **Register in src/index.ts:**

```typescript
import { diffTokensTool } from "./tools/diff.js";

server.tool(
  "diff_tokens",
  "Show what design tokens changed between two git refs (commits, branches, tags)",
  {
    baseRef: z.string().describe("Base git ref (commit, branch, tag)"),
    headRef: z.string().describe("Head git ref to compare against"),
  },
  async (args) => {
    const { formatted } = await diffTokensTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);
```

3. **Test:**

```bash
npm run build
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"diff_tokens","arguments":{"baseRef":"main","headRef":"feature-branch"}},"id":1}' | npm start
```

---

## Testing Strategy

### Current State

- **Type checking:** TypeScript strict mode (`npm run build`)
- **Manual testing:** MCP protocol JSON-RPC calls via `echo | npm start`
- **Example tokens:** `example-tokens/` directory for integration tests

### Recommended Testing Approach

**Unit tests** (to be added):

```typescript
// src/lib/semantics/__tests__/ontology.test.ts
import { parseSemanticPath, buildSemanticPath } from "../ontology.js";

describe("parseSemanticPath", () => {
  it("parses valid semantic paths", () => {
    const result = parseSemanticPath("background.action.accent.hover");
    expect(result).toEqual({
      propertyClass: "background",
      uxContext: "action",
      intent: "accent",
      state: "hover",
    });
  });
  
  it("returns null for invalid paths", () => {
    expect(parseSemanticPath("invalid")).toBeNull();
  });
});
```

**Integration tests:**

```typescript
// src/__tests__/tools.integration.test.ts
import { planFlowTool } from "../tools/designer.js";

describe("plan_flow tool", () => {
  it("matches 'login page' to login-form pattern", async () => {
    const result = await planFlowTool(
      { description: "login page with email and password" },
      process.cwd(),
      await loadConfig(),
    );
    
    expect(result.json.patterns[0].id).toBe("login-form");
    expect(result.json.components).toContain("button");
    expect(result.json.components).toContain("text-input");
  });
});
```

**Framework recommendation:** Vitest (fast, TypeScript-native)

```bash
npm install -D vitest
# Add to package.json: "test": "vitest"
npm test
```

---

## Known Limitations

### 1. Token File Size

**Issue:** Loading 5000+ tokens from hundreds of files can be slow (1-2s).

**Mitigation:** Pre-build a token index cache (JSON file) and load that instead. Invalidate on file change.

**Future:** Implement `TokenCache` class with file watching.

### 2. Reference Cycles

**Issue:** `resolveReferences()` doesn't detect cycles. `{a} → {b} → {a}` causes infinite loop.

**Mitigation:** Add cycle detection:

```typescript
function resolveReferences(tokenMap: TokenMap, maxDepth = 10) {
  // Add depth tracking per token
}
```

### 3. No Incremental Updates

**Issue:** Every tool call reloads all token files from disk.

**Mitigation:** Implement persistent cache + file watching.

**Future:** Long-running server mode (daemon) instead of spawning per-request.

### 4. Component Surface Completeness

**Issue:** Only 22 components have token surfaces defined. Real design systems have 50-100+.

**Mitigation:** Encourage users to extend `COMPONENT_TOKEN_SURFACES` for their specific components.

**Future:** AI-assisted component surface inference from component code.

### 5. Pattern Matching Accuracy

**Issue:** Keyword-based matching can miss patterns or suggest irrelevant ones.

**Mitigation:** Use synonym expansion (already implemented) and allow users to add custom patterns.

**Future:** Embeddings-based semantic search (requires vector DB).

### 6. No Visual Analysis

**Issue:** `analyze_ui` tool requires manual component/color listing. No direct screenshot processing.

**Mitigation:** Integrate with Figma MCP or vision models (GPT-4V, Claude Vision).

**Future:** Vision API integration for screenshot → components/colors.

---

## Future Directions

### Phase 1: Production Readiness

- [ ] Comprehensive test suite (unit + integration)
- [ ] Token cache implementation
- [ ] Reference cycle detection
- [ ] Error handling improvements (structured errors, retry logic)
- [ ] Performance profiling & optimization
- [ ] CLI mode for non-MCP use

### Phase 2: Visual Tools

- [ ] Figma MCP integration (read variables, collections, screenshots)
- [ ] Screenshot analysis via vision API
- [ ] Component visual diff (before/after token changes)
- [ ] Auto-detect components from screenshot

### Phase 3: Advanced Intelligence

- [ ] Token drift detection (track when designs diverge from system)
- [ ] Usage analytics (which tokens are used where, consolidation opportunities)
- [ ] AI-assisted component surface inference (analyze component code → generate surface)
- [ ] Requirement-to-spec translation (PRD → token requirements)
- [ ] Pattern assembly (generate component variants from tokens)

### Phase 4: Collaboration

- [ ] Multi-brand advanced management (brand inheritance, overrides)
- [ ] Version control integration (track token changes, blame, history)
- [ ] Design-to-code sync (Figma → code, bidirectional)
- [ ] Team workflows (approval flows, token proposals)

### Phase 5: Ecosystem

- [ ] Package registry for patterns, rules, adapters
- [ ] Plugin system for custom tools
- [ ] Web dashboard for token visualization
- [ ] Real-time collaboration mode

---

## Code Patterns

### Pattern 1: Tool Structure

All tools follow this pattern:

```typescript
export async function myTool(
  args: { /* validated by Zod */ },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{
  formatted: string;  // AI-readable Markdown
  json: {             // Structured data
    // Machine-readable fields
  };
}> {
  // 1. Load data
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);
  
  // 2. Business logic
  const result = doSomething(tokenMap, args);
  
  // 3. Format for AI
  const lines: string[] = [];
  lines.push("# Title");
  lines.push("");
  lines.push(`Summary: **${result.summary}**`);
  // ... more Markdown
  
  return {
    formatted: lines.join("\n"),
    json: result,
  };
}
```

### Pattern 2: Safe Token Access

Always check existence before accessing:

```typescript
// ❌ Bad
const token = tokenMap.get(path);
const value = token.value; // TypeError if token is undefined

// ✅ Good
const token = tokenMap.get(path);
if (!token) {
  console.warn(`Token not found: ${path}`);
  return;
}
const value = token.value;

// ✅ Better (with default)
const token = tokenMap.get(path);
const value = token?.value ?? "#FF0000"; // fallback
```

### Pattern 3: Reference Resolution

Always resolve after loading:

```typescript
const tokenMap = await loadAllTokens(projectRoot, config);
resolveReferences(tokenMap); // Mutates in-place

// Now use resolvedValue instead of value
for (const [path, token] of tokenMap) {
  const color = token.resolvedValue ?? token.value; // Prefer resolved
}
```

### Pattern 4: Format-Agnostic Operations

Never assume a token format. Use adapters:

```typescript
// ❌ Bad
const tokens = JSON.parse(fs.readFileSync("tokens.json"));
const primary = tokens.colors.primary; // Assumes structure

// ✅ Good
const tokenMap = await loadAllTokens(projectRoot, config); // Auto-detects format
const primary = tokenMap.get("colors.primary"); // Path-based access
```

### Pattern 5: Markdown Output

Tools return Markdown for AI readability:

```typescript
const lines: string[] = [];

// Headers
lines.push("# Main Title");
lines.push("## Section");

// Emphasis
lines.push("**bold text**");
lines.push("_italic text_");

// Lists
lines.push("- Item 1");
lines.push("- Item 2");

// Code
lines.push("`inline code`");
lines.push("```json");
lines.push(JSON.stringify(obj, null, 2));
lines.push("```");

// Tables
lines.push("| Column 1 | Column 2 |");
lines.push("|----------|----------|");
lines.push("| Value 1  | Value 2  |");

return { formatted: lines.join("\n"), json: {...} };
```

### Pattern 6: Error Handling

Provide actionable error messages:

```typescript
try {
  const tokenMap = await loadAllTokens(projectRoot, config);
} catch (err) {
  return {
    formatted: `❌ Error loading tokens: ${err.message}\n\n` +
               `**Suggestion:** Check that \`tokenPaths\` in mcp-ds.config.json points to valid files.\n` +
               `**Paths configured:** ${config.tokenPaths.join(", ")}`,
    json: { error: err.message },
  };
}
```

### Pattern 7: Parallel Operations

Use `Promise.all` for independent operations:

```typescript
const [tokenMap, paletteData, themeConfig] = await Promise.all([
  loadAllTokens(projectRoot, config),
  loadPaletteData(projectRoot),
  loadThemeConfig(projectRoot),
]);
```

---

## Critical Files Deep Dive

### src/lib/semantics/ontology.ts (1350 lines)

**Purpose:** The knowledge backbone. Defines what semantic tokens mean and how components map to tokens.

**Key exports:**

- `ALL_PROPERTY_CLASSES` — 11 CSS property classes
- `SEMANTIC_INTENTS` — 8 semantic intents
- `UX_CONTEXTS` — 6 UX contexts with component lists
- `COMPONENT_TOKEN_SURFACES` — 22 component definitions
- `parseSemanticPath()` — Strict parsing
- `parseSemanticPathLenient()` — Fuzzy parsing (aliases, typos)
- `buildSemanticPath()` — Construct valid paths
- `getComponentSurface()` — Lookup component definition
- `findComponentContext()` — Which context owns a component

**When to modify:**

- Adding new components
- Adding new intents or states
- Adjusting component token requirements
- Fixing alias mappings

**Testing impact:** Changes here affect **all semantic tools**. Test thoroughly.

### src/lib/designer/patterns.ts (533 lines)

**Purpose:** UI pattern registry for `plan_flow` tool.

**Key exports:**

- `COMMON_UI_PATTERNS` — 22 patterns
- `getPattern()` — Lookup by ID
- `getPatternsByCategory()` — Filter by category
- `getUniqueComponents()` — Deduplicate component lists

**When to modify:**

- Adding new UI patterns
- Adjusting pattern keywords for better matching
- Updating component lists for existing patterns

**Testing impact:** Changes affect pattern matching accuracy.

### src/lib/parser.ts (450 lines)

**Purpose:** Load and resolve token files.

**Key exports:**

- `loadAllTokens()` — Read all token files, auto-detect format, parse
- `resolveReferences()` — Dereference aliases in-place
- `findReferencedPath()` — Extract referenced path from `{...}`

**When to modify:**

- Adding new reference syntax (e.g., `$variable` instead of `{path}`)
- Optimizing load performance
- Adding caching

**Testing impact:** Core dependency of all tools. Regression risk high.

---

## Commit Message Conventions

Use conventional commits for clarity:

```
feat(designer): add pattern matching tool
fix(parser): handle circular references
refactor(ontology): simplify alias maps
docs: update README with new tool
perf(resolver): optimize reference resolution
test: add unit tests for semantic parser
```

**Scopes:**

- `designer` — Designer-centric tools
- `semantics` — Semantic token system
- `parser` — Token loading
- `ontology` — Knowledge model
- `palette` — Color generation
- `themes` — Theme management
- `validator` — Validation engine
- `formats` — Format adapters
- `tools` — Tool implementations
- `mcp` — MCP server layer

---

## Getting Help

**For LLMs/Agents continuing this work:**

1. **Start here:** Read README.md for user-facing context
2. **Then dive into:** This AGENT_HANDOFF.md for architecture
3. **Critical files:** Read `src/lib/semantics/ontology.ts` first
4. **Before extending:** Review [Extension Points](#extension-points)
5. **Before refactoring:** Review [Design Decisions](#design-decisions--rationale)
6. **When stuck:** Search `docs/competitive-analysis.md` for inspiration

**For humans:**

- GitHub Issues: Technical problems, bug reports
- GitHub Discussions: Architecture questions, feature proposals
- MCP Discord: Community support

---

## Final Notes

This codebase is designed to be **extended by AI agents**. The architecture is intentionally modular, and the ontology is the key abstraction. If you're adding features, start by understanding how the semantic token model works — everything else builds on it.

The goal is to make design systems **AI-native**. Not just readable by AI, but evolved by AI in collaboration with designers and developers.

**Good luck building the future of design systems. 🚀**

---

**Version:** 0.1.0  
**Last Updated:** 2026-02-18  
**Maintainer:** Human + AI collaboration  
**License:** MIT
