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

**Design-system-aware workflow:** Search first, validate before writing, use the semantic ontology for naming.

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
2. **Color work**: Use generate_palette + map_palette_to_semantics + check_contrast. Never skip contrast validation for text/background pairs.
3. **Semantic naming**: Follow propertyClass.uxContext.intent[.state] (e.g. background.action.accent.hover). Use describe_ontology when unsure.
4. **Validation**: Run validate_tokens before committing token changes. Use audit_semantics for naming compliance.
5. **Handoffs**: Use audit_design and design-handoff-review prompt when preparing designs for developers.
6. **Migration**: Use analyze_topology and generate_refactor_scenarios before large token refactors.
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

## Quick Reference: Tool Selection

- **"What tokens exist for X?"** → `search_tokens` (text, type, pathPrefix)
- **"Create a color palette"** → `generate_palette` → `map_palette_to_semantics` → `check_contrast`
- **"Are these colors accessible?"** → `check_contrast`
- **"Generate tokens for my components"** → `scaffold_semantics` (or `design-semantic-tokens` prompt)
- **"Audit my token system"** → `audit_semantics` + `analyze_coverage` (or `audit-tokens` prompt)
- **"What do I need for a login page?"** → `plan_flow`
- **"Does my design have everything?"** → `audit_design` (or `design-handoff-review` prompt)
- **"Help migrate my tokens"** → `analyze_topology` → `generate_refactor_scenarios` → `execute_migration`
