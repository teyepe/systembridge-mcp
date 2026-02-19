# systembridge-mcp – System Bridge MCP Server

> An AI-native Model Context Protocol (MCP) server that gives LLMs and agents deep knowledge of design systems and design tokens, enabling intelligent design system evolution, token analysis, and designer-to-developer handoffs.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io)

---

## 🎯 What is this?

**systembridge-mcp** is an MCP server that teaches AI assistants (like Claude, GPT, or custom agents) how to work with your design system. Instead of just answering questions about design, the AI can:

- **Understand your design tokens** — browse, search, and explain your color palettes, spacing scales, and typography
- **Plan new features from scratch** — describe what you need ("a login page"), get back the components and tokens required
- **Audit designs before handoff** — check if your design has all the tokens it needs, find gaps, verify accessibility
- **Match colors and components** — upload a screenshot or describe UI elements, get back what matches your system
- **Generate and validate tokens** — create color palettes, check WCAG contrast, scaffold semantic tokens
- **Evolve your system** — transform tokens, migrate naming, manage themes and brands

**For designers:** Think of it as a design system assistant that knows your entire token library and can answer questions like "what blue should I use for error states?" or "does this design have all the tokens it needs?"

**For developers:** It's a programmatic interface to your design tokens with AI-native tooling for analysis, transformation, and code generation.

---

## 🚀 Quick Start

> **💡 For local testing and development**, see [TESTING.md](TESTING.md) for a simpler setup using `npm link` without absolute paths.

### Prerequisites

- **Node.js 18+** (check with `node --version`)
- An AI assistant that supports MCP (e.g., [Claude Desktop](https://claude.ai/download))

### Installation

```bash
# Clone or download this repository
git clone https://github.com/yourusername/systembridge-mcp.git
cd systembridge-mcp

# Install dependencies
npm install

# Build the server
npm run build

# Optional: Link globally for easier access
npm link
```

### Connect to Claude Desktop

1. Open your Claude Desktop configuration file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the systembridge-mcp server using one of these methods:

#### Option A: Using npm link (Recommended for testing)

If you ran `npm link`, you can reference it by command name:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "systembridge-mcp",
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/path/to/your/design/tokens"
      }
    }
  }
}
```

#### Option B: Direct path (works without npm link)

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/systembridge-mcp/dist/index.js"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/path/to/your/design/tokens"
      }
    }
  }
}
```

#### Option C: Using current working directory

If you don't set `SYSTEMBRIDGE_MCP_PROJECT_ROOT`, the server will use the directory where it's launched. This is useful if you want to run it from your token directory:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/systembridge-mcp/dist/index.js"],
      "cwd": "/path/to/your/design/tokens"
    }
  }
}
```

> **💡 Tip:** For testing with the included example tokens, use `SYSTEMBRIDGE_MCP_PROJECT_ROOT` pointing to the systembridge-mcp repository root, or omit it entirely to use the current directory.

3. Restart Claude Desktop

4. Look for the 🔌 MCP icon — you should see **32 tools** available from systembridge-mcp

---

## 💬 Example Conversations

### For Designers

**Starting from scratch:**
> "I need to design a dashboard with data tables and stat cards. What components and tokens do I need?"

Claude will use `plan_flow` to identify UI patterns, list required components, and tell you what token slots to fill.

**Before developer handoff:**
> "I'm using button, text-input, card, and modal components. Does my design system cover everything?"

Claude will use `audit_design` to check for missing tokens, naming issues, and accessibility problems.

**Reverse-engineering a design:**
> "I see a UI with these colors: #3B82F6, #EF4444, #F3F4F6. Which tokens match?"

Claude will use `analyze_ui` with CIEDE2000 perceptual color matching to find the closest tokens.

### For Developers

**Creating a color palette:**
> "Generate a brand color palette with hue 220, chroma 0.7, and map it to semantic tokens for light mode."

Claude will use `generate_palette` + `map_palette_to_semantics` + `check_contrast` to create accessible tokens.

**Auditing token structure:**
> "Run a full audit of my design tokens. Check naming, accessibility, and coverage."

Claude will use `audit_semantics` + `analyze_coverage` + `check_contrast` to produce a health report.

**Scaffolding tokens:**
> "I need semantic tokens for button, text-input, and alert components."

Claude will use `scaffold_semantics` to generate the full token surface with all states and intents.

**Migrating existing tokens:**
> "I have legacy tokens that don't follow our naming convention. Help me migrate them safely."

Claude will use `analyze_topology` → `generate_refactor_scenarios` → `execute_migration` to plan and execute the migration with validation.

---

## 🛠️ Features

### **Designer-Centric Intelligence**

Three tools designed to solve common designer pain points:

| Tool | What it does | When to use it |
|------|-------------|----------------|
| **plan_flow** | Matches natural language descriptions to UI patterns, components, and token requirements | Starting a new feature, blank canvas syndrome |
| **audit_design** | Checks component coverage, finds missing tokens, validates naming and accessibility | Before developer handoff, design QA |
| **analyze_ui** | Identifies components and matches colors using perceptual distance (ΔE 2000) | Reverse-engineering designs, screenshot analysis |

### **Token Management**

- **search_tokens** — Find tokens by name, value, type, lifecycle state, privacy, and content
  - **Smart lifecycle filtering** (Phase 2): Excludes draft tokens by default to guide users toward production-ready tokens
  - **Private token filtering** (Phase 3): Excludes internal/private tokens unless explicitly requested
  - **Usage examples** (Phase 3): Inline code examples in CSS, React, Vue, Tailwind, and more
  - **Category filtering** (Phase 3): Group and filter tokens by category (components, semantic, etc.)
  - **Lifecycle states**: `draft` (experimental), `active` (production-ready), `deprecated` (being phased out)
  - **Query examples**:
    - `{ text: "blue", type: "color" }` — Find blue color tokens (excludes drafts & private)
    - `{ lifecycle: "all" }` — Include all tokens regardless of lifecycle state
    - `{ includePrivate: true }` — Include private/internal tokens in results
    - `{ category: "components" }` — Show only component-level tokens
    - `{ text: "button primary" }` — Find button primary tokens with usage examples
- **validate_tokens** — Check naming conventions, type correctness, and structure
- **transform_tokens** — Convert between formats (W3C DTCG, Tokens Studio, Style Dictionary)

### **Semantic Token System**

Smart semantic tokens based on CSS property classes, UX contexts, and intents:

- **scaffold_semantics** — Generate complete token surfaces for your components
- **audit_semantics** — Check naming compliance, coverage, and pairing
- **analyze_coverage** — See the full coverage matrix (what's implemented vs. what's needed)
- **describe_ontology** — Understand the naming model and token structure

### **Color & Accessibility**

- **generate_palette** — Create perceptually-uniform tonal scales (HSL or Leonardo APCA)
- **map_palette_to_semantics** — Assign palette colors to semantic slots
- **check_contrast** — WCAG 2.1 and APCA contrast validation with recommendations

### **Themes & Brands**

- **list_brands** / **resolve_brand** — Manage multiple brand identities
- **list_themes** / **resolve_theme** — Theme resolution across dimensions (light/dark, density, etc.)
- **diff_brands** / **diff_themes** — Compare token sets across configurations

### **Mathematical Scale System**

Research-validated scale generation, analysis, and transformation based on design theory:

| Tool | What it does | Use case |
|------|-------------|----------|
| **analyze_scales** | Detects scale patterns, identifies outliers, compares against design principles | Understanding existing spacing/typography, finding inconsistencies |
| **generate_scale** | Creates scales using 8 mathematical strategies (linear, exponential, modular, fibonacci, golden ratio, harmonic, fluid, hybrid) | Building new spacing systems, typography scales |
| **suggest_scale** | Recommends scale strategies based on design principles (Swiss, Financial UI, Material, iOS, Tailwind) | Choosing the right scale for your brand |
| **derive_density_mode** | Algorithmically transforms spacing tokens for compact/spacious modes with WCAG compliance | Creating responsive density variants |
| **audit_scale_compliance** | Validates scales against WCAG, Material Design, iOS HIG rules (touch targets ≥44px, 8dp grid, line-heights ≥1.5) | Accessibility and platform compliance checks |
| **generate_fluid_scale** | Generates CSS `clamp()` expressions for viewport-responsive scales | Fluid typography, responsive spacing |

**Mathematical strategies:**
- **Linear:** `a(n) = base + n × step` — Uniform intervals (e.g., 4, 8, 12, 16)
- **Exponential:** `a(n) = base × 2^n` — Doubling progression (e.g., 4, 8, 16, 32)
- **Modular:** `a(n) = base × ratio^n` — Musical/typographic ratios (e.g., 1.125, 1.2, 1.414, 1.618)
- **Fibonacci:** `F(n) = F(n-1) + F(n-2)` — Natural growth sequence (e.g., 8, 13, 21, 34)
- **Golden Ratio:** `a(n) = base × φ^n` where φ ≈ 1.618 — Classical proportions
- **Harmonic:** `a(n) = base / n` — Decreasing intervals (e.g., 16, 8, 5.33, 4)
- **Fluid:** CSS `clamp(min, preferred, max)` — Viewport-responsive scales
- **Hybrid:** Linear-then-exponential (Tailwind-style) — Practical UI scales

**Design principles database:**
- **Swiss Typography:** Ratios 1.125-1.2, max 7 hierarchy steps, clarity-focused
- **Financial UI:** Compact ratios 1.067-1.125 (minor second), precision and density
- **Material Design:** 8dp base, 48dp touch targets, strict grid alignment
- **iOS HIG:** 8pt base, 44pt touch targets, system fonts
- **Tailwind CSS:** 4px base, hybrid linear-exponential (Tailwind scale)
- **Bootstrap:** 1rem base, modular scale for spacing
- **Minimalist:** Clean ratios, maximum whitespace

### **Token Migration System**

Comprehensive B→C migration orchestration for evolving existing design systems:

| Tool | What it does | Use case |
|------|-------------|----------|
| **analyze_topology** | Maps token dependencies, detects anti-patterns (primitive leakage, naming drift, circular refs), visualizes structure with Mermaid diagrams | Understanding existing token architecture, finding technical debt |
| **audit_figma_usage** | Cross-references local tokens with Figma variables, identifies sync issues, calculates coverage | Keeping Figma and codebase in sync, finding unused tokens |
| **generate_refactor_scenarios** | Generates 3 migration approaches (conservative 95%, progressive 80%, comprehensive 65% success rates) with risk assessment, effort estimation | Planning token refactors, choosing migration strategy |
| **execute_migration** | Executes migration with dry-run, automated reference updates, validation (integrity/accessibility/structure), rollback snapshots | Safe token migrations with automated codebase updates |

**Migration Pipeline:**
```
Existing Tokens → Audit Topology → Generate Scenarios → Execute (Dry Run) → Validate → Execute (Live)
```

**Safety Features:**
- Dry-run by default (must explicitly opt-in to live execution)
- Snapshot creation for instant rollback
- Multi-layer validation (integrity, references, naming, structure, accessibility)
- Automated reference scanning and updates across TypeScript/JavaScript/CSS/SCSS/JSON
- Phase-by-phase execution with stop-on-error

See [docs/migration-system.md](./docs/migration-system.md) and [docs/migration-executor.md](./docs/migration-executor.md) for complete guide.

### **Figma Integration**

Seamless interoperability with Figma variables via the Figma MCP server:

| Tool | What it does | Use case |
|------|-------------|----------|
| **extract_figma_tokens** | Convert Figma variables to standard token formats (W3C, Tokens Studio, Style Dictionary) with collection mapping and metadata | Syncing Figma variables to your local token system, importing designer-defined tokens |
| **validate_figma_tokens** | Validate Figma variables against local tokens, detect naming mismatches, type errors, missing mappings, and value discrepancies | Keeping Figma and codebase synchronized, catching design-code drift |
| **generate_component_docs** | Generate comprehensive component documentation combining local tokens, Figma component data, and design system knowledge | Design-to-development handoffs, automated documentation |

**Prerequisites:**
- Install and configure [mcp-figma](https://github.com/modelcontextprotocol/servers/tree/main/src/figma) MCP server
- Use `mcp_figma_get_variable_defs` to fetch Figma variables
- Pass the variable definitions to the systembridge-mcp tools above

**Workflow:**
```
Figma Variables → extract_figma_tokens → Local Tokens → validate_figma_tokens → Fix Mismatches → generate_component_docs
```

See [docs/figma-integration.md](./docs/figma-integration.md) for complete integration guide.

### **System Generation**

- **generate_system** — One-command generation of a complete token system from config

---

## 📚 Guided Workflows (Prompts)

The server includes **7 pre-built prompts** that orchestrate multiple tools into complete workflows:

1. **create-token** — Step-by-step token creation with duplicate checking
2. **audit-tokens** — Comprehensive token architecture health check
3. **design-semantic-tokens** — Generate and audit semantic tokens for your components
4. **design-color-palette** — Create palette, map to semantics, verify contrast
5. **design-from-scratch** — Blank canvas to complete token plan
6. **design-handoff-review** — Pre-handoff design system compliance check
7. **component-reference** — Research components across 50+ design systems via component.gallery

---

## 🏗️ Architecture

### Token Ontology

systembridge-mcp uses a structured semantic token naming model:

```
{propertyClass}.{uxContext}.{intent}[.{state}][.{modifier}]
```

**Example paths:**
- `background.action.accent.hover`
- `text.surface.danger`
- `border.input.base.focus`

- **Property Classes:** `background`, `text`, `border`, `shadow`, `icon`, `width`, `size`, `radius`, `gap`, `weight`, `font`
- **UX Contexts:** `action`, `input`, `surface`, `feedback`, `navigation`, `data`
- **Intents:** `base`, `accent`, `danger`, `warning`, `success`, `info`, `muted`, `inverted`
- **States:** `default`, `hover`, `active`, `focus`, `disabled`, `selected`
- **Modifiers:** `strong`, `subtle`, `inverted`

### Component Token Surfaces

The system knows what tokens each component needs:

- **button**: 4 property classes × 6 intents × 5 states = **120 token slots**
- **text-input**: 3 property classes × 3 intents × 5 states = **45 token slots**
- **card**: 4 property classes × 2 intents × 1 state = **8 token slots**

This knowledge powers the designer-centric tools.

### UI Pattern Registry

22 built-in UI patterns across 11 categories:

- **Auth:** login, registration, password reset
- **Dashboard:** analytics dashboard, admin panel
- **Data:** data tables, detail views, card grids
- **Forms:** multi-step forms, settings, search/filter
- **Navigation:** sidebar, top nav, tabbed interface
- **Feedback:** notifications, empty states, error pages
- **Marketing:** landing pages, pricing
- **Commerce:** product listings, checkout
- **Content:** articles, modals

Patterns map to component inventories and token requirements.

---

## 📂 Configuration

The server looks for `systembridge-mcp.config.json` in your working directory:

```json
{
  "tokenPaths": ["tokens/**/*.json"],
  "validation": {
    "preset": "recommended"
  },
  "transformation": {
    "platforms": ["css", "js"],
    "buildPath": "build/"
  },
  "theming": {
    "dimensions": [
      {
        "id": "color-scheme",
        "values": ["light", "dark"],
        "defaultValue": "light"
      }
    ],
    "themes": [
      {
        "id": "light",
        "coordinates": [{ "dimension": "color-scheme", "value": "light" }]
      }
    ]
  }
}
```

### Token File Formats

Supports multiple formats (auto-detected):

- **W3C DTCG** (Design Token Community Group spec)
- **Tokens Studio** (Figma plugin format)
- **Style Dictionary** (Amazon's token format)

Place your token files anywhere — configure paths via `tokenPaths` glob patterns.

---

## 🎨 For Design Teams

### Integration with Design Tools

While this MCP server focuses on token intelligence, it pairs well with:

- **Figma Tokens Studio** — Sync tokens between Figma and code
- **Figma Variables** — Export variables to JSON, analyze with systembridge-mcp
- **Style Dictionary** — Transform tokens to platform code (handled natively)

### Designer Workflow

1. **Start in Figma or Sketch** — design your screens
2. **Ask Claude** — "Does this design have all the tokens it needs?"
3. **Get instant feedback** — missing tokens, naming issues, accessibility problems
4. **Fill gaps** — scaffold missing tokens using AI guidance
5. **Hand off confidently** — developers get a complete, validated token set

### Non-Technical Access

Designers don't need to write code. Just:

1. Open Claude Desktop
2. Describe what you see or want
3. Claude uses systembridge-mcp tools to analyze and respond
4. Copy/paste token JSON when needed (Claude will format it)

---

## 🔧 For Development Teams

### CLI Usage

Run the server standalone for debugging:

```bash
# Start the server (STDIO mode)
npm start

# Development mode with auto-reload
npm run dev
```

### API (MCP Protocol)

The server implements the [Model Context Protocol](https://modelcontextprotocol.io) over STDIO. Tools are exposed as JSON-RPC methods.

**Example: Search tokens**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_tokens",
    "arguments": {
      "query": "blue",
      "type": "color"
    }
  },
  "id": 1
}
```

### Extending the Server

The codebase is modular:

- **Add tools:** Create functions in `src/tools/` and register in `src/index.ts`
- **Extend ontology:** Edit `src/lib/semantics/ontology.ts`
- **Add UI patterns:** Edit `src/lib/designer/patterns.ts`
- **Add palette strategies:** Implement in `src/lib/palette/strategies/`

See [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) for architecture details.

---

## 🧪 Testing & Development

### Version Checking

The server automatically checks for updates on startup by querying the npm registry. This ensures you're running the latest version with bug fixes and new features. If an update is available, you'll see a friendly notification with the upgrade command.

To disable version checking, set the `SYSTEMBRIDGE_MCP_SKIP_VERSION_CHECK` environment variable:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "node",
      "args": ["/path/to/systembridge-mcp/dist/index.js"],
      "env": {
        "SYSTEMBRIDGE_MCP_SKIP_VERSION_CHECK": "true"
      }
    }
  }
}
```

### Interactive CLI for Testing

The interactive CLI lets you test search functionality without running a full MCP client. It's perfect for rapid iteration during development or debugging search queries.

```bash
# Start interactive mode
npm run interactive

# Example session:
> color blue
Found 12 token(s):
  **color.primary.500**
    Value: "#3B82F6"
    Type: color
    Match: text matched in value

> spacing 8
Found 3 token(s):
  **spacing.2**
    Value: "8px"
    Type: dimension
    Match: text matched in value

> .debug        # Toggle raw JSON output
> .help         # Show available commands
> .quit         # Exit
```

**Commands:**
- `.help` — Show command reference
- `.debug` — Toggle debug mode (shows raw JSON responses)
- `.clear` — Clear screen
- `.quit` — Exit (or Ctrl+C)

**Query Examples:**
- `color blue` — Find color tokens containing "blue"
- `spacing 8` — Find spacing tokens with value "8"
- `type:color` — Filter by token type
- `button accent` — Find tokens related to accent buttons

### Automated Test Suite

The test suite ensures search quality and prevents regressions. Inspired by Dialtone MCP Server's production-tested approach (77 tests, 100% pass rate).

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

**Test Coverage:**
- **Color Queries:** Blue tokens, primary colors, hex value matching
- **Spacing Queries:** Value search, name search
- **Typography Queries:** Font families, font weights
- **Semantic Queries:** Action accent, surface danger
- **Filtering:** Type filters (color, dimension), deprecated token handling
- **Lifecycle Filtering (Phase 2):** Draft/active/deprecated state filtering
- **Private Token Filtering (Phase 3):** Private token exclusion/inclusion
- **Category Filtering (Phase 3):** Category-based token grouping
- **Usage Examples (Phase 3):** Example parsing, formatting, multi-framework support
- **Path Prefix:** Filtering by token path prefix
- **Empty Results:** Graceful handling of no-match queries
- **Result Structure:** Schema validation, proper token formatting

**Example Test Output:**
```
✓ Search Quality Tests (29 tests)
  ✓ Color Queries (3 tests)
  ✓ Spacing Queries (2 tests)
  ✓ Typography Queries (2 tests)
  ✓ Filtering (4 tests)
  ✓ Lifecycle Filtering (5 tests) — Phase 2
  ✓ Private Token Filtering (3 tests) — Phase 3
  ✓ Category Filtering (2 tests) — Phase 3
  ✓ Usage Examples (3 tests) — Phase 3
✓ Tool Integration Tests (4 tests)

Test Files  2 passed (2)
     Tests  33 passed (33)
```

### Token Caching (Phase 2)

The server implements intelligent in-memory caching to reduce file I/O on repeated queries. Cache entries are automatically invalidated when token files change.

**Performance Impact:**
- 53% faster search queries with caching enabled
- Most effective with large token sets and repeated queries
- Automatic file change detection (checksum-based)
- Configurable TTL (default: 60 seconds)

**Configuration:**

Caching is enabled by default. To disable it, set the `SYSTEMBRIDGE_MCP_CACHE` environment variable:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "node",
      "args": ["/path/to/systembridge-mcp/dist/index.js"],
      "env": {
        "SYSTEMBRIDGE_MCP_CACHE": "false"
      }
    }
  }
}
```

### Performance Benchmarking

Run performance benchmarks to measure search speed and caching impact:

```bash
npm run benchmark
```

**Example Output:**
```
📊 Benchmark: Search WITHOUT caching
   Iterations: 5
   Average: 6.25ms

📊 Benchmark: Search WITH caching
   Iterations: 5
   Average: 2.93ms

📈 Comparison
   🚀 Faster by 53.0%

Tip: Caching is most effective with large token sets.
```

### Usage Examples & Metadata Enrichment (Phase 3)

Tokens can include inline usage examples and enriched metadata to guide developers:

**Token with Examples:**
```json
{
  "semantic": {
    "button": {
      "primary": {
        "background": {
          "$value": "{color.blue.600}",
          "$description": "Primary button background color",
          "$lifecycle": "active",
          "$category": "components",
          "$examples": [
            {
              "framework": "css",
              "code": ".btn-primary { background-color: var(--semantic-button-primary-background); }",
              "description": "Apply to primary action button"
            },
            {
              "framework": "react",
              "code": "<button style={{ backgroundColor: tokens.semantic.button.primary.background }}>Click</button>"
            }
          ]
        }
      }
    }
  }
}
```

**Supported Metadata Fields:**
- `$lifecycle`: `draft` | `active` | `deprecated` — Token maturity state
- `$private`: `boolean` — Mark as internal/private (excluded from search by default)
- `$category`: `string` — Group tokens (e.g., "components", "semantic", "spacing")
- `$examples`: `array` — Usage examples in multiple frameworks (CSS, React, Vue, Tailwind, etc.)
- `$description`: `string` — Human-readable explanation

**Search with Private & Category Filters:**
```typescript
// Exclude private tokens (default)
{ text: "button" }

// Include private/experimental tokens
{ text: "button", includePrivate: true }

// Filter by category
{ category: "components" }

// Combine filters
{ text: "primary", category: "components", lifecycle: "active" }
```

### Project-Scoped Configuration (Phase 3)

Create a `.systembridge-mcp.json` file in your project root for team-wide settings:

```json
{
  "tokenPaths": ["tokens/**/*.json"],
  "validation": {
    "preset": "recommended"
  },
  "search": {
    "includePrivate": false,
    "includeDraft": false,
    "showExamples": true,
    "defaultCategories": ["components", "semantic"]
  }
}
```

**Search Configuration Options:**
- `includePrivate`: Include private tokens by default (default: `false`)
- `includeDraft`: Include draft tokens by default (default: `false`)
- `showExamples`: Display usage examples in search results (default: `true`)
- `defaultCategories`: Filter to specific categories (omit to show all)

### Type Checking

```bash
# Build and type check
npm run build

# Watch mode (auto-rebuild on file changes)
npm run watch
```

### Manual Testing with MCP Inspector

For testing the full MCP protocol:

```bash
# Start server in STDIO mode
npm start

# In another terminal, send test messages
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | npm start
```

---

## 🗺️ Roadmap

- [ ] **Figma MCP Integration** — Direct Figma plugin interop for screenshot analysis
- [ ] **Token Drift Detection** — Track when designs diverge from the system
- [ ] **Requirement-to-Spec Translation** — Convert PRDs to token requirements
- [ ] **Component Pattern Assembly** — Generate component variants from tokens
- [ ] **Token Usage Analytics** — Identify unused tokens, consolidation opportunities
- [ ] **Multi-brand Management** — Advanced brand identity resolution
- [ ] **Visual Regression Testing** — Compare token changes visually

---

## 🤝 Contributing

Contributions welcome! This is an open-source project.

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify
5. Submit a pull request

See [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) for codebase architecture.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

Built on:
- [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- [Style Dictionary](https://amzn.github.io/style-dictionary/) by Amazon
- [Leonardo](https://leonardocolor.io) color system by Adobe
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/) and [APCA](https://git.apcacontrast.com/) contrast algorithms

Inspired by:
- Design Token Community Group ([W3C DTCG](https://design-tokens.github.io/community-group/))
- [Tokens Studio](https://tokens.studio) Figma plugin
- Design systems from Primer (GitHub), Polaris (Shopify), Carbon (IBM)

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/systembridge-mcp/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/systembridge-mcp/discussions)
- **MCP Community:** [Discord](https://discord.gg/mcp)

---

**Made with ❤️ for designers and developers building better design systems.**

---

## 📖 Additional Documentation

- [AGENT_HANDOFF.md](./docs/AGENT_HANDOFF.md) — Architecture guide for LLMs and agents
- [migration-system.md](./docs/migration-system.md) — Risk assessment and scenario generation
- [migration-executor.md](./docs/migration-executor.md) — Execution, validation, and rollback
- [figma-integration.md](./docs/figma-integration.md) — Figma variable cross-referencing
- [competitive-analysis.md](./docs/competitive-analysis.md) — Market analysis
