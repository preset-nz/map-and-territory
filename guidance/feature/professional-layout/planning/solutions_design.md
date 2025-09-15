# Professional Layout System - Technical Design

## Overview

The Professional Layout System provides a desktop-focused, professional-grade application layout for Map&Territory using shadcn/ui components and Zustand state management. This system creates a foundation for the hexmap editor's interface, balancing the need for a clean, professional editing environment with the gritty aesthetic of the generated maps.

**Integration Approach**: Replace the default Next.js layout with a comprehensive layout system that provides collapsible sidebar navigation, header, and dedicated canvas area while maintaining the existing shadcn/ui component library and Tailwind CSS styling approach. The architecture is designed for desktop usage with store modularity to support future scene management and selection state integration.

## Architecture

### Core Components Architecture

```typescript
// Layout component hierarchy
AppLayout
├── AuthProvider (NoOpAuthProvider initially)
├── LayoutProvider (Zustand context bridge)
├── AppHeader
├── SidebarProvider (shadcn/ui)
│   ├── AppSidebar
│   │   ├── SidebarHeader
│   │   ├── SidebarContent
│   │   │   ├── NavigationSection
│   │   │   ├── ToolPaletteSection
│   │   │   └── LayerManagementSection
│   │   └── SidebarFooter
│   └── SidebarTrigger
└── MainContent
    ├── ContentHeader (breadcrumbs, actions)
    └── ContentArea (canvas, property panels)
```

### Integration with Existing System

- **Next.js App Router**: Integrates with existing `src/app/layout.tsx` as a client component wrapper
- **shadcn/ui Components**: Leverages existing component library with Sidebar, Button, Card, Badge, Separator
- **Tailwind CSS**: Uses established design tokens and desktop-optimized utilities
- **TypeScript**: Full type safety with existing utility types and patterns
- **Future Store Integration**: Layout store designed for composition with scene and selection stores

## Components

### 1. Auth Provider (`NoOpAuthProvider`)

**Responsibility**: Authentication context that can be easily replaced with real auth later

```typescript
interface AuthContextValue {
  user: null;
  isAuthenticated: false;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// No-op implementation that provides auth interface without functionality
const NoOpAuthProvider: React.FC<{ children: React.ReactNode }>;
```

### 2. Layout Provider (`LayoutProvider`)

**Responsibility**: Bridge between Zustand store and React components for layout state

```typescript
interface LayoutProviderProps {
  children: React.ReactNode;
  defaultSidebarOpen?: boolean;
  persistKey?: string;
}

// Wraps app content and provides layout context
const LayoutProvider: React.FC<LayoutProviderProps>;
```

### 3. App Layout (`AppLayout`)

**Responsibility**: Root layout orchestration and desktop-focused behavior

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Main layout container with CSS Grid for desktop
const AppLayout: React.FC<AppLayoutProps>;
```

### 4. App Header (`AppHeader`)

**Responsibility**: Top-level navigation, branding, and global actions

```typescript
interface AppHeaderProps {
  title?: string;
  actions?: React.ReactNode;
  className?: string;
}

// Fixed header with branding and global controls
const AppHeader: React.FC<AppHeaderProps>;
```

### 5. App Sidebar (`AppSidebar`)

**Responsibility**: Primary navigation and tool organization

```typescript
interface AppSidebarProps {
  className?: string;
  variant?: "sidebar" | "inset";
  collapsible?: "icon" | "none";
}

// Extends shadcn/ui Sidebar with app-specific content sections
const AppSidebar: React.FC<AppSidebarProps>;
```

### 6. Content Area (`MainContent`)

**Responsibility**: Primary work area with contextual headers

```typescript
interface MainContentProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

// Desktop-optimized content area with optional contextual header
const MainContent: React.FC<MainContentProps>;
```

## Data Models

### Layout State Interface

```typescript
interface LayoutState {
  // Sidebar state
  sidebar: {
    isOpen: boolean;
    variant: "sidebar" | "inset";
    collapsible: "icon" | "none";
  };

  // Layout preferences
  preferences: {
    theme: "light" | "dark" | "system";
    sidebarWidth: number;
    persistCollapsed: boolean;
  };

  // Navigation state
  navigation: {
    activeSection: string;
    breadcrumb: BreadcrumbItem[];
  };
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}
```

### Store Actions Interface

```typescript
interface LayoutActions {
  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarVariant: (variant: LayoutState["sidebar"]["variant"]) => void;

  // Preference actions
  setTheme: (theme: LayoutState["preferences"]["theme"]) => void;
  setSidebarWidth: (width: number) => void;
  setPersistCollapsed: (persist: boolean) => void;

  // Navigation actions
  setActiveSection: (section: string) => void;
  setBreadcrumb: (items: BreadcrumbItem[]) => void;

  // Utility actions
  resetLayout: () => void;
  loadPreferences: () => void;
}
```

## Zustand Store Structure

### Modular Store Architecture for Future Extensibility

```typescript
// stores/layout-store.ts - Layout-specific store slice
interface LayoutStore extends LayoutState, LayoutActions {}

export const useLayoutStore = create<LayoutStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sidebar: {
          isOpen: true,
          variant: "sidebar",
          collapsible: "icon",
        },
        preferences: {
          theme: "system",
          sidebarWidth: 280,
          persistCollapsed: true,
        },
        navigation: {
          activeSection: "maps",
          breadcrumb: [],
        },

        // Actions implementation
        toggleSidebar: () =>
          set((state) => ({
            sidebar: { ...state.sidebar, isOpen: !state.sidebar.isOpen },
          })),

        // ... other actions
      }),
      {
        name: "map-territory-layout",
        partialize: (state) => ({
          preferences: state.preferences,
          sidebar: {
            isOpen: state.preferences.persistCollapsed
              ? state.sidebar.isOpen
              : true,
            variant: state.sidebar.variant,
            collapsible: state.sidebar.collapsible,
          },
        }),
      },
    ),
    { name: "LayoutStore" },
  ),
);
```

### Store Composition Pattern for Future Integration

```typescript
// Future store integration pattern
// stores/scene-store.ts (future)
interface SceneStore {
  hexmapData: HexmapData;
  layers: LayerData[];
  activeLayer: string;
  // scene management actions
}

// stores/selection-store.ts (future)
interface SelectionStore {
  selectedHexes: HexCoordinate[];
  activeTool: Tool;
  selectionMode: SelectionMode;
  // selection management actions
}

// Combined store hook for complex operations
export const useEditorStores = () => ({
  layout: useLayoutStore(),
  // scene: useSceneStore(), (future)
  // selection: useSelectionStore(), (future)
});
```

## Error Handling

### Layout Error Boundaries

- **Layout Error Boundary**: Catches layout-specific errors and provides fallback UI
- **Sidebar Error Recovery**: Graceful degradation when sidebar fails to render
- **State Persistence Errors**: Handle localStorage/persistence failures gracefully
- **Auth Provider Errors**: NoOpAuthProvider handles all auth calls gracefully

### Error Scenarios

1. **Zustand Store Initialization Failure**: Fallback to component-level state
2. **Persistence Layer Failure**: Continue with session-only state management
3. **Component Rendering Failure**: Render minimal fallback layout
4. **Auth Context Missing**: Provide default unauthenticated state

## Design Decisions

### Desktop-Only Focus

**Rationale**: Map&Territory is a professional desktop application. Removing mobile considerations simplifies the layout logic, improves performance, and allows for more sophisticated desktop-optimized UI patterns.

### State Management: Modular Zustand Architecture

**Rationale**: Designing the layout store as a modular slice anticipates future scene and selection management stores. This approach enables clean separation of concerns while maintaining store composition patterns for complex editor operations.

### NoOpAuthProvider Pattern

**Rationale**: Provides a complete auth interface without implementation, allowing the application to be developed with auth-aware components while deferring actual authentication decisions. Easy to replace with real auth providers later.

### Sidebar Implementation: shadcn/ui with Desktop Optimizations

**Rationale**: shadcn/ui Sidebar provides accessibility and keyboard navigation. Desktop-only focus allows for more sophisticated sidebar behaviors like icon-only collapse without mobile complexity.

### Store Composition over Monolithic State

**Rationale**: Separate stores for layout, future scene management, and selection enable independent development, testing, and maintenance while providing composition hooks for complex operations.

## Testing Strategy

### Unit Tests

- **File**: `tests/unit/components/layout/test_app-layout.test.tsx`
  - Layout component rendering with different props
  - Desktop-focused responsive behavior
  - Error boundary functionality

- **File**: `tests/unit/stores/test_layout-store.test.ts`
  - Store actions and state updates
  - Persistence layer integration
  - State derivation logic

- **File**: `tests/unit/auth/test_noop-auth-provider.test.tsx`
  - NoOpAuthProvider interface compliance
  - Auth context availability
  - Graceful auth call handling

### Integration Tests

- **File**: `tests/integration/layout/test_layout-system.test.tsx`
  - Full layout system integration with Next.js
  - Sidebar state synchronization with UI
  - Theme switching and persistence
  - Auth provider integration with layout

- **File**: `tests/integration/stores/test_store-composition.test.ts`
  - Layout store integration patterns
  - Future store composition readiness
  - Cross-store state consistency

### Accessibility Tests

- **File**: `tests/accessibility/test_layout-a11y.test.tsx`
  - Keyboard navigation through sidebar
  - Screen reader compatibility
  - Focus management during sidebar toggle
  - WCAG compliance validation

### Performance Tests

- **File**: `tests/performance/test_layout-performance.test.ts`
  - Layout rendering performance on desktop
  - State update performance with large datasets
  - Memory usage during frequent sidebar toggles
  - Store composition performance impact

**Test Fixtures**: Utilize existing patterns from `tests/fixtures` for layout mock data, auth mocks, and component props.

## Success Criteria

The layout system is successful when:

- **Professional Desktop Interface**: Provides clean, efficient editing environment optimized for desktop usage
- **State Persistence**: User preferences and layout state persist across sessions
- **Store Modularity**: Layout store integrates cleanly with future scene and selection stores
- **Auth Integration Ready**: NoOpAuthProvider provides seamless path to real authentication
- **Accessibility Compliance**: Full keyboard navigation and screen reader support
- **Performance**: Layout transitions are smooth with no perceptible lag on desktop
- **Type Safety**: Full TypeScript coverage with proper interface contracts
- **Extensibility**: Architecture supports future editor features without major refactoring

This layout system establishes the foundation for the Map&Territory professional desktop editing interface while providing the modular architecture needed for future hexmap editor features, scene management, and authentication integration.
