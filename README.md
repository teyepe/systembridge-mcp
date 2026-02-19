# mcp-ds – Design System MCP Server

> An AI-native Model Context Protocol (MCP) server that gives LLMs and agents deep knowledge of design systems and design tokens, enabling intelligent design system evolution, token analysis, and designer-to-developer handoffs.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io)

---

## 🎯 What is this?

**mcp-ds** is an MCP server that teaches AI assistants (like Claude, GPT, or custom agents) how to work with your design system. Instead of just answering questions about design, the AI can:

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
git clone https://github.com/yourusername/mcp-ds.git
cd mcp-ds

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

2. Add the mcp-ds server using one of these methods:

#### Option A: Using npm link (Recommended for testing)

If you ran `npm link`, you can reference it by command name:

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "mcp-ds",
      "env": {
        "MCP_DS_PROJECT_ROOT": "/path/to/your/design/tokens"
      }
    }
  }
}
```

#### Option B: Direct path (works without npm link)

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-ds/dist/index.js"],
      "env": {
        "MCP_DS_PROJECT_ROOT": "/path/to/your/design/tokens"
      }
    }
  }
}
```

#### Option C: Using current working directory

If you don't set `MCP_DS_PROJECT_ROOT`, the server will use the directory where it's launched. This is useful if you want to run it from your token directory:

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-ds/dist/index.js"],
      "cwd": "/path/to/your/design/tokens"
    }
  }
}
```

> **💡 Tip:** For testing with the included example tokens, use `MCP_DS_PROJECT_ROOT` pointing to the mcp-ds repository root, or omit it entirely to use the current directory.

3. Restart Claude Desktop

4. Look for the 🔌 MCP icon — you should see **32 tools** available from mcp-ds

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

- **search_tokens** — Find tokens by name, value, type, or content
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
- Pass the variable definitions to the mcp-ds tools above

**Workflow:**
```
Figma Variables → extract_figma_tokens → Local Tokens → validate_figma_tokens → Fix Mismatches → generate_component_docs
```

See [docs/figma-integration.md](./docs/figma-integration.md) for complete integration guide.

### **System Generation**

- **generate_system** — One-command generation of a complete token system from config

---

## 📚 Guided Workflows (Prompts)

The server includes **6 pre-built prompts** that orchestrate multiple tools into complete workflows:

1. **create-token** — Step-by-step token creation with duplicate checking
2. **audit-tokens** — Comprehensive token architecture health check
3. **design-semantic-tokens** — Generate and audit semantic tokens for your components
4. **design-color-palette** — Create palette, map to semantics, verify contrast
5. **design-from-scratch** — Blank canvas to complete token plan
6. **design-handoff-review** — Pre-handoff design system compliance check

---

## 🏗️ Architecture

### Token Ontology

mcp-ds uses a structured semantic token naming model:

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

The server looks for `mcp-ds.config.json` in your working directory:

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
- **Figma Variables** — Export variables to JSON, analyze with mcp-ds
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
3. Claude uses mcp-ds tools to analyze and respond
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

## 🧪 Testing

```bash
# Type check
npm run build

# Run a test query
echo '{"jsonrpc":"2.0","method":"initialize",...}' | npm start
```

Full test suite coming soon.

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

- **Issues:** [GitHub Issues](https://github.com/yourusername/mcp-ds/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/mcp-ds/discussions)
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
