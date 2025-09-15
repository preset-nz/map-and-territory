# Creative Layout System - Technical Design

## Overview

This document outlines the technical design for transforming Map&Territory's layout system from an enterprise-focused implementation to a creative tool interface optimized for TTRPG hexmap editing. The design replaces complex business navigation with creative tool patterns inspired by Photoshop/Affinity Designer.

**Integration Approach:** Complete replacement of existing enterprise layout with a three-zone creative workspace: collapsible scene sidebar (left), full-width header with horizontal toolbar, and context-sensitive properties panel (right).

## Architecture

### System Integration

The creative layout integrates with existing systems through:

- **shadcn/ui Components**: Leverages existing Button, Sheet, Sidebar, and Tooltip components
- **Zustand State Management**: Extends current store pattern with creative-specific state slices
- **Next.js 15 App Router**: Maintains existing route structure while replacing layout components
- **TypeScript Integration**: Full type safety across all layout interfaces

### Component Hierarchy

```
CreativeLayout (root)
├── AppHeader (full-width)
├── CreativeToolbar (horizontal, below header)
│   ├── ScenePanelToggle
│   ├── ToolSelector (Select, Paint, Draw, Erase)
│   └── PropertiesPanelToggle
├── WorkspaceArea (flexible)
│   ├── SceneViewPanel (collapsible left, 300px default)
│   ├── MapCanvas (central, dynamic width)
│   └── PropertiesPanel (collapsible right, 280px default)
```

### State Architecture

Three coordinated Zustand store slices manage layout state:

- **LayoutStore**: Panel visibility, workspace dimensions, responsive breakpoints
- **ToolStore**: Active tool selection, tool-specific configurations, cursor states
- **SelectionStore**: Current selection state, context-sensitive properties

## Components

### CreativeLayout (Root Component)

**Responsibility:** Orchestrates the entire creative workspace layout
**Key Features:**

- Responsive layout calculations based on panel states
- Keyboard shortcut management (F1, F2, 1-9, Esc)
- Canvas width adjustment as panels collapse/expand
- Accessibility landmarks and ARIA regions

### CreativeToolbar

**Responsibility:** Horizontal tool selection and panel toggles
**Key Features:**

- Icon-based tool selection with visual state feedback
- Panel toggle buttons with consistent positioning
- Tooltip integration for tool identification
- Keyboard navigation support

### SceneViewPanel

**Responsibility:** Hierarchical map structure navigation
**Key Features:**

- Tree view of map layers, objects, and effects
- Drag-and-drop reordering capabilities
- Expand/collapse states with smooth animations
- Multi-select support for batch operations

### PropertiesPanel

**Responsibility:** Context-sensitive property editing
**Key Features:**

- Dynamic content based on selection and active tool
- Real-time canvas updates on property changes
- Form validation with visual feedback
- Grouped property sections with clear hierarchy

### MapCanvas

**Responsibility:** Central editing surface
**Key Features:**

- Dynamic width calculation based on panel states
- Tool-specific cursor changes
- Zoom and pan integration
- Selection feedback visualization

## Data Models

### Layout State Interface

```typescript
interface LayoutState {
  scenePanelOpen: boolean;
  propertiesPanelOpen: boolean;
  scenePanelWidth: number;
  propertiesPanelWidth: number;
  canvasWidth: number;
  breakpoint: "desktop" | "compact" | "minimal";
}
```

### Tool State Interface

```typescript
interface ToolState {
  activeTool: "select" | "paint" | "draw" | "erase";
  toolConfig: Record<string, unknown>;
  cursor: string;
  shortcuts: Record<string, string>;
}
```

### Selection State Interface

```typescript
interface SelectionState {
  selectedItems: string[];
  selectionType: "none" | "single" | "multi";
  contextProperties: Record<string, unknown>;
  lastSelectedId: string | null;
}
```

## Error Handling

### Panel State Errors

- **Invalid Panel Widths**: Reset to default dimensions (300px/280px)
- **Panel Toggle Failures**: Provide visual feedback and retry mechanism
- **State Persistence Errors**: Fallback to default panel configuration

### Tool Selection Errors

- **Invalid Tool States**: Default to 'select' tool with user notification
- **Tool Configuration Errors**: Reset to tool defaults and log warning
- **Cursor Update Failures**: Fallback to default cursor with graceful degradation

### Canvas Resizing Errors

- **Dimension Calculation Failures**: Use viewport dimensions as fallback
- **Animation Errors**: Skip animations and apply final state immediately
- **Responsive Breakpoint Issues**: Use 'desktop' as safe default

### Graceful Degradation

- **Reduced Animation**: Disable panel animations on performance constraints
- **Simplified Interactions**: Remove drag-and-drop if touch interaction issues
- **Keyboard Fallbacks**: Ensure all functionality accessible via keyboard

## Testing Strategy

### Unit Tests

**File**: `tests/unit/components/creative-layout/test-creative-layout.test.ts`

- Panel state management validation
- Tool selection logic verification
- Responsive dimension calculations
- Keyboard shortcut handling

**File**: `tests/unit/stores/test-layout-store.test.ts`

- Store state transitions
- Action dispatching correctness
- State persistence behavior
- Error state handling

### Integration Tests

**File**: `tests/integration/creative-workspace/test-panel-interactions.test.ts`

- Panel collapse/expand workflows
- Canvas width adjustment validation
- Tool switching with properties panel updates
- Cross-component state synchronization

**File**: `tests/integration/creative-workspace/test-keyboard-navigation.test.ts`

- F1/F2 panel toggle functionality
- 1-9 tool selection shortcuts
- Tab navigation through interface
- Accessibility compliance validation

### End-to-End Tests

**File**: `tests/e2e/creative-workflow/test-creative-session.test.ts`

- Complete creative workflow from app entry to map export
- Panel usage patterns during extended creative sessions
- Tool switching performance during rapid interactions
- Responsive behavior across viewport sizes

### Visual Regression Tests

**File**: `tests/visual/creative-layout/test-layout-states.test.ts`

- Panel open/closed state visual consistency
- Tool selection visual feedback
- Responsive layout appearance
- Animation smoothness validation

## Design Decisions

### Three-Zone Layout Choice

**Decision:** Implement left scene panel + center canvas + right properties layout
**Rationale:** Matches creative tool conventions (Photoshop, Figma) while providing optimal workflow efficiency for hexmap editing
**Alternatives Considered:** Single sidebar with tabs, floating panels, modal properties
**Trade-offs:** Increased complexity vs. enhanced usability for target workflows

### Horizontal Toolbar Implementation

**Decision:** Place tool selection in horizontal bar below header rather than vertical sidebar
**Rationale:** Maximizes vertical canvas space while maintaining immediate tool access
**Alternatives Considered:** Vertical toolbar, floating tool palette, context menus
**Trade-offs:** Header space usage vs. improved canvas real estate

### Zustand Store Composition

**Decision:** Use composed store slices rather than single monolithic store
**Rationale:** Enables clear separation of concerns and improved testability
**Alternatives Considered:** Single layout store, React Context, Redux Toolkit
**Trade-offs:** Slight complexity increase vs. better modularity and performance

### Panel Animation Strategy

**Decision:** CSS transforms for panel transitions with 200ms duration
**Rationale:** Maintains 60fps performance while providing clear spatial feedback
**Alternatives Considered:** JavaScript animations, no animations, longer durations
**Trade-offs:** Bundle size impact vs. professional interaction quality

### Responsive Design Approach

**Decision:** Desktop-first with adaptive panel behavior rather than mobile-first
**Rationale:** Primary use case is desktop creative sessions; mobile is secondary
**Alternatives Considered:** Mobile-first responsive, separate mobile layout
**Trade-offs:** Mobile optimization vs. desktop experience prioritization

## Performance Considerations

### Canvas Resizing Optimization

- **Debounced Calculations**: Panel state changes debounced at 16ms for smooth 60fps
- **Transform-Based Animations**: Use `translateX` rather than width changes to avoid reflows
- **Viewport Caching**: Cache viewport dimensions to minimize DOM queries

### State Management Efficiency

- **Selective Re-renders**: Component subscriptions to specific store slices only
- **Memoized Selectors**: Complex calculations cached with Zustand middleware
- **Lazy Property Loading**: Properties panel content loaded on-demand per tool/selection

### Memory Management

- **Event Listener Cleanup**: Proper cleanup of keyboard shortcuts and resize listeners
- **Component Unmounting**: Clear tool state and panel preferences on navigation
- **Animation Frame Cleanup**: Cancel pending animations on component unmount

## Migration Strategy

### Phase 1: Foundation (Week 1)

1. **New Store Slices**: Implement LayoutStore, ToolStore, SelectionStore
2. **Base Components**: Create CreativeLayout, CreativeToolbar shells
3. **Integration Points**: Replace AppLayout usage in main app entry point

### Phase 2: Panel System (Week 2)

1. **SceneViewPanel**: Transform current sidebar content to scene hierarchy
2. **PropertiesPanel**: Implement context-sensitive property editing
3. **Panel Animations**: Add smooth collapse/expand transitions

### Phase 3: Tool Integration (Week 3)

1. **Tool Selection**: Implement creative tool switching logic
2. **Canvas Integration**: Connect tool states to canvas interactions
3. **Keyboard Shortcuts**: Add F1/F2/1-9 shortcut handling

### Phase 4: Polish & Testing (Week 4)

1. **Responsive Behavior**: Implement adaptive panel sizing
2. **Error Handling**: Add comprehensive error boundaries
3. **Accessibility**: Complete WCAG 2.1 AA compliance
4. **Performance Optimization**: Implement debouncing and memoization

### Migration Safety Measures

- **Feature Flagging**: CreativeLayout behind environment flag during development
- **Gradual Rollout**: A/B test with subset of users before full deployment
- **Rollback Plan**: Maintain AppLayout as fallback for critical failures
- **State Migration**: Preserve user preferences during layout transition

### Backward Compatibility

- **Route Preservation**: All existing routes continue to function
- **State Persistence**: Migrate existing sidebar preferences to new panel system
- **Component API**: Maintain existing prop interfaces where possible
- **User Settings**: Preserve accessibility and theme preferences

The design provides a comprehensive foundation for transforming Map&Territory into a professional creative tool while maintaining technical excellence and user experience quality.
