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

### Phase 1 — Developer Experience (v0.5.0) ✅ COMPLETE

1. ✅ **Version checking on startup** — Implemented with update notifications
2. ✅ **Interactive CLI mode** — `npm run interactive` for testing without MCP client
3. ✅ **Automated test suite** — 33 tests with 100% pass rate (Vitest)
4. **Design system rules file generation** — auto-generate agent instruction files (`.cursorrules`, `.claude/instructions`) from ontology + token structure
5. **Rename map export** — extend `suggestMigrations()` to output machine-readable JSON rename maps
6. **Deprecation metadata** — support `$deprecated` in token parsing + emit warnings during validation
7. **Token usage scanner** — grep codebase for `var(--token-name)` / token import references

### Phase 2 — Performance & Smart Filtering (v0.6.0) ✅ COMPLETE

5. ✅ **Smart lifecycle filtering** — draft/active/deprecated states with smart defaults
6. ✅ **Token caching** — In-memory caching with checksum-based invalidation (53% faster)
7. ✅ **Performance benchmarking** — Benchmark script and utilities
8. **Codemod generation** — produce ast-grep/jscodeshift scripts from rename maps
9. **Figma variable import** — read Figma REST API variables, emit W3C DTCG JSON
10. **Tailwind config generation** — new transform platform target
11. **Token selection advisor** — "Which token should I use for a primary action button background?" natural language query tool

### Phase 3 — Production Polish (v0.7.0) ✅ COMPLETE

9. ✅ **Usage examples system** — Multi-framework examples (CSS, React, Vue, Tailwind, etc.)
10. ✅ **Private token filtering** — Exclude internal tokens by default
11. ✅ **Category filtering** — Organize tokens by category
12. ✅ **Metadata enrichment** — $lifecycle, $private, $category, $examples support
13. ✅ **Project-scoped configuration** — .mcp-ds.json for team settings
14. **Storybook integration** — component prop extraction + story-aware token resolution
15. **HTTP/SSE transport** — enable remote/shared MCP server deployment
16. **Adoption analytics** — codebase scanning + unused token detection + structured reports
17. **Color blindness simulation** — visual accessibility beyond contrast ratios

### Phase 4 — Ecosystem Integration (Future)

18. **Figma bidirectional sync** — Push tokens to Figma, pull changes
19. **Storybook MCP integration** — Component discovery and token usage analysis
20. **Design system rules generation** — Auto-generate agent instructions
21. **Codemod generation** — AST-based migration scripts
22. **Adoption analytics** — Usage tracking and reporting

---

## Our Competitive Advantages (already shipped)

These capabilities are **unique to mcp-ds** — no competitor has them:

**Core Architecture:**
- **Semantic ontology with property classes, intents, UX contexts, states, emphasis modifiers** — structured knowledge graph for token naming, not just key-value lookup
- **Alias-aware lenient parsing** with confidence scoring — recognizes `bg`, `fg`, `surface`, `fill`, `primary`, `error` conventions alongside canonical IDs
- **Multi-dimensional theming** — color-scheme × density × brand as orthogonal dimensions with theme composition

**Token Intelligence:**
- **Automated contrast pair detection** — finds background↔text pairs by semantic analysis, not manual annotation
- **Semantic scaffolding** — generates a complete semantic token structure from an ontology slice
- **Coverage analysis** — identifies gaps in semantic token coverage against the ontology
- **Migration suggestions** — proposes how to rename non-standard tokens to align with the ontology

**Color & Palette:**
- **Palette generation** with multiple strategies (HSL, Leonardo contrast-based, manual)
- **Palette-to-semantics mapping** — auto-assigns generated palette colors to semantic roles
- **WCAG 2.1 and APCA contrast validation** with automated recommendations

**Developer Experience (Phase 1-3):**
- **Smart lifecycle filtering** (v0.6.0) — Excludes draft tokens by default, guides to production-ready tokens
- **Token caching** (v0.6.0) — 53% performance improvement with checksum-based invalidation
- **Usage examples** (v0.7.0) — Multi-framework code examples (CSS, React, Vue, Tailwind, etc.)
- **Private token filtering** (v0.7.0) — Hide internal tokens from production searches
- **Category organization** (v0.7.0) — Smart token grouping and filtering
- **Interactive CLI** (v0.5.0) — Test search quality without MCP client
- **Version checking** (v0.5.0) — Auto-notify on updates
- **Project-scoped config** (v0.7.0) — Team-wide settings via .mcp-ds.json
- **Comprehensive test suite** (v0.5.0-v0.7.0) — 33 tests, 100% pass rate
