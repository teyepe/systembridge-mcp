/**
 * Component Documentation Generator
 *
 * Generates comprehensive component documentation by combining:
 * - Local token definitions
 * - Figma component structure and metadata
 * - Component token surface definitions (expected tokens)
 * - LLM+human-readable formatting
 */

import type { DesignToken } from "../types.js";
import type {
  ComponentDocumentationOptions,
  ComponentDocumentationResult,
  ComponentDocumentation,
  ComponentMetadata,
  ComponentTokenReference,
  FigmaComponentData,
} from "./types.js";
import { getComponentSurface } from "../semantics/ontology.js";
import { formatCompleteDocument } from "../formatting/docs-formatter.js";

// ---------------------------------------------------------------------------
// Main Documentation Generation
// ---------------------------------------------------------------------------

/**
 * Generate documentation for one or more components.
 *
 * @param options Documentation generation options
 * @returns Generated documentation and summary
 */
export async function generateComponentDocs(
  options: ComponentDocumentationOptions,
): Promise<ComponentDocumentationResult> {
  const docs: ComponentDocumentation[] = [];

  for (const componentName of options.componentNames) {
    const doc = await generateSingleComponentDoc(
      componentName,
      options
    );
    docs.push(doc);
  }

  // Calculate summary
  const tokensReferenced = new Set<string>();
  let examplesGenerated = 0;

  for (const doc of docs) {
    for (const token of doc.metadata.tokens) {
      tokensReferenced.add(token.path);
    }
    if (options.includeCodeExamples) {
      examplesGenerated++;
    }
  }

  return {
    docs,
    summary: {
      componentsDocumented: docs.length,
      tokensReferenced: tokensReferenced.size,
      examplesGenerated,
    },
  };
}

// ---------------------------------------------------------------------------
// Single Component Documentation
// ---------------------------------------------------------------------------

async function generateSingleComponentDoc(
  componentName: string,
  options: ComponentDocumentationOptions,
): Promise<ComponentDocumentation> {
  // Get component surface (expected tokens)
  const surface = getComponentSurface(componentName);

  // Get Figma component data
  const figmaData = options.figmaComponentData?.[componentName];

  // Build component metadata
  const metadata = buildComponentMetadata(
    componentName,
    surface,
    figmaData,
    options.localTokens
  );

  // Generate formatted documentation
  const content = formatCompleteDocument(
    componentName,
    metadata,
    options.includeTokenRefs,
    options.includeCodeExamples,
    options.codeLanguage || "jsx"
  );

  return {
    name: componentName,
    content,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Metadata Builder
// ---------------------------------------------------------------------------

function buildComponentMetadata(
  componentName: string,
  surface: ReturnType<typeof getComponentSurface>,
  figmaData: FigmaComponentData | undefined,
  localTokens: Map<string, DesignToken>,
): ComponentMetadata {
  // Determine category from uxContext or infer from name
  const category = surface?.uxContext
    ? surface.uxContext.charAt(0).toUpperCase() + surface.uxContext.slice(1)
    : inferCategoryFromName(componentName);

  // Build description
  const description = 
    figmaData?.description || 
    `${componentName} component`;

  // Collect token references
  const tokens = collectTokenReferences(
    componentName,
    surface,
    figmaData,
    localTokens
  );

  // Build Figma metadata
  const figma = figmaData ? {
    nodeId: figmaData.id,
    variants: figmaData.variants?.map(v => v.name) || [],
    properties: figmaData.properties?.map(p => p.name) || [],
  } : undefined;

  // Build accessibility metadata
  const accessibility = buildAccessibilityMetadata(
    componentName,
    surface
  );

  return {
    category,
    description,
    tokens,
    figma,
    accessibility,
  };
}

// ---------------------------------------------------------------------------
// Token Reference Collection
// ---------------------------------------------------------------------------

function collectTokenReferences(
  componentName: string,
  surface: ReturnType<typeof getComponentSurface>,
  figmaData: FigmaComponentData | undefined,
  localTokens: Map<string, DesignToken>,
): ComponentTokenReference[] {
  const references: ComponentTokenReference[] = [];
  const seenPaths = new Set<string>();

  // From component surface definition
  if (surface) {
    // Generate expected token paths from surface definition
    // Format: {propertyClass}.{uxContext}.{intent}.{state}
    for (const propertyClass of surface.propertyClasses) {
      for (const intent of surface.intents) {
        for (const state of surface.states) {
          // Try common semantic token patterns
          const patterns = [
            `${propertyClass}.${surface.uxContext}.${intent}.${state}`,
            `${propertyClass}.${intent}.${state}`,
            `semantic.${propertyClass}.${intent}.${state}`,
          ];

          for (const pattern of patterns) {
            const token = localTokens.get(pattern);
            if (token && !seenPaths.has(token.path)) {
              seenPaths.add(token.path);
              references.push({
                path: token.path,
                type: token.type || "unknown",
                value: String(token.resolvedValue || token.value),
                purpose: `${propertyClass} for ${intent} ${state} state`,
                property: propertyClass,
              });
              break; // Found a match, move to next combination
            }
          }
        }
      }
    }
  }

  // From Figma bound variables
  if (figmaData?.boundVariables) {
    for (const boundVar of figmaData.boundVariables) {
      // Try to find the token
      const token = findTokenByName(boundVar.variableName, localTokens);
      
      if (token && !seenPaths.has(token.path)) {
        seenPaths.add(token.path);
        references.push({
          path: token.path,
          type: token.type || "unknown",
          value: String(token.resolvedValue || token.value),
          purpose: `Bound to ${boundVar.property}`,
          property: boundVar.property,
        });
      }
    }
  }

  // Sort by property name for consistency
  return references.sort((a, b) => a.property.localeCompare(b.property));
}

/**
 * Find a token by name (handles fuzzy matching).
 */
function findTokenByName(
  name: string,
  localTokens: Map<string, DesignToken>,
): DesignToken | undefined {
  // Try exact match
  const exact = localTokens.get(name);
  if (exact) return exact;

  // Try normalized match
  const normalized = name.replace(/\//g, ".").toLowerCase();
  for (const [path, token] of localTokens) {
    if (path.toLowerCase() === normalized) {
      return token;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Accessibility Metadata
// ---------------------------------------------------------------------------

function buildAccessibilityMetadata(
  componentName: string,
  surface: ReturnType<typeof getComponentSurface>,
): ComponentMetadata["accessibility"] {
  const lower = componentName.toLowerCase();

  // Determine ARIA role
  let role = "generic";
  if (lower.includes("button")) role = "button";
  else if (lower.includes("link")) role = "link";
  else if (lower.includes("input") || lower.includes("textfield")) role = "textbox";
  else if (lower.includes("checkbox")) role = "checkbox";
  else if (lower.includes("radio")) role = "radio";
  else if (lower.includes("select") || lower.includes("dropdown")) role = "combobox";
  else if (lower.includes("dialog") || lower.includes("modal")) role = "dialog";
  else if (lower.includes("alert")) role = "alert";
  else if (lower.includes("tooltip")) role = "tooltip";
  else if (lower.includes("menu")) role = "menu";
  else if (lower.includes("tab")) role = "tab";
  else if (lower.includes("navigation") || lower.includes("nav")) role = "navigation";

  // Determine WCAG level (based on component criticality)
  const wcag = (
    lower.includes("button") ||
    lower.includes("link") ||
    lower.includes("input") ||
    lower.includes("form")
  ) ? "AA" : "AA"; // Default to AA for all

  // Keyboard support (most interactive components should have it)
  const keyboardSupport = !(
    lower.includes("tooltip") ||
    lower.includes("badge") ||
    lower.includes("avatar") ||
    lower.includes("icon")
  );

  // Common ARIA attributes
  const ariaAttributes: string[] = [];
  if (lower.includes("button") || lower.includes("link")) {
    ariaAttributes.push("aria-label", "aria-pressed");
  }
  if (lower.includes("input") || lower.includes("textfield")) {
    ariaAttributes.push("aria-label", "aria-describedby", "aria-invalid");
  }
  if (lower.includes("dialog") || lower.includes("modal")) {
    ariaAttributes.push("aria-labelledby", "aria-modal", "aria-describedby");
  }
  if (lower.includes("alert")) {
    ariaAttributes.push("aria-live", "aria-atomic");
  }

  return {
    role,
    wcag,
    keyboardSupport,
    ariaAttributes,
  };
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function inferCategoryFromName(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("button")) return "Actions";
  if (lower.includes("input") || lower.includes("textfield") || lower.includes("select")) {
    return "Forms";
  }
  if (lower.includes("card") || lower.includes("panel")) return "Layout";
  if (lower.includes("dialog") || lower.includes("modal")) return "Overlays";
  if (lower.includes("alert") || lower.includes("toast") || lower.includes("snackbar")) {
    return "Feedback";
  }
  if (lower.includes("tab") || lower.includes("menu") || lower.includes("navigation")) {
    return "Navigation";
  }
  if (lower.includes("icon") || lower.includes("avatar") || lower.includes("badge")) {
    return "Media";
  }

  return "Components";
}

function inferTypeFromProperty(property: string): string {
  const lower = property.toLowerCase();

  if (lower.includes("color") || lower.includes("background") || lower.includes("border") || lower.includes("fill")) {
    return "color";
  }
  if (lower.includes("spacing") || lower.includes("padding") || lower.includes("margin") || lower.includes("gap")) {
    return "dimension";
  }
  if (lower.includes("shadow")) return "shadow";
  if (lower.includes("radius")) return "dimension";
  if (lower.includes("font") || lower.includes("text")) return "typography";

  return "string";
}

/**
 * Format documentation result as markdown summary.
 */
export function formatDocumentationSummary(result: ComponentDocumentationResult): string {
  const lines: string[] = [];

  lines.push("# Component Documentation Generated");
  lines.push("");
  lines.push(`- **Components:** ${result.summary.componentsDocumented}`);
  lines.push(`- **Tokens Referenced:** ${result.summary.tokensReferenced}`);
  lines.push(`- **Code Examples:** ${result.summary.examplesGenerated}`);
  lines.push("");

  lines.push("## Components");
  lines.push("");
  for (const doc of result.docs) {
    lines.push(`### ${doc.name}`);
    lines.push(`- **Category:** ${doc.metadata.category}`);
    lines.push(`- **Tokens:** ${doc.metadata.tokens.length}`);
    if (doc.metadata.figma) {
      lines.push(`- **Figma Node:** ${doc.metadata.figma.nodeId}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
