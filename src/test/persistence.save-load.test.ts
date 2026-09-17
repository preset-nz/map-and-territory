import { beforeEach, describe, expect, it } from "vitest";
import { HexNoiseType } from "@/layers/adapters/hex-noise";
import { registerLayerType } from "@/layers/registry";
import { useCampaignStore } from "@/stores/campaign";
import {
  CAMPAIGN_MIME_V1,
  deserializeCampaignV1,
  saveActiveCampaignV1,
  serializeCampaignV1,
} from "@/stores/campaign/persistence";
import { registerCoreLayerTypes } from "@/test/test-helpers";

describe("Save/Load v1", () => {
  beforeEach(() => {
    // Reset store
    useCampaignStore.setState({ current: null });
    // Register types
    registerCoreLayerTypes();
    registerLayerType(HexNoiseType);
  });

  it("omits derived fields like paintColor on save and restores defaults on load", () => {
    // Create campaign first (hard-prevent maps without campaign)
    useCampaignStore.getState().createEmpty({ name: "Test" });
    // Create base campaign + map
    const id = useCampaignStore.getState().addMap({ name: "Map 01" });
    expect(id).toBeTruthy();

    // Insert a hexnoise layer above paper
    const layerId = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "Hex Noise 01");
    expect(layerId).toBeTruthy();

    // Set explicit paintColor (derived/cache) and a terrainId (intent)
    useCampaignStore.getState().updateLayerState(layerId!, {
      mode: "paint",
      terrainId: "forest",
      paintColor: "#00ff00",
    } as any);

    // Save
    const file = saveActiveCampaignV1();
    expect(file?.version).toBe(1);
    expect(CAMPAIGN_MIME_V1).toContain("version=1");
    const persistedLayer = file!.campaign.maps[0].layers.find(
      (l) => l.meta.typeId === "hexnoise",
    )!;
    expect(persistedLayer).toBeTruthy();
    const persistedState = persistedLayer.state as Record<string, unknown>;
    // paintColor must not be present in persisted JSON
    expect("paintColor" in persistedState).toBe(false);
    // Ensure intent fields remain
    expect(persistedState["terrainId"]).toBe("forest");

    // Load (pure)
    const loaded = deserializeCampaignV1(file!);
    const map = loaded.maps[0];
    const hex = (map.layers ?? []).find((l) => l.type === "hexnoise")!;
    const st = hex.state as Record<string, unknown>;
    // paintColor should be undefined after deserialize (recomputed at render)
    expect(st["paintColor"]).toBeUndefined();
    expect(st["terrainId"]).toBe("forest");
  });

  it("round-trips campaign identity and activeMapId via pure functions", () => {
    useCampaignStore.getState().createEmpty({ name: "Test" });
    const store = useCampaignStore.getState();
    const mapA = store.addMap({ name: "A" });
    const mapB = store.addMap({ name: "B" });
    store.selectMap(mapB);
    const cur = useCampaignStore.getState().current!;
    const file = serializeCampaignV1(cur);
    const loaded = deserializeCampaignV1(file);
    expect(loaded.name).toBe(cur.name);
    expect(loaded.activeMapId).toBe(cur.activeMapId);
    expect(loaded.maps.length).toBe(cur.maps.length);
  });
});
