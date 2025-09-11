import { describe, it, expect, vi } from "vitest";
import { loadPluginsWithPriority } from "@/plugin/loader";
import type { PluginManifest, PluginModule } from "@/plugin/types";

describe("Layer Creation Integration After Migration", () => {
  describe("Plugin Priority System", () => {
    it("loads plugins with correct priority ordering", async () => {
      const loadOrder: string[] = [];

      const paperManifest: PluginManifest = {
        id: "app.plugins.paper-layer",
        name: "Paper Layer",
        version: "0.1.0",
        priority: 100,
      };

      const hexgridManifest: PluginManifest = {
        id: "app.plugins.hexgrid-layer",
        name: "Hexgrid Layer",
        version: "0.1.0",
        priority: 100,
      };

      const contentManifest: PluginManifest = {
        id: "app.plugins.content",
        name: "Content Plugin",
        version: "0.1.0",
        priority: 10,
      };

      const paperModule: PluginModule = {
        activate: () => loadOrder.push("paper"),
      };

      const hexgridModule: PluginModule = {
        activate: () => loadOrder.push("hexgrid"),
      };

      const contentModule: PluginModule = {
        activate: () => loadOrder.push("content"),
      };

      await loadPluginsWithPriority([
        [contentManifest, contentModule], // Lower priority, should load last
        [paperManifest, paperModule], // High priority
        [hexgridManifest, hexgridModule], // High priority
      ]);

      // Anchor layers (priority 100) should load before content layers (priority 10)
      expect(loadOrder).toEqual(["hexgrid", "paper", "content"]);
    });

    it("handles plugins with same priority deterministically", async () => {
      const loadOrder: string[] = [];

      const pluginA: [PluginManifest, PluginModule] = [
        { id: "plugin-z", name: "Plugin Z", version: "1.0.0", priority: 50 },
        { activate: () => loadOrder.push("plugin-z") },
      ];

      const pluginB: [PluginManifest, PluginModule] = [
        { id: "plugin-a", name: "Plugin A", version: "1.0.0", priority: 50 },
        { activate: () => loadOrder.push("plugin-a") },
      ];

      await loadPluginsWithPriority([pluginA, pluginB]);

      // Should load in alphabetical order by ID when priorities are equal
      expect(loadOrder).toEqual(["plugin-a", "plugin-z"]);
    });

    it("uses default priority for plugins without priority field", async () => {
      const loadOrder: string[] = [];

      const noPriorityPlugin: [PluginManifest, PluginModule] = [
        { id: "no-priority", name: "No Priority", version: "1.0.0" }, // No priority field
        { activate: () => loadOrder.push("no-priority") },
      ];

      const lowPriorityPlugin: [PluginManifest, PluginModule] = [
        {
          id: "low-priority",
          name: "Low Priority",
          version: "1.0.0",
          priority: 5,
        },
        { activate: () => loadOrder.push("low-priority") },
      ];

      await loadPluginsWithPriority([noPriorityPlugin, lowPriorityPlugin]);

      // Default priority (10) should be higher than explicit priority (5)
      expect(loadOrder).toEqual(["no-priority", "low-priority"]);
    });
  });

  describe("Plugin System Validation", () => {
    it("validates that priority-based loading function exists and works", async () => {
      const testManifest: PluginManifest = {
        id: "test-plugin",
        name: "Test Plugin",
        version: "1.0.0",
        priority: 100,
      };

      const testModule: PluginModule = {
        activate: vi.fn(),
      };

      // Should not throw
      await expect(
        loadPluginsWithPriority([[testManifest, testModule]]),
      ).resolves.toBeUndefined();

      // Should call activate function
      expect(testModule.activate).toHaveBeenCalledTimes(1);
    });

    it("handles empty plugin array gracefully", async () => {
      await expect(loadPluginsWithPriority([])).resolves.toBeUndefined();
    });

    it("maintains plugin loading order across multiple runs", async () => {
      const runs = 2;
      const results: string[][] = [];

      for (let i = 0; i < runs; i++) {
        const loadOrder: string[] = [];

        const plugins: Array<[PluginManifest, PluginModule]> = [
          [
            { id: "plugin-c", name: "C", version: "1.0.0", priority: 10 },
            { activate: async () => loadOrder.push("c") },
          ],
          [
            { id: "plugin-a", name: "A", version: "1.0.0", priority: 10 },
            { activate: async () => loadOrder.push("a") },
          ],
          [
            { id: "plugin-b", name: "B", version: "1.0.0", priority: 10 },
            { activate: async () => loadOrder.push("b") },
          ],
        ];

        await loadPluginsWithPriority(plugins);
        results.push([...loadOrder]); // Create a copy
      }

      // All runs should produce the same deterministic order
      const expected = ["a", "b", "c"];
      results.forEach((result, index) => {
        expect(result).toEqual(expected);
      });
    });
  });
});
