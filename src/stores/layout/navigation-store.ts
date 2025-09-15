/**
 * Navigation Store - Focused Zustand State Management for Navigation
 *
 * This store slice manages navigation state including active sections
 * and breadcrumb management. Designed for composition with other
 * layout store slices.
 */

import { StateCreator } from "zustand";
import {
  NavigationState,
  NavigationActions,
  BreadcrumbItem,
  DEFAULT_NAVIGATION_STATE,
  filterValidBreadcrumbs,
  isValidBreadcrumbItem,
} from "../../types/layout/navigation";

// ============================================================================
// Navigation Store Slice Type
// ============================================================================

export interface NavigationSlice extends NavigationState, NavigationActions {}

// ============================================================================
// Navigation Store Implementation
// ============================================================================

export const createNavigationSlice: StateCreator<
  NavigationSlice,
  [],
  [],
  NavigationSlice
> = (set) => ({
  // ================================================================
  // Initial Navigation State
  // ================================================================
  ...DEFAULT_NAVIGATION_STATE,

  // ================================================================
  // Navigation Management Actions
  // ================================================================

  /**
   * Set the currently active section
   * @param section - Section identifier
   */
  setActiveSection: (section: string) => {
    if (!section.trim()) {
      console.warn("Active section cannot be empty");
      return;
    }

    set((state) => ({
      ...state,
      activeSection: section,
    }));
  },

  /**
   * Update breadcrumb navigation trail
   * @param items - Array of breadcrumb items
   */
  setBreadcrumb: (items: BreadcrumbItem[]) => {
    // Filter out invalid breadcrumb items
    const validItems = filterValidBreadcrumbs(items);

    if (validItems.length !== items.length) {
      console.warn(
        "Some breadcrumb items were filtered out due to missing labels",
      );
    }

    set((state) => ({
      ...state,
      breadcrumb: validItems,
    }));
  },

  /**
   * Add single breadcrumb item to current trail
   * @param item - Breadcrumb item to add
   */
  addBreadcrumb: (item: BreadcrumbItem) => {
    if (!isValidBreadcrumbItem(item)) {
      console.warn("Breadcrumb item must have a label");
      return;
    }

    set((state) => {
      // Mark previous items as not current and add new item as current
      const updatedBreadcrumb = state.breadcrumb.map((breadcrumb) => ({
        ...breadcrumb,
        isCurrent: false,
      }));

      return {
        ...state,
        breadcrumb: [...updatedBreadcrumb, { ...item, isCurrent: true }],
      };
    });
  },

  /**
   * Clear breadcrumb navigation trail
   */
  clearBreadcrumb: () => {
    set((state) => ({
      ...state,
      breadcrumb: [],
    }));
  },
});

// ============================================================================
// Navigation Store Selectors
// ============================================================================

/**
 * Selector interface for navigation-specific state
 */
export interface NavigationSelectors {
  navigationState: NavigationState;
  navigationActions: NavigationActions;
  activeSection: string;
  breadcrumb: BreadcrumbItem[];
  currentBreadcrumbItem: BreadcrumbItem | undefined;
}

/**
 * Create navigation selectors for a composed store
 */
export const createNavigationSelectors = <T extends NavigationSlice>(
  store: T,
): NavigationSelectors => ({
  navigationState: {
    activeSection: store.activeSection,
    breadcrumb: store.breadcrumb,
  },
  navigationActions: {
    setActiveSection: store.setActiveSection,
    setBreadcrumb: store.setBreadcrumb,
    addBreadcrumb: store.addBreadcrumb,
    clearBreadcrumb: store.clearBreadcrumb,
  },
  activeSection: store.activeSection,
  breadcrumb: store.breadcrumb,
  currentBreadcrumbItem: store.breadcrumb.find((item) => item.isCurrent),
});
