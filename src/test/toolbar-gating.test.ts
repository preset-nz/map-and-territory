import { describe, it, expect, beforeEach } from "vitest";
import {
  loadPluginsWithPriority,
  getToolbarContributions,
} from "@/plugin/loader";
import {
  campaignPluginManifest,
  campaignPluginModule,
} from "@/plugin/builtin/campaign";
import { mapPluginManifest, mapPluginModule } from "@/plugin/builtin/map";
import { resolvePreconditions } from "@/plugin/capabilities";
import { useCampaignStore } from "@/stores/campaign";

describe("Toolbar gating: map.new requires a campaign", () => {
  beforeEach(async () => {
    // Reset store between tests
    useCampaignStore.setState({ current: null, dirty: false });
    // Load just the campaign and map plugins to populate toolbar
    await loadPluginsWithPriority([
      { manifest: campaignPluginManifest, module: campaignPluginModule },
      { manifest: mapPluginManifest, module: mapPluginModule },
    ]);
  });

  it("contribution for map.new carries hasCampaign precondition", () => {
    const items = getToolbarContributions();
    const mapNew = items.find((i) => i.command === "map.new");
    expect(mapNew).toBeTruthy();
    expect(mapNew?.enableWhen).toBeTruthy();
    expect(mapNew?.enableWhen).toContain("hasCampaign");
  });

  it("disables when no campaign exists, enables after creating campaign", () => {
    // No campaign: should not be enabled
    const resNoCampaign = resolvePreconditions(["hasCampaign"]);
    expect(resNoCampaign.enabled).toBe(false);

    // Create an empty campaign in the store
    useCampaignStore.getState().createEmpty({ name: "Test" });

    // Now the precondition should pass
    const resWithCampaign = resolvePreconditions(["hasCampaign"]);
    expect(resWithCampaign.enabled).toBe(true);
  });
});
