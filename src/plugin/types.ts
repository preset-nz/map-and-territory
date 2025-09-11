export type CapabilityToken =
  | "hasActiveMap"
  | "hasActiveLayer"
  | "hasCampaign"
  | "hasProject"
  | `selectionIs:${"campaign" | "map" | "layer"}`
  | `canAddLayer:${string}`
  | `activeLayerIs:${string}`
  | "gridVisible";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion?: string;
  capabilities?: string[];
  /**
   * Plugin loading priority. Higher values load first.
   * Default is 10. Anchor layers (paper/hexgrid) should use 100.
   */
  priority?: number;
  contributes?: {
    commands?: Array<{ id: string; title: string; shortcut?: string }>;
    toolbar?: Array<{
      group: string;
      items: Array<{
        type: "button";
        command: string;
        icon?: string;
        label?: string;
        order?: number;
        enableWhen?: CapabilityToken[]; // Host-evaluated capability tokens
        disabledReason?: string; // Tooltip when disabled by precondition
      }>;
    }>;
  };
  entry?: string;
}

import type { AppAPI } from "@/plugin/appapi";

export interface PluginContext {
  // Narrow API surface in MVP; extend later
  log: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  app?: AppAPI; // stable host AppAPI seam (campaign facet)
}

export interface PluginModule {
  activate?: (ctx: PluginContext) => void | Promise<void>;
  deactivate?: (ctx: PluginContext) => void | Promise<void>;
  commands?: Record<string, (payload?: unknown) => Promise<void> | void>;
}

// CSS cursor mapping for tools declared by plugins
export type CssCursor = "default" | "crosshair" | "cell" | "pointer" | "move";
