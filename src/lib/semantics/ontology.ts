/**
 * Semantic Token Ontology
 *
 * Defines the structural knowledge model for semantic design tokens.
 * This ontology encodes the relationships between CSS property targets,
 * semantic intents, UX contexts, interaction states, and emphasis modifiers.
 *
 * The ontology is based on research across production design systems:
 * - VTEX Shoreline ($fg/$bg/$border + surface + modifier + state)
 * - GitLab Pajamas (constant → semantic → contextual, concept groups)
 * - Material Design 3 (color roles, surface containers, accessible pairing)
 * - Backbase (background/on-background/foreground/border/link/focus)
 * - ttoss ({ux}.{context}.{nature}.{state})
 * - EightShapes (taxonomy audit methodology, anti-pattern identification)
 */

// ---------------------------------------------------------------------------
// Property classes — CSS-destination axis
// ---------------------------------------------------------------------------

/**
 * A property class describes WHAT CSS property a token ultimately targets.
 * This is the most important structural decision for separation of concerns.
 */
export interface PropertyClass {
  /** Machine identifier, e.g. "background" */
  id: string;
  /** Human label */
  label: string;
  /** One-line description of the property class */
  description: string;
  /** CSS properties this class maps to */
  cssProperties: string[];
  /** Which token types (from DesignToken.type) are valid for this class */
  allowedTokenTypes: string[];
  /**
   * Accessibility pairing: which other property classes MUST have a
   * corresponding token when this one exists, to ensure contrast.
   * e.g. "background" requires "text" or "icon" to exist as pairable.
   */
  requiredPairings?: string[];
}

/** Built-in property classes covering the CSS color model */
export const COLOR_PROPERTY_CLASSES: PropertyClass[] = [
  {
    id: "background",
    label: "Background",
    description:
      "Surface fills and background colors. Maps to background-color, background.",
    cssProperties: ["background-color", "background"],
    allowedTokenTypes: ["color"],
    requiredPairings: ["text"],
  },
  {
    id: "text",
    label: "Text",
    description:
      "Text content color. Maps to CSS color property for text elements.",
    cssProperties: ["color"],
    allowedTokenTypes: ["color"],
    requiredPairings: ["background"],
  },
  {
    id: "icon",
    label: "Icon",
    description:
      "Icon and SVG fill color. Separated from text to allow independent emphasis control.",
    cssProperties: ["color", "fill"],
    allowedTokenTypes: ["color"],
    requiredPairings: ["background"],
  },
  {
    id: "border",
    label: "Border",
    description:
      "Border stroke color. Distinct from outline (focus rings) and from background fills.",
    cssProperties: ["border-color"],
    allowedTokenTypes: ["color"],
  },
  {
    id: "outline",
    label: "Outline / Focus",
    description:
      "Focus ring and outline color. Separated from border for interactive accessibility.",
    cssProperties: ["outline-color", "box-shadow"],
    allowedTokenTypes: ["color"],
  },
  {
    id: "shadow",
    label: "Shadow / Elevation",
    description: "Box shadow and elevation effects.",
    cssProperties: ["box-shadow"],
    allowedTokenTypes: ["shadow", "color"],
  },
];

/** Built-in property classes for spacing (block/inline model) */
export const SPACING_PROPERTY_CLASSES: PropertyClass[] = [
  {
    id: "spacing-inline",
    label: "Inline Spacing",
    description:
      "Horizontal / inline-axis spacing: padding-inline, margin-inline, column-gap.",
    cssProperties: [
      "padding-inline",
      "padding-inline-start",
      "padding-inline-end",
      "margin-inline",
      "margin-inline-start",
      "margin-inline-end",
      "column-gap",
    ],
    allowedTokenTypes: ["dimension"],
  },
  {
    id: "spacing-block",
    label: "Block Spacing",
    description:
      "Vertical / block-axis spacing: padding-block, margin-block, row-gap.",
    cssProperties: [
      "padding-block",
      "padding-block-start",
      "padding-block-end",
      "margin-block",
      "margin-block-start",
      "margin-block-end",
      "row-gap",
    ],
    allowedTokenTypes: ["dimension"],
  },
  {
    id: "gap",
    label: "Gap",
    description: "Uniform gap between flex/grid children.",
    cssProperties: ["gap"],
    allowedTokenTypes: ["dimension"],
  },
];

/** Built-in property classes for sizing */
export const SIZING_PROPERTY_CLASSES: PropertyClass[] = [
  {
    id: "sizing",
    label: "Sizing",
    description: "Width, height, min/max dimensions.",
    cssProperties: [
      "width",
      "height",
      "min-width",
      "min-height",
      "max-width",
      "max-height",
    ],
    allowedTokenTypes: ["dimension"],
  },
  {
    id: "radius",
    label: "Border Radius",
    description: "Corner rounding.",
    cssProperties: ["border-radius"],
    allowedTokenTypes: ["dimension"],
  },
];

/** All built-in property classes */
export const ALL_PROPERTY_CLASSES: PropertyClass[] = [
  ...COLOR_PROPERTY_CLASSES,
  ...SPACING_PROPERTY_CLASSES,
  ...SIZING_PROPERTY_CLASSES,
];

// ---------------------------------------------------------------------------
// Semantic intents — meaning axis
// ---------------------------------------------------------------------------

/**
 * A semantic intent describes the MEANING a token carries — not its visual
 * appearance, but its communicative purpose.
 */
export interface SemanticIntent {
  id: string;
  label: string;
  description: string;
  /** Primitive hue families typically referenced (advisory, not enforcing) */
  typicalHues?: string[];
  /** Example token: "background.base" */
  exampleToken?: string;
}

export const SEMANTIC_INTENTS: SemanticIntent[] = [
  {
    id: "base",
    label: "Base / Neutral",
    description:
      "Default surface with no specific semantic weight. The starting point for most UI elements.",
    typicalHues: ["neutral", "gray"],
    exampleToken: "background.base",
  },
  {
    id: "accent",
    label: "Accent / Brand",
    description:
      "Primary brand emphasis. Reserved for the most important actions and elements " +
      "that need to stand out. Use sparingly to preserve attention hierarchy.",
    typicalHues: ["blue", "brand"],
    exampleToken: "background.accent",
  },
  {
    id: "muted",
    label: "Muted / Subtle",
    description:
      "De-emphasized elements. Secondary actions, placeholder text, disabled states. " +
      "Lower visual weight than base.",
    typicalHues: ["neutral", "gray"],
    exampleToken: "text.muted",
  },
  {
    id: "inverted",
    label: "Inverted",
    description:
      "Reverse of the base surface. Used sparingly for high-contrast attention " +
      "(e.g., modal backdrops, tooltips, snackbars).",
    typicalHues: [],
    exampleToken: "background.inverted",
  },
  {
    id: "success",
    label: "Success",
    description:
      "Positive outcome — action completed, validation passed. Implies no further action needed.",
    typicalHues: ["green"],
    exampleToken: "background.success",
  },
  {
    id: "warning",
    label: "Warning",
    description:
      "Caution — potentially unexpected behavior, non-critical issue. " +
      "Requires attention but not urgency.",
    typicalHues: ["yellow", "amber", "orange"],
    exampleToken: "background.warning",
  },
  {
    id: "danger",
    label: "Danger / Critical",
    description:
      "Error or destructive action — system failure, validation error, " +
      "irreversible action. Demands immediate attention.",
    typicalHues: ["red"],
    exampleToken: "background.danger",
  },
  {
    id: "info",
    label: "Informational",
    description:
      "Neutral informational message. Prominent but not urgent. " +
      "Announcements, progress feedback, tips.",
    typicalHues: ["blue", "cyan"],
    exampleToken: "background.info",
  },
];

// ---------------------------------------------------------------------------
// UX contexts — component-domain axis
// ---------------------------------------------------------------------------

/**
 * A UX context is a category of components that share interaction patterns
 * and therefore share a semantic token surface.
 */
export interface UxContext {
  id: string;
  label: string;
  description: string;
  /** Typical components in this context */
  components: string[];
  /**
   * Which property classes are essential for this context.
   * If a scaffolded system covers this context, these MUST be present.
   */
  requiredPropertyClasses: string[];
  /** Whether interactive states (hover/active/focus/disabled) are needed */
  interactive: boolean;
}

export const UX_CONTEXTS: UxContext[] = [
  {
    id: "action",
    label: "Action",
    description:
      "Interactive elements that trigger user actions: buttons, CTAs, links, toggles.",
    components: [
      "button",
      "icon-button",
      "link",
      "toggle",
      "fab",
      "chip",
      "cta",
    ],
    requiredPropertyClasses: ["background", "text", "border", "outline"],
    interactive: true,
  },
  {
    id: "input",
    label: "Input / Control",
    description:
      "Form elements and data entry: text fields, selects, checkboxes, radios, sliders.",
    components: [
      "text-input",
      "textarea",
      "select",
      "checkbox",
      "radio",
      "switch",
      "slider",
      "date-picker",
      "file-input",
    ],
    requiredPropertyClasses: ["background", "text", "border", "outline"],
    interactive: true,
  },
  {
    id: "surface",
    label: "Surface / Display",
    description:
      "Content presentation and containers: pages, cards, panels, modals, sidebars.",
    components: [
      "page",
      "card",
      "panel",
      "modal",
      "dialog",
      "sidebar",
      "drawer",
      "popover",
      "tooltip",
      "sheet",
    ],
    requiredPropertyClasses: ["background", "text", "border", "shadow"],
    interactive: false,
  },
  {
    id: "feedback",
    label: "Feedback",
    description:
      "Status communication and user feedback: alerts, toasts, banners, notifications. " +
      "Typically transient — triggered by events or actions.",
    components: [
      "alert",
      "toast",
      "snackbar",
      "banner",
      "notification",
      "progress",
      "skeleton",
    ],
    requiredPropertyClasses: ["background", "text", "border", "icon"],
    interactive: false,
  },
  {
    id: "navigation",
    label: "Navigation",
    description:
      "Wayfinding elements: menus, tabs, breadcrumbs, pagination, nav bars.",
    components: [
      "navbar",
      "sidebar-nav",
      "tabs",
      "breadcrumb",
      "pagination",
      "menu",
      "dropdown-menu",
      "stepper",
    ],
    requiredPropertyClasses: ["background", "text", "border"],
    interactive: true,
  },
  {
    id: "data",
    label: "Data Display",
    description:
      "Structured data presentation: tables, lists, trees, grids, data cards.",
    components: [
      "table",
      "list",
      "tree",
      "grid",
      "data-card",
      "badge",
      "tag",
      "avatar",
    ],
    requiredPropertyClasses: ["background", "text", "border"],
    interactive: false,
  },
];

// ---------------------------------------------------------------------------
// Interaction states
// ---------------------------------------------------------------------------

export interface InteractionState {
  id: string;
  label: string;
  description: string;
  /** CSS pseudo-class or attribute selector this maps to */
  cssSelector: string;
  /** Whether this state is omitted from token name when it's the default */
  implicitDefault: boolean;
}

export const INTERACTION_STATES: InteractionState[] = [
  {
    id: "default",
    label: "Default",
    description: "Resting / idle state. Often omitted from token name.",
    cssSelector: "",
    implicitDefault: true,
  },
  {
    id: "hover",
    label: "Hover",
    description: "Pointer hovering over the element.",
    cssSelector: ":hover",
    implicitDefault: false,
  },
  {
    id: "active",
    label: "Active / Pressed",
    description: "Element is being clicked or tapped.",
    cssSelector: ":active",
    implicitDefault: false,
  },
  {
    id: "focus",
    label: "Focus",
    description: "Element has keyboard or programmatic focus.",
    cssSelector: ":focus-visible",
    implicitDefault: false,
  },
  {
    id: "disabled",
    label: "Disabled",
    description: "Element is non-interactive / unavailable.",
    cssSelector: ":disabled, [aria-disabled=true]",
    implicitDefault: false,
  },
  {
    id: "selected",
    label: "Selected",
    description: "Element is in a selected/checked/active-route state.",
    cssSelector: "[aria-selected=true], [aria-checked=true], :checked",
    implicitDefault: false,
  },
];

// ---------------------------------------------------------------------------
// Emphasis modifiers
// ---------------------------------------------------------------------------

export interface EmphasisModifier {
  id: string;
  label: string;
  description: string;
}

export const EMPHASIS_MODIFIERS: EmphasisModifier[] = [
  {
    id: "default",
    label: "Default",
    description: "Standard prominence. Often omitted from token name.",
  },
  {
    id: "strong",
    label: "Strong",
    description:
      "Higher prominence / darker tone. Primary actions, important borders.",
  },
  {
    id: "soft",
    label: "Soft / Subtle",
    description:
      "Lower prominence / lighter tone. Descriptions, secondary content.",
  },
  {
    id: "plain",
    label: "Plain",
    description:
      "Transparent or borderless in default state. Tertiary actions, ghost buttons.",
  },
];

// ---------------------------------------------------------------------------
// Naming formula
// ---------------------------------------------------------------------------

/**
 * Canonical naming formula for semantic tokens.
 *
 * Full form:  {propertyClass}.{uxContext}.{intent}.{modifier}.{state}
 * Minimal:    {propertyClass}.{intent}
 *
 * Examples:
 *   background.action.accent.strong.hover
 *   text.input.danger.default           → (state "default" may be omitted)
 *   border.surface.base
 *   icon.feedback.success
 *   spacing-inline.action               → (intent-free spacing)
 *
 * The formula is flexible:
 * - uxContext may be omitted for global semantics (background.base)
 * - modifier "default" is always omitted
 * - state "default" is always omitted
 * - For spacing/sizing, intent is often omitted (spacing-inline.action)
 */
export interface SemanticTokenName {
  propertyClass: string;
  uxContext?: string;
  intent: string;
  modifier?: string;
  state?: string;
}

/**
 * Build a canonical token path from structured name parts.
 * Omits "default" modifier and state.
 */
export function buildSemanticPath(name: SemanticTokenName): string {
  const parts = [name.propertyClass];
  if (name.uxContext) parts.push(name.uxContext);
  parts.push(name.intent);
  if (name.modifier && name.modifier !== "default") parts.push(name.modifier);
  if (name.state && name.state !== "default") parts.push(name.state);
  return parts.join(".");
}

/**
 * Attempt to parse a token path into semantic name parts.
 * Returns null if the path doesn't match the ontology.
 */
export function parseSemanticPath(
  path: string,
): SemanticTokenName | null {
  const segments = path.split(".");

  if (segments.length < 2) return null;

  const propertyClassIds = new Set(ALL_PROPERTY_CLASSES.map((p) => p.id));
  const uxContextIds = new Set(UX_CONTEXTS.map((u) => u.id));
  const intentIds = new Set(SEMANTIC_INTENTS.map((i) => i.id));
  const modifierIds = new Set(EMPHASIS_MODIFIERS.map((m) => m.id));
  const stateIds = new Set(INTERACTION_STATES.map((s) => s.id));

  // First segment must be a property class
  // Handle compound IDs like "spacing-inline"
  let propertyClass: string | undefined;
  let idx = 0;
  if (propertyClassIds.has(segments[0])) {
    propertyClass = segments[0];
    idx = 1;
  } else if (
    segments.length > 1 &&
    propertyClassIds.has(`${segments[0]}-${segments[1]}`)
  ) {
    propertyClass = `${segments[0]}-${segments[1]}`;
    idx = 2;
  }

  if (!propertyClass || idx >= segments.length) return null;

  // Next could be uxContext or intent
  let uxContext: string | undefined;
  if (uxContextIds.has(segments[idx])) {
    uxContext = segments[idx];
    idx++;
  }

  // Next must be intent
  if (idx >= segments.length) {
    // If no more segments, treat the uxContext as intent if valid
    if (uxContext && intentIds.has(uxContext)) {
      return { propertyClass, intent: uxContext };
    }
    return null;
  }

  let intent: string;
  if (intentIds.has(segments[idx])) {
    intent = segments[idx];
    idx++;
  } else if (!uxContext) {
    // Maybe it's an unknown intent — be lenient
    intent = segments[idx];
    idx++;
  } else {
    return null;
  }

  // Optionally modifier
  let modifier: string | undefined;
  if (idx < segments.length && modifierIds.has(segments[idx])) {
    modifier = segments[idx];
    idx++;
  }

  // Optionally state
  let state: string | undefined;
  if (idx < segments.length && stateIds.has(segments[idx])) {
    state = segments[idx];
    idx++;
  }

  return { propertyClass, uxContext, intent, modifier, state };
}

// ---------------------------------------------------------------------------
// Component → token surface mapping
// ---------------------------------------------------------------------------

/**
 * Defines the minimum token surface a component requires.
 * Used by the scaffold generator to know what to produce.
 */
export interface ComponentTokenSurface {
  /** Component name, e.g. "button" */
  component: string;
  /** Which UX context this component falls under */
  uxContext: string;
  /** Required semantic intents for this component */
  intents: string[];
  /** Which property classes are needed */
  propertyClasses: string[];
  /** Which states are needed */
  states: string[];
  /** Extra token slots specific to this component (e.g. "placeholder" for inputs) */
  extraSlots?: string[];
}

/**
 * Built-in component-to-token mappings.
 * These define the minimum viable semantic token surface for common components.
 */
export const COMPONENT_TOKEN_SURFACES: ComponentTokenSurface[] = [
  // ---- Action components --------------------------------------------------
  {
    component: "button",
    uxContext: "action",
    intents: ["accent", "base", "danger"],
    propertyClasses: ["background", "text", "border", "outline"],
    states: ["default", "hover", "active", "focus", "disabled"],
  },
  {
    component: "icon-button",
    uxContext: "action",
    intents: ["base", "accent"],
    propertyClasses: ["background", "icon", "border", "outline"],
    states: ["default", "hover", "active", "focus", "disabled"],
  },
  {
    component: "link",
    uxContext: "action",
    intents: ["accent", "base"],
    propertyClasses: ["text", "outline"],
    states: ["default", "hover", "active", "focus"],
  },
  {
    component: "chip",
    uxContext: "action",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border"],
    states: ["default", "hover", "active", "selected"],
  },

  // ---- Input / Control components -----------------------------------------
  {
    component: "text-input",
    uxContext: "input",
    intents: ["base", "danger", "success"],
    propertyClasses: ["background", "text", "border", "outline"],
    states: ["default", "hover", "focus", "disabled"],
    extraSlots: ["placeholder"],
  },
  {
    component: "textarea",
    uxContext: "input",
    intents: ["base", "danger"],
    propertyClasses: ["background", "text", "border", "outline"],
    states: ["default", "hover", "focus", "disabled"],
    extraSlots: ["placeholder"],
  },
  {
    component: "select",
    uxContext: "input",
    intents: ["base", "danger"],
    propertyClasses: ["background", "text", "border", "outline", "icon"],
    states: ["default", "hover", "focus", "disabled"],
  },
  {
    component: "checkbox",
    uxContext: "input",
    intents: ["base", "accent", "danger"],
    propertyClasses: ["background", "border", "icon", "outline"],
    states: ["default", "hover", "focus", "disabled", "selected"],
  },
  {
    component: "radio",
    uxContext: "input",
    intents: ["base", "accent"],
    propertyClasses: ["background", "border", "icon", "outline"],
    states: ["default", "hover", "focus", "disabled", "selected"],
  },
  {
    component: "switch",
    uxContext: "input",
    intents: ["base", "accent"],
    propertyClasses: ["background", "border", "icon"],
    states: ["default", "hover", "disabled", "selected"],
  },

  // ---- Surface / Display components ---------------------------------------
  {
    component: "card",
    uxContext: "surface",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border", "shadow"],
    states: ["default"],
  },
  {
    component: "modal",
    uxContext: "surface",
    intents: ["base"],
    propertyClasses: ["background", "text", "border", "shadow"],
    states: ["default"],
    extraSlots: ["overlay"],
  },
  {
    component: "tooltip",
    uxContext: "surface",
    intents: ["inverted"],
    propertyClasses: ["background", "text"],
    states: ["default"],
  },
  {
    component: "page",
    uxContext: "surface",
    intents: ["base"],
    propertyClasses: ["background", "text"],
    states: ["default"],
  },

  // ---- Feedback components ------------------------------------------------
  {
    component: "alert",
    uxContext: "feedback",
    intents: ["success", "warning", "danger", "info"],
    propertyClasses: ["background", "text", "border", "icon"],
    states: ["default"],
  },
  {
    component: "toast",
    uxContext: "feedback",
    intents: ["success", "warning", "danger", "info"],
    propertyClasses: ["background", "text", "icon"],
    states: ["default"],
  },
  {
    component: "banner",
    uxContext: "feedback",
    intents: ["info", "warning"],
    propertyClasses: ["background", "text", "border", "icon"],
    states: ["default"],
  },

  // ---- Navigation components ----------------------------------------------
  {
    component: "tabs",
    uxContext: "navigation",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border"],
    states: ["default", "hover", "selected", "disabled"],
  },
  {
    component: "menu",
    uxContext: "navigation",
    intents: ["base"],
    propertyClasses: ["background", "text", "border", "icon"],
    states: ["default", "hover", "active", "selected", "disabled"],
  },
  {
    component: "breadcrumb",
    uxContext: "navigation",
    intents: ["base", "muted"],
    propertyClasses: ["text", "icon"],
    states: ["default", "hover"],
  },
  {
    component: "pagination",
    uxContext: "navigation",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border"],
    states: ["default", "hover", "selected", "disabled"],
  },

  // ---- Data display components --------------------------------------------
  {
    component: "table",
    uxContext: "data",
    intents: ["base"],
    propertyClasses: ["background", "text", "border"],
    states: ["default", "hover", "selected"],
    extraSlots: ["header", "stripe"],
  },
  {
    component: "badge",
    uxContext: "data",
    intents: ["accent", "success", "warning", "danger", "info", "muted"],
    propertyClasses: ["background", "text"],
    states: ["default"],
  },
  {
    component: "tag",
    uxContext: "data",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border"],
    states: ["default"],
  },
  {
    component: "avatar",
    uxContext: "data",
    intents: ["accent", "muted"],
    propertyClasses: ["background", "text", "border"],
    states: ["default"],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const _propertyClassMap = new Map(ALL_PROPERTY_CLASSES.map((p) => [p.id, p]));
const _intentMap = new Map(SEMANTIC_INTENTS.map((i) => [i.id, i]));
const _uxContextMap = new Map(UX_CONTEXTS.map((u) => [u.id, u]));
const _stateMap = new Map(INTERACTION_STATES.map((s) => [s.id, s]));
const _modifierMap = new Map(EMPHASIS_MODIFIERS.map((m) => [m.id, m]));

export function getPropertyClass(id: string): PropertyClass | undefined {
  return _propertyClassMap.get(id);
}
export function getIntent(id: string): SemanticIntent | undefined {
  return _intentMap.get(id);
}
export function getUxContext(id: string): UxContext | undefined {
  return _uxContextMap.get(id);
}
export function getInteractionState(
  id: string,
): InteractionState | undefined {
  return _stateMap.get(id);
}
export function getEmphasisModifier(
  id: string,
): EmphasisModifier | undefined {
  return _modifierMap.get(id);
}

/**
 * Find which UX context a component belongs to.
 * Returns undefined if the component isn't in the built-in registry.
 */
export function findComponentContext(
  componentName: string,
): UxContext | undefined {
  const lower = componentName.toLowerCase().replace(/\s+/g, "-");
  for (const ctx of UX_CONTEXTS) {
    if (ctx.components.some((c) => c === lower)) return ctx;
  }
  // Fuzzy: check if any context's component list partially matches
  for (const ctx of UX_CONTEXTS) {
    if (ctx.components.some((c) => lower.includes(c) || c.includes(lower))) {
      return ctx;
    }
  }
  return undefined;
}

/**
 * Get the ComponentTokenSurface for a given component name.
 */
export function getComponentSurface(
  componentName: string,
): ComponentTokenSurface | undefined {
  const lower = componentName.toLowerCase().replace(/\s+/g, "-");
  return COMPONENT_TOKEN_SURFACES.find((s) => s.component === lower);
}
