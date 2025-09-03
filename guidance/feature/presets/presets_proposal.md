# Preset System Proposal — Node Settings Snapshots for Reuse

## Goal
Enable users to save and reuse settings for nodes (Maps, Layers, and future node types) as “Presets”. Presets speed up workflows, ensure consistency across maps/campaigns, and allow sharing of looks (e.g., Paper, Hexgrid, Terrain styles).

## Scope (MVP)
- Nodes: Map, Layer (per layer type). Future: Tools, Effects, Brush profiles.
- Actions (via kebab/three-dots in Properties Panel header):
  - Save as Preset… (prompts for name)
  - Apply Preset ▶ (submenu with recent/favorites + full list)
  - Manage Presets… (opens lightweight manager)
  - Reset to Default (reapply layer type defaults)
- Preset application is non-destructive with Undo/Redo integration.

## UX Design
- Properties Panel header (for current selection) shows a three-dots button.
- Menu
  - Save as Preset…
  - Apply Preset ▶ [searchable list by node type]
  - Manage Presets…
  - Reset to Default
- Preset Badge (optional): show the applied preset name subtly; clicking reveals quick actions (Reapply / Manage).
- Read-only mode: Save/Apply actions disabled; name visible.
- Multi-selection: Apply Preset applies to all compatible selected nodes.

## Data Model
```ts
// Node Type identifier is the contract for compatibility
// Examples: 'map', 'layer:paper', 'layer:hexgrid', 'layer:terrain:noise-v1'

interface Preset<T = unknown> {
  id: string;             // UUIDv7
  nodeType: string;       // e.g., 'layer:paper'
  name: string;           // user-facing label
  description?: string;
  payload: T;             // serializable settings snapshot; validated against schema for nodeType
  schemaVersion: number;  // nodeType schema version at save time (from registry)
  schemaHash?: string;    // optional hash for integrity/migration hints
  scope: 'user' | 'campaign';   // global (profile) vs. project-scoped
  createdAt: number;      // ms epoch
  updatedAt: number;      // ms epoch
  author?: { id?: string; name?: string };
  tags?: string[];
  flags?: { partial?: boolean; include?: string[]; exclude?: string[] };
}
```

- Node Type: A stable string defined by the node’s definition/registry, not by display name. Plugins must use their registered type id.
- Schema Version/Hash: Sourced from the node type definition to validate payloads and guide migrations.
- Partial Presets: Optional masks to include/exclude fields (e.g., apply everything except `seed`). MVP can store full payload only, but the shape supports partials later.

## Storage & Distribution
- User scope (global): IndexedDB (preferred) or localStorage fallback under a versioned key. Available across campaigns in the same browser profile.
- Campaign scope (project): Embedded in campaign JSON under `presets: { [nodeType]: Preset[] }` for portability.
- Import/Export: JSON (single preset file or bundle). Allow drag/drop into manager.
- Namespaces: Key by `nodeType`, load lazily per type for fast menus.

## Validation & Compatibility
- On Save: validate payload against node type schema (Valibot/Zod). Record `schemaVersion` (+ optional hash).
- On Apply: ensure current node’s type matches preset.nodeType. Validate and coerce if compatible; if schema evolved, consult migration map:
  - Exact version match → apply directly.
  - Minor version with compatible migration → apply with migration.
  - Incompatible → show warning and grey out in list.

## Commands & API
```ts
// AppAPI additions (plugins can use these)
interface PresetAPI {
  save(node: NodeRef, options?: { name?: string; scope?: 'user' | 'campaign'; partial?: boolean; include?: string[]; exclude?: string[] }): string; // returns presetId
  apply(node: NodeRef | NodeRef[], presetId: string): void;
  list(nodeType: string, scope?: 'user' | 'campaign'): PresetSummary[];
  get(presetId: string): Preset | null;
  remove(presetId: string): void;
  rename(presetId: string, name: string): void;
}

interface NodeRef { kind: 'map' | 'layer'; id: string; }
interface PresetSummary { id: string; name: string; updatedAt: number; scope: 'user' | 'campaign'; }
```
- Expose as `AppAPI.preset` facet. Plugins can save/apply presets for their nodes but must respect nodeType compatibility.
- All operations emit domain patches, enabling undo/redo.

## Integration: Properties Panel
- Kebab menu uses `PresetAPI`.
- Save as Preset: prompts for name, selects scope, stores current node payload.
- Apply Preset: shows presets for the node’s `nodeType`; searchable list; favorites pin to top.
- Manage Presets: simple dialog with list, rename, delete, export, import.

## Domain & Rendering Flow
- Save Preset → read current node state (domain) → validate → persist.
- Apply Preset → fetch preset.payload → (migrate if needed) → compute patch → domain update → renderer consumes diffs.
- Undo/Redo: Preset application is a single action with inverse patch.

## Migrations (Future-safe)
- Each node type (core/plugins) may register a migration map `{ fromVersion: (payload) => migrated }`.
- On Apply: run migration to current schema version. Warn if missing.

## Security & Isolation
- No code in presets; pure data. JSON schema validation enforced.
- Plugins can bundle default presets (static JSON) with their manifest; loader validates on install.
- Sharing: importing presets merges only compatible types; disallow unknown nodeType unless plugin present.

## Performance
- Lazy-load presets per nodeType on first use of the menu.
- Cache most-recently-used list for quick Apply in the menu.
- Storage operations are async; UI remains responsive.

## Testing
- Unit: save/apply for map and layer types, validation failures, rename/delete.
- Integration: properties menu flow; undo/redo after Apply.
- Persistence: project-scoped presets round-trip save/load.
- Plugin: third-party layer type presets saved and applied via AppAPI.

## Roadmap
- Partial presets UI (include/exclude fields, e.g., “keep seed”).
- Favorites and tags; quick filter.
- Preset Packs (bundle of presets) for campaign templates.
- Cloud sync (opt-in) for user-scoped presets.

## Open Questions
- Where to show a current preset indicator (badge vs. tooltip) without adding clutter?
- How to reconcile presets when multiple nodes are selected with mixed types (likely: filter to intersection, or per-type sections)?
- Do we want per-tool presets available directly in tool palettes (likely yes, as a follow-up)?

---

## Manage Presets — Short UI Spec (MVP)

### Entry Points
- Properties panel menu: “Manage Presets…”
- Optional global settings menu: “Presets”

### Layout
- Modal dialog (Radix Dialog) sized ~640×520.
- Header: title “Manage Presets”, scope tabs, node type filter.
- Body: two-column layout
  - Left: Preset List (virtualized list)
  - Right: Details Pane (preview + metadata)
- Footer: primary actions (Apply, Close), secondary (Export, Import)

### Controls
- Scope Tabs: [User] [Campaign]
- Node Type Filter: dropdown (e.g., All types, Map, layer:paper, layer:hexgrid…)
- Search: text filter by name/tags (debounced)
- List Items: name, nodeType badge, updatedAt, scope icon; star for Favorite
- Selection: single selection (MVP)

### Actions
- Apply (enabled when compatible with current selection)
- Rename (inline on list or in details)
- Delete (with confirm)
- Duplicate (creates copy with “Copy” suffix)
- Export (selected → JSON)
- Import (file → adds to current scope if compatible)
- Favorite toggle (pins to top in Apply menu)

### Details Pane
- Fields: Name (editable), Node Type (readonly), Updated, Scope
- Payload Preview: collapsible JSON view (read-only)
- Compatibility: shows “Compatible with current selection” or reason why not

### Empty States & Errors
- No presets: invite to “Save as Preset” from properties menu
- Import error: show validation errors (unknown nodeType, schema mismatch)
- Compatibility warning: disable Apply and show reason

### Keyboard & A11y
- Arrow up/down to navigate list; Enter to Apply
- Esc closes dialog; focus management returns to invoker
- Screen-reader labels for list items and actions; role=listbox semantics

### Persistence
- Favorite flag stored alongside preset metadata
- Last used filters (scope, type, search) remembered in local storage

### Performance
- Virtualize list for large collections
- Lazy load by nodeType; previews load on selection

### Non-Goals (MVP)
- Bulk selection/actions
- Partial preset editor UI (follow-up)
