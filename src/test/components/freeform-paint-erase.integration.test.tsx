import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import CanvasViewport from "@/components/map/canvas-viewport";
import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";
import { useLayoutStore } from "@/stores/layout";
import { registerLayerType } from "@/layers/registry";
import { FreeformType } from "@/layers/adapters/freeform-hex";
import type { LayerType } from "@/layers/types";

function mockCanvasRect(canvas: HTMLCanvasElement, w = 800, h = 600) {
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      width: w,
      height: h,
      right: w,
      bottom: h,
      x: 0,
      y: 0,
      toJSON() {},
    }),
  });
}

function paperCenter(cw = 800, ch = 600) {
  const paddingX = Math.max(12, cw * 0.05);
  const paddingY = 12;
  const availW = cw - paddingX * 2;
  const availH = ch - paddingY * 2;
  const aw = 16,
    ah = 10;
  let paperW = availW;
  let paperH = (paperW * ah) / aw;
  if (paperH > availH) {
    paperH = availH;
    paperW = (paperH * aw) / ah;
  }
  const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
  const paperY = paddingY;
  return { x: paperX + paperW / 2, y: paperY + paperH / 2 };
}

describe("Freeform paint/erase integration", () => {
  beforeEach(() => {
    useProjectStore.setState({ current: null });
    useSelectionStore.setState({ selection: { kind: "none" } });
    useLayoutStore.getState().setActiveTool("select");
    registerLayerType(FreeformType as unknown as LayerType);
  });

  it("paints and erases a hex cell", async () => {
    // Project with map and grid
    useProjectStore.getState().createEmpty({ name: "Test" });
    const mapId = useProjectStore.getState().addMap({ name: "Map" })!;
    useProjectStore.getState().selectMap(mapId);
    // Add freeform layer and select it
    const id = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("freeform")!;
    useSelectionStore.getState().selectLayer(id);
    // Seed brush
    useProjectStore.getState().updateLayerState(id, { brushColor: "#ff0000" });
    // Activate paint tool
    useLayoutStore.getState().setActiveTool("paint");

    const { container } = render(<CanvasViewport />);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    mockCanvasRect(canvas);
    const c = paperCenter();
    // Paint at center
    fireEvent.pointerDown(canvas, { clientX: c.x, clientY: c.y });
    fireEvent.pointerUp(canvas);

    const cur = useProjectStore.getState().current!;
    const layer = cur.maps[0].layers!.find((l) => l.id === id)!;
    const cells =
      (layer.state as { cells?: Record<string, unknown> }).cells ?? {};
    expect(Object.keys(cells).length).toBeGreaterThan(0);

    // Erase at same spot
    useLayoutStore.getState().setActiveTool("erase");
    fireEvent.pointerDown(canvas, { clientX: c.x, clientY: c.y });
    fireEvent.pointerUp(canvas);
    const cur2 = useProjectStore.getState().current!;
    const layer2 = cur2.maps[0].layers!.find((l) => l.id === id)!;
    const cells2 =
      (layer2.state as { cells?: Record<string, unknown> }).cells ?? {};
    expect(Object.keys(cells2).length).toBe(0);
  });
});
