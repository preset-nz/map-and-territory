import { registerCommand, unregisterCommand } from "@/lib/commands";
import { getAppAPI } from "@/plugin/appapi";
import type {
  PluginManifest,
  PluginModule,
  PluginContext,
  CapabilityToken,
} from "./types";

type LoadedPlugin = {
  manifest: PluginManifest;
  module: PluginModule;
  disposables: Array<() => void>;
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

function notifyToolbarUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("plugin:toolbar-updated"));
  }
}

export function getLoadedPluginIds() {
  return Array.from(plugins.keys());
}

export function getToolbarContributions() {
  // Return the live array reference so identity is stable between updates.
  return toolbarContribs as ReadonlyArray<{
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

  plugins.set(manifest.id, { manifest, module, disposables });
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
    notifyToolbarUpdate();
    plugins.delete(id);
  }
}
