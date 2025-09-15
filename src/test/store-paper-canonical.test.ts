import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { registerLayerType } from "@/layers/registry";
import { PaperType } from "@/layers/adapters/paper";
import { HexgridType } from "@/layers/adapters/hexgrid";

describe("Paper layer canonicalization", () => {
  beforeEach(() => {
    const store = useCampaignStore.getState();
    store.setActive(null);
    registerLayerType(PaperType);
    registerLayerType(HexgridType);
    store.createEmpty({ name: "Paper Canon" });
    store.addMap({ name: "Map 01" });
  });

  afterEach(() => {
    useCampaignStore.getState().setActive(null);
  });

  function getActiveMap() {
    const cur = useCampaignStore.getState().current!;
    return cur.maps.find((m) => m.id === cur.activeMapId)!;
  }

  function getPaperLayer(map: ReturnType<typeof getActiveMap>) {
    return (map.layers ?? []).find((l) => l.type === "paper")! as {
      id: string;
      state: Record<string, unknown>;
    };
  }

  it("keeps map.paper in sync when updateLayerState mutates the paper layer", () => {
    const map = getActiveMap();
    const paperLayer = getPaperLayer(map);

    useCampaignStore.getState().updateLayerState(paperLayer.id, {
      color: "#112233",
    });

    const nextMap = getActiveMap();
    expect(nextMap.paper.color).toBe("#112233");
    const nextPaper = getPaperLayer(nextMap);
    expect(nextPaper.state.color).toBe("#112233");
  });

  it("keeps map.paper in sync when applyLayerState commits aspect changes", () => {
    const map = getActiveMap();
    const paperLayer = getPaperLayer(map);

    useCampaignStore.getState().applyLayerState(paperLayer.id, (draft) => {
      draft.aspect = "square";
    });

    const nextMap = getActiveMap();
    expect(nextMap.paper.aspect).toBe("square");
    const nextPaper = getPaperLayer(nextMap);
    expect(nextPaper.state.aspect).toBe("square");
  });

  it("setMapPaperColor updates the paper layer state", () => {
    const map = getActiveMap();
    const paperLayer = getPaperLayer(map);

    useCampaignStore.getState().setMapPaperColor(map.id, "#445566");

    const nextMap = getActiveMap();
    expect(nextMap.paper.color).toBe("#445566");
    const nextPaper = getPaperLayer(nextMap);
    expect(nextPaper.state.color).toBe("#445566");
    expect(nextPaper.id).toBe(paperLayer.id);
  });

  it("normalizes incoming campaigns by preferring paper layer state when defined", () => {
    const campaign = {
      id: "camp-1",
      version: 1,
      name: "Imported",
      description: "",
      maps: [
        {
          id: "map-1",
          name: "Map",
          description: "",
          visible: true,
          paper: { aspect: "4:3" as const, color: "#0f0f0f" },
          layers: [
            {
              id: "paper-1",
              type: "paper",
              name: "Paper",
              visible: true,
              state: { aspect: "square", color: "#ff00ff" },
            },
          ],
        },
      ],
      activeMapId: "map-1",
    } satisfies ReturnType<typeof useCampaignStore.getState>["current"];

    useCampaignStore.getState().setActive(campaign);
    const nextMap = getActiveMap();
    expect(nextMap.paper.color).toBe("#ff00ff");
    expect(nextMap.paper.aspect).toBe("square");
    const nextPaper = getPaperLayer(nextMap);
    expect(nextPaper.state.color).toBe("#ff00ff");
    expect(nextPaper.state.aspect).toBe("square");
  });

  it("hydrates paper layer from map.paper when layer lacks values", () => {
    const campaign = {
      id: "camp-2",
      version: 1,
      name: "Imported",
      description: "",
      maps: [
        {
          id: "map-2",
          name: "Map",
          description: "",
          visible: true,
          paper: { aspect: "4:3" as const, color: "#aaaaaa" },
          layers: [
            {
              id: "paper-2",
              type: "paper",
              name: "Paper",
              visible: true,
              state: {},
            },
          ],
        },
      ],
      activeMapId: "map-2",
    } satisfies ReturnType<typeof useCampaignStore.getState>["current"];

    useCampaignStore.getState().setActive(campaign);
    const nextMap = getActiveMap();
    expect(nextMap.paper.aspect).toBe("4:3");
    expect(nextMap.paper.color).toBe("#aaaaaa");
    const nextPaper = getPaperLayer(nextMap);
    expect(nextPaper.state.aspect).toBe("4:3");
    expect(nextPaper.state.color).toBe("#aaaaaa");
  });
});
