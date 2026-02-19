# For Designers

systembridge-mcp gives your AI assistant deep knowledge of your design system. You don't need to write code — just describe what you need or what you see, and the AI will use the right tools to help you.

## How It Works

1. **Open your AI assistant** (e.g. Claude Desktop) with systembridge-mcp connected.
2. **Describe what you see or want** in plain language.
3. **The AI uses systembridge-mcp tools** to search tokens, audit designs, match colors, and more.
4. **Copy/paste token JSON when needed** — the AI will format it for you.

## Integration with Your Design Tools

systembridge-mcp pairs well with:

- **Figma Tokens Studio** — Sync tokens between Figma and code.
- **Figma Variables** — Export variables to JSON, analyze with systembridge-mcp.
- **Style Dictionary** — Transform tokens to platform code (handled natively).

## Example Workflows

### Starting from scratch

> "I need to design a dashboard with data tables and stat cards. What components and tokens do I need?"

The AI uses `plan_flow` to identify UI patterns, list required components, and tell you which token slots to fill.

### Before developer handoff

> "I'm using button, text-input, card, and modal components. Does my design system cover everything?"

The AI uses `audit_design` to check for missing tokens, naming issues, and accessibility problems.

### Reverse-engineering a design

> "I see a UI with these colors: #3B82F6, #EF4444, #F3F4F6. Which tokens match?"

The AI uses `analyze_ui` with perceptual color matching to find the closest tokens in your system.

### Getting the right token

> "What blue should I use for error states?"

The AI uses `search_tokens` and the semantic ontology to find the right token for your context.

## Recommended Designer Workflow

1. **Start in Figma or Sketch** — design your screens.
2. **Ask your AI** — e.g. "Does this design have all the tokens it needs?"
3. **Get instant feedback** — missing tokens, naming issues, accessibility problems.
4. **Fill gaps** — scaffold missing tokens using AI guidance.
5. **Hand off confidently** — developers get a complete, validated token set.

## Figma Integration

If you use Figma variables, systembridge-mcp can:

- Extract Figma variables to standard token formats.
- Validate Figma variables against your local tokens.
- Generate component documentation for handoffs.

See [figma-integration.md](./figma-integration.md) for the full guide.
