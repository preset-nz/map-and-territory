/**
 * Sidebar Store - Focused Zustand State Management for Sidebar
 *
 * This store slice manages sidebar-specific state including open/closed state,
 * variant configuration, and collapse behavior. Designed for composition
 * with other layout store slices.
 */

import { StateCreator } from "zustand";
import {
  SidebarState,
  SidebarActions,
  DEFAULT_SIDEBAR_STATE,
  isValidSidebarVariant,
  isValidSidebarCollapsible,
} from "../../types/layout/sidebar";

// ============================================================================
// Sidebar Store Slice Type
// ============================================================================

export interface SidebarSlice extends SidebarState, SidebarActions {}

// ============================================================================
// Sidebar Store Implementation
// ============================================================================

export const createSidebarSlice: StateCreator<
  SidebarSlice,
  [],
  [],
  SidebarSlice
> = (set) => ({
  // ================================================================
  // Initial Sidebar State
  // ================================================================
  ...DEFAULT_SIDEBAR_STATE,

  // ================================================================
  // Sidebar Management Actions
  // ================================================================

  /**
   * Toggle sidebar open/closed state
   * Respects persistCollapsed preference for state persistence
   */
  toggleSidebar: () => {
    set((state) => ({
      ...state,
      isOpen: !state.isOpen,
    }));
  },

  /**
   * Set sidebar open state explicitly
   * @param open - Whether sidebar should be open
   */
  setSidebarOpen: (open: boolean) => {
    set((state) => ({
      ...state,
      isOpen: open,
    }));
  },

  /**
   * Change sidebar display variant
   * @param variant - Sidebar variant ('sidebar' | 'inset')
   */
  setSidebarVariant: (variant) => {
    if (!isValidSidebarVariant(variant)) {
      console.warn(`Invalid sidebar variant: ${variant}`);
      return;
    }

    set((state) => ({
      ...state,
      variant,
    }));
  },

  /**
   * Set sidebar collapse behavior
   * @param collapsible - Collapse behavior ('icon' | 'none')
   */
  setSidebarCollapsible: (collapsible) => {
    if (!isValidSidebarCollapsible(collapsible)) {
      console.warn(`Invalid sidebar collapsible: ${collapsible}`);
      return;
    }

    set((state) => ({
      ...state,
      collapsible,
    }));
  },
});

// ============================================================================
// Sidebar Store Selectors
// ============================================================================

/**
 * Selector interface for sidebar-specific state
 */
export interface SidebarSelectors {
  sidebarState: SidebarState;
  sidebarActions: SidebarActions;
  isOpen: boolean;
  variant: SidebarState["variant"];
  collapsible: SidebarState["collapsible"];
}

/**
 * Create sidebar selectors for a composed store
 */
export const createSidebarSelectors = <T extends SidebarSlice>(
  store: T,
): SidebarSelectors => ({
  sidebarState: {
    isOpen: store.isOpen,
    variant: store.variant,
    collapsible: store.collapsible,
  },
  sidebarActions: {
    toggleSidebar: store.toggleSidebar,
    setSidebarOpen: store.setSidebarOpen,
    setSidebarVariant: store.setSidebarVariant,
    setSidebarCollapsible: store.setSidebarCollapsible,
  },
  isOpen: store.isOpen,
  variant: store.variant,
  collapsible: store.collapsible,
});
