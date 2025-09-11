import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadPluginsWithPriority } from "@/plugin/loader";
import type { PluginManifest, PluginModule } from "@/plugin/types";

// Mock the registerLayerType function
vi.mock("@/layers/registry", () => ({
  registerLayerType: vi.fn(),
}));

vi.mock("@/plugin/appapi", () => ({
  getAppAPI: () => ({}),
}));

describe("Plugin Priority Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads plugins in priority order (higher priority first)", async () => {
    const loadOrder: string[] = [];

    const lowPriorityManifest: PluginManifest = {
      id: "low-priority",
      name: "Low Priority Plugin",
      version: "1.0.0",
      priority: 1,
    };

    const highPriorityManifest: PluginManifest = {
      id: "high-priority",
      name: "High Priority Plugin",
      version: "1.0.0",
      priority: 100,
    };

    const lowPriorityModule: PluginModule = {
      activate: async () => {
        loadOrder.push("low-priority");
      },
    };

    const highPriorityModule: PluginModule = {
      activate: async () => {
        loadOrder.push("high-priority");
      },
    };

    await loadPluginsWithPriority([
      [lowPriorityManifest, lowPriorityModule],
      [highPriorityManifest, highPriorityModule],
    ]);

    expect(loadOrder).toEqual(["high-priority", "low-priority"]);
  });

  it("falls back to ID sorting when priorities are equal", async () => {
    const loadOrder: string[] = [];

    const pluginBManifest: PluginManifest = {
      id: "plugin-b",
      name: "Plugin B",
      version: "1.0.0",
      priority: 10,
    };

    const pluginAManifest: PluginManifest = {
      id: "plugin-a",
      name: "Plugin A",
      version: "1.0.0",
      priority: 10,
    };

    const pluginBModule: PluginModule = {
      activate: async () => {
        loadOrder.push("plugin-b");
      },
    };

    const pluginAModule: PluginModule = {
      activate: async () => {
        loadOrder.push("plugin-a");
      },
    };

    await loadPluginsWithPriority([
      [pluginBManifest, pluginBModule],
      [pluginAManifest, pluginAModule],
    ]);

    // Should load in alphabetical order by ID when priorities are equal
    expect(loadOrder).toEqual(["plugin-a", "plugin-b"]);
  });

  it("assigns default priority of 10 when priority is undefined", async () => {
    const loadOrder: string[] = [];

    const noPriorityManifest: PluginManifest = {
      id: "no-priority",
      name: "No Priority Plugin",
      version: "1.0.0",
      // priority is undefined
    };

    const lowPriorityManifest: PluginManifest = {
      id: "low-priority",
      name: "Low Priority Plugin",
      version: "1.0.0",
      priority: 5,
    };

    const noPriorityModule: PluginModule = {
      activate: async () => {
        console.log("Activating no-priority");
        loadOrder.push("no-priority");
      },
    };

    const lowPriorityModule2: PluginModule = {
      activate: async () => {
        console.log("Activating low-priority");
        try {
          loadOrder.push("low-priority");
          console.log("Low-priority activation completed");
        } catch (error) {
          console.error("Error in low-priority activation:", error);
          throw error;
        }
      },
    };

    await loadPluginsWithPriority([
      [noPriorityManifest, noPriorityModule],
      [lowPriorityManifest, lowPriorityModule2],
    ]);

    // Default priority (10) should be higher than explicit priority (5)
    expect(loadOrder).toEqual(["no-priority", "low-priority"]);
  });

  it("handles mixed priority scenarios correctly", async () => {
    const loadOrder: string[] = [];

    const pluginManifests: PluginManifest[] = [
      { id: "anchor-a", name: "Anchor A", version: "1.0.0", priority: 100 },
      { id: "content-z", name: "Content Z", version: "1.0.0", priority: 10 },
      { id: "anchor-b", name: "Anchor B", version: "1.0.0", priority: 100 },
      { id: "content-a", name: "Content A", version: "1.0.0" }, // undefined priority = 10
      { id: "tool", name: "Tool", version: "1.0.0", priority: 1 },
    ];

    const pluginModules: PluginModule[] = pluginManifests.map((manifest) => ({
      activate: async () => {
        loadOrder.push(manifest.id);
      },
    }));

    const pluginPairs: Array<[PluginManifest, PluginModule]> =
      pluginManifests.map((manifest, index) => [
        manifest,
        pluginModules[index],
      ]);

    await loadPluginsWithPriority(pluginPairs);

    // Expected order: anchor layers (100) by ID, then content (10) by ID, then tools (1)
    expect(loadOrder).toEqual([
      "anchor-a",
      "anchor-b", // priority 100, sorted by ID
      "content-a",
      "content-z", // priority 10, sorted by ID
      "tool", // priority 1
    ]);
  });

  it("handles empty plugin array", async () => {
    // Should not throw error
    await expect(loadPluginsWithPriority([])).resolves.toBeUndefined();
  });

  it("handles plugin activation errors gracefully", async () => {
    const loadOrder: string[] = [];

    const workingManifest: PluginManifest = {
      id: "working-plugin",
      name: "Working Plugin",
      version: "1.0.0",
      priority: 10,
    };

    const failingManifest: PluginManifest = {
      id: "failing-plugin",
      name: "Failing Plugin",
      version: "1.0.0",
      priority: 20,
    };

    const workingModule: PluginModule = {
      activate: async () => {
        loadOrder.push("working-plugin");
      },
    };

    const failingModule: PluginModule = {
      activate: async () => {
        throw new Error("Plugin activation failed");
      },
    };

    // Should continue loading other plugins even if one fails
    await loadPluginsWithPriority([
      [failingManifest, failingModule], // Failing plugin has higher priority (20)
      [workingManifest, workingModule], // Working plugin has lower priority (10)
    ]);

    // Working plugin should still have loaded despite failing plugin
    expect(loadOrder).toEqual(["working-plugin"]);
  });
});
