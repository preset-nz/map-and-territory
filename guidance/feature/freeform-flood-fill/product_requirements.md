---
ticket: T-023
feature: freeform-flood-fill
owner: product-owner
date: 2025-09-16
level: 2
---

## Problem & Value

- Users need efficient bucket/flood fill functionality for freeform layers to quickly fill connected regions
- Manual painting of large connected areas is time-intensive and error-prone
- Flood fill is a standard expectation in mapping tools and improves user productivity for terrain painting

## In Scope

- Flood fill tool for freeform layers using hex neighbor connectivity
- Command `tool.freeform.fill` with toolbar integration
- BFS/DFS algorithm implementation with configurable boundary detection
- Integration with T-020 batch API for atomic state updates
- Performance guardrails with configurable maximum fill size
- Fill mode options: empty-only vs same-value replacement
- Proper tool enablement based on active layer type and grid visibility

## Out of Scope

- Flood fill for non-freeform layer types
- Advanced fill patterns (gradients, textures, custom shapes)
- Undo/redo beyond standard layer state management
- Multi-layer flood fill operations
- Import/export of fill patterns

## Acceptance Criteria

- [ ] **Given** a freeform layer is active **When** user clicks flood fill tool **Then** tool becomes active and cursor changes appropriately
- [ ] **Given** flood fill tool is active **When** user clicks on empty hex **Then** connected empty region fills with selected terrain up to boundaries
- [ ] **Given** flood fill tool is active **When** user clicks on filled hex in same-value mode **Then** connected region of same terrain type gets replaced
- [ ] **Given** a fill operation exceeds max cell limit **When** fill algorithm reaches cap **Then** operation stops at limit and user gets feedback
- [ ] **Given** fill operation affects paper boundaries **When** algorithm encounters edge **Then** fill respects paper rectangle bounds
- [ ] **Given** fill operation completes **When** state updates **Then** single batch commit preserves undo/redo functionality
- [ ] **Given** non-freeform layer is active **When** user views toolbar **Then** flood fill tool is disabled with appropriate reason

## Risks & Assumptions

- **Performance Risk**: Large connected regions (1000+ cells) could cause UI lag during fill calculation
- **Boundary Detection**: Assumes hex neighbor algorithm correctly identifies connectivity across various terrain configurations
- **Batch API Dependency**: Relies on T-020 batch operations being stable and performant for large updates
- **User Experience**: Assumes users will understand fill behavior differences between empty-only and same-value modes without extensive onboarding
