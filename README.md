# systembridge-mcp – System Bridge MCP Server

> An AI-native Model Context Protocol (MCP) server that gives LLMs and agents deep knowledge of design systems and design tokens, enabling intelligent design system evolution, token analysis, and designer-to-developer handoffs.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io)

---

## What is this?

**systembridge-mcp** teaches AI assistants (like Claude, GPT, or custom agents) how to work with your design system. Instead of just answering questions about design, the AI can:

- **Understand your design tokens** — browse, search, and explain color palettes, spacing scales, and typography
- **Plan new features** — describe what you need ("a login page"), get components and tokens required
- **Audit designs before handoff** — check if your design has all the tokens it needs, find gaps, verify accessibility
- **Match colors and components** — upload a screenshot or describe UI, get back what matches your system
- **Generate and validate tokens** — create palettes, check WCAG contrast, scaffold semantic tokens
- **Evolve your system** — transform tokens, migrate naming, manage themes and brands

**Designers:** Think of it as a design system assistant that knows your token library. Ask "what blue for error states?" or "does this design have all the tokens it needs?" — no code required.

**Developers:** A programmatic interface to design tokens with AI-native tooling for analysis, transformation, and code generation.

---

## Quick Start

**What you need:** Node.js 18+ and an AI assistant that supports MCP (e.g. [Claude Desktop](https://claude.ai/download), Cursor).

1. **Install in your design-token project:**
   ```bash
   npm install -D systembridge-mcp
   ```

2. **Add a config file in your project root** (optional; sensible defaults apply):
   ```json
   // .systembridge-mcp.json or systembridge-mcp.config.json
   { "tokenPaths": ["tokens/**/*.json", "design-tokens/**/*.json"] }
   ```

3. **Add to your MCP config** (e.g. `.cursor/mcp.json` for Cursor):
   ```json
   {
     "mcpServers": {
       "systembridge-mcp": {
         "command": "npx",
         "args": ["systembridge-mcp"]
       }
     }
   }
   ```

4. **Restart your AI assistant.** Look for the MCP icon — you should see **32 tools** from systembridge-mcp. No path configuration needed when using project-level config.

**Next:** [Getting Started](docs/getting-started.md) | [Setup by Client](docs/setup-by-client.md) (Cursor, VS Code, Claude) | [Agent Instructions](docs/agent-instructions.md) (optional AI guidance).  
For local development: [TESTING](TESTING.md).

---

## Example Conversations

### For Designers

> "I need to design a dashboard with data tables and stat cards. What components and tokens do I need?"

The AI uses `plan_flow` to identify UI patterns, list required components, and tell you what token slots to fill.

> "I'm using button, text-input, card, and modal. Does my design system cover everything?"

The AI uses `audit_design` to check for missing tokens, naming issues, and accessibility problems.

> "I see a UI with colors #3B82F6, #EF4444, #F3F4F6. Which tokens match?"

The AI uses `analyze_ui` with perceptual color matching to find the closest tokens.

### For Developers

> "Generate a brand color palette with hue 220, chroma 0.7, and map it to semantic tokens for light mode."

The AI uses `generate_palette` + `map_palette_to_semantics` + `check_contrast` to create accessible tokens.

> "Run a full audit of my design tokens. Check naming, accessibility, and coverage."

The AI uses `audit_semantics` + `analyze_coverage` + `check_contrast` to produce a health report.

> "I have legacy tokens that don't follow our naming convention. Help me migrate them safely."

The AI uses `analyze_topology` → `generate_refactor_scenarios` → `execute_migration` to plan and execute the migration.

---

## Features

| Area | Tools |
|------|-------|
| **Designer intelligence** | `plan_flow`, `audit_design`, `analyze_ui` |
| **Token management** | `search_tokens`, `validate_tokens`, `transform_tokens` |
| **Semantic tokens** | `scaffold_semantics`, `audit_semantics`, `analyze_coverage`, `describe_ontology` |
| **Color & accessibility** | `generate_palette`, `map_palette_to_semantics`, `check_contrast` |
| **Themes & brands** | `list_brands`, `resolve_brand`, `list_themes`, `resolve_theme`, `diff_brands`, `diff_themes` |
| **Scales** | `analyze_scales`, `generate_scale`, `suggest_scale`, `derive_density_mode`, `audit_scale_compliance`, `generate_fluid_scale` |
| **Migration** | `analyze_topology`, `audit_figma_usage`, `generate_refactor_scenarios`, `execute_migration` |
| **Figma** | `extract_figma_tokens`, `validate_figma_tokens`, `generate_component_docs` |

7 pre-built prompts orchestrate multiple tools: create-token, audit-tokens, design-semantic-tokens, design-color-palette, design-from-scratch, design-handoff-review, component-reference.

Full reference: [docs/features.md](docs/features.md)

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Full installation, config options, troubleshooting |
| [Setup by Client](docs/setup-by-client.md) | Per-client setup (Cursor, VS Code, Claude Desktop, Claude Code) |
| [Agent Instructions](docs/agent-instructions.md) | Optional AI usage guidance and rule templates |
| [Local Testing](TESTING.md) | Test with `npm link` without absolute paths |
| [For Designers](docs/for-designers.md) | Designer workflow, example prompts, no-code usage |
| [For Developers](docs/for-developers.md) | CLI, MCP API, extending the server, tests, benchmarks |
| [Features](docs/features.md) | Full feature and tool reference |
| [Configuration](docs/configuration.md) | Config file, env vars, token paths |
| [Migration System](docs/migration-system.md) | Risk assessment and scenario generation |
| [Migration Executor](docs/migration-executor.md) | Execution, validation, and rollback |
| [Figma Integration](docs/figma-integration.md) | Figma variable sync and validation |
| [AGENT_HANDOFF](docs/AGENT_HANDOFF.md) | Architecture guide for LLMs and agents |

---

## Contributing

Contributions welcome. Fork, create a feature branch, make your changes, run `npm run build`, and submit a pull request.

See [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md) for codebase architecture.

---

## License

MIT — see [LICENSE](LICENSE). Copyright © 2024–2026 Tasos Dervenagas.

---

## Acknowledgments

Built on [Model Context Protocol](https://modelcontextprotocol.io), [Style Dictionary](https://amzn.github.io/style-dictionary/), [Leonardo](https://leonardocolor.io), and [WCAG 2.1](https://www.w3.org/TR/WCAG21/). Inspired by W3C DTCG, Tokens Studio, and design systems from Primer, Polaris, and Carbon.

---

**Support:** [GitHub Issues](https://github.com/teyepe/systembridge-mcp/issues) · [GitHub Discussions](https://github.com/teyepe/systembridge-mcp/discussions) · [MCP Discord](https://discord.gg/mcp)
