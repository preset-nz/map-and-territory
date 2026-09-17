/**
 * Layout Components - Main Export Index
 *
 * Provides clean exports for all layout components, enabling focused imports
 * and maintaining a clear component API. This file centralizes all layout
 * component exports for easy consumption across the application.
 *
 * Usage:
 * ```tsx
 * import { AppLayout, AppHeader, MainContent } from '@/components/layout';
 * // or
 * import AppLayout from '@/components/layout/app-layout';
 * ```
 */

// ============================================================================
// Core Layout Components
// ============================================================================

export { default as AppHeader } from "./app-header";
export {
  CenteredLayout,
  ConditionalLayout,
  default as AppLayout,
  FullscreenLayout,
  LayoutProvider,
  withLayout,
} from "./app-layout";
export { default as AppSidebar } from "./app-sidebar";
export { default as AppToolbar } from "./app-toolbar";
export {
  ContentContainer,
  ContentError,
  ContentGrid,
  ContentLoading,
  ContentSection,
  default as MainContent,
  PageHeader,
} from "./main-content";
export { default as PropertiesPanel } from "./properties-panel";
export { default as StatusBar } from "./status-bar";

// ============================================================================
// Specialized Navigation Components
// ============================================================================

export { default as NavigationSections } from "./navigation-sections";

// ============================================================================
// Re-export Layout Types
// ============================================================================

export type {
  // Component-specific props
  AppHeaderProps,
  AppSidebarProps,
  // Base layout props
  BaseLayoutProps,
  BreadcrumbItem,
  LayoutProviderProps,
  // State interfaces
  LayoutState,
  LayoutStore,
  MainContentProps,
} from "@/types/layout";

// ============================================================================
// Re-export Layout Stores and Hooks
// ============================================================================

export {
  debugLayoutState,
  // Utilities
  getLayoutState,
  resetLayoutStore,
  subscribeToLayoutChanges,
  // Main store
  useLayoutStore,
} from "@/stores/layout";

// ============================================================================
// Layout Configuration Constants
// ============================================================================

export {
  DEFAULT_LAYOUT_STATE,
  isValidSidebarCollapsible,
  isValidSidebarVariant,
  isValidTheme,
  SIDEBAR_WIDTH_CONSTRAINTS,
} from "@/types/layout";
