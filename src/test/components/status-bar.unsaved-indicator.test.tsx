import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBar from "@/components/layout/status-bar";
import { useCampaignStore } from "@/stores/campaign";
import { registerCoreLayerTypes } from "@/test/test-helpers";

describe("StatusBar unsaved indicator", () => {
  beforeEach(() => {
    useCampaignStore.setState({ current: null, dirty: false });
    registerCoreLayerTypes();
  });

  it("shows dash when no campaign", () => {
    render(<StatusBar />);
    expect(screen.getByTestId("status-bar")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows Saved when clean and Unsaved indicator when dirty", () => {
    useCampaignStore.getState().createEmpty({ name: "X" });
    const { rerender } = render(<StatusBar />);
    expect(screen.getByText("Saved")).toBeTruthy();

    useCampaignStore.getState().addMap({ name: "A" });
    rerender(<StatusBar />);
    expect(screen.getByText("Unsaved")).toBeTruthy();
    expect(screen.getByTestId("unsaved-indicator")).toBeTruthy();
  });
});
