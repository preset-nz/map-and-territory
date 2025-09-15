/**
 * Preferences Store - Focused Zustand State Management for User Preferences
 *
 * This store slice manages user preferences including theme settings,
 * sidebar width customization, and persistence options. Designed for
 * composition with other layout store slices.
 */

import { StateCreator } from "zustand";
import {
  LayoutPreferences,
  PreferencesActions,
  DEFAULT_PREFERENCES,
  isValidTheme,
  validateSidebarWidth,
} from "../../types/layout/preferences";
import { SIDEBAR_WIDTH_CONSTRAINTS } from "../../types/layout/sidebar";

// ============================================================================
// Preferences Store Slice Type
// ============================================================================

export interface PreferencesSlice
  extends LayoutPreferences,
    PreferencesActions {}

// ============================================================================
// Preferences Store Implementation
// ============================================================================

export const createPreferencesSlice: StateCreator<
  PreferencesSlice,
  [],
  [],
  PreferencesSlice
> = (set) => ({
  // ================================================================
  // Initial Preferences State
  // ================================================================
  ...DEFAULT_PREFERENCES,

  // ================================================================
  // Preference Management Actions
  // ================================================================

  /**
   * Set theme preference with validation
   * @param theme - Theme setting ('light' | 'dark' | 'system')
   */
  setTheme: (theme) => {
    if (!isValidTheme(theme)) {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }

    set((state) => ({
      ...state,
      theme,
    }));
  },

  /**
   * Set sidebar width with validation
   * @param width - Sidebar width in pixels
   */
  setSidebarWidth: (width: number) => {
    const validatedWidth = validateSidebarWidth(
      width,
      SIDEBAR_WIDTH_CONSTRAINTS,
    );

    if (validatedWidth !== width) {
      console.warn(
        `Sidebar width ${width}px clamped to ${validatedWidth}px ` +
          `(min: ${SIDEBAR_WIDTH_CONSTRAINTS.MIN}px, max: ${SIDEBAR_WIDTH_CONSTRAINTS.MAX}px)`,
      );
    }

    set((state) => ({
      ...state,
      sidebarWidth: validatedWidth,
    }));
  },

  /**
   * Set whether to persist collapsed state across sessions
   * @param persist - Whether to persist collapsed state
   */
  setPersistCollapsed: (persist: boolean) => {
    set((state) => ({
      ...state,
      persistCollapsed: persist,
    }));
  },
});

// ============================================================================
// Preferences Store Selectors
// ============================================================================

/**
 * Selector interface for preferences-specific state
 */
export interface PreferencesSelectors {
  preferences: LayoutPreferences;
  preferencesActions: PreferencesActions;
  theme: LayoutPreferences["theme"];
  sidebarWidth: number;
  persistCollapsed: boolean;
}

/**
 * Create preferences selectors for a composed store
 */
export const createPreferencesSelectors = <T extends PreferencesSlice>(
  store: T,
): PreferencesSelectors => ({
  preferences: {
    theme: store.theme,
    sidebarWidth: store.sidebarWidth,
    persistCollapsed: store.persistCollapsed,
  },
  preferencesActions: {
    setTheme: store.setTheme,
    setSidebarWidth: store.setSidebarWidth,
    setPersistCollapsed: store.setPersistCollapsed,
  },
  theme: store.theme,
  sidebarWidth: store.sidebarWidth,
  persistCollapsed: store.persistCollapsed,
});
