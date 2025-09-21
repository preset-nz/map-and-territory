import { registerCommand, unregisterCommand } from "@/lib/commands";
import { getAppAPI } from "@/plugin/appapi";
import type {
  PluginManifest,
  PluginModule,
  PluginContext,
  CapabilityToken,
  CssCursor,
  SceneAdapter,
  EnvProvider,
  ToolHandler,
} from "./types";

type LoadedPlugin = {
  manifest: PluginManifest;
  module: PluginModule;
  disposables: Array<() => void>;
  priority: number;
};

const plugins = new Map<string, LoadedPlugin>();
const toolbarContribs: Array<{
  pluginId: string;
  group: string;
  command: string;
  icon?: string;
  label?: string;
  order?: number;
  enableWhen?: CapabilityToken[];
  disabledReason?: string;
}> = [];

// Stable snapshot for useSyncExternalStore consumers. Only changes when data changes.
let toolbarSnapshot: ReadonlyArray<{
  pluginId: string;
  group: string;
  command: string;
  icon?: string;
  label?: string;
  order?: number;
  enableWhen?: CapabilityToken[];
  disabledReason?: string;
}> = [];

function recomputeToolbarSnapshot() {
  // Freeze to avoid accidental mutation by consumers
  toolbarSnapshot = Object.freeze([...toolbarContribs]);
}

const toolCursors = new Map<string, CssCursor>();
// M1 registries (not yet consumed by renderer)
let activeSceneAdapter: SceneAdapter | null = null;
const envProviderList: EnvProvider[] = [];
// Core, always-on provider: derive grid from Hexgrid layer state to avoid
// bootstrap timing races. Plugins can override with higher priority (>= 0).
const coreGridEnvProvider: EnvProvider = {
  priority: -100,
  provide(frame) {
    const hex = frame.layers.find((l) => l.type === "hexgrid");
    if (!hex || !hex.state) return {};
    const st = hex.state as Record<string, unknown>;
    const size = Math.max(4, Number(st.size ?? 16));
    const orientation = st.orientation === "flat" ? "flat" : "pointy";
    return { grid: { size, orientation } } as const;
  },
};
envProviderList.push(coreGridEnvProvider);
envProviderList.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
const toolRegistry = new Map<string, ToolHandler>();

function notifyToolbarUpdate() {
  if (typeof globalThis === "undefined") return;
  const target = globalThis as unknown as EventTarget & {
    CustomEvent?: typeof CustomEvent;
  };
  const CustomEventCtor = target.CustomEvent;
  if (
    typeof target.dispatchEvent === "function" &&
    typeof CustomEventCtor === "function"
  ) {
    try {
      target.dispatchEvent(new CustomEventCtor("plugin:toolbar-updated"));
    } catch {
      // Non-DOM contexts (e.g. worker without CustomEvent) simply skip notifications.
    }
  }
}

export function getLoadedPluginIds() {
  return Array.from(plugins.keys());
}

export function getToolbarContributions() {
  // Return a stable snapshot for useSyncExternalStore semantics
  return toolbarSnapshot as ReadonlyArray<{
    pluginId: string;
    group: string;
    command: string;
    icon?: string;
    label?: string;
    order?: number;
    enableWhen?: CapabilityToken[];
    disabledReason?: string;
  }>;
}

export function registerToolCursor(tool: string, cursor: CssCursor) {
  toolCursors.set(tool, cursor);
  return () => toolCursors.delete(tool);
}

export function getCursorForTool(tool: string): CssCursor | undefined {
  return toolCursors.get(tool);
}

// ----- Render SPI registries (M1) -----
export function registerSceneAdapter(scene: SceneAdapter) {
  activeSceneAdapter = scene;
  return () => {
    if (activeSceneAdapter === scene) activeSceneAdapter = null;
  };
}

export function getSceneAdapter(): SceneAdapter | null {
  return activeSceneAdapter;
}

export function registerEnvProvider(provider: EnvProvider) {
  envProviderList.push(provider);
  // Keep providers ordered by priority (ascending)
  envProviderList.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  return () => {
    const idx = envProviderList.indexOf(provider);
    if (idx >= 0) envProviderList.splice(idx, 1);
  };
}

import type { SceneFrame } from "@/render/types";
import type { RenderEnv } from "@/layers/types";

export function composeEnv(frame: SceneFrame): Partial<RenderEnv> {
  const out: Partial<RenderEnv> = {};
  for (const p of envProviderList) {
    try {
      Object.assign(out, p.provide(frame) || {});
    } catch (e) {
      console.warn("[plugin] EnvProvider threw:", e);
    }
  }
  return out;
}

export function registerTools(tools: ToolHandler[]) {
  for (const t of tools) toolRegistry.set(t.id, t);
  return () => {
    for (const t of tools) toolRegistry.delete(t.id);
  };
}

export function getTool(id: string): ToolHandler | undefined {
  return toolRegistry.get(id);
}

/**
 * Load plugins in priority order (higher priority loads first)
 * Plugins with same priority are loaded by id (alphabetical)
 */
export async function loadPluginsWithPriority(
  pluginData: Array<[PluginManifest, PluginModule]>,
): Promise<void>;
export async function loadPluginsWithPriority(
  pluginData: Array<{ manifest: PluginManifest; module: PluginModule }>,
): Promise<void>;
export async function loadPluginsWithPriority(
  pluginData:
    | Array<[PluginManifest, PluginModule]>
    | Array<{ manifest: PluginManifest; module: PluginModule }>,
): Promise<void> {
  type Pair = [PluginManifest, PluginModule];
  type Obj = { manifest: PluginManifest; module: PluginModule };
  const isPair = (i: Pair | Obj): i is Pair => Array.isArray(i);
  // Normalize input to pairs to support both tuple and object forms
  const pairs: Array<Pair> = (pluginData as Array<Pair | Obj>).map((item) =>
    isPair(item) ? item : [item.manifest, item.module],
  );

  // Before loading, unload any previously loaded plugins with the same IDs
  // This ensures deterministic activation across multiple runs (important for tests)
  const incomingIds = new Set(pairs.map(([m]) => m.id));
  for (const id of Array.from(plugins.keys())) {
    if (incomingIds.has(id)) {
      await unloadPlugin(id);
    }
  }

  // Sort by priority (descending) then by id (ascending) for deterministic order
  const sortedPlugins = [...pairs].sort((a, b) => {
    const priorityA = a[0].priority ?? 10;
    const priorityB = b[0].priority ?? 10;
    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }
    return a[0].id.localeCompare(b[0].id); // Alphabetical for same priority
  });

  // Load plugins sequentially to maintain order
  for (const [manifest, module] of sortedPlugins) {
    try {
      await loadPlugin(manifest, module);
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error);
      // Continue loading other plugins
    }
  }

  // Fire a deferred update to ensure subscribers that mounted slightly later
  // still receive a change signal (avoids race on initial hydration).
  if (typeof queueMicrotask === "function") {
    queueMicrotask(() => notifyToolbarUpdate());
  } else if (typeof setTimeout === "function") {
    setTimeout(() => notifyToolbarUpdate(), 0);
  }
}

export async function loadPlugin(
  manifest: PluginManifest,
  module: PluginModule,
) {
  if (plugins.has(manifest.id)) return; // already loaded

  const disposables: Array<() => void> = [];

  // Register commands from manifest and module
  const cmdDefs = manifest.contributes?.commands ?? [];
  for (const def of cmdDefs) {
    const handler = module.commands?.[def.id];
    const h = async (payload?: unknown) => {
      if (handler) return await handler(payload);
      // No handler provided by module; noop for now
    };
    registerCommand(def.id, h);
    disposables.push(() => unregisterCommand(def.id));
  }

  // Collect toolbar contributions (UI integration deferred)
  const tbDefs = manifest.contributes?.toolbar ?? [];
  for (const group of tbDefs) {
    for (const item of group.items) {
      if (item.type === "button") {
        const exists = toolbarContribs.some(
          (t) =>
            t.pluginId === manifest.id &&
            t.group === group.group &&
            t.command === item.command,
        );
        if (!exists) {
          toolbarContribs.push({
            pluginId: manifest.id,
            group: group.group,
            command: item.command,
            icon: item.icon,
            label: item.label,
            order: item.order,
            enableWhen: item.enableWhen,
            disabledReason: item.disabledReason,
          });
        }
      }
    }
  }
  recomputeToolbarSnapshot();
  notifyToolbarUpdate();

  const ctx: PluginContext = {
    log: {
      info: (...args) => console.info(`[plugin:${manifest.id}]`, ...args),
      warn: (...args) => console.warn(`[plugin:${manifest.id}]`, ...args),
      error: (...args) => console.error(`[plugin:${manifest.id}]`, ...args),
    },
    app: getAppAPI(),
  };

  if (module.activate) await module.activate(ctx);

  // Register optional Render SPI contributions (no-op in M1)
  if (module.scene) registerSceneAdapter(module.scene);
  if (module.envProviders)
    for (const p of module.envProviders) registerEnvProvider(p);
  if (module.tools) registerTools(module.tools);

  const priority = manifest.priority ?? 10;
  plugins.set(manifest.id, { manifest, module, disposables, priority });
}

export async function unloadPlugin(id: string) {
  const loaded = plugins.get(id);
  if (!loaded) return;
  try {
    if (loaded.module.deactivate)
      await loaded.module.deactivate({
        log: { info: () => {}, warn: () => {}, error: () => {} },
      } as PluginContext);
  } finally {
    for (const d of loaded.disposables) {
      try {
        d();
      } catch {}
    }
    // Remove toolbar contributions for this plugin
    for (let i = toolbarContribs.length - 1; i >= 0; i--) {
      if (toolbarContribs[i].pluginId === id) toolbarContribs.splice(i, 1);
    }
    // No per-plugin cleanup needed for tool cursors in MVP
    recomputeToolbarSnapshot();
    notifyToolbarUpdate();
    plugins.delete(id);
  }
}
