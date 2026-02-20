# Features Reference

Complete reference for systembridge-mcp tools and capabilities.

## Designer-Centric Intelligence

Three tools designed to solve common designer pain points:

| Tool | What it does | When to use it |
|------|-------------|----------------|
| **plan_flow** | Matches natural language descriptions to UI patterns, components, and token requirements | Starting a new feature, blank canvas syndrome (config: `limits.planFlowMaxPatterns`, default 5) |
| **audit_design** | Checks component coverage, finds missing tokens, validates naming and accessibility | Before developer handoff, design QA |
| **analyze_ui** | Identifies components and matches colors using perceptual distance (ΔE 2000) | Reverse-engineering designs, screenshot analysis (config: `limits.analyzeUiMaxColorMatches`, default 5) |

## Token Management

- **search_tokens** — Find tokens by name, value, type, lifecycle state, privacy, and content
  - Smart lifecycle filtering: Excludes draft tokens by default
  - Private token filtering: Excludes internal/private tokens unless explicitly requested
  - Usage examples: Inline code examples in CSS, React, Vue, Tailwind, and more
  - Category filtering: Group and filter tokens by category (components, semantic, etc.)
  - Lifecycle states: `draft` (experimental), `active` (production-ready), `deprecated` (being phased out)
  - Result limit: Default 50 (config: `search.defaultLimit` or `limits.search`); use `limit` param to override
  - Query examples:
    - `{ text: "blue", type: "color" }` — Find blue color tokens
    - `{ lifecycle: "all" }` — Include all tokens regardless of lifecycle state
    - `{ includePrivate: true }` — Include private/internal tokens
    - `{ category: "components", limit: 25 }` — Show only component-level tokens, max 25 results
- **validate_tokens** — Check naming conventions, type correctness, and structure
- **transform_tokens** — Convert between formats (W3C DTCG, Tokens Studio, Style Dictionary)

## Semantic Token System

- **scaffold_semantics** — Generate complete token surfaces for your components
- **audit_semantics** — Check naming compliance, coverage, and pairing
- **analyze_coverage** — See the full coverage matrix (what's implemented vs. what's needed)
- **describe_ontology** — Understand the naming model and token structure

## Color & Accessibility

- **generate_palette** — Create perceptually-uniform tonal scales (HSL or Leonardo APCA)
- **map_palette_to_semantics** — Assign palette colors to semantic slots
- **check_contrast** — WCAG 2.1 and APCA contrast validation with recommendations

## Themes & Brands

- **list_brands** / **resolve_brand** — Manage multiple brand identities (config limit: `limits.resolveBrand`, default 100)
- **list_themes** / **resolve_theme** — Theme resolution across dimensions (config limit: `limits.resolveTheme`, default 100)
- **diff_brands** / **diff_themes** — Compare token sets across configurations

## Mathematical Scale System

| Tool | What it does | Use case |
|------|-------------|----------|
| **analyze_scales** | Detects scale patterns, identifies outliers, compares against design principles | Understanding existing spacing/typography |
| **generate_scale** | Creates scales using 8 strategies (linear, exponential, modular, fibonacci, golden ratio, harmonic, fluid, hybrid) | Building new spacing systems |
| **suggest_scale** | Recommends strategies based on design principles (Swiss, Financial UI, Material, iOS, Tailwind) | Choosing the right scale |
| **derive_density_mode** | Transforms spacing tokens for compact/spacious modes with WCAG compliance | Responsive density variants |
| **audit_scale_compliance** | Validates against WCAG, Material Design, iOS HIG (touch targets ≥44px, 8dp grid, line-heights ≥1.5) | Accessibility compliance |
| **generate_fluid_scale** | Generates CSS `clamp()` expressions for viewport-responsive scales | Fluid typography |

**Strategies:** Linear, Exponential, Modular, Fibonacci, Golden Ratio, Harmonic, Fluid, Hybrid

**Design principles:** Swiss Typography, Financial UI, Material Design, iOS HIG, Tailwind CSS, Bootstrap, Minimalist

## Token Migration System

| Tool | What it does | Use case |
|------|-------------|----------|
| **analyze_topology** | Maps token dependencies, detects anti-patterns, visualizes with Mermaid | Understanding token architecture |
| **audit_figma_usage** | Cross-references local tokens with Figma variables, identifies sync issues | Figma-codebase sync |
| **generate_refactor_scenarios** | Generates 3 migration approaches (conservative 95%, progressive 80%, comprehensive 65%) with risk assessment | Planning token refactors |
| **execute_migration** | Executes migration with dry-run, reference updates, validation, rollback snapshots | Safe token migrations |

See [migration-system.md](./migration-system.md) and [migration-executor.md](./migration-executor.md) for the complete guide.

## Figma Integration

| Tool | What it does | Use case |
|------|-------------|----------|
| **extract_figma_tokens** | Convert Figma variables to W3C, Tokens Studio, Style Dictionary formats | Import designer-defined tokens |
| **validate_figma_tokens** | Validate Figma variables against local tokens, detect mismatches | Design-code drift detection |
| **generate_component_docs** | Generate component documentation from tokens + Figma data | Design-to-development handoffs |

See [figma-integration.md](./figma-integration.md) for the complete guide.

## System Generation

- **generate_system** — One-command generation of a complete token system from config

## Guided Workflows (Prompts)

7 pre-built prompts that orchestrate multiple tools:

1. **create-token** — Step-by-step token creation with duplicate checking
2. **audit-tokens** — Comprehensive token architecture health check
3. **design-semantic-tokens** — Generate and audit semantic tokens for components
4. **design-color-palette** — Create palette, map to semantics, verify contrast
5. **design-from-scratch** — Blank canvas to complete token plan
6. **design-handoff-review** — Pre-handoff design system compliance check
7. **component-reference** — Research components across 50+ design systems via component.gallery

## Architecture

### Token Ontology

```
{propertyClass}.{uxContext}.{intent}[.{state}][.{modifier}]
```

**Examples:** `background.action.accent.hover`, `text.surface.danger`, `border.input.base.focus`

**Property Classes:** background, text, border, shadow, icon, width, size, radius, gap, weight, font

**UX Contexts:** action, input, surface, feedback, navigation, data

**Intents:** base, accent, danger, warning, success, info, muted, inverted

**States:** default, hover, active, focus, disabled, selected

**Modifiers:** strong, subtle, inverted

### Component Token Surfaces

- **button:** 120 token slots (4 property classes × 6 intents × 5 states)
- **text-input:** 45 token slots
- **card:** 8 token slots

### UI Pattern Registry

22 patterns across 11 categories: Auth, Dashboard, Data, Forms, Navigation, Feedback, Marketing, Commerce, Content.
