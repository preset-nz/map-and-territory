import { describe, it, expect, beforeEach } from "vitest";
import { useCampaignStore, withBatchMetrics } from "@/stores/campaign";
import type { CellsDelta } from "@/stores/campaign";
import { registerLayerType } from "@/layers/registry";
import { FreeformType } from "@/layers/adapters/freeform-hex";

describe("Batch Operations Performance", () => {
  beforeEach(() => {
    registerLayerType(FreeformType);
    const store = useCampaignStore.getState();
    store.setActive(null);
    store.createEmpty({ name: "Test Campaign" });
    store.addMap({ name: "Test Map" });
  });

  it("should handle 1000 cell operations in <50ms", () => {
    const s = useCampaignStore.getState();
    const layerId = s.addLayer("freeform", "Test Layer");

    // Create 1000-cell batch (800 sets + 200 deletes)
    const delta: CellsDelta = { set: {}, delete: [] };
    for (let i = 0; i < 800; i++) {
      delta.set![`${i},0`] = { terrainId: `terrain_${i}` };
    }
    for (let i = 800; i < 1000; i++) {
      delta.delete!.push(`${i},0`); // These won't exist, but count as operations
    }

    const result = withBatchMetrics(
      () => s.applyCellsDelta(layerId!, delta),
      "1000-cell-batch",
    );

    expect(result.success).toBe(true);
    expect(result.metrics!.executionTimeMs).toBeLessThan(50);
    expect(result.metrics!.operationCount).toBe(1000);
  });

  it("should use <10MB memory for any batch size", () => {
    const s = useCampaignStore.getState();
    const layerId = s.addLayer("freeform", "Test Layer");

    const delta: CellsDelta = { set: {} };
    for (let i = 0; i < 1000; i++) {
      delta.set![`${i},0`] = { terrainId: "grass" };
    }

    const result = withBatchMetrics(
      () => s.applyCellsDelta(layerId!, delta),
      "memory-test",
    );

    expect(result.success).toBe(true);
    // Memory usage should be reasonable when available
    if (result.metrics!.memoryUsageMB !== undefined) {
      expect(result.metrics!.memoryUsageMB).toBeLessThan(10);
    }
  });

  it("should trigger single render invalidation per batch", () => {
    const s = useCampaignStore.getState();
    const layerId = s.addLayer("freeform", "Test Layer");

    let updateCount = 0;
    const unsubscribe = useCampaignStore.subscribe(() => {
      updateCount++;
    });

    try {
      const largeDelta: CellsDelta = { set: {} };
      for (let i = 0; i < 500; i++) {
        largeDelta.set![`${i},0`] = { terrainId: "grass" };
      }

      const result = s.applyCellsDelta(layerId!, largeDelta);

      expect(result.success).toBe(true);
      expect(updateCount).toBe(1); // Single store update regardless of batch size
      expect(result.metrics?.operationCount).toBe(500);
    } finally {
      unsubscribe();
    }
  });
});
