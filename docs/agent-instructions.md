# Agent Instructions (Optional)

Optional guidance for AI assistants that *use* systembridge-mcp. Add these instructions to `.cursorrules`, `.claude/instructions`, or your preferred agent config to improve design-token workflows.

---

## When to Use Which Tools

| Scenario | Preferred tools | Avoid |
|----------|-----------------|-------|
| Finding existing tokens | `search_tokens` | Guessing or inventing token names |
| Creating colors | `generate_palette` → `map_palette_to_semantics` → `check_contrast` | Hardcoding hex values without contrast check |
| New semantic token set | `describe_ontology` → `scaffold_semantics` → `audit_semantics` | Ad-hoc naming without ontology |
| Design handoff review | `audit_design`, `check_contrast`, `analyze_coverage` | Assuming coverage without verification |
| Migrating/refactoring tokens | `analyze_topology` → `generate_refactor_scenarios` → `execute_migration` | Manual find-replace without risk assessment |
| Matching UI colors to tokens | `analyze_ui` (with hex colors) | Guessing closest token by name |
| Planning new features | `plan_flow` | Jumping straight to implementation |
| "Check my styles and create tokens" | `extract_styles` → `writeToTokens` or `scaffold_semantics` | Assuming tokens exist already |
| Verifying proposed changes | `verify_proposal` | Writing tokens without checking references, contrast, or naming |

**Design-system-aware workflow:** Search first, validate before writing, use the semantic ontology for naming.

---

## Staged Analysis Workflow (Large Repos)

For large design-token repositories, follow this staged workflow to stay within context limits while maintaining accuracy. Each stage has an evidence budget — keep tool output small and targeted.

### Stage 1: Scope (minimal context)

Declare the analysis scope before fetching any data. Use `countOnly` and `statsOnly` to understand the size of the problem.

```
search_tokens(pathPrefix: "color.semantic.button", countOnly: true)
audit_semantics(pathPrefix: "color.semantic", statsOnly: true)
check_contrast(pathPrefix: "color.semantic", statsOnly: true)
```

### Stage 2: Retrieve (compact output)

Fetch targeted slices using `outputMode: "compact"` and scoped `pathPrefix`. Never retrieve the full token set — partition by concern:

- Button/component mappings: `pathPrefix: "color.semantic.button"`
- Semantic consistency: `pathPrefix: "color.semantic"`
- Primitive palette: `pathPrefix: "color.core"` or `pathPrefix: "color.primitive"`

```
search_tokens(pathPrefix: "color.semantic.button", outputMode: "compact")
resolve_theme(theme: "dark", pathPrefix: "color.semantic.button", outputMode: "compact")
```

Use `offset` and `limit` to paginate through large result sets without flooding context.

### Stage 3: Reduce (focused drill-down)

Run analysis tools in `compact` or `summary` mode. Only drill into failures:

```
check_contrast(pathPrefix: "color.semantic.button", outputMode: "compact")
audit_semantics(pathPrefix: "color.semantic.button", outputMode: "summary")
analyze_topology(pathPrefix: "color.semantic.button", outputMode: "compact")
```

Use `failuresOnly: true` on `check_contrast` to skip passing pairs entirely.

### Stage 4: Verify

Before applying proposed changes, run the verification gate:

```
verify_proposal(proposedTokens: '{"background.action.accent": {"value": "{color.core.blue.500}", "type": "color"}}')
```

This checks in one call:
- No unresolved references after merging with existing tokens
- No contrast regressions vs. the current token set
- Semantic naming compliance with the ontology

For quick single-pair checks:
```
check_contrast(foreground: "#proposed-fg", background: "#proposed-bg")
```

### Stage 5: Synthesize

Only now produce the narrative summary. Reference the evidence gathered in stages 1–4. Every recommendation must cite:
- Affected token paths
- Measured contrast outcomes (WCAG ratio and APCA Lc)
- Impacted themes/brands

### Evidence Budget Guidelines

| Stage | Target budget | Approach |
|-------|--------------|----------|
| Scope | < 200 tokens | `countOnly`, `statsOnly` |
| Retrieve | < 2K tokens per slice | `outputMode: "compact"`, scoped `pathPrefix` |
| Reduce | < 2K tokens per tool | `outputMode: "compact"` or `"summary"`, `failuresOnly` |
| Verify | < 500 tokens | Targeted single-pair checks |
| Synthesize | Remainder | Human-readable final report |

### Output Mode Reference

All heavy tools accept `outputMode`:

- **`compact`**: Terse, one line per item. Metrics on first line. Ideal for intermediate analysis steps.
- **`summary`**: Key findings with brief per-item detail. Good for reviews.
- **`full`** (default): Verbose markdown. Use only for final presentation or small result sets.

Additional context-saving parameters:

- **`countOnly`** (search, resolve_theme, resolve_brand): Returns only the total count.
- **`statsOnly`** (audit_semantics, check_contrast, analyze_coverage, analyze_topology): Returns only aggregate metrics.
- **`failuresOnly`** (check_contrast): Omits passing pairs and unpaired tokens.
- **`offset`** + **`limit`** (search, resolve_theme, resolve_brand): Paginate through large sets.

---

## Built-in Prompts (Shortcuts)

These prompts orchestrate multiple tools in sequence. Suggest them when the user's intent matches:

| Prompt | When to suggest |
|--------|-----------------|
| `create-token` | User wants to add a single token with proper naming and validation |
| `audit-tokens` | User asks for health check, architecture review, or "audit my tokens" |
| `design-semantic-tokens` | User has components (e.g. button, input, card) and needs semantic tokens |
| `design-color-palette` | User wants a new color palette with semantic mapping and contrast check |
| `design-from-scratch` | User describes a screen/feature and needs a full token plan |
| `design-handoff-review` | User is preparing design for developer handoff |
| `component-reference` | User wants to research a component (e.g. button, tabs) across design systems |

---

## Copy-Paste Templates

Add to `.cursorrules` (Cursor) or `.claude/instructions` (Claude Code):

### Minimal (design token awareness)

```
When working with design tokens:
- Use search_tokens before generating or suggesting tokens; never invent names without checking.
- Use check_contrast for any color pairs (foreground/background) before finalizing.
- Prefer semantic tokens (e.g. color.semantic.error) over raw values when referencing design system colors.
```

### Full (design-system-native)

```
Design system MCP (systembridge-mcp) is available. Use it for:

1. **Token discovery**: Always search_tokens before suggesting or creating tokens. Check for existing tokens that match the intent.
2. **Truncated results**: When search_tokens or resolve_theme/resolve_brand return "X of Y" (truncated), offer to fetch more by calling again with limit: Y. Do not report truncation as a failure.
3. **Color work**: Use generate_palette + map_palette_to_semantics + check_contrast. Never skip contrast validation for text/background pairs.
4. **Semantic naming**: Follow propertyClass.uxContext.intent[.state] (e.g. background.action.accent.hover). Use describe_ontology when unsure.
5. **Validation**: Run validate_tokens before committing token changes. Use audit_semantics for naming compliance.
6. **Handoffs**: Use audit_design and design-handoff-review prompt when preparing designs for developers.
7. **Migration**: Use analyze_topology and generate_refactor_scenarios before large token refactors.
8. **Context efficiency**: For large repos, use outputMode: "compact" and scoped pathPrefix to keep responses small. Use countOnly/statsOnly to scout before retrieving. Follow the staged workflow: scope → retrieve → reduce → verify → synthesize.
```

### Component-focused

```
When the user mentions components (button, input, card, modal, etc.):
1. Use plan_flow if they're describing a new screen or feature.
2. Use scaffold_semantics to generate the token surface for those components.
3. Use audit_design to check if their design has full token coverage.
4. Use component-reference to research patterns across 50+ design systems if they ask "how do others do X?"
```

---

## When Results Are Truncated

Tools like `search_tokens`, `resolve_theme`, and `resolve_brand` apply limits to reduce context usage. When you see output like "Found 50 of 200 token(s)" or "Showing 100 of 450 tokens":

- **Do not report this as a failure.** The tool succeeded; results were truncated.
- **Prefer pagination over bulk fetch.** Use `offset` + `limit` to page through results rather than fetching everything at once. This keeps each response small.
- **Use `countOnly: true` first** to learn the total size before committing to a full retrieval.
- **Use `outputMode: "compact"`** when you need to see many tokens without consuming excessive context.
- **Let the user decide** whether more results are worth the extra tokens; don't auto-fetch large sets unless asked.

---

## Quick Reference: Tool Selection

- **"What tokens exist for X?"** → `search_tokens` (text, type, pathPrefix)
- **"Create a color palette"** → `generate_palette` → `map_palette_to_semantics` → `check_contrast`
- **"Are these colors accessible?"** → `check_contrast`
- **"Generate tokens for my components"** → `scaffold_semantics` (or `design-semantic-tokens` prompt)
- **"Audit my token system"** → `audit_semantics` + `analyze_coverage` (or `audit-tokens` prompt)
- **"What do I need for a login page?"** → `plan_flow`
- **"Does my design have everything?"** → `audit_design` (or `design-handoff-review` prompt)
- **"Check my styles and create a design system"** → `extract_styles` with `writeToTokens: true`, then optionally `scaffold_semantics`
- **"Help migrate my tokens"** → `analyze_topology` → `generate_refactor_scenarios` → `execute_migration`
- **"Verify my proposed tokens"** → `verify_proposal`
