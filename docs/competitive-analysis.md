# Competitive Analysis & Feature Roadmap

> Last updated: 2026-02-18

## Competitive Landscape

### Tools Researched

| Project | Stars | Focus |
|---------|-------|-------|
| **figma/mcp-server-guide** | 246 | Official Figma MCP — design-to-code via Dev Mode |
| **southleft/design-systems-mcp** | 100 | Knowledge base — vector search over 188+ curated DS entries (WCAG, Material, Polaris, etc.) |
| **@storybook/addon-mcp** | — | Official Storybook MCP — component discovery, inspection, visual screenshots |
| **yajihum/design-system-mcp** | 24 | Simple Deno MCP — `getComponentProps` + `getTokens`, Style Dictionary output |
| **southleft/figma-console-mcp** | 352 | Full Figma extraction — console, metadata, tokens, variables, screenshots via CDP |
| **bennypowers/design-tokens-language-server** | 85 | LSP for DTCG tokens — autocomplete, validation, references in editors |
| **@adobe/token-diff-generator** | — | CLI for diffing token sets — added/deleted/renamed/deprecated detection |
| **Tokens Studio Platform** | — | Commercial — multi-brand theming, Figma sync, CLI pull, conditions, inheritance |
| **tokens-studio/sd-transforms** | 240 | Style Dictionary transforms for Tokens Studio output |
| **codemod-com/codemod** | 935 | AST-powered code migrations — codemods at scale |
| **Typeform blog** | — | Custom MCP teaching AI their design system (Cline + Claude Code) |
| **Figma Design System Analytics** | — | Native Figma feature — component adoption rates, detach tracking |

### Key Articles

- **Romina Kavcic, "5 MCP Connections Every Design System Team Needs"** (Aug 2025): Recommends Figma, Mintlify (docs), GitHub, PostHog (analytics), Slack as the five essential MCP connections for DS teams.
- **Typeform, "Design-to-Code with MCP"** (Jul 2025): Built a custom MCP to teach AI agents (Cline, Claude Code) their proprietary design system. Highlights the gap between generic LLM output and design-system-aware code.
- **Codrops, "Supercharge Your Design System with LLMs and Storybook MCP"** (Dec 2025): Using Storybook stories as ground-truth context for LLM coding agents. Agents without DS context produce "unmergeable slop."
- **Hypermod / Martin Fowler on Codemods**: AST-based codemods for DS evolution and API migrations at scale. Atlassian, Back Market case studies.
- **Figma Blog, "Design System Analytics"** (Feb 2025): Native Figma feature for tracking component adoption, detach rates, and usage metrics.
- **zeroheight, "Design Systems Report 2025"**: Industry survey showing DS adoption past hype phase; measurement and governance are key challenges.

---

## Tool Deep-Dive Summaries

### figma/mcp-server-guide (Official Figma MCP)

- **Tools**: `get_design_context`, `get_variable_defs`, `get_code_connect_map`, `get_screenshot`, `create_design_system_rules`, `get_metadata`, `get_figjam`, `whoami`
- **Transport**: HTTP (remote at `mcp.figma.com/mcp` or local desktop at `127.0.0.1:3845/mcp`)
- **Key insight**: `create_design_system_rules` auto-generates rule files for AI agents. `get_variable_defs` returns variables/styles used in a selection. Code Connect bridges Figma nodes to codebase component paths.
- **Limitation**: Rate-limited per Figma plan tier. View/Collab seats limited to 6 calls/month.

### southleft/design-systems-mcp (Knowledge Base)

- **Tools**: `search_design_knowledge`, `search_chunks`, `browse_by_category`, `get_all_tags`
- **Architecture**: Supabase pgvector + OpenAI embeddings (1536 dimensions), Cloudflare Workers deployment
- **Content**: 188+ curated entries, 761+ content chunks — W3C standards, WCAG 2.2, ARIA practices, 10+ major design systems
- **Ingestion**: URL, PDF, CSV bulk, website crawl → vector embeddings
- **Key insight**: Purely a knowledge retrieval system. No token manipulation or generation. Complements rather than competes with mcp-ds.

### @storybook/addon-mcp (Official Storybook MCP)

- **Packages**: `@storybook/addon-mcp` (addon), `@storybook/mcp` (standalone library)
- **Capabilities**: Component & story discovery, component inspection, visual verification via screenshots
- **Key insight**: Bridges the gap between "which components exist" and "what does correct look like" for LLM agents. The screenshot feature is a killer — agents can visually verify their output matches the story.

### bennypowers/design-tokens-language-server

- **Language**: Go (94%), with VS Code, Neovim, Zed extensions
- **Features**: DTCG format autocomplete, validation, reference resolution in CSS/JSON/YAML
- **Schema support**: Both Editor's Draft and DTCG 2025.10 stable, including multi-schema workspaces
- **Key insight**: IDE-level DX for tokens. Our MCP could expose similar capabilities as tools/resources.

### @adobe/token-diff-generator

- **Output formats**: CLI, JSON, Markdown
- **Detection**: Added, deleted, renamed, deprecated, updated tokens across schema versions
- **Key insight**: Focused purely on diffing. We already have `diff_themes` and `diff_brands`; extending to generic version-to-version diff would cover this use case.

### Tokens Studio Platform

- **Features**: Multi-brand theming with conditions & inheritance, Figma sync, CLI pull/push, design scale automation
- **Token types**: Color, typography, border, sizing, opacity with dynamic/static/unknown classification
- **Theming**: Color modes, brand modes, appearance modes
- **Key insight**: Closest commercial competitor in scope. We match on multi-brand theming and go deeper on semantic intelligence. They excel at Figma bidirectional sync and have a polished platform UI.

---

## Feature / Enhancement List

### 1. Figma Integration — HIGH priority

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| Import Figma variables as tokens | Figma MCP, figma-console-mcp | No | Pull variables (colors, spacing, typography) from a Figma file via REST API and convert to W3C DTCG format |
| Diff Figma variables vs. local tokens | Romina Kavcic | No | Detect mismatches between Figma source-of-truth and local token files |
| Export tokens to Figma variables | Tokens Studio | No | Push local tokens back into Figma as variables (two-way sync) |
| Code Connect mapping | Figma MCP (`get_code_connect_map`) | No | Map Figma component node IDs to codebase component paths |

### 2. Component / Storybook Bridge — MEDIUM priority

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| Component prop extraction | yajihum, Storybook MCP | No | Parse component files / stories to extract prop interfaces, variants, defaults |
| Story-aware token usage | Storybook MCP | No | Trace which tokens a component actually consumes from its stories |
| Component spec generation | Figma MCP, Romina Kavcic | No | Generate component documentation/specs from token usage + props |
| Visual regression context | Storybook MCP (`get_screenshot`) | No | Provide screenshot context to verify token changes haven't broken visuals |

### 3. Documentation & Knowledge Base — MEDIUM priority

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| Semantic search over DS knowledge | southleft/design-systems-mcp | Partial | We have `describe_ontology` and `search_tokens`, but not vector search over guidelines/docs |
| Design system rules generation | Figma MCP (`create_design_system_rules`) | No | Auto-generate `.cursorrules` / `.claude` / `.github/copilot-instructions` rules from token structure + ontology |
| Token changelog / release notes | GitHub MCP, @adobe/token-diff-generator | No | Summarize token changes between versions into a human-readable changelog |
| Ingest external DS docs | southleft/design-systems-mcp | No | Ingest Material, Polaris, Carbon docs etc. to provide best-practice context |

### 4. Migration & Codemods — HIGH priority

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| Auto-generate rename map | `suggestMigrations()` + codemods | Partial | We suggest migrations; next step is outputting a machine-readable JSON rename map |
| Codemod generation | Hypermod, Atlassian, codemod-com | No | Generate jscodeshift/ast-grep transforms to update token references in CSS/JS/TS |
| Deprecation tracking | @adobe/token-diff-generator | No | Mark tokens as deprecated with `$deprecated` metadata; track & warn during validation |
| Token version diffing | @adobe/token-diff-generator | Partial | We have `diff_themes` and `diff_brands`; add generic version-to-version diff |

### 5. Adoption & Analytics — MEDIUM priority

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| Token usage scanning | Figma DS Analytics, PostHog | No | Scan codebase (CSS/SCSS/TS) to find which tokens are actually used vs. defined |
| Coverage report | `analyze_coverage` tool | **Yes** | Already have semantic coverage analysis |
| Unused token detection | Design Tokens Language Server | No | Cross-reference defined tokens against codebase usage to find dead tokens |
| Adoption dashboard data | Figma DS Analytics, PostHog MCP | No | Emit structured JSON for adoption metrics (used/unused/custom overrides) |

### 6. Editor / DX Integrations — LOW-MEDIUM priority

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| LSP-style autocomplete | bennypowers/design-tokens-language-server | No | Provide token name completions in CSS/SCSS/JS via MCP resources |
| Inline token previews | Design Tokens Language Server | No | Return color swatches / spacing visualizations for token values |
| Token reference resolution | Design Tokens Language Server | Partial | Our parser resolves references; could expose as a dedicated tool |
| Remote MCP (HTTP transport) | southleft/design-systems-mcp | No | Currently STDIO only; add HTTP/SSE transport for remote/shared access |

### 7. AI Agent Context — HIGH priority

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| Design system rules file output | Figma MCP, Typeform | No | Generate `.cursorrules`, `.claude/instructions`, `.github/copilot-instructions` from ontology + tokens |
| Token selection advisor | southleft/design-systems-mcp | Partial | `describe_ontology` explains structure; could add "which token should I use for X?" query tool |
| Prompt templates / skills | Figma MCP plugins, Storybook MCP | No | Ship pre-built prompt templates for common token workflows (audit → fix → validate cycle) |
| Component-to-token mapping | Typeform, Storybook MCP | No | Given a component name, return all semantic tokens it should consume |

### 8. Platform Output & Delivery — MEDIUM priority

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| Multi-platform transform | `transform_tokens` tool | **Yes** | Already have Style Dictionary transforms |
| Tokens Studio format import | tokens-studio/sd-transforms | No | Import Tokens Studio JSON (with `$extensions`) natively |
| Tailwind config generation | yajihum | No | Generate `tailwind.config.js` theme extensions from tokens |
| Swift / Kotlin output | Figma MCP, Tokens Studio | No | Mobile platform token output (iOS/Android) |

### 9. Palette & Color Intelligence — LOW priority (mostly done)

| Feature | Inspired By | We Have? | Description |
|---------|------------|----------|-------------|
| Palette generation | `generate_palette` | **Yes** | HSL, Leonardo, manual strategies |
| Contrast checking | `check_contrast` | **Yes** | WCAG AA/AAA with alias-aware lenient parsing |
| Color blindness simulation | colorjs.io capabilities | No | Simulate protanopia/deuteranopia/tritanopia for token palette |
| P3/Display-P3 support | colorjs.io | Partial | colorjs.io supports it; could expose wide-gamut token output |

---

## Recommended Phasing

### Phase 1 — Quick Wins (1–2 weeks)

1. **Design system rules file generation** — auto-generate agent instruction files (`.cursorrules`, `.claude/instructions`) from ontology + token structure
2. **Rename map export** — extend `suggestMigrations()` to output machine-readable JSON rename maps
3. **Deprecation metadata** — support `$deprecated` in token parsing + emit warnings during validation
4. **Token usage scanner** — grep codebase for `var(--token-name)` / token import references

### Phase 2 — Differentiation (2–4 weeks)

5. **Codemod generation** — produce ast-grep/jscodeshift scripts from rename maps
6. **Figma variable import** — read Figma REST API variables, emit W3C DTCG JSON
7. **Tailwind config generation** — new transform platform target
8. **Token selection advisor** — "Which token should I use for a primary action button background?" natural language query tool

### Phase 3 — Ecosystem (4+ weeks)

9. **Storybook integration** — component prop extraction + story-aware token resolution
10. **HTTP/SSE transport** — enable remote/shared MCP server deployment
11. **Adoption analytics** — codebase scanning + unused token detection + structured reports
12. **Color blindness simulation** — visual accessibility beyond contrast ratios

---

## Our Competitive Advantages (already shipped)

These capabilities are **unique to mcp-ds** — no competitor has them:

- **Semantic ontology with property classes, intents, UX contexts, states, emphasis modifiers** — structured knowledge graph for token naming, not just key-value lookup
- **Alias-aware lenient parsing** with confidence scoring — recognizes `bg`, `fg`, `surface`, `fill`, `primary`, `error` conventions alongside canonical IDs
- **Automated contrast pair detection** — finds background↔text pairs by semantic analysis, not manual annotation
- **Multi-dimensional theming** — color-scheme × density × brand as orthogonal dimensions with theme composition
- **Semantic scaffolding** — generates a complete semantic token structure from an ontology slice
- **Coverage analysis** — identifies gaps in semantic token coverage against the ontology
- **Migration suggestions** — proposes how to rename non-standard tokens to align with the ontology
- **Palette generation** with multiple strategies (HSL, Leonardo contrast-based, manual)
- **Palette-to-semantics mapping** — auto-assigns generated palette colors to semantic roles
