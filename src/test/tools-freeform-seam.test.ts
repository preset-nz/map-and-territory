import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";
import { registerLayerType } from "@/layers/registry";
import { FreeformType } from "@/layers/adapters/freeform-hex";
import { freeformModule } from "@/plugin/builtin/freeform";
import { AppAPI } from "@/appapi";

const paintTool = freeformModule.tools!.find((t) => t.id === "paint")!;
const eraseTool = freeformModule.tools!.find((t) => t.id === "erase")!;

function getCtx(layerId: string) {
  return {
    app: AppAPI,
    updateLayerState: useCampaignStore.getState().updateLayerState,
    applyLayerState: useCampaignStore.getState().applyLayerState,
    getActiveLayerState: <T = unknown>(id?: string): T | null => {
      const cur = useCampaignStore.getState().current;
      const activeId = cur?.activeMapId ?? null;
      const map = cur?.maps.find((m) => m.id === activeId);
      const lid = id ?? layerId;
      const layer = map?.layers?.find((l) => l.id === lid);
      return (layer?.state as T) ?? null;
    },
    selection: { kind: "layer", id: layerId },
  } as const;
}

const env = {
  zoom: 1,
  pixelRatio: 1,
  size: { w: 100, h: 100 },
  paperRect: { x: 0, y: 0, w: 100, h: 100 },
  camera: { x: 0, y: 0, zoom: 1 },
  grid: { size: 16, orientation: "pointy" as const },
  palette: undefined,
};

describe("Freeform tools use ToolContext seams", () => {
  beforeEach(() => {
    const s = useCampaignStore.getState();
    s.setActive(null);
    s.createEmpty({ name: "Seam Campaign" });
    s.addMap({ name: "Map 01" });
    registerLayerType(FreeformType);
  });
  afterEach(() => {
    useCampaignStore.getState().setActive(null);
    useSelectionStore.getState().clear();
  });

  it("paint tool writes via applyLayerState; erase removes cell", () => {
    const store = useCampaignStore.getState();
    const layerId = store.addLayer("freeform")!;
    useSelectionStore.getState().selectLayer(layerId);
    // Configure brush color on layer state
    store.updateLayerState(layerId, { brushColor: "#112233" });

    const ctx = getCtx(layerId);
    // Center point maps to {0,0} for origin at center
    paintTool.onPointerDown?.({ x: 50, y: 50 }, env as any, ctx as any);

    const cur = useCampaignStore.getState().current!;
    const map = cur.maps.find((m) => m.id === cur.activeMapId)!;
    const layer = (map.layers ?? []).find((l) => l.id === layerId)! as {
      state: Record<string, any>;
    };
    expect(layer.state.cells["0,0"]).toBeTruthy();
    expect(layer.state.cells["0,0"].color).toBe("#112233");

    // Now erase
    eraseTool.onPointerDown?.({ x: 50, y: 50 }, env as any, ctx as any);
    const cur2 = useCampaignStore.getState().current!;
    const map2 = cur2.maps.find((m) => m.id === cur2.activeMapId)!;
    const layer2 = (map2.layers ?? []).find((l) => l.id === layerId)! as {
      state: Record<string, any>;
    };
    expect(layer2.state.cells["0,0"]).toBeUndefined();
  });
});
