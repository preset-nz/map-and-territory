# Interaction Specifications: Creative Layout

## Core Interactions

### Interaction Pattern: Panel Toggle Controls

**Trigger:** User clicks scene view toggle (left) or properties panel toggle (right) in toolbar
**Behavior:**

1. Panel slides in/out with smooth 200ms ease animation
2. Main canvas area adjusts width to accommodate panel state
3. Toggle button visual state updates (pressed/unpressed)
4. Keyboard shortcut (F1 for scene, F2 for properties) provides alternative access

**Feedback:**

- Visual: Toggle button shows active/inactive state with subtle background change
- Animation: Smooth slide transition maintains spatial relationship
- Accessibility: Screen reader announces "Scene panel expanded/collapsed"

**States:**

- **Both Collapsed:** Full canvas width, minimal UI chrome
- **Scene Only:** Scene panel visible, properties collapsed
- **Properties Only:** Properties panel visible, scene collapsed
- **Both Expanded:** Split view with canvas in center (default for complex editing)

**Edge Cases:**

- Very narrow viewport: Panels stack vertically instead of side-by-side
- No selection: Properties panel shows canvas-level properties instead of hiding

### Interaction Pattern: Creative Tool Selection

**Trigger:** User clicks tool icon in central toolbar area or uses keyboard shortcut
**Behavior:**

1. Previous tool deactivates visually
2. Selected tool activates with visual emphasis
3. Cursor changes to reflect selected tool
4. Properties panel updates to show tool-specific options

**Feedback:**

- Visual: Selected tool has distinct active state (background, border, or highlight)
- Cursor: Changes to tool-appropriate cursor (crosshair, brush, pointer)
- Properties: Context-sensitive properties appear in right panel

**States:**

- **Select Tool:** Default pointer, shows object properties when selecting
- **Hex Paint:** Brush cursor, shows paint/terrain options
- **Draw Tool:** Crosshair cursor, shows line/stroke properties
- **Erase Tool:** Eraser cursor, shows erase options

**Edge Cases:**

- Rapid tool switching: Debounce property panel updates to avoid flicker
- Tool shortcuts during other interactions: Queue tool switch until interaction completes

## Component Behaviors

### Scene View Sidebar (Left Panel)

**Default State:**

- 300px width, showing current map's scene hierarchy
- Collapsible sections for layers, objects, and effects
- Tree structure with expand/collapse controls

**Hover State:**

- Individual items highlight on hover
- Expand/collapse arrows become more prominent
- Tooltip shows full item names if truncated

**Active State:**

- Selected items have distinct background color
- Multi-select with cmd/ctrl+click supported
- Drag and drop for reordering layers/objects

**Loading State:**

- Skeleton placeholders for scene tree structure
- Subtle loading animation for async operations

**Error State:**

- Error icon with tooltip explaining issue
- Retry action available for failed operations
- Graceful degradation if scene data unavailable

### Central Toolbar

**Default State:**

- Horizontal layout with logical tool grouping
- Icons use consistent visual weight and style
- Clear separation between toggle controls and creative tools

**Tool States:**

- **Inactive:** Base icon color with subtle hover brightening
- **Active:** Distinct background/border, brighter icon color
- **Disabled:** Reduced opacity, no hover interaction

**Hover State:**

- Subtle background change on tool hover
- Tooltip appears after 500ms delay with tool name and shortcut
- Visual feedback that tool is clickable

### Properties Panel (Right Panel)

**Default State:**

- 280px width, context-sensitive content
- Organized sections with clear visual hierarchy
- Form controls follow design system patterns

**Context States:**

- **No Selection:** Shows canvas/document properties
- **Single Selection:** Shows properties for selected object
- **Multi-Selection:** Shows common properties only
- **Tool Selected:** Shows tool-specific options and settings

**Interaction States:**

- Form controls follow standard patterns (input focus, validation)
- Real-time updates reflect on canvas as properties change
- Undo/redo integration for property changes

## Layout Behavior Specifications

### Header Component

**Structure:** Full width (100%) spanning entire application
**Content:** Application branding, document title, and global actions (save, settings, help)
**Height:** Fixed 48px for consistent layout calculations
**Responsive:** Content adjusts but height remains constant

### Responsive Breakpoints

**Large Desktop (1400px+):** Default layout with all panels comfortably visible
**Standard Desktop (1200-1399px):** Slight panel width reduction, maintains usability
**Small Desktop (1024-1199px):** Aggressive panel width reduction, possible auto-collapse
**Tablet/Mobile:** Not primary target but graceful degradation to single-panel mobile layout

## Accessibility Requirements

### Keyboard Navigation

**Tab Order:** Header → Toolbar (left to right) → Scene Panel → Canvas → Properties Panel
**Shortcuts:**

- F1: Toggle scene panel
- F2: Toggle properties panel
- 1-9: Select creative tools
- Esc: Return to select tool
- Space: Pan mode while held

### Screen Reader Support

**ARIA Labels:** All tools and panels have descriptive labels
**Live Regions:** Property changes announced when they affect canvas
**Landmarks:** Header, toolbar, main canvas, and panels properly labeled
**State Announcements:** Panel expand/collapse states announced

### High Contrast Mode

**Tool States:** Sufficient contrast ratios in all states
**Panel Borders:** Clear visual separation between interface areas
**Focus Indicators:** High visibility focus rings on all interactive elements

### Motor Accessibility

**Click Targets:** Minimum 44px touch targets for all interactive elements
**Tool Selection:** Large enough tool icons for users with limited dexterity
**Panel Resize:** Adequate drag handles for panel resizing if implemented
