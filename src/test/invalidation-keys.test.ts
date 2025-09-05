import { describe, it, expect } from "vitest";
import { PaperAdapter, type PaperState } from "@/layers/adapters/paper";
import { HexgridAdapter, type HexgridState } from "@/layers/adapters/hexgrid";
import {
  HexNoiseAdapter,
  type HexNoiseState,
} from "@/layers/adapters/hex-noise";

describe("Layer Adapter Invalidation Keys", () => {
  it("PaperAdapter key changes on aspect/color", () => {
    const a: PaperState = { aspect: "16:10", color: "#ffffff" };
    const b: PaperState = { aspect: "square", color: "#ffffff" };
    const c: PaperState = { aspect: "16:10", color: "#000000" };
    const ka = PaperAdapter.getInvalidationKey(a);
    const kb = PaperAdapter.getInvalidationKey(b);
    const kc = PaperAdapter.getInvalidationKey(c);
    expect(ka).not.toEqual(kb);
    expect(ka).not.toEqual(kc);
  });

  it("HexgridAdapter key sensitive to size/orientation/color/alpha/lineWidth", () => {
    const base: HexgridState = {
      size: 24,
      orientation: "pointy",
      color: "#000000",
      alpha: 1,
      lineWidth: 1,
    };
    const kBase = HexgridAdapter.getInvalidationKey(base);
    expect(
      HexgridAdapter.getInvalidationKey({ ...base, size: 25 }),
    ).not.toEqual(kBase);
    expect(
      HexgridAdapter.getInvalidationKey({ ...base, orientation: "flat" }),
    ).not.toEqual(kBase);
    expect(
      HexgridAdapter.getInvalidationKey({ ...base, color: "#ff0000" }),
    ).not.toEqual(kBase);
    expect(
      HexgridAdapter.getInvalidationKey({ ...base, alpha: 0.5 }),
    ).not.toEqual(kBase);
    expect(
      HexgridAdapter.getInvalidationKey({ ...base, lineWidth: 2 }),
    ).not.toEqual(kBase);
  });

  it("HexNoiseAdapter key sensitive to main fields", () => {
    const base: HexNoiseState = {
      seed: "seed",
      frequency: 0.15,
      offsetX: 0,
      offsetY: 0,
      intensity: 1,
      gamma: 1,
      min: 0,
      max: 1,
      mode: "shape",
      terrain: "plains",
    };
    const kBase = HexNoiseAdapter.getInvalidationKey(base);
    expect(
      HexNoiseAdapter.getInvalidationKey({ ...base, frequency: 0.2 }),
    ).not.toEqual(kBase);
    expect(
      HexNoiseAdapter.getInvalidationKey({ ...base, offsetX: 1 }),
    ).not.toEqual(kBase);
    expect(
      HexNoiseAdapter.getInvalidationKey({ ...base, terrain: "hills" }),
    ).not.toEqual(kBase);
    expect(
      HexNoiseAdapter.getInvalidationKey({ ...base, mode: "paint" }),
    ).not.toEqual(kBase);
  });
});
