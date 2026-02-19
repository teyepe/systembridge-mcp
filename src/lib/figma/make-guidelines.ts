import type { DesignToken, TokenMap } from "../types.js";
import {
  ALL_PROPERTY_CLASSES,
  COMPONENT_TOKEN_SURFACES,
  type ComponentTokenSurface,
  SEMANTIC_INTENTS,
  UX_CONTEXTS,
  buildSemanticPath,
} from "../semantics/ontology.js";

/**
 * Generates a complete set of guidelines for Figma Make.
 *
 * @param tokens - The full token map of the design system
 * @param components - Optional list of component names to generate specific guidelines for
 * @returns A map of file paths (relative to guidelines root) to content strings
 */
export function generateFigmaMakeDocs(
  tokens: TokenMap,
  components?: string[],
): Map<string, string> {
  const files = new Map<string, string>();

  // 1. Master Guidelines.md
  files.set("Guidelines.md", generateMasterGuidelines());

  // 2. Token Guidelines
  const tokenDocs = generateTokenGuidelines(tokens);
  for (const [name, content] of tokenDocs) {
    files.set(`tokens/${name}`, content);
  }

  // 3. Component Guidelines
  const componentDocs = generateComponentGuidelines(components);
  for (const [name, content] of componentDocs) {
    files.set(`components/${name}`, content);
  }

  return files;
}

/**
 * Generates the master Guidelines.md entry point.
 */
function generateMasterGuidelines(): string {
  return `# Design System Guidelines

These guidelines define the rules for generating designs using our design system.
ALWAYS follow these rules strictly.

## Core Principles

1. **Use Semantic Tokens**: Never use raw hex values or arbitrary spacing. Always reference the semantic tokens defined in \`tokens/\`.
2. **Follow Component Patterns**: Use the component structures defined in \`components/\`.
3. **Accessibility**: Ensure strict WCAG 2.1 AA compliance for contrast.
4. **Spacing**: Use the 4px grid system (spacing.1 = 4px).

## Documentation Structure

- **tokens/**: Available design tokens and their usage rules.
  - \`tokens/color.md\`: Semantic color usage (backgrounds, text, borders).
  - \`tokens/typography.md\`: Type scale and font styles.
  - \`tokens/spacing.md\`: Spacing and layout tokens.
  - \`tokens/radius.md\`: Border radius tokens.

- **components/**: Component-specific implementation rules.
  - See individual files for Button, Input, Card, etc.

## Global Rules

- **Backgrounds**: Always pair \`background.action.*\` with appropriate text colors.
- **Text**: Use \`text.base\` for body copy, \`text.muted\` for secondary content.
- **Borders**: Use \`border.base\` for default separators.
`;
}

/**
 * Generates token documentation files.
 */
function generateTokenGuidelines(tokens: TokenMap): Map<string, string> {
  const docs = new Map<string, string>();

  // Buckets for categorization
  const semanticColors: DesignToken[] = [];
  const typography: DesignToken[] = [];
  const spacing: DesignToken[] = [];
  const radius: DesignToken[] = [];
  const shadows: DesignToken[] = [];

  // Single pass iteration
  for (const token of tokens.values()) {
    if (token.type === "color" && token.path.includes("semantic")) {
      semanticColors.push(token);
    } else if (token.type === "typography") {
      typography.push(token);
    } else if (token.type === "dimension" && token.path.includes("spacing")) {
      spacing.push(token);
    } else if (token.type === "dimension" && token.path.includes("radius")) {
      radius.push(token);
    } else if (token.type === "shadow") {
      shadows.push(token);
    }
  }

  // Helper to sort and create docs
  const addDoc = (name: string, title: string, items: DesignToken[], instr: string) => {
    if (items.length > 0) {
      items.sort((a, b) => a.path.localeCompare(b.path));
      docs.set(name, formatTokenDoc(title, items, instr));
    }
  };

  addDoc("color.md", "Semantic Colors", semanticColors, 
    "Use these semantic color tokens for all UI elements. Do not use raw hex values.");
  
  addDoc("typography.md", "Typography", typography, 
    "Use these typography tokens for all text elements.");
  
  addDoc("spacing.md", "Spacing", spacing, 
    "Use these spacing tokens for padding, margin, and gaps.");
  
  addDoc("radius.md", "Border Radius", radius, 
    "Use these radius tokens for component corners.");
  
  addDoc("shadows.md", "Shadows", shadows, 
    "Use these shadow tokens for elevation and depth.");

  return docs;
}

/**
 * Generates component-specific guidelines based on the semantic ontology.
 */
function generateComponentGuidelines(components?: string[]): Map<string, string> {
  const docs = new Map<string, string>();
  
  // Use either provided list or all known components from ontology
  const surfacesToGenerate = components
    ? COMPONENT_TOKEN_SURFACES.filter(s => components.includes(s.component))
    : COMPONENT_TOKEN_SURFACES;

  for (const surface of surfacesToGenerate) {
    docs.set(`${surface.component}.md`, formatComponentDoc(surface));
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTokenDoc(
  title: string,
  tokens: DesignToken[],
  instruction: string
): string {
  let output = `# ${title}\n\n${instruction}\n\n`;
  
  // Group by rough category (2nd segment of path)
  const groups = new Map<string, DesignToken[]>();
  for (const t of tokens) {
    const group = t.path.split('.')[1] || 'General';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(t);
  }

  for (const [group, groupTokens] of groups) {
    output += `## ${group}\n\n`;
    for (const t of groupTokens) {
      const val = typeof t.value === 'object' ? JSON.stringify(t.value) : t.value;
      const description = t.description ? ` - ${t.description}` : "";
      output += `- \`${t.path}\`: ${val}${description}\n`;
    }
    output += "\n";
  }

  return output;
}

function formatComponentDoc(surface: ComponentTokenSurface): string {
  const title = surface.component.charAt(0).toUpperCase() + surface.component.slice(1);
  
  let output = `# ${title} Component\n\n`;
  output += `## Usage Rules\n`;
  output += `- UX Context: **${surface.uxContext}**\n`;
  output += `- Implement the following token slots strictly.\n\n`;

  output += `## Required Tokens\n\n`;

  // Generate the semantic paths this component SHOULD use
  for (const intent of surface.intents) {
    output += `### ${intent.charAt(0).toUpperCase() + intent.slice(1)} Intent\n`;
    
    for (const prop of surface.propertyClasses) {
      // Basic path: property.context.intent
      const path = buildSemanticPath({
        propertyClass: prop,
        uxContext: surface.uxContext,
        intent: intent
      });
      output += `- **${prop}**: \`${path}\`\n`;

      // Interactive states
      if (surface.states.length > 1) { // more than just default
        for (const state of surface.states) {
          if (state === 'default') continue;
          output += `  - ${state}: \`${path}.${state}\`\n`;
        }
      }
    }
    output += "\n";
  }

  return output;
}
