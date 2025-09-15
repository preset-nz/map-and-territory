/**
 * Component prop interfaces for the Professional Layout System
 *
 * This file contains all interfaces for layout component props,
 * following single responsibility principle for component contracts.
 */

import { ReactNode } from "react";
import React from "react";

// ============================================================================
// Base Component Props
// ============================================================================

/**
 * Base props interface for layout components
 */
export interface BaseLayoutProps {
  /** Optional CSS class names */
  className?: string;
  /** Child components */
  children?: ReactNode;
}

// ============================================================================
// Layout Component Props
// ============================================================================

/**
 * Root AppLayout component props
 */
export interface AppLayoutProps extends BaseLayoutProps {
  /** Optional additional wrapper class names */
  wrapperClassName?: string;
}

/**
 * AppHeader component props for top-level navigation
 */
export interface AppHeaderProps extends Omit<BaseLayoutProps, "children"> {
  /** Optional title text to display */
  title?: string;
  /** Optional action buttons/components for header right side */
  actions?: ReactNode;
  /** Optional logo/branding component */
  logo?: ReactNode;
  /** Whether to show breadcrumb navigation */
  showBreadcrumbs?: boolean;
}

/**
 * AppSidebar component props extending shadcn/ui Sidebar
 */
export interface AppSidebarProps extends Omit<BaseLayoutProps, "children"> {
  /** Sidebar display variant */
  variant?: "sidebar" | "inset";
  /** Collapse behavior */
  collapsible?: "icon" | "none";
  /** Optional custom sidebar content */
  content?: ReactNode;
}

/**
 * MainContent component props for primary work area
 */
export interface MainContentProps extends BaseLayoutProps {
  /** Optional contextual header component */
  header?: ReactNode;
  /** Whether content should fill available height */
  fillHeight?: boolean;
  /** Padding configuration */
  padding?: "none" | "tight" | "default" | "loose";
  /** Whether content should be scrollable */
  scrollable?: boolean;
}

// ============================================================================
// Provider Props
// ============================================================================

/**
 * LayoutProvider props for Zustand store integration
 */
export interface LayoutProviderProps {
  /** Child components that will have access to layout store */
  children: ReactNode;
  /** Default sidebar open state on initial load */
  defaultSidebarOpen?: boolean;
  /** Custom persistence key for localStorage */
  persistKey?: string;
  /** Whether to enable store devtools in development */
  enableDevtools?: boolean;
}

// ============================================================================
// Store Configuration Props
// ============================================================================

/**
 * Configuration for store persistence
 */
export interface StorePersistConfig<T = Record<string, unknown>> {
  /** LocalStorage key for persistence */
  name: string;
  /** Function to determine which state properties to persist */
  partialize?: (state: T) => Partial<T>;
  /** Version for migration handling */
  version?: number;
}

// ============================================================================
// Component Utilities
// ============================================================================

/**
 * Helper type to omit specific props from component interfaces
 */
export type ComponentPropsWithoutRef<
  T extends keyof React.JSX.IntrinsicElements,
> = React.ComponentPropsWithoutRef<T>;

/**
 * Helper type for forwarded ref components
 */
export type ComponentPropsWithRef<T extends keyof React.JSX.IntrinsicElements> =
  React.ComponentPropsWithRef<T>;
