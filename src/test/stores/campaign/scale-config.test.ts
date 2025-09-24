import { describe, beforeEach, expect, it } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { TerrainSettings } from "@/palettes/settings";

function resetStore() {
  const api = useCampaignStore.getState();
  api.setActive(null as unknown as any);
}

describe("campaign scale config", () => {
  beforeEach(() => {
    resetStore();
  });

  it("assigns default scale config when map is created", () => {
    const store = useCampaignStore.getState();
    store.createEmpty({ name: "Test" });
    const mapId = store.addMap({ name: "Demo" });
    expect(mapId).toBeTruthy();
    const map = useCampaignStore
      .getState()
      .current?.maps.find((m) => m.id === mapId);
    expect(map?.scale).toBeTruthy();
    expect(map?.scale?.useSettingUnits).toBe(true);
    expect(map?.scale?.placement).toBe("overlay");
    expect(map?.scale?.customUnitId).toBe("kilometers");
  });

  it("respects campaign setting when normalizing map scale", () => {
    const store = useCampaignStore.getState();
    store.createEmpty({ name: "Campaign" });
    store.setCampaignSetting(TerrainSettings.SPACE_OPERA.id);
    const mapId = store.addMap({ name: "Orbit" });
    const map = useCampaignStore
      .getState()
      .current?.maps.find((m) => m.id === mapId);
    expect(map?.scale?.customUnitId).toBe("light-minutes");
  });

  it("updates map scale with placement and custom unit overrides", () => {
    const store = useCampaignStore.getState();
    store.createEmpty({ name: "Campaign" });
    const mapId = store.addMap({ name: "Field" });
    expect(mapId).toBeTruthy();
    store.updateMapScale(mapId!, {
      placement: "below",
      useSettingUnits: false,
      customUnitId: "miles",
    });
    const map = useCampaignStore
      .getState()
      .current?.maps.find((m) => m.id === mapId);
    expect(map?.scale?.placement).toBe("below");
    expect(map?.scale?.useSettingUnits).toBe(false);
    expect(map?.scale?.customUnitId).toBe("miles");
  });

  it("restores setting defaults when useSettingUnits toggled back on", () => {
    const store = useCampaignStore.getState();
    store.createEmpty({ name: "Campaign" });
    const mapId = store.addMap({ name: "Descent" });
    store.updateMapScale(mapId!, {
      placement: "below",
      useSettingUnits: false,
      customUnitId: "miles",
    });
    store.updateMapScale(mapId!, { useSettingUnits: true });
    const map = useCampaignStore
      .getState()
      .current?.maps.find((m) => m.id === mapId);
    expect(map?.scale?.useSettingUnits).toBe(true);
    expect(map?.scale?.customUnitId).toBe("miles");
  });
});
