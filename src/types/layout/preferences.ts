/**
 * User preferences types for the Professional Layout System
 *
 * This file contains all interfaces and types related to user preferences,
 * theme settings, and customization options.
 */

// ============================================================================
// Preferences State Interface
// ============================================================================

/**
 * Layout preferences for persistence and user customization
 */
export interface LayoutPreferences {
  /** Theme setting - 'system' respects OS preference */
  theme: "light" | "dark" | "system";
  /** Sidebar width in pixels when expanded */
  sidebarWidth: number;
  /** Whether to persist sidebar collapsed state across sessions */
  persistCollapsed: boolean;
}

// ============================================================================
// Preferences Actions
// ============================================================================

/**
 * Actions interface for preference management
 */
export interface PreferencesActions {
  /** Set theme preference */
  setTheme: (theme: LayoutPreferences["theme"]) => void;
  /** Set sidebar width in pixels */
  setSidebarWidth: (width: number) => void;
  /** Set whether to persist collapsed state */
  setPersistCollapsed: (persist: boolean) => void;
}

// ============================================================================
// Preferences Constants and Utilities
// ============================================================================

/**
 * Default preferences values
 */
export const DEFAULT_PREFERENCES: LayoutPreferences = {
  theme: "dark",
  sidebarWidth: 280,
  persistCollapsed: true,
} as const;

/**
 * Theme options type guard
 */
export const isValidTheme = (
  theme: string,
): theme is LayoutPreferences["theme"] => {
  return ["light", "dark", "system"].includes(theme);
};

/**
 * Valid theme values for validation
 */
export const VALID_THEMES = ["light", "dark", "system"] as const;

/**
 * Sidebar width validation helper
 */
export const validateSidebarWidth = (
  width: number,
  constraints: { MIN: number; MAX: number },
) => {
  return Math.max(constraints.MIN, Math.min(width, constraints.MAX));
};
