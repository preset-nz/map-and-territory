/**
 * Store Composition Utilities - Layout Store Composition Helpers
 *
 * This file provides utilities for composing focused store slices into
 * a complete layout store, supporting both individual slice access and
 * composed store functionality.
 */

import { StateCreator } from "zustand";
import { SidebarSlice } from "./sidebar-store";
import { PreferencesSlice } from "./preferences-store";
import { NavigationSlice } from "./navigation-store";
import { LayoutActions, DEFAULT_LAYOUT_STATE } from "../../types/layout";

// ============================================================================
// Composed Store Types
// ============================================================================

/**
 * Complete layout store combining all slices
 */
export interface ComposedLayoutStore
  extends SidebarSlice,
    PreferencesSlice,
    NavigationSlice {
  // Additional composed actions
  resetLayout: () => void;
  loadPreferences: () => void;
}

// ============================================================================
// Store Composition Factory
// ============================================================================

/**
 * Create a composed layout store from individual slices
 * This allows us to maintain focused slices while providing
 * a complete store interface for components that need it.
 */
export const createComposedLayoutStore =
  (): StateCreator<ComposedLayoutStore, [], [], ComposedLayoutStore> =>
  (set, get) => ({
    // ================================================================
    // Composed Initial State (handled by individual slice creators)
    // ================================================================

    // Sidebar state
    isOpen: DEFAULT_LAYOUT_STATE.sidebar.isOpen,
    variant: DEFAULT_LAYOUT_STATE.sidebar.variant,
    collapsible: DEFAULT_LAYOUT_STATE.sidebar.collapsible,

    // Preferences state
    theme: DEFAULT_LAYOUT_STATE.preferences.theme,
    sidebarWidth: DEFAULT_LAYOUT_STATE.preferences.sidebarWidth,
    persistCollapsed: DEFAULT_LAYOUT_STATE.preferences.persistCollapsed,

    // Navigation state
    activeSection: DEFAULT_LAYOUT_STATE.navigation.activeSection,
    breadcrumb: DEFAULT_LAYOUT_STATE.navigation.breadcrumb,

    // ================================================================
    // Composed Actions (implemented by individual slices)
    // ================================================================

    // Sidebar actions (will be overridden by createSidebarSlice)
    toggleSidebar: () => {},
    setSidebarOpen: () => {},
    setSidebarVariant: () => {},
    setSidebarCollapsible: () => {},

    // Preferences actions (will be overridden by createPreferencesSlice)
    setTheme: () => {},
    setSidebarWidth: () => {},
    setPersistCollapsed: () => {},

    // Navigation actions (will be overridden by createNavigationSlice)
    setActiveSection: () => {},
    setBreadcrumb: () => {},
    addBreadcrumb: () => {},
    clearBreadcrumb: () => {},

    // ================================================================
    // Additional Composed Actions
    // ================================================================

    /**
     * Reset layout to default state
     * Preserves user preferences but resets UI state
     */
    resetLayout: () => {
      set((state) => ({
        ...state,
        // Reset sidebar and navigation, preserve preferences
        isOpen: DEFAULT_LAYOUT_STATE.sidebar.isOpen,
        variant: DEFAULT_LAYOUT_STATE.sidebar.variant,
        collapsible: DEFAULT_LAYOUT_STATE.sidebar.collapsible,
        activeSection: DEFAULT_LAYOUT_STATE.navigation.activeSection,
        breadcrumb: DEFAULT_LAYOUT_STATE.navigation.breadcrumb,
      }));
    },

    /**
     * Load saved preferences from persistence layer
     * Triggers re-hydration of persisted state
     */
    loadPreferences: () => {
      // This is handled automatically by the persist middleware
      // This method is provided for explicit preference refresh if needed
      const currentState = get();
      console.log("Current layout preferences:", {
        theme: currentState.theme,
        sidebarWidth: currentState.sidebarWidth,
        persistCollapsed: currentState.persistCollapsed,
      });
    },
  });

// ============================================================================
// Store Slice Selectors
// ============================================================================

/**
 * Extract sidebar state from composed store
 */
export const selectSidebarState = (state: ComposedLayoutStore) => ({
  isOpen: state.isOpen,
  variant: state.variant,
  collapsible: state.collapsible,
});

/**
 * Extract preferences state from composed store
 */
export const selectPreferencesState = (state: ComposedLayoutStore) => ({
  theme: state.theme,
  sidebarWidth: state.sidebarWidth,
  persistCollapsed: state.persistCollapsed,
});

/**
 * Extract navigation state from composed store
 */
export const selectNavigationState = (state: ComposedLayoutStore) => ({
  activeSection: state.activeSection,
  breadcrumb: state.breadcrumb,
});

/**
 * Extract all actions from composed store
 */
export const selectLayoutActions = (
  state: ComposedLayoutStore,
): LayoutActions => ({
  // Sidebar actions
  toggleSidebar: state.toggleSidebar,
  setSidebarOpen: state.setSidebarOpen,
  setSidebarVariant: state.setSidebarVariant,
  setSidebarCollapsible: state.setSidebarCollapsible,

  // Preferences actions
  setTheme: state.setTheme,
  setSidebarWidth: state.setSidebarWidth,
  setPersistCollapsed: state.setPersistCollapsed,

  // Navigation actions
  setActiveSection: state.setActiveSection,
  setBreadcrumb: state.setBreadcrumb,
  addBreadcrumb: state.addBreadcrumb,
  clearBreadcrumb: state.clearBreadcrumb,

  // Utility actions
  resetLayout: state.resetLayout,
  loadPreferences: state.loadPreferences,
});
