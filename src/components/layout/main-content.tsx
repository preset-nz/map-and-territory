"use client";

/**
 * MainContent - Professional Main Content Area Component
 *
 * Provides the primary content area with proper spacing, scroll handling,
 * and responsive layout adjustments. Integrates with layout state for
 * optimal content presentation.
 *
 * Features:
 * - Responsive content area with proper padding
 * - Scroll management and overflow handling
 * - Layout integration with sidebar states
 * - Professional spacing and typography
 * - Desktop-optimized responsive behavior
 */

import React from "react";
import { cn } from "@/lib/utils";
import { MainContentProps } from "@/types/layout";

// ============================================================================
// MainContent Component
// ============================================================================

/**
 * MainContent component providing the primary content area
 *
 * @param props - MainContent configuration props
 */
export const MainContent: React.FC<MainContentProps> = ({
  children,
  className = "",
  padding = "default",
  scrollable = true,
}) => {
  // Layout integration available for future responsive adjustments

  /**
   * Generate padding classes based on prop value
   */
  const getPaddingClasses = () => {
    switch (padding) {
      case "none":
        return "";
      case "tight":
        return "p-4";
      case "loose":
        return "p-8 lg:p-12";
      case "default":
      default:
        return "p-6 lg:p-8";
    }
  };

  /**
   * Generate scroll and overflow classes
   */
  const getScrollClasses = () => {
    if (!scrollable) {
      return "overflow-hidden";
    }
    return "overflow-auto";
  };

  /**
   * Generate responsive classes based on sidebar state
   */
  const getResponsiveClasses = () => {
    const baseClasses = "flex-1 min-h-0";

    // Add transition for smooth layout changes
    const transitionClasses = "transition-all duration-200 ease-in-out";

    return cn(baseClasses, transitionClasses);
  };

  return (
    <main
      className={cn(
        // Base layout classes
        getResponsiveClasses(),
        "w-full",

        // Scroll behavior
        getScrollClasses(),

        // Background and styling
        "bg-background",

        // Custom padding
        getPaddingClasses(),

        // Custom classes
        className,
      )}
    >
      {/* Content wrapper - natural height; scroll when content overflows */}
      <div className="min-h-0 w-full">{children}</div>
    </main>
  );
};

// ============================================================================
// Content Grid Component
// ============================================================================

/**
 * ContentGrid - Responsive grid layout for content
 *
 * Provides responsive grid layouts with consistent spacing
 * for organizing content into columns.
 */
interface ContentGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export const ContentGrid: React.FC<ContentGridProps> = ({
  children,
  columns = 1,
  gap = "md",
  className = "",
}) => {
  const getColumnsClasses = () => {
    switch (columns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
      case 5:
        return "grid-cols-1 md:grid-cols-3 lg:grid-cols-5";
      case 6:
        return "grid-cols-1 md:grid-cols-3 lg:grid-cols-6";
      default:
        return "grid-cols-1";
    }
  };

  const getGapClasses = () => {
    switch (gap) {
      case "sm":
        return "gap-3";
      case "md":
        return "gap-6";
      case "lg":
        return "gap-8";
      default:
        return "gap-6";
    }
  };

  return (
    <div
      className={cn("grid", getColumnsClasses(), getGapClasses(), className)}
    >
      {children}
    </div>
  );
};

// ============================================================================
// Content Container Component
// ============================================================================

/**
 * ContentContainer - Wrapper for constrained content width
 *
 * Provides consistent content width constraints and centering
 * for better readability and professional layout.
 */
interface ContentContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

export const ContentContainer: React.FC<ContentContainerProps> = ({
  children,
  maxWidth = "2xl",
  className = "",
}) => {
  const getMaxWidthClasses = () => {
    switch (maxWidth) {
      case "sm":
        return "max-w-sm";
      case "md":
        return "max-w-md";
      case "lg":
        return "max-w-lg";
      case "xl":
        return "max-w-xl";
      case "2xl":
        return "max-w-2xl";
      case "full":
        return "max-w-full";
      default:
        return "max-w-2xl";
    }
  };

  return (
    <div className={cn("mx-auto", getMaxWidthClasses(), className)}>
      {children}
    </div>
  );
};

// ============================================================================
// Page Header Component
// ============================================================================

/**
 * PageHeader - Standardized page header component
 *
 * Provides consistent page header styling with title, description,
 * and optional actions for professional page layouts.
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className = "",
}) => {
  return (
    <div className={cn("mb-6 lg:mb-8", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">{actions}</div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Content Section Component
// ============================================================================

/**
 * ContentSection - Standardized content section component
 *
 * Provides consistent spacing and styling for content sections
 * within the main content area.
 */
interface ContentSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  children,
  title,
  description,
  actions,
  className = "",
}) => {
  return (
    <section className={cn("mb-6 lg:mb-8", className)}>
      {(title || description || actions) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-medium tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
};

// ============================================================================
// Loading State Component
// ============================================================================

/**
 * ContentLoading - Loading state for main content
 *
 * Provides consistent loading state presentation with skeleton
 * placeholders for better user experience.
 */
interface ContentLoadingProps {
  title?: string;
  lines?: number;
  className?: string;
}

export const ContentLoading: React.FC<ContentLoadingProps> = ({
  title = "Loading content...",
  lines = 3,
  className = "",
}) => {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {/* Title skeleton */}
      <div className="h-8 bg-muted rounded-md w-1/3" />

      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 bg-muted rounded",
              i === lines - 1 ? "w-2/3" : "w-full",
            )}
          />
        ))}
      </div>

      {/* Accessibility text */}
      <span className="sr-only">{title}</span>
    </div>
  );
};

// ============================================================================
// Error State Component
// ============================================================================

/**
 * ContentError - Error state for main content
 *
 * Provides consistent error state presentation with retry
 * functionality for better error handling.
 */
interface ContentErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ContentError: React.FC<ContentErrorProps> = ({
  title = "Something went wrong",
  message = "There was an error loading the content. Please try again.",
  onRetry,
  className = "",
}) => {
  return (
    <div className={cn("text-center py-12", className)}>
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-destructive">{title}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Default Export
// ============================================================================

export default MainContent;
