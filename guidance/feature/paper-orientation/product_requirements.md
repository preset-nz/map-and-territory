# Paper Orientation Support - Product Requirements

## Vision

Enable users to choose between landscape and portrait orientations for their maps, providing flexibility for different use cases while maintaining aspect ratio consistency and a professional appearance.

## User Stories

### As a Map Creator

- I want to choose between landscape and portrait orientations so that my map fits my intended use case
- I want to switch orientations without losing my map content so that I can experiment with different layouts
- I want the orientation to persist when I save and reload my campaign

### As a Campaign Designer

- I want portrait maps for vertical dungeon layouts and tower designs
- I want landscape maps for horizontal exploration and world maps
- I want to preview how my map will look in different orientations before committing

### As a Print User

- I want my map orientation to match standard paper sizes for easy printing
- I want consistent margins and borders regardless of orientation
- I want the map to maximize usable space while maintaining readability

## Functional Requirements

### Core Orientation Support

#### FR-1: Orientation Selection

- System SHALL provide landscape and portrait orientation options
- System SHALL maintain the selected aspect ratio (square, 4:3, 16:10) in both orientations
- System SHALL apply orientation immediately upon selection (live preview)

#### FR-2: Aspect Ratio Behavior

- For non-square aspects:
  - Landscape: wider than tall (e.g., 16:10 becomes 16 wide × 10 tall)
  - Portrait: taller than wide (e.g., 16:10 becomes 10 wide × 16 tall)
- Square aspect: no visual change between orientations (but orientation still tracked)

#### FR-3: Content Preservation

- Map content SHALL remain positioned correctly when switching orientations
- Grid alignment SHALL be maintained during orientation changes
- Layer visibility and properties SHALL be preserved

### User Interface

#### FR-4: Orientation Controls

- Orientation selector SHALL be located near aspect ratio selector in paper properties
- Options SHALL be clearly labeled: "Landscape" and "Portrait"
- Current orientation SHALL be visually indicated

#### FR-5: Visual Feedback

- Paper rectangle SHALL update immediately when orientation changes
- Grid SHALL reflow to fit new paper dimensions
- Border SHALL adjust to new paper shape

### Persistence

#### FR-6: State Management

- Orientation SHALL be saved as part of paper layer state
- Orientation SHALL be restored when loading a campaign
- Default orientation SHALL be landscape for backward compatibility

## Non-Functional Requirements

### Performance

#### NFR-1: Rendering Performance

- Orientation switch SHALL complete within 100ms
- No visible flicker or jump during orientation change
- Smooth transition animation (optional enhancement)

### Compatibility

#### NFR-2: Backward Compatibility

- Existing campaigns without orientation SHALL default to landscape
- No data loss when loading old campaigns
- Graceful migration path for existing paper states

### Usability

#### NFR-3: Intuitive Behavior

- Orientation change SHALL be predictable and reversible
- Visual representation SHALL clearly show current orientation
- Undo/redo SHALL work with orientation changes

## Acceptance Criteria

### AC-1: Basic Orientation Toggle

```gherkin
Given I have a map with 16:10 aspect ratio in landscape
When I select portrait orientation
Then the paper dimensions should swap (10 wide × 16 tall)
And all map content should remain visible
And the grid should adjust to the new dimensions
```

### AC-2: Square Aspect Behavior

```gherkin
Given I have a map with square aspect ratio
When I toggle between landscape and portrait
Then the visual appearance should remain unchanged
But the orientation state should be tracked internally
```

### AC-3: Persistence

```gherkin
Given I have set my map to portrait orientation
When I save and reload the campaign
Then the map should still be in portrait orientation
And all content should be in the same positions
```

### AC-4: Content Preservation

```gherkin
Given I have painted content on a landscape map
When I switch to portrait orientation
Then all painted hexes should remain in the same world positions
And no content should be lost or displaced
```

## Out of Scope

- Automatic content reflow/rearrangement when changing orientation
- Different aspect ratios for landscape vs portrait
- Page rotation (90-degree turns) - this is orientation selection, not rotation
- Multi-page layouts or spreads
- Custom aspect ratios beyond the existing three options

## Success Metrics

- Users can successfully switch between orientations without confusion
- No increase in rendering time when using portrait orientation
- Zero data loss when changing orientations
- Positive user feedback on orientation flexibility

## Dependencies

- Paper layer system (already implemented)
- Aspect ratio support (already implemented)
- Scene geometry calculations (computePaperRect function)
- Property panel UI system

## Risks and Mitigations

| Risk                                         | Impact | Mitigation                                   |
| -------------------------------------------- | ------ | -------------------------------------------- |
| Performance degradation with portrait        | Medium | Profile and optimize rendering pipeline      |
| User confusion about orientation vs rotation | Low    | Clear labeling and documentation             |
| Content clipping in portrait mode            | Medium | Provide visual indicators for content bounds |
| Breaking existing campaigns                  | High   | Implement careful backward compatibility     |

## Future Enhancements

- Orientation-aware grid layouts (different hex patterns for portrait)
- Automatic content reflow options
- Orientation templates for common use cases
- Export presets for different orientations
- Responsive design that adapts to viewport aspect
