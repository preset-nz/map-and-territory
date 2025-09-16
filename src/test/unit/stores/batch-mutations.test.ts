import { describe, it, expect, beforeEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import type { CellsDelta } from "@/stores/campaign";
import { registerLayerType } from "@/layers/registry";
import { FreeformType } from "@/layers/adapters/freeform-hex";

describe("Batch Layer State Mutations - Core Functionality", () => {
  beforeEach(() => {
    registerLayerType(FreeformType);
    const store = useCampaignStore.getState();
    store.setActive(null);
    store.createEmpty({ name: "Test Campaign" });
    store.addMap({ name: "Test Map" });
  });

  describe("applyLayerStateBatch", () => {
    it("should apply batch state mutations with single store update", () => {
      const s = useCampaignStore.getState();
      const layerId = s.addLayer("freeform", "Test Layer");

      let updateCount = 0;
      const unsubscribe = useCampaignStore.subscribe(() => {
        updateCount++;
      });

      try {
        const batchResult = s.applyLayerStateBatch(layerId!, (draft: any) => {
          draft.cells = {
            "0,0": { terrainId: "grass" },
            "1,1": { terrainId: "water" },
          };
          draft.opacity = 0.8;
        });

        // Verify single store update
        expect(updateCount).toBe(1);
        expect(batchResult.success).toBe(true);

        // Verify state was updated
        const current = useCampaignStore.getState().current!;
        const map = current.maps.find((m) => m.id === current.activeMapId);
        const layer = map?.layers?.find((l) => l.id === layerId);
        expect(layer?.state).toMatchObject({
          cells: {
            "0,0": { terrainId: "grass" },
            "1,1": { terrainId: "water" },
          },
          opacity: 0.8,
        });
      } finally {
        unsubscribe();
      }
    });

    it("should handle errors gracefully and leave state unchanged", () => {
      const s = useCampaignStore.getState();
      const layerId = s.addLayer("freeform", "Test Layer");

      const current = useCampaignStore.getState().current!;
      const map = current.maps.find((m) => m.id === current.activeMapId);
      const layer = map?.layers?.find((l) => l.id === layerId);
      const initialState = structuredClone(layer!.state);

      const batchResult = s.applyLayerStateBatch(layerId!, () => {
        throw new Error("Simulated error");
      });

      expect(batchResult.success).toBe(false);
      expect(batchResult.error).toContain("Simulated error");

      // Verify layer state was not changed
      const updatedCurrent = useCampaignStore.getState().current!;
      const updatedMap = updatedCurrent.maps.find(
        (m) => m.id === updatedCurrent.activeMapId,
      )!;
      const updatedLayer = updatedMap.layers?.find((l) => l.id === layerId);
      expect(updatedLayer!.state).toEqual(initialState);
    });
  });

  describe("applyCellsDelta", () => {
    it("should apply cell additions with single store update", () => {
      const s = useCampaignStore.getState();
      const layerId = s.addLayer("freeform", "Test Layer");

      let updateCount = 0;
      const unsubscribe = useCampaignStore.subscribe(() => {
        updateCount++;
      });

      try {
        const delta: CellsDelta = {
          set: {
            "0,0": { terrainId: "grass" },
            "1,1": { terrainId: "water" },
          },
        };

        const result = s.applyCellsDelta(layerId!, delta);

        expect(updateCount).toBe(1);
        expect(result.success).toBe(true);

        const current = useCampaignStore.getState().current!;
        const map = current.maps.find((m) => m.id === current.activeMapId);
        const layer = map?.layers?.find((l) => l.id === layerId);
        expect(layer?.state).toMatchObject({
          cells: {
            "0,0": { terrainId: "grass" },
            "1,1": { terrainId: "water" },
          },
        });
      } finally {
        unsubscribe();
      }
    });

    it("should apply cell deletions", () => {
      const s = useCampaignStore.getState();
      const layerId = s.addLayer("freeform", "Test Layer");

      // Add initial cells
      s.updateLayerState(layerId!, {
        cells: { "0,0": { terrainId: "grass" }, "1,1": { terrainId: "water" } },
      });

      const delta: CellsDelta = {
        delete: ["0,0"],
      };

      const result = s.applyCellsDelta(layerId!, delta);
      expect(result.success).toBe(true);

      const current = useCampaignStore.getState().current!;
      const map = current.maps.find((m) => m.id === current.activeMapId);
      const layer = map?.layers?.find((l) => l.id === layerId);
      expect(layer?.state).toMatchObject({
        cells: { "1,1": { terrainId: "water" } },
      });
      expect((layer?.state as any).cells["0,0"]).toBeUndefined();
    });

    it("should reject invalid batch operations", () => {
      const s = useCampaignStore.getState();
      const layerId = s.addLayer("freeform", "Test Layer");

      const invalidDelta: CellsDelta = {
        set: { "invalid-key": { terrainId: "grass" } },
      };

      const result = s.applyCellsDelta(layerId!, invalidDelta);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid cell key format");
    });

    it("should enforce operation limits", () => {
      const s = useCampaignStore.getState();
      const layerId = s.addLayer("freeform", "Test Layer");

      const hugeDelta: CellsDelta = { set: {} };
      for (let i = 0; i < 10001; i++) {
        hugeDelta.set![`${i},0`] = { terrainId: "grass" };
      }

      const result = s.applyCellsDelta(layerId!, hugeDelta);
      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds maximum of 10000 operations");
    });
  });

  describe("backward compatibility", () => {
    it("should maintain updateLayerState behavior", () => {
      const s = useCampaignStore.getState();
      const layerId = s.addLayer("freeform", "Test Layer");

      s.updateLayerState(layerId!, {
        cells: { "0,0": { terrainId: "grass" } },
        opacity: 0.7,
      });

      const current = useCampaignStore.getState().current!;
      const map = current.maps.find((m) => m.id === current.activeMapId);
      const layer = map?.layers?.find((l) => l.id === layerId);
      expect(layer?.state).toMatchObject({
        cells: { "0,0": { terrainId: "grass" } },
        opacity: 0.7,
      });
    });
  });
});
