import { beforeEach, describe, expect, it } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { resolvePalette } from "@/stores/selectors/palette";

describe("palette settings on campaign and map", () => {
  beforeEach(() => {
    useCampaignStore.setState({ current: null });
  });

  it("resolves palette by campaign settingId when no map override", () => {
    const store = useCampaignStore.getState();
    store.createEmpty({ name: "Test" });
    const mapId = store.addMap({ name: "A" });
    store.selectMap(mapId);
    store.setCampaignSetting("space-opera");
    const pal = resolvePalette(useCampaignStore.getState().current, mapId);
    expect(pal.grid.line).toBeDefined();
  });

  it("supports two maps with different effective settings", () => {
    const store = useCampaignStore.getState();
    store.createEmpty({ name: "Test" });
    const a = store.addMap({ name: "A" });
    const b = store.addMap({ name: "B" });
    store.setCampaignSetting("doom-forge");
    store.setMapSetting(a, "space-opera");
    const palA = resolvePalette(useCampaignStore.getState().current, a);
    const palB = resolvePalette(useCampaignStore.getState().current, b);
    expect(palA.grid.line).not.toEqual(palB.grid.line);
  });

  it("clearing map override reverts to campaign setting", () => {
    const store = useCampaignStore.getState();
    store.createEmpty({ name: "Test" });
    const a = store.addMap({ name: "A" });
    store.setCampaignSetting("doom-forge");
    store.setMapSetting(a, "space-opera");
    const before = resolvePalette(useCampaignStore.getState().current, a);
    store.setMapSetting(a, undefined);
    const after = resolvePalette(useCampaignStore.getState().current, a);
    expect(after.grid.line).not.toEqual(before.grid.line);
  });
});
