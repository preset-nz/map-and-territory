Status: Draft
Last Updated: 2025-09-03

# Properties Panel – Schema-Driven Design

## Goal

Provide a generic, declarative properties system where plugins (or core) declare groups, fields, and bindings. The Properties Panel renders UI from schema, manages state updates, validation, and undo/redo. Complex cases can fall back to custom renderers without breaking the schema-first model.

## Principles

- Declarative-first: schemas over bespoke components.
- Predictable updates: pure patches, no hidden side-effects.
- Minimal surface: small widget set, composable groups/rows.
- Extensible: fallback renderers and custom widgets via registry.

## Core Types (Contracts)

```ts
export type PropertySchema = PropertyGroup[];

export interface PropertyGroup {
  id: string; // unique within target
  title: string;
  order?: number;
  when?: string; // context expression (e.g., selectedLayer.type === 'terrain')
  rows: PropertyRow[];
}

export type PropertyRow = Field | Field[]; // single or multi-column row (2 max for MVP)

export type Field =
  | NumberField
  | SliderField
  | SelectField
  | ToggleField
  | ColorField
  | TextField
  | AngleField
  | Vec2Field;

interface BaseField<T> {
  kind: string; // 'number' | 'select' | ...
  id: string; // unique within group
  label?: string;
  tooltip?: string;
  icon?: string;
  order?: number;
  bind: Binding<T>;
  when?: string; // conditional visibility
  disabled?: string; // conditional disabled
}

export interface NumberField extends BaseField<number> {
  kind: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface SliderField extends BaseField<number> {
  kind: "slider";
  min: number;
  max: number;
  step?: number;
  marks?: number[];
}

export interface SelectField extends BaseField<string> {
  kind: "select";
  options: Array<{ value: string; label: string }>;
}

export interface ToggleField extends BaseField<boolean> {
  kind: "toggle";
}
export interface ColorField extends BaseField<string> {
  kind: "color";
  format?: "hex" | "rgba";
}
export interface TextField extends BaseField<string> {
  kind: "text";
  placeholder?: string;
}
export interface AngleField extends BaseField<number> {
  kind: "angle";
  unit?: "deg" | "rad";
}
export interface Vec2Field extends BaseField<{ x: number; y: number }> {
  kind: "vec2";
}

export type Binding<T> =
  | { type: "path"; path: string } // e.g., 'layers[sel].state.opacity'
  | { type: "computed"; get: string; set: string } // expr strings evaluated in safe context
  | {
      type: "adapter";
      read: (ctx: BindingCtx) => T;
      write: (v: T, ctx: BindingCtx) => void;
    };

export interface BindingCtx {
  selection: SelectionCtx;
  app: AppAPI;
}
export interface SelectionCtx {
  layerId?: string;
  sceneId?: string;
}
```

Notes

- `computed` uses a tiny expression evaluator over a safe whitelist (no `eval`), or is deferred until Worker isolation.
- `adapter` provides full programmatic control when needed.

## Targets & Scopes

- Scope: `scene` or `layer:{type}`. Schema files are contributed via plugin manifest for each scope.
- Composition: Multiple plugins can contribute groups to the same scope; ordering by `order` then `title`.

## Rendering Behavior

- The Properties Panel renders groups and rows according to schema and context.
- Field changes produce a single state patch via `AppAPI.layers.update(id, patch)` or `AppAPI.scene.update(patch)` where applicable.
- Undo/redo integrates by wrapping patch dispatches in the host’s history manager.

## Examples

Paper Layer (scope: `layer:paper`)

- Group: "Paper"
- Fields: `aspectRatio` (select: A4, A3, square, custom), `color` (color)

Hexgrid Layer (scope: `layer:hexgrid`)

- Group: "Grid"
- Fields: `size` (slider), `rotation` (angle), `style` (select: line/point)

Terrain Layer (scope: `layer:terrain`)

- Group: "Terrain"
- Fields: `opacity` (slider), `blendMode` (select), optional `seed` (number)

## Custom Renderers & Widgets

- Plugins may register custom widgets by `kind` into a widget registry.
- Fallback: a plugin can provide a `PropertyRenderer` React component for complex UI; schema still declares the group container to keep ordering predictable.

## Validation & Defaults

- Layer type schema (Valibot) remains the source of truth for data shapes.
- Property fields should provide compatible defaults; UI validates inputs before dispatching patches.

## Performance

- Controlled inputs, debounced patches for sliders.
- Virtualize long lists of groups/fields when needed.

## Future Optionality

- Palette presets: Provide curated color palettes (e.g., parchment/ink/steel) and expose as `presets` on `ColorField`. Defer implementation until base UX is stable.

## Acceptance Criteria (MVP)

- Properties Panel renders from schemas for paper, hexgrid, and terrain layers.
- Changing a field updates the selected layer’s state and triggers re-render.
- Conditional visibility works (e.g., show rotation only when style = line).
- Undo/redo works for property edits.

## Testing Strategy

- Schema-to-UI mapping tests per field kind.
- Patch dispatch tests verifying correct layer/scene updates.
- Conditional visibility and disabled-state tests.
- Integration test: edit properties on all three layer types and observe rendering changes.

## Delegation (Subagents)

- Schema Engine: parse/validate schema, condition evaluator, defaulting.
- Renderer: group/row layout, widget registry, controlled inputs, virtualization.
- Bindings: path adapter, computed adapter (safe evaluator), programmatic adapter.
- Integration: history wrapper, performance tuning, DX utilities for plugin authors.
