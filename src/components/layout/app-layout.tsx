"use client";

/**
 * AppLayout - Root Application Layout Component
 *
 * Orchestrates the complete professional layout system by combining
 * header, sidebar, and main content areas. Provides the foundational
 * structure for the entire application interface.
 *
 * Features:
 * - Complete layout orchestration with proper component composition
 * - Integration with shadcn/ui SidebarProvider for layout state
 * - Responsive behavior with desktop-first approach
 * - Professional spacing and visual hierarchy
 * - Accessibility compliance and keyboard navigation
 */

import React, { useEffect, useMemo, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

import AppHeader from "./app-header";
import AppSidebar from "./app-sidebar";
import AppToolbar from "./app-toolbar";
import PropertiesPanel from "./properties-panel";
import MainContent from "./main-content";
import { AuthErrorBoundary } from "../providers/auth-provider";
import StatusBar from "./status-bar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ensureCommand } from "@/lib/commands";
import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";
import { useLayoutStore } from "@/stores/layout";
import { loadPlugin } from "@/plugin/loader";
import {
  newCampaignManifest,
  newCampaignModule,
} from "@/plugin/builtin/new-campaign";
import { mapCrudManifest, mapCrudModule } from "@/plugin/builtin/map-crud";
import { hexNoiseManifest, hexNoiseModule } from "@/plugin/builtin/hex-noise";
import {
  settingsPaletteManifest,
  settingsPaletteModule,
} from "@/plugin/builtin/settings-palette";

import { BaseLayoutProps } from "@/types/layout";
import { cn } from "@/lib/utils";

// ============================================================================
// AppLayout Component
// ============================================================================

/**
 * AppLayout component providing the complete application layout structure
 *
 * This component orchestrates all major layout components and provides
 * the necessary providers for state management and UI interactions.
 *
 * @param props - AppLayout configuration props
 */
export const AppLayout: React.FC<BaseLayoutProps> = ({
  children,
  className = "",
}) => {
  const isOpen = useLayoutStore((state) => state.isOpen);
  const statusBarVisible = useLayoutStore((state) => state.statusBarVisible);
  const propertiesPanelOpen = useLayoutStore(
    (state) => state.propertiesPanelOpen,
  );
  const setScenePanelWidth = useLayoutStore(
    (state) => state.setScenePanelWidth,
  );
  const setPropertiesPanelWidth = useLayoutStore(
    (state) => state.setPropertiesPanelWidth,
  );
  const scenePanelWidthPx = useLayoutStore((state) => state.scenePanelWidth);
  const propsPanelWidthPx = useLayoutStore(
    (state) => state.propertiesPanelWidth,
  );

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Register host command for new campaign (prompt + create)
  useEffect(() => {
    ensureCommand("host.prompt.newCampaign", async () => {
      // MVP: no dialogs; create Untitled campaign with empty description
      useProjectStore
        .getState()
        .createEmpty({ name: "Untitled Campaign", description: "" });
      useSelectionStore.getState().selectCampaign();
    });
  }, []);

  // Host actions for maps
  useEffect(() => {
    ensureCommand("host.action.newMap", async () => {
      const id = useProjectStore
        .getState()
        .addMap({ name: "Untitled Map", description: "" });
      useProjectStore.getState().selectMap(id);
      useSelectionStore.getState().selectMap(id);
    });
    ensureCommand("host.action.deleteMap", async (payload?: unknown) => {
      const id = (payload as { id?: string } | undefined)?.id;
      if (!id) return;
      // MVP: simple confirm; replace with Radix dialog later
      if (window.confirm("Delete this map? This cannot be undone.")) {
        useProjectStore.getState().deleteMap(id);
        useSelectionStore.getState().selectCampaign();
      }
    });
  }, []);

  // Load built-in New Campaign plugin (registers command + toolbar contribution)
  useEffect(() => {
    loadPlugin(newCampaignManifest, newCampaignModule);
    loadPlugin(mapCrudManifest, mapCrudModule);
    loadPlugin(hexNoiseManifest, hexNoiseModule);
    loadPlugin(settingsPaletteManifest, settingsPaletteModule);
  }, []);

  // Sync selection count for status bar
  useEffect(() => {
    const unsub = useSelectionStore.subscribe((state) => {
      const sel = state.selection;
      const count = sel.kind === "none" ? 0 : 1;
      useLayoutStore.getState().setSelectionCount(count);
    });
    return () => {
      unsub();
    };
  }, []);

  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;

  // Keep last known percentages in refs (restored on expand)
  const scenePctRef = useRef<number>(20);
  const propsPctRef = useRef<number>(25);

  // Initialize refs from persisted pixel widths (client-side)
  useEffect(() => {
    if (!vw) return;
    if (scenePanelWidthPx) {
      scenePctRef.current = clamp(
        Math.round((scenePanelWidthPx / vw) * 100),
        15,
        30,
      );
    }
    if (propsPanelWidthPx) {
      propsPctRef.current = clamp(
        Math.round((propsPanelWidthPx / vw) * 100),
        20,
        35,
      );
    }
  }, [scenePanelWidthPx, propsPanelWidthPx, vw]);

  // Controlled layout that adapts to which panels are present
  // We will conditionally render side panels; main fills remaining space naturally.

  // Initial defaults (also used to silence SSR warning about defaultSize)
  const initialScene = scenePctRef.current;
  const initialProps = propsPctRef.current;
  const initialMain = useMemo(() => {
    const s = isOpen ? initialScene : 0;
    const p = propertiesPanelOpen ? initialProps : 0;
    return clamp(100 - s - p, 40, 100);
  }, [isOpen, propertiesPanelOpen, initialScene, initialProps]);

  // Persist sizes when layout changes (drag end or normalization)
  // handled inline in onResize callbacks above

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div
          className={cn(
            "grid h-screen w-full grid-rows-[auto_auto_1fr_auto]",
            className,
          )}
        >
          {/* Row 1: Header */}
          <AppHeader />
          {/* Row 2: Toolbar */}
          <AppToolbar />

          {/* Row 3: Main editor area; only this row scrolls its own content */}
          <div className="min-h-0 min-w-0 overflow-hidden">
            {/* Provide explicit height to panels via h-full */}
            <PanelGroup
              key={`pg-${isOpen ? "L" : "l"}-${propertiesPanelOpen ? "R" : "r"}`}
              direction="horizontal"
              className="h-full w-full"
            >
              {/* Scene Panel (Resizable) */}
              {isOpen && (
                <Panel
                  id="scene-panel"
                  order={1}
                  defaultSize={initialScene}
                  minSize={15}
                  maxSize={30}
                  className="min-h-0"
                  onResize={(size) => {
                    if (typeof window === "undefined") return;
                    const width = Math.round((size / 100) * window.innerWidth);
                    const prev = useLayoutStore.getState().scenePanelWidth;
                    if (Math.abs(width - prev) >= 4) setScenePanelWidth(width);
                  }}
                >
                  <div className="h-full min-h-0">
                    <AppSidebar />
                  </div>
                </Panel>
              )}

              {/* Resize handle for scene panel */}
              {isOpen && (
                <PanelResizeHandle
                  className="w-1 bg-border hover:bg-accent transition-colors"
                  aria-label="Resize scene and main panels"
                  aria-controls="scene-panel main-panel"
                />
              )}

              {/* Main Panel */}
              <Panel
                id="main-panel"
                order={2}
                minSize={0}
                defaultSize={initialMain}
                className="min-h-0"
              >
                <div className="h-full min-h-0 flex flex-col">
                  <MainContent scrollable padding="none">
                    {children}
                  </MainContent>
                </div>
              </Panel>

              {/* Properties Panel (Resizable) */}
              {propertiesPanelOpen && (
                <PanelResizeHandle
                  className="w-1 bg-border hover:bg-accent transition-colors"
                  aria-label="Resize main and properties panels"
                  aria-controls="main-panel properties-panel"
                />
              )}
              {propertiesPanelOpen && (
                <Panel
                  id="properties-panel"
                  order={3}
                  defaultSize={initialProps}
                  minSize={20}
                  maxSize={35}
                  className="min-h-0"
                  onResize={(size) => {
                    if (typeof window === "undefined") return;
                    const width = Math.round((size / 100) * window.innerWidth);
                    const prev = useLayoutStore.getState().propertiesPanelWidth;
                    if (Math.abs(width - prev) >= 4)
                      setPropertiesPanelWidth(width);
                  }}
                >
                  <AuthErrorBoundary>
                    <div className="h-full min-h-0">
                      <PropertiesPanel />
                    </div>
                  </AuthErrorBoundary>
                </Panel>
              )}
            </PanelGroup>
          </div>

          {/* Row 4: Status Bar */}
          {statusBarVisible && <StatusBar />}
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

// ============================================================================
// Layout Provider Component (Alternative Implementation)
// ============================================================================

/**
 * LayoutProvider - Alternative layout provider for advanced use cases
 *
 * Provides additional layout context and configuration options
 * for applications requiring more granular layout control.
 */
interface LayoutProviderProps extends BaseLayoutProps {
  /** Custom header component override */
  customHeader?: React.ComponentType;
  /** Custom sidebar component override */
  customSidebar?: React.ComponentType;
  /** Layout variant for different application modes */
  variant?: "default" | "compact" | "wide";
  /** Header visibility control */
  showHeader?: boolean;
  /** Sidebar visibility control */
  showSidebar?: boolean;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({
  children,
  className = "",
  customHeader: CustomHeader,
  customSidebar: CustomSidebar,
  variant = "default",
  showHeader = true,
  showSidebar = true,
}) => {
  /**
   * Get layout variant classes
   */
  const getVariantClasses = () => {
    switch (variant) {
      case "compact":
        return "container-sm mx-auto";
      case "wide":
        return "max-w-none";
      case "default":
      default:
        return "";
    }
  };

  /**
   * Render header component
   */
  const renderHeader = () => {
    if (!showHeader) return null;

    if (CustomHeader) {
      return <CustomHeader />;
    }

    return <AppHeader />;
  };

  /**
   * Render sidebar component
   */
  const renderSidebar = () => {
    if (!showSidebar) return null;

    if (CustomSidebar) {
      return <CustomSidebar />;
    }

    return <AppSidebar />;
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div
          className={cn(
            "flex min-h-screen w-full",
            getVariantClasses(),
            className,
          )}
        >
          {/* Conditional Sidebar */}
          {renderSidebar()}

          {/* Main Content Area */}
          <SidebarInset className="flex flex-col flex-1 min-w-0">
            {/* Conditional Header */}
            {renderHeader()}

            {/* Main Content */}
            <MainContent>{children}</MainContent>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

// ============================================================================
// Specialized Layout Components
// ============================================================================

/**
 * FullscreenLayout - Layout for fullscreen applications
 *
 * Provides a layout without header and sidebar for immersive experiences
 * like editors, dashboards, or presentation modes.
 */
interface FullscreenLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const FullscreenLayout: React.FC<FullscreenLayoutProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={cn("min-h-screen w-full", className)}>
      <MainContent padding="none" className="h-screen">
        {children}
      </MainContent>
    </div>
  );
};

/**
 * CenteredLayout - Layout for centered content
 *
 * Provides a layout with centered content, useful for login pages,
 * error pages, or other focused content presentations.
 */
interface CenteredLayoutProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const CenteredLayout: React.FC<CenteredLayoutProps> = ({
  children,
  maxWidth = "md",
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
      default:
        return "max-w-md";
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen w-full flex items-center justify-center p-4",
        className,
      )}
    >
      <div className={cn("w-full", getMaxWidthClasses())}>{children}</div>
    </div>
  );
};

// ============================================================================
// Layout Composition Utilities
// ============================================================================

/**
 * withLayout - HOC for wrapping components with layout
 *
 * Provides a higher-order component pattern for applying
 * layout to specific components or pages.
 */
export const withLayout = <P extends object>(
  Component: React.ComponentType<P>,
  layoutProps?: Partial<LayoutProviderProps>,
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <LayoutProvider {...layoutProps}>
        <Component {...props} />
      </LayoutProvider>
    );
  };

  WrappedComponent.displayName = `withLayout(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

/**
 * Layout composition utility for conditional layouts
 */
interface ConditionalLayoutProps {
  children: React.ReactNode;
  condition: boolean;
  layout: React.ComponentType<{ children: React.ReactNode }>;
  fallback?: React.ComponentType<{ children: React.ReactNode }>;
  layoutProps?: Record<string, unknown>;
  fallbackProps?: Record<string, unknown>;
}

export const ConditionalLayout: React.FC<ConditionalLayoutProps> = ({
  children,
  condition,
  layout: Layout,
  fallback: Fallback,
  layoutProps = {},
  fallbackProps = {},
}) => {
  if (condition) {
    return <Layout {...layoutProps}>{children}</Layout>;
  }

  if (Fallback) {
    return <Fallback {...fallbackProps}>{children}</Fallback>;
  }

  return <>{children}</>;
};

// ============================================================================
// Default Export
// ============================================================================

export default AppLayout;
