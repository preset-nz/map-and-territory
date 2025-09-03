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

export { default as AppLayout, LayoutProvider, FullscreenLayout, CenteredLayout, withLayout, ConditionalLayout } from './app-layout';
export { default as AppHeader } from './app-header';
export { default as AppSidebar } from './app-sidebar';
export { default as AppToolbar } from './app-toolbar';
export { default as PropertiesPanel } from './properties-panel';
export { default as StatusBar } from './status-bar';
export { default as MainContent, ContentContainer, ContentGrid, PageHeader, ContentSection, ContentLoading, ContentError } from './main-content';

// ============================================================================
// Specialized Navigation Components
// ============================================================================

export { default as NavigationSections } from './navigation-sections';

// ============================================================================
// Re-export Layout Types
// ============================================================================

export type {
  // Base layout props
  BaseLayoutProps,
  LayoutProviderProps,
  
  // Component-specific props
  AppHeaderProps,
  AppSidebarProps,
  MainContentProps,
  
  // State interfaces
  LayoutState,
  LayoutStore,
  BreadcrumbItem,
} from '@/types/layout';

// ============================================================================
// Re-export Layout Stores and Hooks
// ============================================================================

export {
  // Main store
  useLayoutStore,
  
  // Utilities
  getLayoutState,
  subscribeToLayoutChanges,
  resetLayoutStore,
  debugLayoutState,
} from '@/stores/layout';

// ============================================================================
// Layout Configuration Constants
// ============================================================================

export { 
  DEFAULT_LAYOUT_STATE,
  SIDEBAR_WIDTH_CONSTRAINTS,
  isValidTheme,
  isValidSidebarVariant,
  isValidSidebarCollapsible 
} from '@/types/layout';
