import { describe, it, expect, beforeEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";

describe("Campaign Store", () => {
  beforeEach(() => {
    // reset
    useCampaignStore.setState({ current: null });
  });

  it("creates an empty campaign with defaults", () => {
    const project = useCampaignStore
      .getState()
      .createEmpty({ name: "Untitled Campaign", description: "" });
    expect(project.name).toBe("Untitled Campaign");
    expect(project.description).toBe("");
    expect(project.maps).toEqual([]);
    expect(project.activeMapId).toBeNull();
  });

  it("allows spaces in campaign name during rename", () => {
    useCampaignStore.getState().createEmpty({ name: "A", description: "" });
    useCampaignStore.getState().rename("My Campaign Title");
    expect(useCampaignStore.getState().current?.name).toBe("My Campaign Title");
  });

  it("updates description", () => {
    useCampaignStore.getState().createEmpty({ name: "X", description: "" });
    useCampaignStore.getState().setDescription("Hello world");
    expect(useCampaignStore.getState().current?.description).toBe(
      "Hello world",
    );
  });
});
