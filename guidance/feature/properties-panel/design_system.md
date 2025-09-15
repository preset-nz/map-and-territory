# Property Panel Design System

## Overview

**Purpose:** Property panel for Map&Territory (hexmap editor) that connects to item stores and dynamically populates with map/layer/tool parameters. Balances a professional UI with gritty, analog content outputs.
**Scope:** Parameter components, folder grouping, multi-selection support, read-only/readwrite modes. Extensible via the plugin architecture.
**Target Users:** Game masters and creators (see guidance/personas.md) working with campaigns, maps, layers, and tools.

## Design Specifications

### Visual Hierarchy

- **Panel Container:** Professional, quiet surface; subtle borders. UI recedes to let map content shine (see Product Brief).
- **Folder Groups:** Collapsible sections with clear separation for Layers, Tools, Effects, Metadata.
- **Parameters:** Consistent spacing and alignment with clear labels and optional descriptions.
- **States:** Distinct treatment for read-only, error, and disabled.
- **Color Palette:** Use theme tokens rather than fixed hex. Suggested baseline aligns with shadcn tokens:
  - Surface/Border: Neutral grays (tokens: background, input, border)
  - Primary Accent: theme primary (used sparingly for focus/selection)
  - Error/Success: tokens destructive/success

### Component Structure

```
PropertyPanel
├── PanelHeader (optional)
├── FolderGroup[]
│   ├── FolderHeader (collapsible)
│   ├── DescriptionText (optional)
│   └── Parameter[]
└── DescriptionText (optional)
```

### Parameter Types (MVP-aligned)

1. **Text Input** — Single/multi-line text for names, notes.
2. **Number Input (1D/2D/3D)** — Integer/float with validation (e.g., hex size, offset vectors).
3. **Boolean** — Checkbox for toggles (e.g., snap to grid).
4. **Dropdown Select** — Enumerations (e.g., brush mode, tile material).
5. **Color Picker** — Hex color for inks/overlays.
6. **Texture Swatch (SVG/Pattern)** — Select small SVG textures/patterns used for tiles/brushes; preview as swatch.
7. (Deferred) **Multi-Select** — For tags or layered selections.
8. (Deferred) **Slider** — Numeric ranges; not used in MVP to avoid adding complexity.
9. (Deferred) **Date/Time, File Path, External Images** — Not core to MVP. Images are represented as textures/patterns rather than arbitrary URLs.

### Responsive Behavior

- **Minimum Width:** 280px
- **Optimal Width:** 320-400px
- **Resize Handle:** Right edge for horizontal resizing
- **Parameter Layout:** Single column, stacked vertically
- **Label Truncation:** Ellipsis with full text in tooltip

## Implementation Guide

### React Component Architecture

```typescript
interface PropertyPanelProps {
  data: ItemStore;
  readOnly?: boolean;
  onValueChange?: (path: string, value: any) => void;
  onError?: (path: string, error: string) => void;
}

interface Parameter {
  key: string;
  label: string;
  type: ParameterType;
  value: any;
  description?: string;
  readOnly?: boolean;
  validation?: ValidationRule[];
  error?: string;
  children?: Parameter[];
}

interface FolderGroup {
  title: string;
  description?: string;
  collapsed?: boolean;
  parameters: Parameter[];
}
```

### Component Mapping (Current Library)

- **Panel Container/Groups:** use existing `Group` + `Separator` (upgrade to collapsible folders later).
- **Labels/Help:** `PropertyLabel` with optional description; `Tooltip` for overflow or extra help.
- **Text Inputs:** `Input`, `Textarea`.
- **Number Inputs:** `Int1D/2D/3D`, `Float1D/2D/3D` (no sliders yet).
- **Boolean:** `CheckboxField` (toggle switch can come later).
- **Dropdowns:** `SelectField`.
- **Color:** `ColorField` (hex; consider alpha later).
- **Texture Swatch:** small SVG preview + select (to be added when textures are available in the asset store).

### State Management

```typescript
// Folder collapse states
const [folderStates, setFolderStates] = useLocalStorage("panel-folders", {});

// Parameter values with validation
const [parameterValues, setParameterValues] = useState({});
const [parameterErrors, setParameterErrors] = useState({});
```

## Design System Integration

### Design Tokens

```css
--panel-bg: #ffffff;
--panel-border: #e9ecef;
--panel-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
--accent-primary: #ff6b35;
--accent-hover: #e55a2b;
--text-primary: #343a40;
--text-secondary: #6c757d;
--error-color: #dc3545;
--success-color: #28a745;
--border-radius: 6px;
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
```

### Component Dependencies

- **FolderGroup** → Parameter components
- **Parameter** → Input components, validation utilities
- **TextureParameter** → SVG/pattern catalog and preview
- **MultiSelectParameter (deferred)** → Chip display, selection management

### Accessibility Features

- **Keyboard Navigation:** Tab order through parameters
- **ARIA Labels:** Descriptive labels for screen readers
- **Error Announcements:** Live regions for validation errors
- **Focus Management:** Clear focus indicators
- **Color Contrast:** WCAG AA compliance (4.5:1 ratio)

## Parameter Specifications

### Folder Group Component

- **Header:** Clickable with expand/collapse icon
- **State Persistence:** Remembers collapsed/expanded state
- **Description:** Optional text below header
- **Animation:** Smooth collapse/expand transition

### Read-Only Mode

- **Visual Treatment:** Grayed out labels, disabled inputs
- **Interaction:** No cursor changes, non-editable
- **Toggle:** Runtime switching between modes
- **Indication:** Clear visual cues for read-only state

### Error States

- **Visual:** Red border, error icon, error text
- **Tooltip:** Detailed error message on hover
- **Validation:** Real-time or on blur/submit
- **Recovery:** Clear errors when valid input provided

### Texture Swatch Parameter

- **Display:** Small SVG/pattern preview swatch
- **Source:** Internal asset catalog (not external URLs)
- **Selection:** Dropdown or grid picker with search/filter
- **Fallback:** Neutral pattern if missing

### Multi-Selection Support

- **Chips:** Selected items as removable chips
- **Dropdown:** Searchable list with checkboxes
- **Bulk Actions:** Select all/none options
- **Overflow:** Scroll or collapse for many selections

## Validation & Testing

### Success Metrics

- **Usability:** Task completion rate >95%
- **Performance:** <100ms response time for value changes
- **Accessibility:** WCAG 2.1 AA compliance
- **Error Recovery:** Clear error resolution path
- **Theme Switching:** Seamless light/dark mode transitions

### Testing Approach

- **Unit Tests:** Individual parameter components and search functionality
- **Integration Tests:** Data binding (to stores), bulk operations, and multi-selection editing
- **Accessibility Tests:** Screen reader labels, keyboard navigation, focus states
- **Visual Regression:** Appearance consistency across themes
- **Usability Testing:** Task-based scenarios for map/layer/tool editing

### POC Validation Scenarios

1. **Single Map Item:** Edit a tile’s parameters (color, texture, tags) with validation.
2. **Multi-Selection:** Select multiple hexes and adjust shared parameters (e.g., material).
3. **Bulk Operations:** Reset values across selected hexes/layers.
4. **Search Parameters:** Find specific layer/tile attributes quickly.
5. **Theme Switching:** Toggle light/dark while editing without visual regressions.
6. **Layer Child Props:** Expand layer effects (noise/FBM settings) as child parameters.
7. **Read-only Mode:** Show derived values (e.g., computed density) as read-only.
8. **Error States:** Trigger/resolve validation on number inputs (ranges, ints-only).
9. **Panel Resizing:** Drag panel across min→max, confirm reflow and readability.
10. **Copy/Paste:** Copy parameters between compatible tiles/layers.
11. **Clipboard:** Copy color/texture tokens to external apps.

### Iteration Plan

1. **Phase 1:** Core parameter types and folder grouping
2. **Phase 2:** Advanced parameters (image, multi-select)
3. **Phase 3:** Validation framework and error handling
4. **Phase 4:** Performance optimization and accessibility audit
5. **Phase 5:** Multi-panel coordination and state synchronization

## Implementation Priority

1. **Folder Groups** — Collapsible containers
2. **Basic Parameters** — Text, number (1/2/3D), boolean, dropdown, color
3. **Description Text** — Inline documentation and tooltips
4. **Read-Only Mode** — State toggle functionality
5. **Error States** — Validation and error display
6. **Texture Swatch** — SVG/pattern picker and preview
7. **Multi-Select (deferred)** — Complex selection handling
8. **Advanced (deferred)** — Sliders, date/time
