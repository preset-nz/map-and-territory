import { describe, it, expect, beforeEach } from "vitest";
import { useSelectionStore } from "@/stores/selection";

describe("Selection Store", () => {
  beforeEach(() => {
    useSelectionStore.setState({ selection: { kind: "none" } });
  });

  it("selects campaign", () => {
    useSelectionStore.getState().selectCampaign();
    expect(useSelectionStore.getState().selection).toEqual({
      kind: "campaign",
    });
  });
});
