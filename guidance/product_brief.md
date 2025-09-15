# Map&Territory Product Brief

**Product Type:** Hexmap Editor for TTRPGs  
**Status:** Learning Project  
**Date:** September 2, 2025

---

## What We're Building

Map&Territory is a hexmap editor for creating atmospheric maps for tabletop RPGs, especially games like Mörk Borg and Death in Space. This is a hobbyist side project focused on learning modern web development patterns while building something genuinely useful for the TTRPG community.

The core concept: **professional content editing tools** that produce **gritty, analog-style maps**. Think Affinity Designer's clean interface but for creating maps that look like weathered artifacts from dark fantasy worlds.

## Design Philosophy

**Visual Aesthetic:** Gritty, analog, hand-drawn feeling inspired by Mörk Borg and Death in Space. Maps should feel like discovered artifacts - distressed, atmospheric, with ink splatters and weathered textures.

**UI Aesthetic:** Professional content editing application. Clean, efficient interface that doesn't compete with the map content. Think Adobe/Affinity tools - the UI fades into the background so you can focus on creation.

**Core Tension:** The interesting design challenge is this duality - a polished, professional interface for creating intentionally rough, gritty content.

## Who Might Use It

**Game Masters** who want to create atmospheric hex maps for dark fantasy/horror campaigns without needing artistic skills.

**Content Creators** making zines, modules, or indie TTRPG materials who need maps with authentic analog aesthetics.

**Players** who want to contribute to worldbuilding or reference evocative maps during gameplay.

_See guidance/personas.md for detailed user personas._

## Core Features for MVP

**Hex Grid Editor**

- Vector-based hex grids with terrain painting
- Distressed textures and analog effects built-in
- Ink splatter, weathered edges, hand-drawn aesthetics

**Multi-Document Support**

- Project-based organization for campaigns
- Multiple related maps in one workspace
- Learn complex state management patterns

**Layer System**

- Hierarchical organization of map elements
- Terrain, features, annotations, effects as separate layers
- Good practice for complex UI state

**Plugin Architecture**

- Extensible system for community contributions
- Learn modern plugin patterns and sandboxing
- Start simple, build complexity over time

**Save/Load/Export**

- JSON project format for flexibility
- PNG/SVG export with print-ready quality
- File handling and data persistence patterns

## Technical Learning Goals

**Next.js & React Patterns**

- App router, server components, modern React patterns
- Complex state management across multiple documents
- Professional application architecture

**Canvas/SVG Rendering**

- High-performance map rendering
- Vector graphics manipulation
- Texture and effect systems for analog aesthetics

**Plugin System Design**

- Learn extensible architecture patterns
- Sandboxing and security considerations
- Event systems and API design

**File Handling & Persistence**

- JSON-based project format design
- Import/export systems
- Local storage with future cloud sync potential

**Professional UI Development**

- Component libraries (shadcn/ui)
- Complex layout systems (panels, toolbars, canvases)
- Keyboard shortcuts and power-user features

---

## Success Criteria

**Functional Success**

- Can create a usable hex map that captures the gritty aesthetic
- Multi-document workflow feels natural and useful
- Export quality suitable for printing or sharing

**Learning Success**

- Understand modern Next.js patterns and architecture
- Gain experience with complex state management
- Learn plugin architecture and extensibility patterns
- Practice professional UI development techniques

**Fun Factor**

- Enjoyable to build and iterate on
- Creates maps I'd actually want to use in games
- Maybe share with TTRPG friends and get feedback
- Could inspire future projects or contributions

**Technical Quality**

- Clean, maintainable code following modern practices
- Good test coverage for core functionality
- Performance adequate for complex maps
- Architecture that could scale if needed

## Aesthetic References

**Map Style Inspiration**

- **Mörk Borg**: Distressed textures, ink splatters, weathered parchment, high contrast
- **Death in Space**: Gritty sci-fi aesthetics, worn metal textures, analog decay
- **General Analog Feel**: Hand-drawn imperfections, coffee stains, torn edges, smudged ink

**UI Style Inspiration**

- **Professional Content Tools**: Affinity Designer, Adobe Creative Suite, Figma
- **Clean & Efficient**: Interface fades into background, focus on content creation
- **Power User Friendly**: Keyboard shortcuts, customizable panels, efficient workflows

The contrast between polished UI and gritty map content creates an interesting design challenge and learning opportunity.
