# Hex Outlines Feature Brief

**Feature Type:** Mapping Tool Enhancement
**Priority:** Medium
**Status:** Planned
**Date:** September 23, 2025

---

## What We're Building

A hex outline drawing tool that allows users to create atmospheric boundary lines for geographic features like coastlines, mountain ranges, forest edges, cliffs, and territorial borders on their hex maps.

Users click on hex corners to build connected outline paths, with smart pathfinding to fill gaps when corners are skipped. Lines can be styled with different colors, widths, patterns, and atmospheric effects to match the gritty aesthetic of dark fantasy RPG maps.

## User Stories

### Primary: Geographic Boundary Creation

**As a GM creating a wilderness hex map**
I want to draw coastlines around islands and continents
So that players can clearly see land/water boundaries and navigation routes

**As a GM detailing regional politics**
I want to outline territorial borders and kingdom boundaries
So that political tensions and travel restrictions are visually clear

**As a content creator making a published module**
I want to add atmospheric cliff edges and mountain ridges
So that the map conveys environmental hazards and terrain difficulty

### Secondary: Atmospheric Enhancement

**As a GM inspired by Mörk Borg aesthetics**
I want rough, jagged outline styles with ink-splatter effects
So that my maps feel like weathered artifacts from a dying world

**As a player contributing to worldbuilding**
I want to quickly sketch approximate boundaries during play
So that we can capture emerging story elements on the shared map

## Success Criteria

### Functional Requirements

- **Corner Selection**: Click hex corners to add points to outline path
- **Smart Pathfinding**: Auto-connect when skipping corners (Redbubble-style)
- **Styling Options**: Color, width (1-10px), line patterns (solid/dashed/dotted)
- **Path Modes**: Strict hex-edge following vs smooth curved paths
- **Visual Feedback**: Real-time preview during path creation
- **Atmospheric Effects**: Optional jagged/rough rendering for gritty aesthetic

### Design Requirements

- **Professional UX**: Clean tool interaction following existing freeform patterns
- **Performance**: Smooth drawing with hundreds of outline segments
- **Export Compatible**: Outlines included in PNG/SVG exports
- **Layer Integration**: Works with existing layer system and rendering pipeline

### Acceptance Scenarios

1. **Coastline Creation**: Draw a complete island coastline with 20+ corners in under 2 minutes
2. **Smart Gaps**: Skip 3 corners in a sequence, tool automatically connects the optimal path
3. **Style Variation**: Create both clean political borders and rough cliff edges on same map
4. **Complex Geography**: Draw interlocking territorial boundaries without visual conflicts

## User Personas

### "The Wilderness GM" - Sarah

- **Context**: Running a hex-crawl campaign with detailed regional politics
- **Needs**: Clear territorial boundaries, travel route indicators, geographic hazards
- **Pain Points**: Current tools either too complex (GIS software) or too simple (basic paint)
- **Success**: Can create professional-looking political maps in minutes, not hours

### "The Atmospheric Creator" - Marcus

- **Context**: Publishing indie TTRPG modules with distinctive visual style
- **Needs**: Maps that feel like artifacts from the game world
- **Pain Points**: Clean digital tools don't match desired gritty aesthetic
- **Success**: Outlines enhance atmosphere without requiring artistic skills

### "The Collaborative Player" - Jamie

- **Context**: Contributing to shared worldbuilding during ongoing campaign
- **Needs**: Quick sketching tools for capturing emerging story elements
- **Pain Points**: Don't want to break immersion with complex tools during play
- **Success**: Can add rough boundaries in seconds while maintaining game flow

## Technical Constraints

### Platform Integration

- Must follow existing plugin architecture (`src/plugin/builtin/`)
- Compatible with current hex coordinate system (`src/lib/hex/`)
- Integrates with Canvas2D rendering pipeline (`src/render/`)

### Performance Requirements

- Real-time preview with <16ms frame budget
- Efficient storage for complex outline data
- Smooth interaction with 500+ hex map

### Aesthetic Requirements

- Optional roughening algorithms for organic line variation
- Integration with existing palette system for consistent theming
- Support for atmospheric effects (ink spatters, weathered edges)

---

## Out of Scope (For Now)

- **Advanced Vector Editing**: Bezier curves, node manipulation beyond corner selection
- **Text Labels**: Outline annotation system (separate feature)
- **Auto-Tracing**: Importing boundary data from external map sources
- **3D Effects**: Elevation-based outline rendering
- **Animation**: Moving or dynamic boundary effects

This feature focuses on core boundary drawing functionality with atmospheric styling, building foundation for future enhancements.
