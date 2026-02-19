# Competitive Analysis: mcp-ds vs Dialtone MCP Server

**Date:** February 19, 2026  
**Version:** mcp-ds v0.5.0 vs dialtone-mcp-server v1.2.1  
**Repository:** https://github.com/dialpad/dialtone/tree/staging/packages/dialtone-mcp-server

---

## Executive Summary

**Dialtone MCP Server** is a production-grade, **query-focused** MCP server serving Dialpad's real design system with **4 simple search tools** (utility classes, tokens, components, icons). It's optimized for **retrieval and lookup** with smart filtering of deprecated/discouraged items.

**mcp-ds** is a **knowledge-system** focused MCP server providing **32 comprehensive tools** for design token **creation, transformation, validation, migration, and generation**. It's optimized for **system design and architecture** with semantic ontologies, scale generation, and multi-dimensional theming.

### Key Insight

**Dialtone solves "What exists?"** — helping developers find the right class, token, component, or icon from an existing system.

**mcp-ds solves "How do I build it?"** — helping designers and developers architect, generate, migrate, and maintain token systems.

**They serve different stages of the design system lifecycle:**
- **Dialtone:** Consumption (retrieval, lookup, usage)
- **mcp-ds:** Creation (generation, architecture, migration, validation)

---

## Comparison Matrix

| Dimension | Dialtone MCP | mcp-ds |
|-----------|--------------|--------|
| **Primary Use Case** | Search existing system | Build/evolve token systems |
| **Target Users** | Developers using Dialtone | Designers + devs building systems |
| **Tool Count** | 4 tools | 32 tools |
| **Scope** | Dialpad-specific | Design system agnostic |
| **Data Source** | Dialtone monorepo (static) | User's token files (dynamic) |
| **Search Focus** | Keyword-based retrieval | Semantic ontology-based |
| **Key Strength** | Production-tested, fast search | Comprehensive system generation |
| **Innovation** | Smart deprecated/discouraged filtering | Mathematical scales, migration engine |
| **Team Experience** | Real product team (Dialpad) | Research-validated patterns |
| **Version** | 1.2.1 (5 months old) | 0.5.0 (active development) |

---

## Architecture Comparison

### Dialtone MCP Server

```
┌────────────────────────────────────────────────────┐
│  MCP Protocol Layer (index.ts)                     │
│  • 4 tools (search_utility_classes, search_tokens, │
│    search_components, search_icons)                │
│  • 5 resources (JSON data exports)                 │
│  • Version checking (npm registry)                 │
└─────────────────────┬──────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────────┐
│  Search Tools Layer (src/tools/)                   │
│  • utility-classes.ts — 3,315 CSS classes          │
│  • tokens.ts — 5,691 design tokens                 │
│  • components.ts — 87 Vue components               │
│  • icons.ts — 594 icons                            │
└─────────────────────┬──────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────────┐
│  Data Layer (src/data.ts)                          │
│  • Import from @dialpad/dialtone-css               │
│  • Import from @dialpad/dialtone-icons             │
│  • Import from @dialpad/dialtone-vue               │
│  • client-rules.json (AI guidelines)               │
└────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Stateless:** All data imported at build time from Dialtone packages
- **Read-only:** No file writing, no token generation
- **Monorepo-aware:** Lives inside Dialtone monorepo, uses workspace dependencies
- **Single-purpose:** Search and retrieve existing Dialtone assets

### mcp-ds

```
┌────────────────────────────────────────────────────┐
│  MCP Protocol Layer (src/index.ts)                 │
│  • 32 tools (designer, semantics, scales, themes,  │
│    migration, validation, transformation)          │
│  • 6 prompts (guided workflows)                    │
│  • 1 resource (token search)                       │
└─────────────────────┬──────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────────┐
│  Tools Layer (src/tools/)                          │
│  • Designer-centric: plan_flow, audit_design       │
│  • Semantics: scaffold, audit, coverage            │
│  • Scales: generate, analyze, audit                │
│  • Themes: resolve, project, list                  │
│  • Figma: extract, validate, generate docs         │
│  • Migration: topology, scenarios, execute         │
└─────────────────────┬──────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────────┐
│  Library Layer (src/lib/)                          │
│  • semantics/ — Ontology, scaffold, audit          │
│  • scales/ — 8 generators, analyzers, knowledge    │
│  • palette/ — HSL, Leonardo, mapping               │
│  • color/ — WCAG, APCA, conversions                │
│  • themes/ — Multi-dimensional resolution          │
│  • migration/ — Risk, scenarios, execution         │
│  • figma/ — Extraction, validation                 │
│  • factory/ — System generation                    │
└────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Stateful:** Reads/writes user's token files dynamically
- **Read-write:** Creates tokens, generates systems, executes migrations
- **Format-agnostic:** Supports W3C, Tokens Studio, Style Dictionary
- **Multi-purpose:** End-to-end token lifecycle management

---

## Feature Comparison

### 1. Search & Discovery

| Feature | Dialtone | mcp-ds |
|---------|----------|--------|
| **Keyword search** | ✅ Excellent (3-tier ranking) | ✅ Good (semantic + text) |
| **Utility class search** | ✅ 3,315 classes | ❌ N/A (not utility-focused) |
| **Design token search** | ✅ 5,691 tokens | ✅ User's tokens |
| **Component search** | ✅ 87 Vue components | ❌ N/A (pattern-based instead) |
| **Icon search** | ✅ 594 icons, category + keyword | ❌ N/A |
| **Deprecated filtering** | ✅ Auto-remove deprecated | ❌ Not applicable |
| **Discouraged swapping** | ✅ Auto-suggest alternatives | ❌ Not applicable |
| **Search speed** | ⚡ Very fast (in-memory) | 🐢 Slower (file read) |

**Winner: Dialtone** for existing system consumption.

### 2. Token Generation

| Feature | Dialtone | mcp-ds |
|---------|----------|--------|
| **Color palette generation** | ❌ None | ✅ HSL, Leonardo, contrast-safe |
| **Semantic token scaffolding** | ❌ None | ✅ Ontology-based generation |
| **Scale generation** | ❌ None | ✅ 8 mathematical strategies |
| **System generation** | ❌ None | ✅ One-command full system |
| **Theme generation** | ❌ None | ✅ Multi-dimensional projection |

**Winner: mcp-ds** — Dialtone doesn't generate tokens, only retrieves them.

### 3. Validation & Quality

| Feature | Dialtone | mcp-ds |
|---------|----------|--------|
| **Token validation** | ❌ None | ✅ 3 presets (relaxed/recommended/strict) |
| **WCAG contrast checking** | ❌ None | ✅ WCAG 2.1 + APCA |
| **Naming validation** | ❌ None | ✅ Semantic ontology compliance |
| **Scale compliance** | ❌ None | ✅ WCAG + Material + iOS HIG |
| **Accessibility audit** | ❌ None | ✅ Touch targets, line-heights |

**Winner: mcp-ds** — Dialtone assumes Dialtone tokens are already valid.

### 4. Migration & Evolution

| Feature | Dialtone | mcp-ds |
|---------|----------|--------|
| **Dependency analysis** | ❌ None | ✅ Topology mapping, Mermaid diagrams |
| **Anti-pattern detection** | ❌ None | ✅ 5 types (leakage, drift, redundancy) |
| **Risk assessment** | ❌ None | ✅ 5-dimensional scoring |
| **Scenario generation** | ❌ None | ✅ 3 approaches (conservative/progressive/comprehensive) |
| **Automated refactoring** | ❌ None | ✅ Dry-run, validation, rollback |
| **Reference scanning** | ❌ None | ✅ TS/JS/CSS/SCSS/JSON patterns |

**Winner: mcp-ds** — Migration is core to mcp-ds, not relevant to Dialtone.

### 5. Figma Integration

| Feature | Dialtone | mcp-ds |
|---------|----------|--------|
| **Variable extraction** | ❌ None | ✅ W3C/Tokens Studio/SD formats |
| **Validation** | ❌ None | ✅ 4 dimensions (naming/type/value/coverage) |
| **Component docs** | ❌ None | ✅ MDX/Markdown with examples |
| **Sync detection** | ❌ None | ✅ Drift scoring (0-100) |

**Winner: mcp-ds** — Figma integration planned but not in Dialtone.

### 6. Developer Experience

| Feature | Dialtone | mcp-ds |
|---------|----------|--------|
| **Installation** | ✅ Project-scoped (recommended) | ✅ Developer-configured |
| **Version checking** | ✅ Auto-check npm registry on startup | ❌ None |
| **Interactive testing** | ✅ `pnpm run interactive` CLI | ❌ None |
| **Automated tests** | ✅ 77 test cases, 100% pass rate | ❌ None |
| **Error handling** | ✅ Graceful fallbacks | ✅ Comprehensive |
| **Documentation** | ✅ Excellent README | ✅ Excellent (README + AGENT_HANDOFF) |

**Winner: Dialtone** for production-ready DX.

---

## Interesting Innovations to Adopt

### 1. ⭐ **Version Checking on Startup** (High Priority)

**Dialtone's approach:**
```typescript
async function checkVersion() {
  const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
  const data = await response.json();
  const latestVersion = data.version;
  
  if (currentVersion !== latestVersion) {
    console.error('⚠️  Dialtone MCP Server Update Available');
    console.error(`   Current: v${currentVersion}`);
    console.error(`   Latest:  v${latestVersion}`);
    console.error('   To update: npm install -D @dialpad/dialtone-mcp-server@latest');
  }
}
```

**Why adopt:**
- Users often run outdated versions without knowing
- Prevents bug reports for fixed issues
- Gentle nudge to stay up-to-date

**Implementation for mcp-ds:**
```typescript
// src/lib/version-check.ts
export async function checkVersion() {
  try {
    const response = await fetch('https://registry.npmjs.org/@your-org/mcp-ds/latest');
    const { version: latest } = await response.json();
    const { version: current } = await import('../package.json', { assert: { type: 'json' } });
    
    if (current !== latest) {
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('⚠️  mcp-ds Update Available');
      console.error(`   Current: v${current}`);
      console.error(`   Latest:  v${latest}`);
      console.error('   Run: npm update mcp-ds');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  } catch {
    // Fail silently if offline
  }
}
```

### 2. ⭐ **Interactive Testing CLI** (High Priority)

**Dialtone's approach:**
```bash
pnpm run interactive
# Query Format: Use keywords only, not questions.
# ✓ Good: "padding 8px", "color primary", "button"
# ✗ Bad: "how do I add padding?", "what button component exists?"
```

**Why adopt:**
- Rapid testing without full MCP client
- Developer-friendly for debugging search quality
- Immediate feedback loop

**Implementation for mcp-ds:**
```typescript
// interactive-search.ts
import readline from 'readline';
import { searchTokens } from './src/tools/search.js';
import { loadAllTokens } from './src/lib/parser.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const config = await loadConfig();
const tokens = await loadAllTokens('.', config);

console.log('mcp-ds Interactive Search');
console.log('Query format: keywords only (e.g., "color primary", "spacing 8")');
console.log('Type "exit" to quit\n');

const prompt = () => {
  rl.question('> ', async (query) => {
    if (query === 'exit') return rl.close();
    
    const results = await searchTokens({ query, limit: 10 });
    console.log(results.formatted);
    prompt();
  });
};

prompt();
```

### 3. ⭐ **Smart Deprecated/Discouraged Filtering** (Medium Priority)

**Dialtone's approach:**
```typescript
export function applySmartFilter(results, data) {
  for (const result of results) {
    // Remove deprecated completely
    if (result.metadata?.deprecated) {
      deprecatedCount++;
      continue;
    }
    
    // Swap discouraged with alternatives
    if (result.metadata?.discouraged && result.metadata?.alternatives) {
      for (const altPattern of result.metadata.alternatives) {
        // Handle wildcards: "d-headline-*" expands to all matching classes
        if (altPattern.includes('*')) {
          const prefix = altPattern.replace(/\*/g, '');
          for (const [name, itemData] of Object.entries(data)) {
            if (name.startsWith(prefix) && !itemData.metadata?.deprecated) {
              filtered.push({ ...result, name, details: itemData.values });
            }
          }
        }
      }
      continue;
    }
  }
}
```

**Why adopt:**
- Prevents users from adopting soon-to-be-removed tokens
- Proactive guidance toward current best practices
- Reduces technical debt in consuming codebases

**Implementation for mcp-ds:**
```typescript
// src/lib/validators/lifecycle.ts
export interface TokenLifecycle {
  status: 'stable' | 'discouraged' | 'deprecated';
  reason?: string;
  alternatives?: string[];
  deprecatedIn?: string; // version
  removedIn?: string; // version
}

// Add to token metadata:
{
  "$type": "color",
  "$value": "#007bff",
  "$extensions": {
    "mcp-ds": {
      "lifecycle": {
        "status": "discouraged",
        "reason": "Use semantic tokens instead of primitives",
        "alternatives": ["background.action.accent"]
      }
    }
  }
}

// In search results:
export function filterSearchResults(results, options) {
  return results.filter(r => {
    if (r.lifecycle?.status === 'deprecated' && options.hideDeprecated) return false;
    return true;
  }).map(r => {
    if (r.lifecycle?.status === 'discouraged') {
      r._warning = `⚠️ DISCOURAGED: ${r.lifecycle.reason}. Use: ${r.lifecycle.alternatives.join(', ')}`;
    }
    return r;
  });
}
```

### 4. ⭐ **Compound Property Detection** (Low Priority)

**Dialtone's approach:**
```typescript
// Detects "padding right" → "padding-right" from adjacent words
function extractKeywords(query, compoundProperties) {
  const words = query.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];
    const potential = `${word1}-${word2}`;
    
    if (compoundProperties.has(potential)) {
      compoundProps.push(potential);
    }
  }
}
```

**Why adopt:**
- More natural query language ("padding right" vs "padding-right")
- Better matches how designers/developers think
- Reduces cognitive load

**Implementation for mcp-ds:**
- Less relevant since mcp-ds uses semantic paths like `background.action.accent`
- But could help with property class detection: "background color" → `background`

### 5. ⭐ **Project-Scoped Configuration** (Medium Priority)

**Dialtone's recommendation:**
```json
// .mcp.json in project root (committed to version control)
{
  "mcpServers": {
    "dialtone": {
      "command": "dialtone-mcp-server"
    }
  }
}
```

**Why adopt:**
- Team consistency: everyone uses same version
- Project-specific config (different token paths per project)
- Version control benefits

**Current mcp-ds approach:**
- Uses `MCP_DS_PROJECT_ROOT` environment variable
- Config in `mcp-ds.config.json` at project root

**Hybrid approach:**
```json
// .mcp.json (already supported by Claude Code)
{
  "mcpServers": {
    "mcp-ds": {
      "command": "node",
      "args": ["./node_modules/mcp-ds/dist/index.js"],
      "cwd": "${workspaceFolder}",
      "env": {
        "MCP_DS_CONFIG": "./design-tokens/mcp-ds.config.json"
      }
    }
  }
}
```

### 6. 📊 **Automated Test Suite** (High Priority)

**Dialtone's approach:**
```javascript
// test-search.js — 77 test cases
const tests = [
  { query: 'padding 8px', expectedClasses: ['d-p8', 'd-pt8', 'd-pr8', ...] },
  { query: 'display flex', expectedClasses: ['d-d-flex', 'd-d-inline-flex'] },
  // ... 75 more
];

let passed = 0;
for (const test of tests) {
  const results = searchUtilityClasses(test.query);
  const matches = results.filter(r => test.expectedClasses.includes(r.name));
  if (matches.length === test.expectedClasses.length) passed++;
}

console.log(`Overall Success Rate: ${(passed/tests.length*100).toFixed(0)}% (${passed}/${tests.length})`);
```

**Why adopt:**
- Regression prevention
- Quality assurance for search accuracy
- Confidence in refactoring

**Implementation for mcp-ds:**
```typescript
// test/search-quality.test.ts
const testCases = [
  { query: 'blue color', expectedTokens: ['color.blue.500', 'color.blue.600'] },
  { query: 'button background', expectedTokens: ['background.action.accent', 'background.action.base'] },
  { query: 'spacing 8', expectedTokens: ['space.8', 'space.200'] },
];

let passed = 0;
for (const test of testCases) {
  const { results } = await searchTokens({ query: test.query });
  const found = results.filter(r => test.expectedTokens.includes(r.path));
  if (found.length >= test.expectedTokens.length) passed++;
  else console.error(`❌ Failed: "${test.query}" — Expected ${test.expectedTokens}, got ${results.map(r => r.path)}`);
}

console.log(`Search Quality: ${(passed/testCases.length*100).toFixed(0)}%`);
```

---

## What mcp-ds Does Better

### 1. **Generative Capabilities**

Dialtone only retrieves; mcp-ds **creates**:
- `generate_palette`: Leonardo color generation with contrast-safe scales
- `generate_scale`: 8 mathematical strategies (linear, modular, Fibonacci, golden ratio, fluid)
- `scaffold_semantic_tokens`: Ontology-based token generation from primitives
- `generate_system`: One-command full system creation

### 2. **Semantic Intelligence**

mcp-ds has deep understanding of token semantics:
- **Ontology system:** `{propertyClass}.{uxContext}.{intent}[.{state}][.{modifier}]`
- **Component knowledge:** 22 UI patterns with token requirements
- **Coverage analysis:** Which tokens are missing for a design

Dialtone just searches flat lists.

### 3. **Migration & Evolution**

mcp-ds 4-phase migration pipeline:
1. **Topology analysis:** Dependency graphs, anti-patterns
2. **Figma integration:** Cross-reference with Figma variables
3. **Scenario generation:** Risk-assessed migration plans
4. **Execution:** Dry-run, validation, rollback

Dialtone has no migration story.

### 4. **Multi-Dimensional Theming**

mcp-ds supports complex theming:
- Multiple dimensions (color-scheme, density, contrast)
- Theme projection (dark + compact combinations)
- Brand resolution (multi-brand systems)

Dialtone is single-theme (Dialtone itself).

### 5. **Format Flexibility**

mcp-ds supports:
- W3C Design Tokens (DTCG spec)
- Tokens Studio format
- Style Dictionary format

Dialtone is Dialtone-specific.

---

## What Dialtone Does Better

### 1. **Production Maturity**

- **Real team usage:** Dialpad product/design teams use this daily
- **Version stability:** v1.2.1 with months of production use
- **Test coverage:** 77 automated tests with 100% pass rate

mcp-ds is v0.5.0, not yet production-tested at scale.

### 2. **Search Performance**

- **In-memory data:** All data bundled at build time, instant lookups
- **Optimized ranking:** 3-tier ranking (exact, fuzzy, fallback)
- **Smart filtering:** Auto-remove deprecated, auto-swap discouraged

mcp-ds reads from disk, slower for large token sets.

### 3. **Developer Experience**

- **Interactive CLI:** Instant feedback without MCP client
- **Version checking:** Auto-notify on outdated versions
- **Clear examples:** Inline usage examples in every result
- **npx support:** Zero-install option with `npx -y @dialpad/dialtone-mcp-server`

mcp-ds requires manual setup, no interactive mode.

### 4. **Specificity**

Dialtone is laser-focused on one thing: **help developers use Dialtone**.

mcp-ds is broad, trying to serve all design token use cases.

**Specificity = better UX for Dialtone users.**

---

## Recommendations for mcp-ds

### Immediate Adoption (v0.6.0) ✅ COMPLETE

1. ✅ **Version checking on startup** — Implemented in Phase 1 (v0.5.0)
2. ✅ **Interactive CLI** — `npm run interactive` for testing search quality
3. ✅ **Automated test suite** — 33 test cases (100% pass rate)

### Short-term Adoption (v0.7.0) ✅ COMPLETE

4. ✅ **Smart lifecycle filtering** — Implemented in Phase 2 (v0.6.0)
5. ✅ **Project-scoped config** — `.mcp-ds.json` in project root
6. ✅ **Usage examples in search** — Show inline examples like Dialtone
7. ✅ **Private token filtering** — Exclude internal tokens by default
8. ✅ **Category filtering** — Organize tokens by category
9. ✅ **Metadata enrichment** — Comprehensive $lifecycle, $private, $category, $examples

### Long-term Consideration (v1.0.0)

7. 🤔 **Build-time bundling** — Pre-bundle example-tokens for faster startup
8. 🤔 **npx support** — `npx @your-org/mcp-ds` for zero-install
9. 🤔 **Documentation parity** — Match Dialtone's excellent README structure

---

## Strategic Positioning

### Dialtone MCP Server

**Tagline:** "Search Dialpad's design system from your AI assistant"

**Value prop:**
- Dialpad developers get instant access to Dialtone assets
- Zero learning curve (just search naturally)
- Always up-to-date with latest Dialtone releases

**Market:** **Single-company internal tool** (Dialpad)

### mcp-ds

**Tagline:** "AI-powered design token architecture and migration"

**Value prop:**
- Design system teams can generate, validate, and migrate tokens
- Semantic intelligence prevents bad naming/structure
- Mathematical rigor for scales and accessibility

**Market:** **Multi-company OSS tool** (any team building design systems)

### Complementary, Not Competitive

**Scenario 1: Dialpad builds a new product**
1. Use **mcp-ds** to architect the token system (scales, palette, semantics)
2. Export to Dialtone format
3. Use **Dialtone MCP** to help developers consume it

**Scenario 2: Startup builds design system**
1. Use **mcp-ds** to generate system from scratch
2. Build their own search MCP (inspired by Dialtone) for consumption

---

## Conclusion

**Dialtone MCP Server** is an excellent example of a **narrowly-scoped, production-grade MCP server** that does one thing well: retrieval from an existing system.

**Key learnings:**
1. ✅ Version checking improves adoption
2. ✅ Interactive testing speeds development
3. ✅ Automated tests prevent regressions
4. ✅ Smart filtering guides users to best practices
5. ✅ Project-scoped config improves team consistency

**mcp-ds should adopt these DX improvements** while maintaining its broader scope as a design token **architecture and generation** tool.

**Neither is "better"** — they solve different problems for different stages of the design system lifecycle.
