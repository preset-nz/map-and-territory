# T-015 — Save/Load Campaign (Level 2)

## Goal

- Export/import a Campaign as versioned JSON with a minimal UI, preserving maps, layers, and layer states while excluding derived/cache fields.

## Success Criteria

- v1 JSON schema defined and documented with root `{ version: 1, campaign }` and MIME `application/vnd.map-territory+json;version=1`.
- Save generates a file where each layer state is produced via adapter `serialize()` when provided, else raw state.
- Load accepts only `version: 1`, reconstructs campaign/maps/layers, and normalizes anchors (Paper bottom, Hex Grid top). Active map restored.
- Unknown layer types round‑trip via a placeholder adapter without breaking rendering.
- Round‑trip unit tests cover built‑ins; a minimal E2E validates Save→Load→Render without multiple invalidations.

## Non‑Goals (v1)

- Backward/forward compatibility across schema versions.
- Streaming/chunked saves, binary blobs, or attachments.
- Project‑level user metadata beyond existing fields.

## Risks & Constraints

- Maintaining render stability for unknown layer types.
- Avoiding persistence of derived fields (e.g., Hex Noise `paintColor`).

## UX Notes

- Add Save and Load entries under File menu in the App Header; confirm overwrite on load. Keep UI minimal.
