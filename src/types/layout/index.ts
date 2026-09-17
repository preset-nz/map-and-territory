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

export * from "./components";
export * from "./navigation";
export * from "./preferences";
export * from "./sidebar";

// ============================================================================
// Composed State Interfaces
// ============================================================================

import type { NavigationActions, NavigationState } from "./navigation";
import type {
  LayoutPreferences as _LP,
  LayoutPreferences,
  PreferencesActions,
} from "./preferences";
import type { SidebarActions, SidebarState } from "./sidebar";

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

import { DEFAULT_NAVIGATION_STATE } from "./navigation";
import { DEFAULT_PREFERENCES } from "./preferences";
import { DEFAULT_SIDEBAR_STATE } from "./sidebar";

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

export type {
  AppHeaderProps,
  AppSidebarProps,
  BaseLayoutProps,
  LayoutProviderProps,
  MainContentProps,
} from "./components";
// Re-export commonly used interfaces with original names for compatibility
export type { BreadcrumbItem } from "./navigation";
export { isValidTheme } from "./preferences";
// Re-export constants for compatibility
export {
  isValidSidebarCollapsible,
  isValidSidebarVariant,
  SIDEBAR_WIDTH_CONSTRAINTS,
} from "./sidebar";

// ============================================================================
// Convenience Public Types
// ============================================================================

/**
 * Canonical Theme type for the layout system.
 * Exported for consumers and tests to avoid duplicate local aliases.
 */
export type Theme = _LP["theme"];
