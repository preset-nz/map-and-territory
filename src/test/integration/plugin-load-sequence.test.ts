import { describe, it, expect, vi } from "vitest";
import { loadPluginsWithPriority } from "@/plugin/loader";
import type { PluginManifest, PluginModule } from "@/plugin/types";

describe("Plugin Load Sequence Integration", () => {
  describe("Priority-Based Plugin Loading", () => {
    it("loads plugins in correct priority order", async () => {
      const loadOrder: string[] = [];

      // Create plugins with different priorities
      const plugins: Array<[PluginManifest, PluginModule]> = [
        [
          { id: "freeform", name: "Freeform", version: "1.0.0" }, // priority: undefined (10)
          { activate: async () => loadOrder.push("freeform") },
        ],
        [
          { id: "paper", name: "Paper", version: "1.0.0", priority: 100 },
          { activate: async () => loadOrder.push("paper") },
        ],
        [
          { id: "hex-noise", name: "Hex Noise", version: "1.0.0" }, // priority: undefined (10)
          { activate: async () => loadOrder.push("hex-noise") },
        ],
        [
          { id: "hexgrid", name: "Hexgrid", version: "1.0.0", priority: 100 },
          { activate: async () => loadOrder.push("hexgrid") },
        ],
      ];

      await loadPluginsWithPriority(plugins);

      // Should load anchor layers first (priority 100), then content layers (priority 10)
      // Within same priority, should load alphabetically by ID
      expect(loadOrder).toEqual(["hexgrid", "paper", "freeform", "hex-noise"]);
    });

    it("ensures anchor layers load before content layers", async () => {
      const loadOrder: string[] = [];

      const anchorPlugins = [
        { id: "paper", priority: 100 },
        { id: "hexgrid", priority: 100 },
      ];

      const contentPlugins = [
        { id: "freeform", priority: 10 },
        { id: "hex-noise", priority: 10 },
      ];

      const allPlugins = [...contentPlugins, ...anchorPlugins].map(
        (p) =>
          [
            { id: p.id, name: p.id, version: "1.0.0", priority: p.priority },
            { activate: () => loadOrder.push(p.id) },
          ] as [PluginManifest, PluginModule],
      );

      await loadPluginsWithPriority(allPlugins);

      // Find indices of anchor and content plugins
      const anchorIndices = anchorPlugins.map((p) => loadOrder.indexOf(p.id));
      const contentIndices = contentPlugins.map((p) => loadOrder.indexOf(p.id));

      // All anchor plugins should load before all content plugins
      const maxAnchorIndex = Math.max(...anchorIndices);
      const minContentIndex = Math.min(...contentIndices);

      expect(maxAnchorIndex).toBeLessThan(minContentIndex);
    });

    it("loads plugins deterministically with same priority", async () => {
      // Test multiple runs to ensure consistent ordering
      const runs = 3;
      const orderResults: string[][] = [];

      for (let i = 0; i < runs; i++) {
        const loadOrder: string[] = [];

        const plugins: Array<[PluginManifest, PluginModule]> = [
          [
            { id: "plugin-c", name: "C", version: "1.0.0", priority: 10 },
            { activate: () => loadOrder.push("plugin-c") },
          ],
          [
            { id: "plugin-a", name: "A", version: "1.0.0", priority: 10 },
            { activate: () => loadOrder.push("plugin-a") },
          ],
          [
            { id: "plugin-b", name: "B", version: "1.0.0", priority: 10 },
            { activate: () => loadOrder.push("plugin-b") },
          ],
        ];

        await loadPluginsWithPriority(plugins);
        orderResults.push(loadOrder);
      }

      // All runs should produce the same order (alphabetical by ID)
      const expectedOrder = ["plugin-a", "plugin-b", "plugin-c"];
      orderResults.forEach((order) => {
        expect(order).toEqual(expectedOrder);
      });
    });
  });

  describe("Complete Plugin Loading Sequence", () => {
    it("handles plugin loading failures gracefully", async () => {
      const workingLoadOrder: string[] = [];

      const workingPlugin: [PluginManifest, PluginModule] = [
        { id: "working", name: "Working", version: "1.0.0", priority: 10 },
        { activate: () => workingLoadOrder.push("working") },
      ];

      const failingPlugin: [PluginManifest, PluginModule] = [
        { id: "failing", name: "Failing", version: "1.0.0", priority: 20 },
        {
          activate: () => {
            throw new Error("Plugin failed to load");
          },
        },
      ];

      // Should not throw and should continue with other plugins
      await expect(
        loadPluginsWithPriority([failingPlugin, workingPlugin]),
      ).resolves.toBeUndefined();

      // Working plugin should have loaded despite failing plugin
      expect(workingLoadOrder).toContain("working");
    });

    it("validates plugin manifest priority handling", async () => {
      const loadOrder: string[] = [];

      const plugins: Array<[PluginManifest, PluginModule]> = [
        [
          { id: "no-priority", name: "No Priority", version: "1.0.0" }, // undefined priority
          { activate: () => loadOrder.push("no-priority") },
        ],
        [
          {
            id: "high-priority",
            name: "High Priority",
            version: "1.0.0",
            priority: 100,
          },
          { activate: () => loadOrder.push("high-priority") },
        ],
        [
          {
            id: "low-priority",
            name: "Low Priority",
            version: "1.0.0",
            priority: 1,
          },
          { activate: () => loadOrder.push("low-priority") },
        ],
      ];

      await loadPluginsWithPriority(plugins);

      // Should load in priority order: high (100), no-priority (default 10), low (1)
      expect(loadOrder).toEqual([
        "high-priority",
        "no-priority",
        "low-priority",
      ]);
    });

    it("handles empty plugin array", async () => {
      await expect(loadPluginsWithPriority([])).resolves.toBeUndefined();
    });

    it("handles single plugin", async () => {
      const activated = vi.fn();
      const plugin: [PluginManifest, PluginModule] = [
        { id: "single", name: "Single", version: "1.0.0", priority: 50 },
        { activate: activated },
      ];

      await loadPluginsWithPriority([plugin]);
      expect(activated).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling", () => {
    it("continues loading remaining plugins when one fails", async () => {
      const loadOrder: string[] = [];

      const plugins: Array<[PluginManifest, PluginModule]> = [
        [
          { id: "first", name: "First", version: "1.0.0", priority: 30 },
          { activate: () => loadOrder.push("first") },
        ],
        [
          { id: "failing", name: "Failing", version: "1.0.0", priority: 20 },
          {
            activate: () => {
              throw new Error("Failed");
            },
          },
        ],
        [
          { id: "last", name: "Last", version: "1.0.0", priority: 10 },
          { activate: () => loadOrder.push("last") },
        ],
      ];

      await loadPluginsWithPriority(plugins);

      // Should load non-failing plugins in correct order
      expect(loadOrder).toEqual(["first", "last"]);
    });

    it("handles plugins without activate function", async () => {
      const plugin: [PluginManifest, PluginModule] = [
        { id: "no-activate", name: "No Activate", version: "1.0.0" },
        {}, // No activate function
      ];

      // Should not throw
      await expect(loadPluginsWithPriority([plugin])).resolves.toBeUndefined();
    });
  });
});
