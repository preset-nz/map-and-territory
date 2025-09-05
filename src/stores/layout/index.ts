/**
 * Layout Stores - Main Export Index and Composed Store
 *
 * This file provides a complete layout store implementation using
 * focused slices for maintainability, while maintaining backwards
 * compatibility with the previous monolithic store interface.
 *
 * Architecture: Focused store slices composed into a complete store
 * with selective persistence and development utilities.
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { LayoutState, DEFAULT_LAYOUT_STATE } from "../../types/layout";

// ============================================================================
// Re-export Individual Slices
// ============================================================================

export * from "./sidebar-store";
export * from "./preferences-store";
export * from "./navigation-store";
export * from "./composition";

// ============================================================================
// Complete Layout Store Implementation
// ============================================================================

/**
 * Combined layout store interface for the complete store
 */
interface CompleteLayoutStore {
  // Sidebar state
  isOpen: boolean;
  variant: "sidebar" | "inset";
  collapsible: "icon" | "none";

  // Preferences state
  theme: "light" | "dark" | "system";
  sidebarWidth: number;
  persistCollapsed: boolean;

  // Navigation state
  activeSection: string;
  breadcrumb: Array<{
    label: string;
    href?: string;
    icon?: React.ReactNode;
    isCurrent?: boolean;
  }>;

  // Creative tool state
  activeTool: string;
  propertiesPanelOpen: boolean;

  // Panel widths
  scenePanelWidth: number;
  propertiesPanelWidth: number;

  // Status bar
  statusBarVisible: boolean;

  // Mouse coordinates for status (include hex axial coords when applicable)
  mousePosition: { x: number; y: number; hex: { q: number; r: number } | null };

  // Selection state
  selectionCount: number;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarVariant: (variant: "sidebar" | "inset") => void;
  setSidebarCollapsible: (collapsible: "icon" | "none") => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setSidebarWidth: (width: number) => void;
  setPersistCollapsed: (persist: boolean) => void;
  setActiveSection: (section: string) => void;
  setBreadcrumb: (
    items: Array<{
      label: string;
      href?: string;
      icon?: React.ReactNode;
      isCurrent?: boolean;
    }>,
  ) => void;
  addBreadcrumb: (item: {
    label: string;
    href?: string;
    icon?: React.ReactNode;
    isCurrent?: boolean;
  }) => void;
  clearBreadcrumb: () => void;
  setActiveTool: (tool: string) => void;
  togglePropertiesPanel: () => void;
  setPropertiesPanelOpen: (open: boolean) => void;

  // Panel sizing actions
  setScenePanelWidth: (width: number) => void;
  setPropertiesPanelWidth: (width: number) => void;

  // Status bar actions
  toggleStatusBar: () => void;
  setMousePosition: (
    x: number,
    y: number,
    hex?: { q: number; r: number } | null,
  ) => void;
  setSelectionCount: (count: number) => void;

  resetLayout: () => void;
  loadPreferences: () => void;
}

/**
 * Main layout store implementation combining all focused slices
 *
 * Uses immer middleware for immutable updates, devtools for debugging,
 * and selective persistence to avoid storing ephemeral state.
 */
export const useLayoutStore = create<CompleteLayoutStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer<CompleteLayoutStore>((set, get) => ({
          // ================================================================
          // Initial State from Defaults
          // ================================================================
          ...DEFAULT_LAYOUT_STATE.sidebar,
          ...DEFAULT_LAYOUT_STATE.preferences,
          ...DEFAULT_LAYOUT_STATE.navigation,

          // Creative tool defaults
          activeTool: "select",
          propertiesPanelOpen: true,

          // Panel width defaults
          scenePanelWidth: 280,
          propertiesPanelWidth: 320,

          // Status bar defaults
          statusBarVisible: true,

          // Mouse position defaults
          mousePosition: { x: 0, y: 0, hex: null },

          // Selection defaults
          selectionCount: 0,

          // ================================================================
          // Sidebar Actions
          // ================================================================
          toggleSidebar: () => {
            set((state) => {
              state.isOpen = !state.isOpen;
            });
          },

          setSidebarOpen: (open: boolean) => {
            set((state) => {
              state.isOpen = open;
            });
          },

          setSidebarVariant: (variant) => {
            set((state) => {
              state.variant = variant;
            });
          },

          setSidebarCollapsible: (collapsible) => {
            set((state) => {
              state.collapsible = collapsible;
            });
          },

          // ================================================================
          // Preferences Actions
          // ================================================================
          setTheme: (theme) => {
            set((state) => {
              state.theme = theme;
            });
          },

          setSidebarWidth: (width: number) => {
            set((state) => {
              state.sidebarWidth = width;
            });
          },

          setPersistCollapsed: (persist: boolean) => {
            set((state) => {
              state.persistCollapsed = persist;
            });
          },

          // ================================================================
          // Navigation Actions
          // ================================================================
          setActiveSection: (section: string) => {
            set((state) => {
              state.activeSection = section;
            });
          },

          setBreadcrumb: (items) => {
            set((state) => {
              state.breadcrumb = items;
            });
          },

          addBreadcrumb: (item) => {
            set((state) => {
              // Mark previous items as not current
              state.breadcrumb.forEach((breadcrumb) => {
                breadcrumb.isCurrent = false;
              });

              // Add new item as current
              state.breadcrumb.push({
                ...item,
                isCurrent: true,
              });
            });
          },

          clearBreadcrumb: () => {
            set((state) => {
              state.breadcrumb = [];
            });
          },

          // ================================================================
          // Creative Tool Actions
          // ================================================================
          setActiveTool: (tool: string) => {
            set((state) => {
              state.activeTool = tool;
            });
          },

          togglePropertiesPanel: () => {
            set((state) => {
              state.propertiesPanelOpen = !state.propertiesPanelOpen;
            });
          },

          setPropertiesPanelOpen: (open: boolean) => {
            set((state) => {
              state.propertiesPanelOpen = open;
            });
          },

          // ================================================================
          // Additional Composed Actions
          // ================================================================

          /**
           * Reset layout to default state
           * Preserves user preferences but resets UI state
           */
          resetLayout: () => {
            set((state) => {
              // Reset sidebar and navigation, preserve preferences
              state.isOpen = DEFAULT_LAYOUT_STATE.sidebar.isOpen;
              state.variant = DEFAULT_LAYOUT_STATE.sidebar.variant;
              state.collapsible = DEFAULT_LAYOUT_STATE.sidebar.collapsible;
              state.activeSection =
                DEFAULT_LAYOUT_STATE.navigation.activeSection;
              state.breadcrumb = DEFAULT_LAYOUT_STATE.navigation.breadcrumb;
              // Keep existing preferences
            });
          },

          // ================================================================
          // Panel Sizing Actions
          // ================================================================
          setScenePanelWidth: (width: number) => {
            set((state) => {
              state.scenePanelWidth = Math.max(200, Math.min(400, width));
            });
          },

          setPropertiesPanelWidth: (width: number) => {
            set((state) => {
              state.propertiesPanelWidth = Math.max(280, Math.min(480, width));
            });
          },

          // ================================================================
          // Status Bar Actions
          // ================================================================
          toggleStatusBar: () => {
            set((state) => {
              state.statusBarVisible = !state.statusBarVisible;
            });
          },

          setMousePosition: (
            x: number,
            y: number,
            hex: { q: number; r: number } | null,
          ) => {
            set((state) => {
              state.mousePosition = { x, y, hex };
            });
          },

          setSelectionCount: (count: number) => {
            set((state) => {
              state.selectionCount = Math.max(0, count);
            });
          },

          /**
           * Load saved preferences from persistence layer
           * Triggers re-hydration of persisted state
           */
          loadPreferences: () => {
            // This is handled automatically by the persist middleware
            // This method is provided for explicit preference refresh if needed
            const currentState = get();
            console.log("Current layout preferences:", {
              theme: currentState.theme,
              sidebarWidth: currentState.sidebarWidth,
              persistCollapsed: currentState.persistCollapsed,
              scenePanelWidth: currentState.scenePanelWidth,
              propertiesPanelWidth: currentState.propertiesPanelWidth,
              statusBarVisible: currentState.statusBarVisible,
            });
          },
        })),
      ),
      {
        // ================================================================
        // Persistence Configuration
        // ================================================================
        name: "map-territory-layout",

        /**
         * Selective persistence - only persist user preferences and
         * sidebar state (if persistCollapsed is true)
         */
        partialize: (state): Partial<LayoutState> => {
          return {
            preferences: {
              theme: state.theme,
              sidebarWidth: state.sidebarWidth,
              persistCollapsed: state.persistCollapsed,
            },
            sidebar: {
              // Only persist sidebar open state if user wants it persisted
              isOpen: state.persistCollapsed
                ? state.isOpen
                : DEFAULT_LAYOUT_STATE.sidebar.isOpen,
              variant: state.variant,
              collapsible: state.collapsible,
            },
            panels: {
              scenePanelWidth: state.scenePanelWidth,
              propertiesPanelWidth: state.propertiesPanelWidth,
              statusBarVisible: state.statusBarVisible,
            },
            // Don't persist navigation state or ephemeral status - they should reset on page load
          };
        },

        /**
         * Migration handling for future schema changes
         */
        version: 1,
        migrate: (persistedState: unknown) => {
          // Future migration logic will go here
          return persistedState as LayoutState;
        },

        /**
         * Skip hydration on SSR to prevent hydration mismatches
         */
        skipHydration: typeof window === "undefined",
      },
    ),
    {
      // Devtools configuration
      name: "LayoutStore",
      enabled: process.env.NODE_ENV === "development",
    },
  ),
);

// ============================================================================
// Direct Store Access (Recommended)
// ============================================================================

// Use useLayoutStore((state) => state.propertyName) directly in components
// This provides better TypeScript support and avoids selector complications

// ============================================================================
// Store Utilities (Backwards Compatibility)
// ============================================================================

/**
 * Get current layout state (non-reactive)
 * Useful for one-time state access outside React components
 */
export const getLayoutState = (): LayoutState => {
  const store = useLayoutStore.getState();
  return {
    sidebar: {
      isOpen: store.isOpen,
      variant: store.variant,
      collapsible: store.collapsible,
    },
    preferences: {
      theme: store.theme,
      sidebarWidth: store.sidebarWidth,
      persistCollapsed: store.persistCollapsed,
    },
    navigation: {
      activeSection: store.activeSection,
      breadcrumb: store.breadcrumb,
    },
    tools: {
      activeTool: store.activeTool,
      propertiesPanelOpen: store.propertiesPanelOpen,
    },
    panels: {
      scenePanelWidth: store.scenePanelWidth,
      propertiesPanelWidth: store.propertiesPanelWidth,
      statusBarVisible: store.statusBarVisible,
    },
    status: {
      mousePosition: store.mousePosition,
      selectionCount: store.selectionCount,
    },
  };
};

/**
 * Subscribe to specific layout state changes
 * Useful for external integrations or logging
 */
export const subscribeToLayoutChanges = <T>(
  selector: (state: LayoutState) => T,
  callback: (value: T, previousValue: T) => void,
) => {
  return useLayoutStore.subscribe(
    (state) =>
      selector({
        sidebar: {
          isOpen: state.isOpen,
          variant: state.variant,
          collapsible: state.collapsible,
        },
        preferences: {
          theme: state.theme,
          sidebarWidth: state.sidebarWidth,
          persistCollapsed: state.persistCollapsed,
        },
        navigation: {
          activeSection: state.activeSection,
          breadcrumb: state.breadcrumb,
        },
      }),
    callback,
  );
};

/**
 * Reset layout store to initial state
 * Useful for testing or admin actions
 */
export const resetLayoutStore = () => {
  useLayoutStore.setState({
    ...DEFAULT_LAYOUT_STATE.sidebar,
    ...DEFAULT_LAYOUT_STATE.preferences,
    ...DEFAULT_LAYOUT_STATE.navigation,
  });
};

/**
 * Development-only function to log current store state
 * @param label - Optional label for the log
 */
export const debugLayoutState = (label = "Layout State") => {
  if (process.env.NODE_ENV === "development") {
    console.group(label);
    console.log("Current state:", getLayoutState());
    console.groupEnd();
  }
};

// ============================================================================
// Public Selector Hooks (Official Surface)
// ============================================================================

/**
 * Public Store API Surface
 *
 * Philosophy
 * - useLayoutStore is the core primitive. Prefer selecting the minimal slice
 *   needed to avoid unnecessary component re-renders.
 * - These helper hooks provide ergonomic, narrowly-scoped selectors for
 *   common UI concerns (sidebar, preferences, navigation) while keeping
 *   boundaries clear and predictable.
 * - Keep selections stable and avoid returning new object identities unless
 *   necessary; these helpers return small, flat objects to reduce churn.
 *
 * Usage
 *   const { isOpen } = useSidebarState()
 *   const { setTheme } = useThemeActions()
 *   const { breadcrumb } = useNavigationState()
 */

/**
 * useSidebarState - Reactive selector for sidebar UI state
 */
export const useSidebarState = () =>
  useLayoutStore((state) => ({
    isOpen: state.isOpen,
    variant: state.variant,
    collapsible: state.collapsible,
  }));

/**
 * useLayoutPreferences - Reactive selector for user preferences
 */
export const useLayoutPreferences = () =>
  useLayoutStore((state) => ({
    theme: state.theme,
    sidebarWidth: state.sidebarWidth,
    persistCollapsed: state.persistCollapsed,
  }));

/**
 * useNavigationState - Reactive selector for navigation state
 */
export const useNavigationState = () =>
  useLayoutStore((state) => ({
    activeSection: state.activeSection,
    breadcrumb: state.breadcrumb,
  }));

/**
 * useSidebarActions - Sidebar action selectors
 */
export const useSidebarActions = () => {
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen);
  const setSidebarVariant = useLayoutStore((s) => s.setSidebarVariant);
  const setSidebarCollapsible = useLayoutStore((s) => s.setSidebarCollapsible);
  return {
    toggleSidebar,
    setSidebarOpen,
    setSidebarVariant,
    setSidebarCollapsible,
  };
};

/**
 * useThemeActions - Preferences action selectors
 */
export const useThemeActions = () => {
  const setTheme = useLayoutStore((s) => s.setTheme);
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const setPersistCollapsed = useLayoutStore((s) => s.setPersistCollapsed);
  return { setTheme, setSidebarWidth, setPersistCollapsed };
};

/**
 * useNavigationActions - Navigation action selectors
 */
export const useNavigationActions = () => {
  const setActiveSection = useLayoutStore((s) => s.setActiveSection);
  const setBreadcrumb = useLayoutStore((s) => s.setBreadcrumb);
  const addBreadcrumb = useLayoutStore((s) => s.addBreadcrumb);
  const clearBreadcrumb = useLayoutStore((s) => s.clearBreadcrumb);
  return { setActiveSection, setBreadcrumb, addBreadcrumb, clearBreadcrumb };
};

/**
 * useToolState - Creative tool state selectors
 */
export const useToolState = () =>
  useLayoutStore((state) => ({
    activeTool: state.activeTool,
    propertiesPanelOpen: state.propertiesPanelOpen,
  }));

/**
 * useToolActions - Creative tool action selectors
 */
export const useToolActions = () => {
  const setActiveTool = useLayoutStore((s) => s.setActiveTool);
  const togglePropertiesPanel = useLayoutStore((s) => s.togglePropertiesPanel);
  const setPropertiesPanelOpen = useLayoutStore(
    (s) => s.setPropertiesPanelOpen,
  );
  return { setActiveTool, togglePropertiesPanel, setPropertiesPanelOpen };
};

/**
 * usePanelState - Panel sizing and status state selectors
 */
export const usePanelState = () =>
  useLayoutStore((state) => ({
    scenePanelWidth: state.scenePanelWidth,
    propertiesPanelWidth: state.propertiesPanelWidth,
    statusBarVisible: state.statusBarVisible,
  }));

/**
 * usePanelActions - Panel sizing action selectors
 */
export const usePanelActions = () => {
  const setScenePanelWidth = useLayoutStore((s) => s.setScenePanelWidth);
  const setPropertiesPanelWidth = useLayoutStore(
    (s) => s.setPropertiesPanelWidth,
  );
  const toggleStatusBar = useLayoutStore((s) => s.toggleStatusBar);
  return { setScenePanelWidth, setPropertiesPanelWidth, toggleStatusBar };
};

/**
 * useStatusState - Status information state selectors
 */
export const useStatusState = () =>
  useLayoutStore((state) => ({
    mousePosition: state.mousePosition,
    selectionCount: state.selectionCount,
  }));

/**
 * useStatusActions - Status update action selectors
 */
export const useStatusActions = () => {
  const setMousePosition = useLayoutStore((s) => s.setMousePosition);
  const setSelectionCount = useLayoutStore((s) => s.setSelectionCount);
  return { setMousePosition, setSelectionCount };
};
