/**
 * Sidebar-specific types for the Professional Layout System
 *
 * This file contains all interfaces and types related to sidebar state
 * and configuration, following single responsibility principle.
 */

// ============================================================================
// Sidebar State Interfaces
// ============================================================================

/**
 * Sidebar state configuration
 */
export interface SidebarState {
  /** Whether sidebar is currently open/expanded */
  isOpen: boolean;
  /** Sidebar display variant */
  variant: "sidebar" | "inset";
  /** Collapse behavior - 'icon' shows icons only when collapsed, 'none' hides completely */
  collapsible: "icon" | "none";
}

// ============================================================================
// Sidebar Actions
// ============================================================================

/**
 * Actions interface for sidebar state management
 */
export interface SidebarActions {
  /** Toggle sidebar open/closed state */
  toggleSidebar: () => void;
  /** Set sidebar open state explicitly */
  setSidebarOpen: (open: boolean) => void;
  /** Change sidebar variant */
  setSidebarVariant: (variant: SidebarState["variant"]) => void;
  /** Set collapse behavior */
  setSidebarCollapsible: (collapsible: SidebarState["collapsible"]) => void;
}

// ============================================================================
// Sidebar Constants and Utilities
// ============================================================================

/**
 * Sidebar width constraints for validation
 */
export const SIDEBAR_WIDTH_CONSTRAINTS = {
  MIN: 200,
  MAX: 400,
  DEFAULT: 280,
} as const;

/**
 * Default sidebar state values
 */
export const DEFAULT_SIDEBAR_STATE: SidebarState = {
  isOpen: true,
  variant: "sidebar",
  collapsible: "icon",
} as const;

/**
 * Sidebar variant type guard
 */
export const isValidSidebarVariant = (
  variant: string,
): variant is SidebarState["variant"] => {
  return ["sidebar", "inset"].includes(variant);
};

/**
 * Sidebar collapsible type guard
 */
export const isValidSidebarCollapsible = (
  collapsible: string,
): collapsible is SidebarState["collapsible"] => {
  return ["icon", "none"].includes(collapsible);
};

/**
 * Type for sidebar section identifiers
 */
export type SidebarSection = "navigation" | "tools" | "layers";
