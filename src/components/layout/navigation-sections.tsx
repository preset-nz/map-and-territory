"use client";

/**
 * NavigationSections - Specialized Navigation Components
 *
 * Provides reusable navigation section components that can be used
 * across different layouts and contexts. Supports hierarchical
 * navigation with proper accessibility and state management.
 *
 * Features:
 * - Hierarchical navigation with nested items
 * - Active state tracking and visual indicators
 * - Keyboard navigation and accessibility
 * - Icon support with optional text labels
 * - Collapsible sections with smooth transitions
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layout";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Navigation item interface
 */
interface NavigationItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Navigation URL */
  href?: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Nested sub-items */
  items?: NavigationItem[];
  /** Badge or count to display */
  badge?: string | number;
  /** Item disabled state */
  disabled?: boolean;
  /** External link indicator */
  external?: boolean;
}

/**
 * Navigation section interface
 */
interface NavigationSection {
  /** Section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Section items */
  items: NavigationItem[];
  /** Section collapsible state */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * NavigationSections props
 */
interface NavigationSectionsProps {
  /** Navigation sections to render */
  sections: NavigationSection[];
  /** Component className */
  className?: string;
  /** Show section titles */
  showTitles?: boolean;
  /** Compact mode for reduced spacing */
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a navigation item is active
 */
const isItemActive = (item: NavigationItem, pathname: string): boolean => {
  if (!item.href) return false;

  if (item.href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(item.href);
};

/**
 * Check if any child item is active
 */
const hasActiveChild = (items: NavigationItem[], pathname: string): boolean => {
  return items.some(
    (item) =>
      isItemActive(item, pathname) ||
      (item.items && hasActiveChild(item.items, pathname)),
  );
};

// ============================================================================
// NavigationItem Component
// ============================================================================

interface NavigationItemComponentProps {
  item: NavigationItem;
  level: number;
  pathname: string;
  isCompact: boolean;
  isSidebarCollapsed: boolean;
  onItemClick: (item: NavigationItem) => void;
}

const NavigationItemComponent: React.FC<NavigationItemComponentProps> = ({
  item,
  level,
  pathname,
  isCompact,
  isSidebarCollapsed,
  onItemClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(
    hasActiveChild(item.items || [], pathname),
  );

  const isActive = isItemActive(item, pathname);
  const hasChildren = item.items && item.items.length > 0;
  // const childActive = hasChildren && hasActiveChild(item.items!, pathname);

  /**
   * Handle item click
   */
  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren && !item.href) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    } else {
      onItemClick(item);
    }
  };

  /**
   * Handle expand toggle
   */
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  /**
   * Render navigation item content
   */
  const renderItemContent = () => (
    <>
      {/* Icon */}
      {item.icon && (
        <item.icon
          className={cn(
            "h-4 w-4 flex-shrink-0",
            isActive ? "text-primary" : "text-muted-foreground",
          )}
        />
      )}

      {/* Label */}
      {!isSidebarCollapsed && (
        <span className={cn("flex-1 truncate", isActive && "font-medium")}>
          {item.label}
        </span>
      )}

      {/* Badge */}
      {!isSidebarCollapsed && item.badge && (
        <span
          className={cn(
            "ml-auto flex-shrink-0 rounded-full px-2 py-1 text-xs",
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {item.badge}
        </span>
      )}

      {/* Expand indicator */}
      {!isSidebarCollapsed && hasChildren && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-4 w-4 p-0 hover:bg-transparent"
          onClick={handleToggleExpand}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      )}
    </>
  );

  /**
   * Base item classes
   */
  const itemClasses = cn(
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
    "hover:bg-accent hover:text-accent-foreground",
    "focus:bg-accent focus:text-accent-foreground focus:outline-none",
    isActive && "bg-accent text-accent-foreground",
    item.disabled && "opacity-50 cursor-not-allowed",
    isCompact && "py-1",
    level > 0 && "ml-4",
  );

  /**
   * Render item with tooltip if collapsed
   */
  const renderItem = () => {
    const itemElement = item.href ? (
      <Link
        href={item.href}
        className={itemClasses}
        onClick={handleClick}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
      >
        {renderItemContent()}
      </Link>
    ) : (
      <button
        className={itemClasses}
        onClick={handleClick}
        disabled={item.disabled}
      >
        {renderItemContent()}
      </button>
    );

    // Wrap with tooltip if sidebar is collapsed and has icon
    if (isSidebarCollapsed && item.icon) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{itemElement}</TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex flex-col">
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-xs text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return itemElement;
  };

  return (
    <li>
      {renderItem()}

      {/* Render children if expanded and not collapsed */}
      {hasChildren && isExpanded && !isSidebarCollapsed && (
        <ul className="mt-1 space-y-1">
          {item.items!.map((childItem) => (
            <NavigationItemComponent
              key={childItem.id}
              item={childItem}
              level={level + 1}
              pathname={pathname}
              isCompact={isCompact}
              isSidebarCollapsed={isSidebarCollapsed}
              onItemClick={onItemClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

// ============================================================================
// NavigationSection Component
// ============================================================================

interface NavigationSectionComponentProps {
  section: NavigationSection;
  isCompact: boolean;
  showTitle: boolean;
  isSidebarCollapsed: boolean;
  onItemClick: (item: NavigationItem) => void;
}

const NavigationSectionComponent: React.FC<NavigationSectionComponentProps> = ({
  section,
  isCompact,
  showTitle,
  isSidebarCollapsed,
  onItemClick,
}) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(
    section.defaultCollapsed || false,
  );

  /**
   * Handle section toggle
   */
  const handleToggle = () => {
    if (section.collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={cn("space-y-2", isCompact && "space-y-1")}>
      {/* Section Title */}
      {showTitle && !isSidebarCollapsed && (
        <div className="px-3">
          {section.collapsible ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-medium text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
              onClick={handleToggle}
            >
              <span className="flex items-center gap-2">
                {section.title}
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </span>
            </Button>
          ) : (
            <h3 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h3>
          )}
        </div>
      )}

      {/* Section Items */}
      {(!section.collapsible || !isCollapsed) && (
        <nav>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <NavigationItemComponent
                key={item.id}
                item={item}
                level={0}
                pathname={pathname}
                isCompact={isCompact}
                isSidebarCollapsed={isSidebarCollapsed}
                onItemClick={onItemClick}
              />
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};

// ============================================================================
// NavigationSections Component
// ============================================================================

/**
 * NavigationSections component providing structured navigation
 *
 * @param props - NavigationSections configuration props
 */
export const NavigationSections: React.FC<NavigationSectionsProps> = ({
  sections,
  className = "",
  showTitles = true,
  compact = false,
}) => {
  const setActiveSection = useLayoutStore((state) => state.setActiveSection);
  const isOpen = useLayoutStore((state) => state.isOpen);

  /**
   * Handle navigation item click
   */
  const handleItemClick = (item: NavigationItem) => {
    setActiveSection(item.label);
  };

  return (
    <div className={cn("space-y-6", compact && "space-y-3", className)}>
      {sections.map((section, index) => (
        <React.Fragment key={section.id}>
          <NavigationSectionComponent
            section={section}
            isCompact={compact}
            showTitle={showTitles}
            isSidebarCollapsed={!isOpen}
            onItemClick={handleItemClick}
          />

          {/* Separator between sections */}
          {index < sections.length - 1 && showTitles && !compact && (
            <Separator />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================================================
// Default Export
// ============================================================================

export default NavigationSections;
