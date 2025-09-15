Status: Draft
Last Updated: 2025-09-03

# Plugin System – Solutions Design

## Scope & Objectives

- Enable third-party and first-party plugins to contribute to all major app areas: toolbar, commands, tools, layers, panels, rendering, persistence, and properties.
- Keep the MVP minimal, predictable, and type-safe while preserving optionality for sandboxing and distribution.
- Align with SOLID/CUPID, clear interfaces, and platform thinking.

## Complexity & Workflow

- Complexity: Level 3 (cross-cutting platform capability)
- Process: Architecture-first with ADRs, staged implementation via subagents; contract tests for each extension point per Testing Standards.

## Architectural Decisions (Summary)

- ADR-0002 (this feature): Adopt a capability-based plugin platform with declarative manifests, stable extension-point interfaces, and progressive isolation (in-process ESM → Worker sandbox).
- Commands-first model: UI elements (e.g., toolbar buttons) bind to registered commands.
- Slot-based composition: Plugins fill named UI “slots” (toolbar groups, property sections, panel widgets).
- Deterministic rendering pipeline: Layer renderers are pure functions of state + context for testability.

## Core Concepts & Interfaces

The following are TypeScript interface shapes used as contracts. Implementation agents generate actual types in `src/plugin/` and public exports `@/plugin`.

### Plugin Manifest

```ts
export interface PluginManifest {
  id: string; // unique, reverse-DNS recommended
  name: string;
  version: string; // semver
  capabilities: Capability[]; // declared access (scene, layers, tools, storage)
  contributes?: {
    commands?: CommandContribution[];
    toolbar?: ToolbarContribution[]; // buttons, groups
    tools?: ToolContribution[]; // pointer/brush tools
    layers?: LayerTypeContribution[]; // register new layer types
    properties?: PropertyContribution[]; // inject sections into properties panel
    panels?: PanelContribution[]; // optional custom panels/inspector sections
  };
  entry: string; // ESM entry module path
}

export type Capability =
  | "scene:read"
  | "scene:write"
  | "layer:read"
  | "layer:write"
  | "render:canvas"
  | "render:scene-view"
  | "tool:register"
  | "storage:project";

export interface CommandContribution {
  id: string; // e.g., 'app.scene.new'
  title: string;
  when?: string; // context expression (e.g., sceneExists && !dirty)
  shortcut?: string; // e.g., 'Mod+N'
}

export interface ToolbarContribution {
  group: string; // e.g., 'scene'
  items: Array<{
    type: "button";
    command: string; // binds to contributed or existing command
    icon?: string; // icon id/name
    label?: string;
    tooltip?: string;
    order?: number;
  }>;
}

export interface ToolContribution {
  id: string; // e.g., 'paint.brush'
  title: string;
  icon?: string;
  targetLayerTypes?: string[]; // e.g., ['terrain']
}

export interface LayerTypeContribution {
  type: string; // e.g., 'paper' | 'hexgrid' | 'terrain'
  title: string;
  schema: unknown; // Valibot schema; used for validation + migration
  defaultState: unknown;
}

export interface PropertyContribution {
  for: { kind: "layer" | "scene"; type?: string }; // target scope
  sectionId: string; // unique within target
  title: string;
  order?: number;
}

export interface PanelContribution {
  slot: "left" | "right" | "bottom" | "floating";
  id: string;
  title: string;
  order?: number;
}
```

### Runtime Module API (ESM Entry)

```ts
export interface PluginModule {
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(ctx: PluginContext): void | Promise<void>;
  // Optional adapters provided based on contributions declared in manifest
  commands?: Record<string, CommandHandler>;
  tools?: Record<string, ToolAdapter>;
  layers?: Record<string, LayerAdapter>;
  properties?: Record<string, PropertyRenderer>;
  panels?: Record<string, PanelRenderer>;
}

export interface PluginContext {
  app: AppAPI; // stable, narrow app surface
  events: EventBus; // typed pub/sub
  storage: ProjectStorage; // controlled persistence
  log: Logger; // namespaced logging
  capabilities: Capability[]; // validated from manifest
}

export type CommandHandler = (
  api: AppAPI,
  payload?: unknown,
) => Promise<void> | void;

export interface ToolAdapter {
  onPointerDown(e: PointerEventLike, api: ToolAPI): void;
  onPointerMove(e: PointerEventLike, api: ToolAPI): void;
  onPointerUp(e: PointerEventLike, api: ToolAPI): void;
  onKey?(e: KeyboardEventLike, api: ToolAPI): void;
  cursor?: string;
}

export interface LayerAdapter<LayerState = unknown> {
  drawMain?(
    ctx: CanvasRenderingContext2D,
    state: LayerState,
    env: RenderEnv,
  ): void; // main view
  drawSceneView?(
    ctx: CanvasRenderingContext2D,
    state: LayerState,
    env: RenderEnv,
  ): void; // scene/overview
  hitTest?(pt: Vec2, state: LayerState, env: RenderEnv): boolean;
  serialize?(state: LayerState): unknown; // default: state
  deserialize?(raw: unknown): LayerState; // default: validated via schema
}

export interface PropertyRendererProps<T> {
  state: T;
  update(patch: Partial<T>): void;
}
export type PropertyRenderer = (
  props: PropertyRendererProps<any>,
) => React.ReactNode;

export interface PanelRendererProps {
  app: AppAPI;
}
export type PanelRenderer = (props: PanelRendererProps) => React.ReactNode;
```

### App API (Stable Public Surface)

Keep lean and selector-based per ADR-0001 philosophy.

```ts
export interface AppAPI {
  // Scenes
  scene: {
    create(): string; // returns sceneId
    load(projectJson: unknown): void;
    save(): unknown; // returns projectJson
    getActiveId(): string | null;
  };

  // Layers
  layers: {
    add(type: string, initial?: unknown): string; // returns layerId
    update(id: string, patch: unknown): void;
    getById<T = unknown>(id: string): T | null;
    all(): Array<{ id: string; type: string; state: unknown }>;
  };

  // Commands & UI
  commands: {
    execute(id: string, payload?: unknown): Promise<void>;
    register(id: string, handler: CommandHandler): void; // namespaced by plugin
  };

  // Tools
  tools: {
    register(id: string, adapter: ToolAdapter): void;
    activate(id: string): void;
    active(): string | null;
  };

  // Rendering context
  render: {
    requestFrame(): void; // schedule re-draw
  };
}

export interface ProjectStorage {
  get(): unknown;
  set(next: unknown): void; // project-level persistence
}

export interface EventBus {
  on<T>(event: string, handler: (payload: T) => void): () => void;
  emit<T>(event: string, payload: T): void;
}

export interface RenderEnv {
  zoom: number;
  pixelRatio: number;
  size: { w: number; h: number };
}
```

## UI Composition & Slots

- Toolbar: Plugins contribute buttons in named groups. Example group `scene` will host New/Save/Load.
- Properties Panel: Plugins contribute sections keyed by target (scene/layer type) with ordering.
- Scene View: Layer adapters may add `drawSceneView` for miniature/overview rendering.
- Panels: Optional panels (e.g., terrain palette) mount into `left|right|bottom|floating` slots.

## Rendering Pipeline Contracts

- Z-ordered layers render via `drawMain` in sequence; functions are pure w.r.t. `state + env`.
- Scene view uses `drawSceneView` if provided; otherwise a default thumbnail renderer.
- Hit-testing is optional but encouraged for selection tools; predictable return for CUPID.

## Persistence & Versioning

- Each layer type declares a Valibot schema. Serialization defaults to state; custom (de)serializers supported for versioned migrations.
- Project JSON stores: scenes[], layers[], z-order, active scene, tool state.
- Manifest versioning: plugin semantic versions used for migration gates.

## Sandboxing & Security (Progressive)

- MVP: In-process ESM modules via dynamic `import()`. No `eval`. Capabilities gate access to `AppAPI` facets.
- Phase 2: Optional Web Worker isolation per plugin with message-based `AppAPI` proxy.
- CSP: Disallow remote code loading by default; allow file-based modules in dev.

## Loading & Distribution

- MVP Dev Loader: Local file URL or import map alias to ESM module + JSON manifest.
- Future: Package distribution via Module Federation or import-map registry; plugin signing optional.

## Example Mappings (From Product Brief)

1. Toolbar – Scene Toolgroup

- New Scene Button: plugin contributes command `app.scene.new` and toolbar item in group `scene`.
- Save Scene Button: plugin contributes `app.scene.save` in same group.
- Load Scene Button: plugin contributes `app.scene.load` in same group.

2. Layer Plugins

- Paper Layer: registers `type: 'paper'`, properties for aspect ratio, color; implements `drawMain` + `drawSceneView` + properties UI.
- Hexgrid Layer: registers `type: 'hexgrid'`, properties for size, rotation; implements both draw adapters + properties.
- Terrain Layer: registers `type: 'terrain'`, adds a toolbar button (or panel action) to add a new terrain layer; draws in both views + properties.

3. Paint Tool

- Registers `tool: 'paint.brush'`, `targetLayerTypes: ['terrain']`; implements pointer handlers to modify terrain layer state; binds an icon button.

## Acceptance Criteria (MVP)

- Load/unload a sample plugin at runtime; activation registers contributions without errors.
- Toolbar shows a `scene` group with New/Save/Load contributed buttons executing commands.
- Layer panel supports adding Paper, Hexgrid, Terrain layers; they render in main and scene views and expose properties.
- Paint tool button activates the tool and can modify terrain layers; undo/redo integrated with app state.
- Project save/load preserves plugin layer state.

## Testing Strategy

- Contract tests per extension point: commands, toolbar, tools, layers, properties, rendering.
- Rendering tests: snapshot pixel tests for deterministic primitives where feasible.
- Integration tests: end-to-end flows for the three scene buttons and paint-on-terrain workflow.
- Schema tests: validation and migration of layer state.

## Risks & Mitigations

- Surface area creep → Keep `AppAPI` narrow, versioned, and selector-based.
- Performance under many plugins → Lazy activation; only mount adapters on demand.
- Security → Progressive isolation; no remote code by default; capability gating.

## Delegation Plan (Subagents)

- Plugin Kernel: manifest loader, capability validation, lifecycle (activate/deactivate), event bus proxy.
- Commands & Toolbar: command registry, toolbar slot renderer, context expression evaluator.
- Layers: layer registry, rendering pipeline adapters, hit-test integration, z-order orchestration.
- Tools: tool registry, pointer event router, active tool management, cursor handling.
- Properties: property section registry, renderer for scene/layer scopes.
- Persistence: project JSON schema, plugin layer (de)serialization hooks, migration framework.
- Sample Plugins: scene-buttons, paper-layer, hexgrid-layer, terrain-layer, paint-tool.

## Future Optionality

- Worker sandbox for heavy or untrusted plugins.
- Plugin marketplace metadata and signing.
- Remote asset fetching with CSP allowlist and cache.
