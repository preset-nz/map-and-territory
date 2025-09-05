export type CapabilityToken =
  | "hasActiveMap"
  | "hasActiveLayer"
  | "hasCampaign"
  | "hasProject"
  | `selectionIs:${"campaign" | "map" | "layer"}`
  | `canAddLayer:${string}`;

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion?: string;
  capabilities?: string[];
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

export interface PluginContext {
  // Narrow API surface in MVP; extend later
  log: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

export interface PluginModule {
  activate?: (ctx: PluginContext) => void | Promise<void>;
  deactivate?: (ctx: PluginContext) => void | Promise<void>;
  commands?: Record<string, (payload?: unknown) => Promise<void> | void>;
}
