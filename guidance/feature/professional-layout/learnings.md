# Professional Layout Implementation - Learnings

## Date: 2025-09-02

## Issue Identified

The initial implementation of the professional layout system was way too enterprise-focused and doesn't align with the Map&Territory product vision.

## Current Problems

### 1. Enterprise-Focused Sidebar

The sidebar contains sections and navigation items that belong in an enterprise management system:

- Dashboard, Analytics, Reports
- Users, Roles, Permissions
- Data Sources, Collections
- Import/Export (generic business data context)

This makes the app feel like a business intelligence tool or CRM rather than a creative hexmap editor for TTRPGs.

### 2. Overly Complex Navigation Structure

- Hierarchical multi-level navigation with collapsible sections
- Complex state management for navigation
- Over-engineered for what should be a simple creative tool
- Too many abstractions (NavigationSections, NavigationItems, etc.)

### 3. Wrong Product Tone

The homepage and UI copy uses language like:

- "Professional Layout System"
- "Enterprise-ready features"
- "Professional desktop layout system with advanced component architecture"

This completely misses the target audience (TTRPG players/GMs creating maps for fun).

## What It Should Be

Based on the product brief, Map&Territory is:

- A **hexmap editor** for creating atmospheric maps for TTRPGs
- Inspired by **Mörk Borg and Death in Space** aesthetics
- A **hobbyist side project** for learning
- A **creative tool** like Photoshop/Affinity, not a business app

## Recommended Changes

### 1. Simplify Sidebar to Creative Tool Pattern

Replace enterprise sections with map editor relevant tools:

- **File**: New Map, Open Project, Save, Export
- **Tools**: Select, Hex Paint, Draw, Erase, Text
- **View**: Zoom, Grid, Layers Panel
- **Layers**: Layer management UI
- **Properties**: Selected element properties

### 2. Update Homepage Content

- Remove enterprise language
- Focus on hexmap creation for TTRPGs
- Highlight features like:
  - Gritty, analog map aesthetics
  - Hex grid editing
  - Layer system for organization
  - Export for printing/sharing

### 3. Simplify Navigation Components

- Remove complex hierarchical navigation
- Use simpler, flatter structure
- Think "creative tool panels" not "enterprise navigation"

### 4. Adjust Overall Tone

- Less "professional enterprise"
- More "creative hobby project"
- Focus on fun and creativity
- Language that resonates with TTRPG community

## Learning Points

1. **Start with the product vision** - The implementation got ahead of the actual product needs
2. **Avoid over-engineering early** - Complex navigation patterns aren't needed for a simple creative tool
3. **Know your audience** - TTRPG hobbyists don't need enterprise features
4. **UI should match the product** - A creative tool needs creative tool UI patterns, not business app patterns

## Next Steps

The layout system needs to be simplified to match the actual product vision. This means removing enterprise-focused elements and replacing them with creative tool patterns that make sense for a hexmap editor.

- Layout scrolling discipline (desktop app)
  - Use a 4-row CSS grid: `grid-rows-[auto_auto_1fr_auto]` so only the content row expands.
  - Set `body` to `overflow-hidden` to prevent window scrolling; only inner containers scroll.
  - In the content row, any flex or panel wrapper must include `min-h-0` to allow children to shrink and scroll.
  - Apply `h-full` to the top-level `PanelGroup` so it inherits the grid row height; use `min-h-0` for `Panel` content.
  - Make the scroll container explicit where needed:
    - Main view: `<main class="overflow-auto flex-1 min-h-0" />` and avoid forcing child heights.
    - Side panels: header/footer remain non-scrollable; wrap the middle section in `div.flex-1.min-h-0.overflow-auto`.
  - For resizable panels, ensure default sizes sum to 100% to avoid normalization warnings; compute defaults from persisted pixel widths when available.

  This pattern avoids accidental parent expansion (default `min-height:auto`) and guarantees independent scrolling for each column while header, toolbar and statusbar stay fixed.
