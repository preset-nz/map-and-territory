/**
 * Layout Types - Main Export Index
 *
 * This file provides clean exports for all layout-related types,
 * maintaining backwards compatibility while enabling focused imports.
 *
 * Architecture: Focused type files with single responsibility,
 * composed into complete interfaces through this index file.
 */

// ============================================================================
// Re-export Individual Domain Types
// ============================================================================

export * from "./sidebar";
export * from "./preferences";
export * from "./navigation";
export * from "./components";

// ============================================================================
// Composed State Interfaces
// ============================================================================

import { SidebarState, SidebarActions } from "./sidebar";
import { LayoutPreferences, PreferencesActions } from "./preferences";
import { NavigationState, NavigationActions } from "./navigation";
import type { LayoutPreferences as _LP } from "./preferences";

/**
 * Complete layout state interface combining all state slices
 */
export interface LayoutState {
  /** Sidebar state and configuration */
  sidebar: SidebarState;
  /** User preferences and customization */
  preferences: LayoutPreferences;
  /** Navigation and routing state */
  navigation: NavigationState;
  /** Creative tool state */
  tools?: {
    activeTool: string;
    propertiesPanelOpen: boolean;
  };
  /** Panel sizing state */
  panels?: {
    scenePanelWidth: number;
    propertiesPanelWidth: number;
    statusBarVisible: boolean;
  };
  /** Status information */
  status?: {
    mousePosition: {
      x: number;
      y: number;
      hex: { q: number; r: number } | null;
    };
    selectionCount: number;
  };
}

/**
 * Complete layout actions interface combining all action slices
 */
export interface LayoutActions
  extends SidebarActions,
    PreferencesActions,
    NavigationActions {
  /** Reset layout to default state */
  resetLayout: () => void;
  /** Load saved preferences from persistence layer */
  loadPreferences: () => void;
}

/**
 * Combined layout store interface extending state and actions
 */
export interface LayoutStore extends LayoutState, LayoutActions {}

// ============================================================================
// Composed Default Values
// ============================================================================

import { DEFAULT_SIDEBAR_STATE } from "./sidebar";
import { DEFAULT_PREFERENCES } from "./preferences";
import { DEFAULT_NAVIGATION_STATE } from "./navigation";

/**
 * Complete default layout state combining all defaults
 */
export const DEFAULT_LAYOUT_STATE: LayoutState = {
  sidebar: DEFAULT_SIDEBAR_STATE,
  preferences: DEFAULT_PREFERENCES,
  navigation: DEFAULT_NAVIGATION_STATE,
} as const;

// ============================================================================
// Backwards Compatibility Exports
// ============================================================================

// Re-export commonly used interfaces with original names for compatibility
export type { BreadcrumbItem } from "./navigation";
export type {
  AppSidebarProps,
  AppHeaderProps,
  MainContentProps,
} from "./components";
export type { BaseLayoutProps, LayoutProviderProps } from "./components";

// Re-export constants for compatibility
export { SIDEBAR_WIDTH_CONSTRAINTS } from "./sidebar";
export { isValidTheme } from "./preferences";
export { isValidSidebarVariant, isValidSidebarCollapsible } from "./sidebar";

// ============================================================================
// Convenience Public Types
// ============================================================================

/**
 * Canonical Theme type for the layout system.
 * Exported for consumers and tests to avoid duplicate local aliases.
 */
export type Theme = _LP["theme"];
