# Creative Layout Cleanup - Phase 2

**Status:** ✅ In QA (Phase 2 implementation integrated)  
**Priority:** High  
**Impact:** Layout UX & Functionality  
**Date:** 2025-09-03

## Executive Summary

The creative layout has several critical issues that impact the user experience for the hexmap editor. This plan addresses 9 specific layout problems to transform the current enterprise-style interface into a streamlined creative tool interface.

## Issues Analysis

### 🔴 Critical Issues

1. **Header Width Constraint** - Header doesn't span full viewport width due to container class
2. **Toolbar Width Constraint** - Toolbar lacks full-width styling
3. **Enterprise Navigation** - Header contains complex dropdown navigation unsuitable for creative tools
4. **Panel Overlap** - Scene panel extends to viewport top, overlapping with toolbar area

### 🟡 Medium Priority Issues

5. **Properties Panel Toggle** - Collapse button exists but not connected to store
6. **Partial Scene Collapse** - Scene panel collapse only shows icons, not fully hidden
7. **Missing Status Bar** - No status/info bar at bottom of interface

### 🟠 Enhancement Issues

8. **Properties Panel Resize** - Cannot be resized by user
9. **Scene Panel Resize** - Cannot be resized by user

## Current Architecture Analysis

### Layout Hierarchy

```
AppLayout (SidebarProvider)
├── AppSidebar (Scene Panel)
├── SidebarInset
    ├── AppHeader (Enterprise style)
    ├── AppToolbar (Creative tools)
    └── Content + PropertiesPanel
```

### Problem Areas

#### Header Component (`app-header.tsx`)

- Uses `container` class limiting width
- Contains complex NavigationMenu with dropdowns
- Designed for enterprise/business applications
- Not suitable for creative tool interface

#### Toolbar Component (`app-toolbar.tsx`)

- Uses local state instead of layout store
- Toggle buttons don't actually control panels
- Missing full-width constraints

#### Layout Structure (`app-layout.tsx`)

- Scene panel positioned from viewport top
- No status bar allocation
- Panels not resizable

#### Store Integration

- Panel visibility states exist but not connected
- No panel width persistence
- Missing status bar state

## Implementation Plan

### Phase 1: Structure & Width Fixes

#### 1.1 Header Simplification (`app-header.tsx`)

**Goal:** Transform from enterprise to creative interface

**Changes:**

- Remove `container` class → `w-full`
- Replace NavigationMenu with simple app title
- Keep only essential user menu
- Streamline to single row layout
- Remove breadcrumb navigation

**Before:**

```tsx
<div className="container flex h-14 items-center">
  <NavigationMenu>...</NavigationMenu>
  <Breadcrumb>...</Breadcrumb>
  <UserDropdown />
</div>
```

**After:**

```tsx
<div className="w-full flex h-12 items-center px-4">
  <div className="flex items-center gap-3">
    <h1>Map and Territory</h1>
  </div>
  <div className="flex-1" />
  <UserDropdown />
</div>
```

#### 1.2 Toolbar Full Width (`app-toolbar.tsx`)

**Goal:** Ensure toolbar spans complete viewport width

**Changes:**

- Remove any width constraints
- Ensure proper flex layout
- Connect to layout store properly

**Before:**

```tsx
<div className="border-b bg-background">
  <div className="flex items-center gap-2 px-3 py-2">
```

**After:**

```tsx
<div className="w-full border-b bg-background">
  <div className="flex items-center gap-2 px-3 py-2">
```

#### 1.3 Layout Structure Fix (`app-layout.tsx`)

**Goal:** Proper vertical stacking without overlaps

**Changes:**

- Ensure scene panel starts below toolbar
- Add status bar allocation
- Implement proper flex layout

### Phase 2: Panel Functionality

#### 2.1 Properties Panel Integration (`properties-panel-simple.tsx`)

**Goal:** Connect collapse functionality to store

**Implementation:**

- Import `useLayoutStore` with `propertiesPanelOpen` state
- Add conditional rendering based on state
- Implement smooth slide animations
- Connect toolbar toggle button

**Code Structure:**

```tsx
const propertiesPanelOpen = useLayoutStore((state) => state.propertiesPanelOpen);

return (
  <div className={`w-80 border-l bg-background transition-transform duration-200 ${
    propertiesPanelOpen ? 'translate-x-0' : 'translate-x-full'
  }`}>
```

#### 2.2 Scene Panel Full Collapse (`app-sidebar.tsx`)

**Goal:** Complete hide/show functionality

**Current Issue:** shadcn Sidebar only collapses to icon view
**Solution:** Override with custom visibility state

**Implementation:**

- Use layout store `isOpen` state for complete visibility
- When collapsed, render `null` or `hidden` class
- Ensure toolbar toggle works properly

#### 2.3 Toolbar Store Connection (`app-toolbar.tsx`)

**Goal:** Replace local state with layout store

**Changes:**

- Remove `useState` for panel states
- Connect to `useLayoutStore` selectors
- Ensure buttons trigger store actions

**Before:**

```tsx
const [activeTool, setActiveTool] = React.useState("select");
const [propertiesPanelOpen, setPropertiesPanelOpen] = React.useState(true);
```

**After:**

```tsx
const { activeTool, propertiesPanelOpen } = useToolState();
const { setActiveTool, togglePropertiesPanel } = useToolActions();
```

### Phase 3: Resizable Panels

#### 3.1 Dependencies

**Install:** `react-resizable-panels` or custom resize implementation

```bash
pnpm add react-resizable-panels
```

#### 3.2 Scene Panel Resize

**Goal:** User-resizable scene panel width

**Features:**

- Resize handle on right edge
- Min width: 200px, Max width: 400px
- Store width in layout store
- Persist across sessions

**Implementation:**

```tsx
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

<PanelGroup direction="horizontal">
  <Panel defaultSize={20} minSize={15} maxSize={30}>
    <AppSidebar />
  </Panel>
  <PanelResizeHandle className="w-1 bg-border hover:bg-accent" />
  <Panel minSize={50}>{/* Main content */}</Panel>
</PanelGroup>;
```

#### 3.3 Properties Panel Resize

**Goal:** User-resizable properties panel width

**Features:**

- Resize handle on left edge
- Min width: 280px, Max width: 480px
- Store width in layout store
- Collapse to 0 width when hidden

### Phase 4: Status Bar

#### 4.1 StatusBar Component (`status-bar.tsx`)

**Goal:** Information-rich footer component

**Features:**

- Current active tool display
- Zoom level indicator
- Mouse coordinates
- Document save status
- Selection info

**Layout:**

```tsx
<div className="h-6 border-t bg-muted/30 text-xs flex items-center px-3 gap-4">
  <div>Tool: {activeTool}</div>
  <Separator orientation="vertical" />
  <div>Zoom: {zoomLevel}%</div>
  <Separator orientation="vertical" />
  <div>
    X: {mouseX}, Y: {mouseY}
  </div>
  <div className="flex-1" />
  <div>{selectionCount} selected</div>
</div>
```

#### 4.2 Status Bar Integration

**Location:** Bottom of `AppLayout`
**Height:** Fixed 24px
**Position:** Below main content area

## Store Enhancements

### Layout Store Updates (`stores/layout/index.ts`)

#### New State Properties

```typescript
interface LayoutState {
  // Existing...

  // Panel widths
  scenePanelWidth: number;
  propertiesPanelWidth: number;

  // Status bar
  statusBarVisible: boolean;

  // Mouse coordinates for status
  mousePosition: { x: number; y: number };

  // Selection state
  selectionCount: number;
}
```

#### New Actions

```typescript
interface LayoutActions {
  // Panel sizing
  setScenePanelWidth: (width: number) => void;
  setPropertiesPanelWidth: (width: number) => void;

  // Status updates
  toggleStatusBar: () => void;
  setMousePosition: (x: number, y: number) => void;
  setSelectionCount: (count: number) => void;
}
```

## File Changes Summary

### Modified Files

1. **`src/components/layout/app-layout.tsx`**
   - Add resizable panel structure
   - Integrate status bar
   - Fix layout hierarchy

2. **`src/components/layout/app-header.tsx`**
   - Simplify to creative interface
   - Remove container width constraint
   - Remove enterprise navigation

3. **`src/components/layout/app-toolbar.tsx`**
   - Connect to layout store
   - Remove local state
   - Ensure full width

4. **`src/components/layout/app-sidebar.tsx`**
   - Implement full collapse
   - Add resize capability

5. **`src/components/layout/properties-panel-simple.tsx`**
   - Connect to store state
   - Add collapse animations
   - Integrate resize handle

6. **`src/stores/layout/index.ts`**
   - Add panel width states
   - Add status bar state
   - Add mouse position tracking

### New Files

1. **`src/components/layout/status-bar.tsx`**
   - Status information display
   - Tool and selection info
   - Performance indicators

2. **`src/hooks/use-resize-observer.tsx`**
   - Custom hook for resize detection
   - Panel dimension tracking

## Success Criteria

### Functional Requirements

- [ ] Header spans full viewport width
- [ ] Toolbar spans full viewport width
- [ ] Header uses simplified creative interface
- [ ] Scene panel starts below toolbar
- [ ] Properties panel collapse/expand works
- [ ] Scene panel fully hides when collapsed
- [ ] Both panels can be resized by user
- [ ] Panel widths persist across sessions
- [ ] Status bar displays at bottom with relevant info

### Visual Requirements

- [ ] Smooth animations for panel transitions
- [ ] Consistent spacing and alignment
- [ ] Professional resize handles
- [ ] Clear visual hierarchy

### Performance Requirements

- [ ] No layout shift during panel operations
- [ ] Smooth 60fps animations
- [ ] Responsive resize operations

## Risk Assessment

### Low Risk

- Header width fixes (CSS changes only)
- Toolbar connection (store integration)
- Status bar addition (new component)

### Medium Risk

- Panel collapse implementation (animation complexity)
- Store state management (state persistence)

### High Risk

- Resizable panels (complex interaction states)
- Layout restructuring (potential breaking changes)

## Testing Strategy

### Unit Tests

- Store actions and state updates
- Component prop handling
- Animation state management

### Integration Tests

- Panel resize interactions
- Store persistence
- Cross-panel communication

### Visual Tests

- Layout responsiveness
- Animation smoothness
- Component positioning

## Implementation Timeline

### Phase 1 (Day 1): Structure Fixes

- Header simplification
- Width constraints removal
- Basic layout structure

### Phase 2 (Day 2): Panel Functionality

- Store integration
- Collapse/expand functionality
- Toolbar connections

### Phase 3 (Day 3): Resizable Panels

- Dependencies installation
- Resize implementation
- State persistence

### Phase 4 (Day 4): Status Bar & Polish

- Status bar component
- Final integration
- Testing and refinement

## Dependencies

### New Packages

```json
{
  "react-resizable-panels": "^3.0.0"
}
```

### Existing Dependencies

- All shadcn/ui components (already installed)
- Zustand layout store (already implemented)
- Tailwind CSS (already configured)

## Rollback Plan

If issues arise during implementation:

1. **Header Issues**: Revert to container-based layout
2. **Panel Issues**: Disable resizing, use fixed widths
3. **Store Issues**: Use local state fallbacks
4. **Animation Issues**: Remove transitions, use instant show/hide

Each phase is designed to be independently reversible while maintaining functionality.

---

**Next Steps:** Begin implementation with Phase 1 - Structure & Width Fixes

## Implementation Status

The following items are implemented in code and wired to the layout store per the `guidance/process/nextjs_typescript_feature_implementation.md` process:

- [x] Header spans full viewport width and uses simplified creative interface (`src/components/layout/app-header.tsx`)
- [x] Toolbar spans full width and uses store for tool state and panel toggles (`src/components/layout/app-toolbar.tsx`)
- [x] Scene panel starts below header/toolbar; no overlap (`src/components/layout/app-layout.tsx`)
- [x] Properties panel collapse/expand connected to store (`src/components/layout/properties-panel-simple.tsx`)
- [x] Scene panel fully hides when collapsed (`src/components/layout/app-sidebar.tsx`)
- [x] Resizable panels using `react-resizable-panels` with width persistence (`src/components/layout/app-layout.tsx`, `src/stores/layout/index.ts`)
- [x] Status bar component integrated at bottom with tool, mouse, selection info (`src/components/layout/status-bar.tsx`)

Minor deltas to consider for polish (queued to subagents):

- [ ] Properties panel slide animation can switch to `translate-x` approach for smoother off-canvas feel
- [ ] Align panel min/max constraints to exact px from guidance (currently percentage-based in layout; store enforces px bounds)
- [ ] Add optional `use-resize-observer` hook if future panels need dynamic recalculation

## QA Notes

- Unit tests run, but Vitest currently picks up Playwright e2e test files under `src/test/e2e/`, causing a runner conflict. Recommend excluding e2e folder from Vitest in `vitest.config.ts` or moving e2e specs to a top-level `e2e/` directory used only by Playwright.

## Conformance with Next.js + TS Implementation Guide

- App Router layout composition in `src/app/layout.tsx` and Server Components for top-level routing are preserved.
- Performance-first implementation: route-level splitting via App Router, minimal client reactivity in layout components, and store selectors to limit re-renders.
- Accessibility and visual hierarchy considered across header, toolbar, panels, and status bar.
