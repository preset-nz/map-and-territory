import { describe, it, expect, beforeEach } from "vitest";
import { resolvePreconditions } from "@/plugin/capabilities";
import { useCampaignStore } from "@/stores/campaign";

describe("capabilities", () => {
  beforeEach(() => {
    useCampaignStore.setState({ current: null });
  });

  it("hasActiveMap disables without an active map and enables after", () => {
    let res = resolvePreconditions(["hasActiveMap"]);
    expect(res.enabled).toBe(false);
    // Create project + map
    const p = useCampaignStore.getState().createEmpty({ name: "P" });
    useCampaignStore.getState().setActive(p);
    const id = useCampaignStore.getState().addMap({ name: "M" })!;
    useCampaignStore.getState().selectMap(id);
    res = resolvePreconditions(["hasActiveMap"]);
    expect(res.enabled).toBe(true);
  });
});
