import { describe, it, expect } from "vitest";
import type { LayerInstance } from "@/layers/types";
import {
  clampToAnchorRange,
  getAnchorBounds,
  HEXGRID_ANCHOR_TYPE,
  isAnchorLayer,
  PAPER_ANCHOR_TYPE,
} from "@/stores/campaign/anchors";

describe("anchor bounds utility", () => {
  const make = (type: string, id: string): LayerInstance => ({
    id,
    type,
    name: type,
    visible: true,
    state: {},
  });

  it("derives min/max indices between anchors", () => {
    const layers = [
      make(PAPER_ANCHOR_TYPE, "paper"),
      make("terrain", "terrain"),
      make("fog", "fog"),
      make(HEXGRID_ANCHOR_TYPE, "grid"),
    ];
    const bounds = getAnchorBounds(layers);
    expect(bounds.bottom).toBe(0);
    expect(bounds.top).toBe(3);
    expect(bounds.min).toBe(1);
    expect(bounds.max).toBe(2);
  });

  it("treats missing anchors as open ranges", () => {
    const layers = [make("terrain", "terrain"), make("fog", "fog")];
    const bounds = getAnchorBounds(layers);
    expect(bounds.bottom).toBe(-1);
    expect(bounds.top).toBe(2);
    expect(bounds.min).toBe(0);
    expect(bounds.max).toBe(1);
  });

  it("clamps indices to available range", () => {
    const layers = [
      make(PAPER_ANCHOR_TYPE, "paper"),
      make("terrain", "terrain"),
      make(HEXGRID_ANCHOR_TYPE, "grid"),
    ];
    const bounds = getAnchorBounds(layers);
    expect(clampToAnchorRange(-5, bounds, layers.length)).toBe(1);
    expect(clampToAnchorRange(10, bounds, layers.length)).toBe(1);
    expect(clampToAnchorRange(1, bounds, layers.length)).toBe(1);
  });

  it("identifies anchor layers", () => {
    expect(isAnchorLayer(make(PAPER_ANCHOR_TYPE, "paper"))).toBe(true);
    expect(isAnchorLayer(make(HEXGRID_ANCHOR_TYPE, "grid"))).toBe(true);
    expect(isAnchorLayer(make("terrain", "terrain"))).toBe(false);
    expect(isAnchorLayer(undefined)).toBe(false);
  });
});
