/**
 * UI Pattern Registry
 *
 * Encodes common UI patterns and their component/token requirements.
 * This is the knowledge backbone for the designer-centric tools — it maps
 * high-level design problems to concrete component inventories and token surfaces.
 *
 * The registry is intentionally opinionated: it captures what production
 * design systems actually need, not theoretical completeness.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Screen-level UI pattern */
export interface UIPattern {
  /** Machine identifier, e.g. "login-form" */
  id: string;
  /** Human-readable label */
  name: string;
  /** One-line description of the pattern */
  description: string;
  /** High-level category */
  category: PatternCategory;
  /** Components typically used in this pattern */
  components: string[];
  /** UX contexts involved */
  uxContexts: string[];
  /** Common intents needed */
  intents: string[];
  /** Keywords / phrases that suggest this pattern (for matching) */
  keywords: string[];
  /** Advisory token hints beyond component defaults */
  additionalTokenHints?: string[];
  /** Common screen/flow names where this pattern appears */
  screenExamples?: string[];
}

export type PatternCategory =
  | "layout"
  | "form"
  | "data"
  | "navigation"
  | "feedback"
  | "marketing"
  | "auth"
  | "dashboard"
  | "content"
  | "commerce"
  | "settings";

// ---------------------------------------------------------------------------
// Built-in Pattern Registry
// ---------------------------------------------------------------------------

export const COMMON_UI_PATTERNS: UIPattern[] = [
  // ---- Auth ---------------------------------------------------------------
  {
    id: "login-form",
    name: "Login Form",
    description:
      "User authentication screen with email/password fields, submit button, and auxiliary links.",
    category: "auth",
    components: ["text-input", "button", "link", "card", "page"],
    uxContexts: ["input", "action", "surface"],
    intents: ["base", "accent", "danger"],
    keywords: [
      "login", "sign in", "signin", "authenticate", "log in",
      "email", "password", "credentials",
    ],
    additionalTokenHints: [
      "background.surface.base (page background)",
      "shadow.surface.base (card elevation)",
      "text.input.danger (validation error)",
    ],
    screenExamples: ["Login", "Sign In", "Welcome Back"],
  },
  {
    id: "registration-form",
    name: "Registration Form",
    description:
      "New account creation with multiple input fields, validation, terms acceptance, and submit.",
    category: "auth",
    components: [
      "text-input", "checkbox", "button", "link", "card", "page", "select",
    ],
    uxContexts: ["input", "action", "surface"],
    intents: ["base", "accent", "danger", "success"],
    keywords: [
      "register", "sign up", "signup", "create account", "onboarding",
      "registration", "new user",
    ],
    additionalTokenHints: [
      "text.input.success (field validation passed)",
      "border.input.danger (field validation failed)",
    ],
    screenExamples: ["Register", "Sign Up", "Create Account"],
  },
  {
    id: "password-reset",
    name: "Password Reset",
    description:
      "Forgot-password flow: email input, confirmation message, and reset form.",
    category: "auth",
    components: ["text-input", "button", "link", "card", "page", "alert"],
    uxContexts: ["input", "action", "surface", "feedback"],
    intents: ["base", "accent", "info", "success"],
    keywords: [
      "forgot password", "reset password", "password recovery",
      "reset link", "change password",
    ],
    screenExamples: ["Forgot Password", "Reset Password"],
  },

  // ---- Dashboard ----------------------------------------------------------
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    description:
      "Data-heavy screen with stat cards, charts, tables, and filters.",
    category: "dashboard",
    components: [
      "card", "page", "table", "badge", "tabs", "select", "button",
    ],
    uxContexts: ["surface", "data", "navigation", "input", "action"],
    intents: ["base", "accent", "success", "warning", "danger", "info"],
    keywords: [
      "dashboard", "analytics", "metrics", "statistics", "stats",
      "overview", "kpi", "chart", "report",
    ],
    additionalTokenHints: [
      "background.data.base (table stripe)",
      "text.data.muted (secondary stat label)",
      "border.surface.base (card dividers)",
    ],
    screenExamples: ["Dashboard", "Analytics", "Overview", "Reports"],
  },
  {
    id: "admin-panel",
    name: "Admin Panel",
    description:
      "Management interface with sidebar navigation, data tables, action buttons, and status indicators.",
    category: "dashboard",
    components: [
      "page", "menu", "table", "button", "badge", "modal",
      "text-input", "select", "tabs", "breadcrumb", "pagination",
    ],
    uxContexts: ["surface", "navigation", "data", "action", "input", "feedback"],
    intents: ["base", "accent", "danger", "success", "warning", "muted"],
    keywords: [
      "admin", "management", "cms", "back office", "backoffice",
      "control panel", "crud",
    ],
    screenExamples: ["Admin", "Management", "Users", "Settings"],
  },

  // ---- Data ---------------------------------------------------------------
  {
    id: "data-table",
    name: "Data Table View",
    description:
      "Tabular data display with sorting, filtering, pagination, and row actions.",
    category: "data",
    components: [
      "table", "pagination", "button", "select", "text-input",
      "badge", "menu", "checkbox",
    ],
    uxContexts: ["data", "action", "input", "navigation"],
    intents: ["base", "accent", "muted"],
    keywords: [
      "table", "data grid", "list view", "records", "rows",
      "spreadsheet", "sortable", "filterable",
    ],
    additionalTokenHints: [
      "background.data.base.hover (row hover)",
      "background.data.base.selected (selected row)",
      "border.data.base (cell borders)",
    ],
    screenExamples: ["Users List", "Orders", "Products", "Inventory"],
  },
  {
    id: "detail-view",
    name: "Detail / Profile View",
    description:
      "Single-record display with header, metadata sections, action buttons, and related content.",
    category: "data",
    components: [
      "page", "card", "button", "badge", "avatar", "tabs",
      "table", "link",
    ],
    uxContexts: ["surface", "data", "action", "navigation"],
    intents: ["base", "accent", "muted", "info"],
    keywords: [
      "detail", "profile", "view", "single record", "page detail",
      "user profile", "item detail",
    ],
    screenExamples: ["User Profile", "Product Detail", "Order Detail"],
  },
  {
    id: "card-grid",
    name: "Card Grid / Gallery",
    description:
      "Grid of content cards with images, titles, descriptions, and actions.",
    category: "data",
    components: ["page", "card", "button", "badge", "tag", "pagination"],
    uxContexts: ["surface", "data", "action", "navigation"],
    intents: ["base", "accent", "muted"],
    keywords: [
      "card grid", "gallery", "grid view", "tile view", "catalog",
      "portfolio", "collection",
    ],
    screenExamples: ["Gallery", "Catalog", "Products Grid"],
  },

  // ---- Forms --------------------------------------------------------------
  {
    id: "multi-step-form",
    name: "Multi-Step Form / Wizard",
    description:
      "Multi-page form with step indicator, validation, and progress tracking.",
    category: "form",
    components: [
      "text-input", "select", "checkbox", "radio", "switch",
      "button", "card", "page", "alert",
    ],
    uxContexts: ["input", "action", "surface", "feedback", "navigation"],
    intents: ["base", "accent", "danger", "success", "info"],
    keywords: [
      "wizard", "multi-step", "stepper", "form flow", "questionnaire",
      "checkout", "setup wizard", "onboarding flow",
    ],
    additionalTokenHints: [
      "background.navigation.accent (active step)",
      "text.navigation.muted (completed step)",
      "border.navigation.base (step connector)",
    ],
    screenExamples: ["Checkout", "Setup", "Onboarding", "Application Form"],
  },
  {
    id: "settings-form",
    name: "Settings / Preferences",
    description:
      "Configuration form with grouped sections, toggles, selects, and save actions.",
    category: "settings",
    components: [
      "page", "card", "switch", "select", "radio", "text-input",
      "button", "tabs",
    ],
    uxContexts: ["surface", "input", "action", "navigation"],
    intents: ["base", "accent", "danger", "success"],
    keywords: [
      "settings", "preferences", "configuration", "options", "account settings",
      "notification settings", "privacy settings",
    ],
    screenExamples: ["Settings", "Preferences", "Account", "Profile Settings"],
  },
  {
    id: "search-filter",
    name: "Search & Filter Panel",
    description:
      "Search bar with filter controls, faceted navigation, and results display.",
    category: "form",
    components: [
      "text-input", "select", "checkbox", "switch", "button",
      "tag", "badge", "card",
    ],
    uxContexts: ["input", "action", "data", "surface"],
    intents: ["base", "accent", "muted"],
    keywords: [
      "search", "filter", "facet", "search bar", "advanced search",
      "refinement", "search results",
    ],
    screenExamples: ["Search", "Browse", "Explore", "Find"],
  },

  // ---- Navigation ---------------------------------------------------------
  {
    id: "sidebar-layout",
    name: "Sidebar Navigation Layout",
    description:
      "App shell with persistent sidebar navigation, header, and main content area.",
    category: "navigation",
    components: [
      "page", "menu", "link", "button", "avatar", "badge",
    ],
    uxContexts: ["surface", "navigation", "action", "data"],
    intents: ["base", "accent", "muted"],
    keywords: [
      "sidebar", "side nav", "app shell", "layout", "navigation drawer",
      "menu layout", "main layout",
    ],
    additionalTokenHints: [
      "background.navigation.base (sidebar bg)",
      "text.navigation.accent (active nav item)",
      "border.navigation.base (sidebar divider)",
    ],
    screenExamples: ["App Layout", "Main Layout"],
  },
  {
    id: "top-nav-layout",
    name: "Top Navigation Layout",
    description:
      "Header-based navigation with top bar, dropdown menus, and breadcrumbs.",
    category: "navigation",
    components: [
      "page", "menu", "link", "button", "breadcrumb", "avatar",
    ],
    uxContexts: ["surface", "navigation", "action"],
    intents: ["base", "accent", "muted", "inverted"],
    keywords: [
      "top nav", "header", "navbar", "top bar", "app bar",
      "navigation bar", "global nav",
    ],
    screenExamples: ["Header", "Navigation Bar"],
  },
  {
    id: "tabbed-interface",
    name: "Tabbed Interface",
    description:
      "Content organized into tabbed sections with tab bar and content panels.",
    category: "navigation",
    components: ["tabs", "page", "card", "button"],
    uxContexts: ["navigation", "surface", "action"],
    intents: ["base", "accent"],
    keywords: [
      "tabs", "tabbed", "tab panel", "tab view", "segmented",
      "tab navigation",
    ],
    screenExamples: ["Details (tabbed)", "Settings (tabbed)"],
  },

  // ---- Feedback -----------------------------------------------------------
  {
    id: "notification-center",
    name: "Notification Center",
    description:
      "Notification list with read/unread states, categories, and actions.",
    category: "feedback",
    components: ["page", "card", "badge", "button", "menu", "toast", "link"],
    uxContexts: ["surface", "feedback", "data", "action", "navigation"],
    intents: ["base", "accent", "info", "warning", "danger", "success"],
    keywords: [
      "notifications", "inbox", "alerts", "messages", "activity feed",
      "updates", "notification center",
    ],
    screenExamples: ["Notifications", "Inbox", "Activity"],
  },
  {
    id: "empty-state",
    name: "Empty State",
    description:
      "Placeholder for empty content areas with illustration, message, and call-to-action.",
    category: "feedback",
    components: ["page", "button", "card"],
    uxContexts: ["surface", "action", "feedback"],
    intents: ["base", "accent", "muted"],
    keywords: [
      "empty state", "no results", "no data", "zero state", "blank state",
      "first time", "getting started",
    ],
    screenExamples: ["Empty State", "No Results", "Getting Started"],
  },
  {
    id: "error-page",
    name: "Error Page",
    description:
      "Error state page (404, 500, etc.) with message, illustration, and recovery actions.",
    category: "feedback",
    components: ["page", "button", "link"],
    uxContexts: ["surface", "action", "feedback"],
    intents: ["base", "danger", "muted"],
    keywords: [
      "error page", "404", "500", "not found", "server error",
      "something went wrong", "error state",
    ],
    screenExamples: ["404", "Error", "Not Found"],
  },

  // ---- Marketing / Content ------------------------------------------------
  {
    id: "landing-page",
    name: "Landing Page / Hero",
    description:
      "Marketing landing page with hero section, feature highlights, testimonials, and CTA.",
    category: "marketing",
    components: [
      "page", "button", "card", "badge", "link",
    ],
    uxContexts: ["surface", "action", "data"],
    intents: ["base", "accent", "muted", "inverted"],
    keywords: [
      "landing", "hero", "marketing", "homepage", "splash",
      "feature page", "product page",
    ],
    additionalTokenHints: [
      "background.surface.inverted (hero section)",
      "text.surface.inverted (hero text on dark bg)",
    ],
    screenExamples: ["Home", "Landing", "Features", "About"],
  },
  {
    id: "pricing-page",
    name: "Pricing Page",
    description:
      "Pricing tiers comparison with feature lists, badges, and CTA buttons.",
    category: "commerce",
    components: ["page", "card", "button", "badge", "table"],
    uxContexts: ["surface", "action", "data"],
    intents: ["base", "accent", "muted", "success"],
    keywords: [
      "pricing", "plans", "tiers", "subscription", "billing",
      "compare plans",
    ],
    screenExamples: ["Pricing", "Plans", "Subscribe"],
  },

  // ---- Commerce -----------------------------------------------------------
  {
    id: "product-listing",
    name: "Product Listing / Catalog",
    description:
      "E-commerce product listing with cards, filters, sorting, and cart actions.",
    category: "commerce",
    components: [
      "page", "card", "button", "select", "text-input", "badge",
      "tag", "pagination",
    ],
    uxContexts: ["surface", "data", "action", "input", "navigation"],
    intents: ["base", "accent", "danger", "success", "muted"],
    keywords: [
      "product listing", "catalog", "shop", "store", "e-commerce",
      "marketplace", "products",
    ],
    screenExamples: ["Shop", "Products", "Catalog", "Marketplace"],
  },
  {
    id: "checkout-flow",
    name: "Checkout Flow",
    description:
      "Purchase flow with cart summary, address form, payment, and confirmation.",
    category: "commerce",
    components: [
      "page", "card", "text-input", "select", "radio", "button",
      "alert", "table", "badge",
    ],
    uxContexts: ["surface", "input", "action", "feedback", "data"],
    intents: ["base", "accent", "danger", "success", "info", "warning"],
    keywords: [
      "checkout", "cart", "payment", "purchase", "order",
      "billing", "shipping",
    ],
    screenExamples: ["Cart", "Checkout", "Payment", "Order Confirmation"],
  },

  // ---- Content / Layout ---------------------------------------------------
  {
    id: "content-page",
    name: "Content / Article Page",
    description:
      "Long-form content page with typography hierarchy, media embeds, and related links.",
    category: "content",
    components: ["page", "card", "link", "badge", "tag"],
    uxContexts: ["surface", "data", "action"],
    intents: ["base", "accent", "muted"],
    keywords: [
      "article", "blog", "content page", "documentation", "wiki",
      "text page", "story", "post",
    ],
    screenExamples: ["Blog Post", "Article", "Documentation", "Help"],
  },
  {
    id: "modal-dialog",
    name: "Modal / Dialog",
    description:
      "Overlay dialog for confirmations, forms, or focused tasks.",
    category: "layout",
    components: ["modal", "button", "text-input", "select"],
    uxContexts: ["surface", "action", "input"],
    intents: ["base", "accent", "danger"],
    keywords: [
      "modal", "dialog", "popup", "overlay", "confirm", "prompt",
      "lightbox",
    ],
    additionalTokenHints: [
      "background.surface.base (overlay backdrop, ~60% opacity)",
      "shadow.surface.base (modal elevation)",
    ],
    screenExamples: ["Confirm Delete", "Edit Item", "New Item"],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Get a pattern by id */
export function getPattern(id: string): UIPattern | undefined {
  return COMMON_UI_PATTERNS.find((p) => p.id === id);
}

/** Get all patterns in a category */
export function getPatternsByCategory(category: PatternCategory): UIPattern[] {
  return COMMON_UI_PATTERNS.filter((p) => p.category === category);
}

/** Get all unique components across a set of patterns */
export function getUniqueComponents(patterns: UIPattern[]): string[] {
  const set = new Set<string>();
  for (const p of patterns) {
    for (const c of p.components) set.add(c);
  }
  return [...set].sort();
}

/** Get all unique intents across a set of patterns */
export function getUniqueIntents(patterns: UIPattern[]): string[] {
  const set = new Set<string>();
  for (const p of patterns) {
    for (const i of p.intents) set.add(i);
  }
  return [...set].sort();
}

/** Get all unique UX contexts across a set of patterns */
export function getUniqueContexts(patterns: UIPattern[]): string[] {
  const set = new Set<string>();
  for (const p of patterns) {
    for (const c of p.uxContexts) set.add(c);
  }
  return [...set].sort();
}
