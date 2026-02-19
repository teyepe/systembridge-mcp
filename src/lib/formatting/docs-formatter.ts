/**
 * Documentation Formatting Utilities
 *
 * Utilities for generating LLM+human-readable documentation with structured
 * frontmatter, markdown tables, and code examples.
 */

import type { ComponentMetadata, ComponentTokenReference } from "../figma/types.js";

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

/**
 * Format component metadata as YAML frontmatter.
 */
export function formatFrontmatter(componentName: string, metadata: ComponentMetadata): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`component: ${componentName}`);
  lines.push(`category: ${metadata.category}`);
  
  if (metadata.tokens.length > 0) {
    lines.push("tokens:");
    
    // Group tokens by type
    const tokensByType = new Map<string, ComponentTokenReference[]>();
    for (const token of metadata.tokens) {
      const existing = tokensByType.get(token.type) || [];
      existing.push(token);
      tokensByType.set(token.type, existing);
    }
    
    // Output grouped tokens
    for (const [type, tokens] of tokensByType) {
      lines.push(`  ${type}:`);
      for (const token of tokens) {
        lines.push(`    - ${token.path}`);
      }
    }
  }
  
  if (metadata.figma) {
    lines.push("figma:");
    lines.push(`  nodeId: "${metadata.figma.nodeId}"`);
    if (metadata.figma.variants.length > 0) {
      lines.push(`  variants: [${metadata.figma.variants.map(v => `"${v}"`).join(", ")}]`);
    }
    if (metadata.figma.properties.length > 0) {
      lines.push(`  properties: [${metadata.figma.properties.map(p => `"${p}"`).join(", ")}]`);
    }
  }
  
  lines.push("accessibility:");
  lines.push(`  role: ${metadata.accessibility.role}`);
  lines.push(`  wcag: ${metadata.accessibility.wcag}`);
  lines.push(`  keyboardSupport: ${metadata.accessibility.keyboardSupport}`);
  if (metadata.accessibility.ariaAttributes.length > 0) {
    lines.push(`  ariaAttributes: [${metadata.accessibility.ariaAttributes.map(a => `"${a}"`).join(", ")}]`);
  }
  
  lines.push("---");
  lines.push("");
  
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Token Tables
// ---------------------------------------------------------------------------

/**
 * Format token references as a markdown table.
 */
export function formatTokenTable(tokens: ComponentTokenReference[]): string {
  if (tokens.length === 0) {
    return "";
  }
  
  const lines: string[] = [];
  lines.push("## Token Reference");
  lines.push("");
  lines.push("| Property | Token | Value | Purpose |");
  lines.push("|----------|-------|-------|---------|");
  
  for (const token of tokens) {
    const property = escapeMarkdown(token.property);
    const path = `\`${token.path}\``;
    const value = `\`${token.value}\``;
    const purpose = escapeMarkdown(token.purpose);
    lines.push(`| ${property} | ${path} | ${value} | ${purpose} |`);
  }
  
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Code Examples
// ---------------------------------------------------------------------------

/**
 * Generate code examples for a component.
 */
export function formatCodeExample(
  componentName: string,
  language: "jsx" | "tsx" | "html" | "vue" | "svelte",
  metadata: ComponentMetadata,
): string {
  const lines: string[] = [];
  lines.push("## Usage");
  lines.push("");
  lines.push("```" + language);
  
  switch (language) {
    case "jsx":
    case "tsx":
      lines.push(formatReactExample(componentName, metadata));
      break;
    case "html":
      lines.push(formatHtmlExample(componentName, metadata));
      break;
    case "vue":
      lines.push(formatVueExample(componentName, metadata));
      break;
    case "svelte":
      lines.push(formatSvelteExample(componentName, metadata));
      break;
  }
  
  lines.push("```");
  lines.push("");
  
  return lines.join("\n");
}

function formatReactExample(componentName: string, metadata: ComponentMetadata): string {
  const variants = metadata.figma?.variants || [];
  const properties = metadata.figma?.properties || [];
  
  const lines: string[] = [];
  
  // Basic example
  lines.push(`<${componentName} />`);
  lines.push("");
  
  // Example with common props
  if (variants.length > 0 || properties.length > 0) {
    const props: string[] = [];
    
    // Add first variant as example
    if (variants.length > 0 && variants[0]) {
      props.push(`variant="${variants[0]}"`);
    }
    
    // Add common size prop if in properties
    if (properties.includes("size")) {
      props.push('size="md"');
    }
    
    if (props.length > 0) {
      lines.push(`<${componentName} ${props.join(" ")} />`);
      lines.push("");
    }
  }
  
  // Example with children (if applicable)
  if (componentName.toLowerCase().includes("button") || 
      componentName.toLowerCase().includes("card") ||
      componentName.toLowerCase().includes("dialog")) {
    lines.push(`<${componentName}>`);
    lines.push(`  Content here`);
    lines.push(`</${componentName}>`);
  }
  
  return lines.join("\n");
}

function formatHtmlExample(componentName: string, metadata: ComponentMetadata): string {
  const kebabName = toKebabCase(componentName);
  const variants = metadata.figma?.variants || [];
  
  const lines: string[] = [];
  
  // Basic example
  const classNames = [`${kebabName}`];
  if (variants.length > 0 && variants[0]) {
    classNames.push(`${kebabName}--${toKebabCase(variants[0])}`);
  }
  
  lines.push(`<div class="${classNames.join(" ")}">`);
  lines.push(`  Content here`);
  lines.push(`</div>`);
  
  return lines.join("\n");
}

function formatVueExample(componentName: string, metadata: ComponentMetadata): string {
  const variants = metadata.figma?.variants || [];
  const properties = metadata.figma?.properties || [];
  
  const lines: string[] = [];
  lines.push(`<${componentName}`);
  
  const props: string[] = [];
  if (variants.length > 0 && variants[0]) {
    props.push(`  variant="${variants[0]}"`);
  }
  if (properties.includes("size")) {
    props.push(`  size="md"`);
  }
  
  if (props.length > 0) {
    lines.push(...props);
  }
  
  lines.push(`/>`);
  
  return lines.join("\n");
}

function formatSvelteExample(componentName: string, metadata: ComponentMetadata): string {
  const variants = metadata.figma?.variants || [];
  
  const lines: string[] = [];
  
  const props: string[] = [];
  if (variants.length > 0 && variants[0]) {
    props.push(`variant="${variants[0]}"`);
  }
  
  lines.push(`<${componentName} ${props.join(" ")} />`);
  
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeMarkdown(text: string): string {
  return text
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Complete Document Generation
// ---------------------------------------------------------------------------

/**
 * Generate a complete component documentation document.
 */
export function formatCompleteDocument(
  componentName: string,
  metadata: ComponentMetadata,
  includeTokenRefs: boolean,
  includeCodeExamples: boolean,
  codeLanguage: "jsx" | "tsx" | "html" | "vue" | "svelte" = "jsx",
): string {
  const lines: string[] = [];
  
  // Frontmatter
  lines.push(formatFrontmatter(componentName, metadata));
  
  // Title and description
  lines.push(`# ${componentName}`);
  lines.push("");
  lines.push(metadata.description);
  lines.push("");
  
  // Variants section (if applicable)
  if (metadata.figma?.variants && metadata.figma.variants.length > 0) {
    lines.push("## Variants");
    lines.push("");
    for (const variant of metadata.figma.variants) {
      lines.push(`### ${variant}`);
      lines.push("");
      // Find tokens specific to this variant if possible
      const variantTokens = metadata.tokens.filter(t => 
        t.purpose.toLowerCase().includes(variant.toLowerCase())
      );
      if (variantTokens.length > 0) {
        lines.push("**Tokens:**");
        for (const token of variantTokens) {
          lines.push(`- ${token.property}: \`${token.path}\` (${token.value})`);
        }
        lines.push("");
      }
    }
  }
  
  // Code examples
  if (includeCodeExamples) {
    lines.push(formatCodeExample(componentName, codeLanguage, metadata));
  }
  
  // Token reference table
  if (includeTokenRefs && metadata.tokens.length > 0) {
    lines.push(formatTokenTable(metadata.tokens));
  }
  
  // Accessibility notes
  lines.push("## Accessibility");
  lines.push("");
  lines.push(`- **Role:** \`${metadata.accessibility.role}\``);
  lines.push(`- **WCAG Level:** ${metadata.accessibility.wcag}`);
  lines.push(`- **Keyboard Support:** ${metadata.accessibility.keyboardSupport ? "Yes" : "No"}`);
  if (metadata.accessibility.ariaAttributes.length > 0) {
    lines.push(`- **ARIA Attributes:** ${metadata.accessibility.ariaAttributes.map(a => `\`${a}\``).join(", ")}`);
  }
  lines.push("");
  
  return lines.join("\n");
}
