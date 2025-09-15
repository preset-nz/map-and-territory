/**
 * Navigation and breadcrumb types for the Professional Layout System
 *
 * This file contains all interfaces and types related to navigation state,
 * breadcrumb management, and routing.
 */

import { ReactNode } from "react";

// ============================================================================
// Navigation Interfaces
// ============================================================================

/**
 * Breadcrumb item interface for navigation state
 */
export interface BreadcrumbItem {
  /** Display text for the breadcrumb item */
  label: string;
  /** Optional navigation href - if provided, item will be clickable */
  href?: string;
  /** Optional icon component to display alongside label */
  icon?: ReactNode;
  /** Whether this item represents the current page/section */
  isCurrent?: boolean;
}

/**
 * Navigation state for active sections and breadcrumbs
 */
export interface NavigationState {
  /** Currently active section identifier */
  activeSection: string;
  /** Breadcrumb navigation trail */
  breadcrumb: BreadcrumbItem[];
}

// ============================================================================
// Navigation Actions
// ============================================================================

/**
 * Actions interface for navigation management
 */
export interface NavigationActions {
  /** Set the currently active section */
  setActiveSection: (section: string) => void;
  /** Update breadcrumb navigation trail */
  setBreadcrumb: (items: BreadcrumbItem[]) => void;
  /** Add single breadcrumb item to current trail */
  addBreadcrumb: (item: BreadcrumbItem) => void;
  /** Clear breadcrumb trail */
  clearBreadcrumb: () => void;
}

// ============================================================================
// Navigation Component Props
// ============================================================================

/**
 * ContentHeader component props for contextual headers
 */
export interface ContentHeaderProps {
  /** Optional CSS class names */
  className?: string;
  /** Page/section title */
  title?: string;
  /** Breadcrumb items - if not provided, will use store state */
  breadcrumb?: BreadcrumbItem[];
  /** Action buttons for header right side */
  actions?: ReactNode;
}

// ============================================================================
// Navigation Constants
// ============================================================================

/**
 * Default navigation state values
 */
export const DEFAULT_NAVIGATION_STATE: NavigationState = {
  activeSection: "maps",
  breadcrumb: [],
} as const;

/**
 * Validation helper for breadcrumb items
 */
export const isValidBreadcrumbItem = (item: BreadcrumbItem): boolean => {
  return Boolean(item.label?.trim());
};

/**
 * Helper to filter valid breadcrumb items
 */
export const filterValidBreadcrumbs = (
  items: BreadcrumbItem[],
): BreadcrumbItem[] => {
  return items.filter(isValidBreadcrumbItem);
};
