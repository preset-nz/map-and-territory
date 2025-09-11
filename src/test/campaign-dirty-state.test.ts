import { describe, it, expect, beforeEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { registerCoreLayerTypes } from "@/test/test-helpers";

describe("Campaign dirty state", () => {
  beforeEach(() => {
    useCampaignStore.setState({ current: null, dirty: false });
    registerCoreLayerTypes();
  });

  it("starts clean on create and becomes dirty on edits", () => {
    const c = useCampaignStore.getState().createEmpty({ name: "X" });
    expect(useCampaignStore.getState().dirty).toBe(false);
    useCampaignStore.getState().addMap({ name: "A" });
    expect(useCampaignStore.getState().dirty).toBe(true);
  });

  it("marking clean after save is supported", () => {
    useCampaignStore.getState().createEmpty({ name: "X" });
    useCampaignStore.getState().addMap({ name: "A" });
    expect(useCampaignStore.getState().dirty).toBe(true);
    useCampaignStore.getState().setDirty(false);
    expect(useCampaignStore.getState().dirty).toBe(false);
  });
});
