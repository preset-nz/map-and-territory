import { describe, it, expect, beforeEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { registerCoreLayerTypes } from "@/test/test-helpers";

describe("Campaign Store Maps", () => {
  beforeEach(() => {
    // Register core layer types for tests
    registerCoreLayerTypes();
    useCampaignStore.setState({ current: null });
  });

  it("adds and selects a new map", () => {
    useCampaignStore.getState().createEmpty({ name: "Camp", description: "" });
    const id = useCampaignStore
      .getState()
      .addMap({ name: "Map 1", description: "" });
    expect(useCampaignStore.getState().current?.maps.length).toBe(1);
    expect(useCampaignStore.getState().current?.activeMapId).toBe(id);
    const m = useCampaignStore.getState().current!.maps[0];
    expect(m.paper).toBeTruthy();
    expect(m.paper.aspect).toBe("16:10");
    expect(m.paper.color).toBeTypeOf("string");
  });

  it("seeds base layers on map add and enforces policies", () => {
    useCampaignStore.getState().createEmpty({ name: "Camp", description: "" });
    useCampaignStore.getState().addMap({ name: "Map 2", description: "" });
    const current = useCampaignStore.getState().current!;
    const map = current.maps.find((m) => m.name === "Map 2")!;
    expect(map.layers && map.layers.length).toBeGreaterThanOrEqual(2);
    const paper = map.layers!.find((l) => l.type === "paper")!;
    const hex = map.layers!.find((l) => l.type === "hexgrid")!;
    // cannot duplicate base layers
    const dupPaper = useCampaignStore.getState().duplicateLayer(paper.id);
    expect(dupPaper).toBeNull();
    // cannot delete base layers
    useCampaignStore.getState().removeLayer(hex.id);
    const stillHex = useCampaignStore
      .getState()
      .current!.maps.find((m) => m.name === "Map 2")!
      .layers!.find((l) => l.type === "hexgrid");
    expect(stillHex).toBeTruthy();
  });

  it("renames and deletes a map", () => {
    useCampaignStore.getState().createEmpty({ name: "Camp", description: "" });
    const id = useCampaignStore
      .getState()
      .addMap({ name: "Old", description: "" });
    useCampaignStore.getState().renameMap(id, "New Name");
    expect(useCampaignStore.getState().current?.maps[0].name).toBe("New Name");
    useCampaignStore.getState().deleteMap(id);
    expect(useCampaignStore.getState().current?.maps.length).toBe(0);
  });

  it("toggles map visibility", () => {
    useCampaignStore.getState().createEmpty({ name: "Camp", description: "" });
    const id = useCampaignStore
      .getState()
      .addMap({ name: "Visible Map", description: "" });
    expect(useCampaignStore.getState().current?.maps[0].visible).toBe(true);
    useCampaignStore.getState().setMapVisibility(id, false);
    expect(useCampaignStore.getState().current?.maps[0].visible).toBe(false);
  });
});
