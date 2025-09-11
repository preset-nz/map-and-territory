import { describe, it, expect } from "vitest";
import {
  resolvePalette,
  resolveTerrainFill,
  resolveGridLine,
} from "@/stores/selectors/palette";
import type { Campaign } from "@/stores/campaign";
import type { MapPalette } from "@/palettes/types";
import { DefaultPalette } from "@/palettes/defaults";

function makeProject(overrides?: Partial<Campaign>): Campaign {
  return {
    id: "p1",
    version: 1,
    name: "Test",
    description: "",
    activeMapId: "m1",
    palette: overrides?.palette as MapPalette | undefined,
    maps: [
      {
        id: "m1",
        name: "Map 1",
        description: "",
        visible: true,
        paper: { aspect: "16:10", color: "#ffffff" },
        palette: overrides?.maps?.[0]?.palette as MapPalette | undefined,
        layers: [],
      },
    ],
    ...(overrides || {}),
  } as Campaign;
}

describe("palette resolution", () => {
  it("falls back to DefaultPalette when no project/map palette", () => {
    const proj = makeProject();
    const p = resolvePalette(proj, "m1");
    expect(p.terrain.plains.fill).toBe(DefaultPalette.terrain.plains.fill);
  });

  it("prefers campaign palette over default, when map has none", () => {
    const campaignPalette: MapPalette = {
      terrain: {
        water: { fill: "#111111" },
        plains: { fill: "#222222" },
        forest: { fill: "#333333" },
        hills: { fill: "#444444" },
        mountains: { fill: "#555555" },
      },
      grid: { line: "#666666" },
    };
    const proj = makeProject({ palette: campaignPalette });
    const p = resolvePalette(proj, "m1");
    expect(p.terrain.plains.fill).toBe("#222222");
  });

  it("map palette overrides campaign palette", () => {
    const campaignPalette: MapPalette = {
      terrain: {
        water: { fill: "#111111" },
        plains: { fill: "#222222" },
        forest: { fill: "#333333" },
        hills: { fill: "#444444" },
        mountains: { fill: "#555555" },
      },
      grid: { line: "#666666" },
    };
    const mapPalette: MapPalette = {
      terrain: {
        water: { fill: "#aaaaaa" },
        plains: { fill: "#bbbbbb" },
        forest: { fill: "#cccccc" },
        hills: { fill: "#dddddd" },
        mountains: { fill: "#eeeeee" },
      },
      grid: { line: "#999999" },
    };
    const proj = makeProject({ palette: campaignPalette });
    // Apply map palette to existing first map
    proj.maps[0].palette = mapPalette;
    const p = resolvePalette(proj, "m1");
    expect(p.terrain.plains.fill).toBe("#bbbbbb");
    expect(p.grid.line).toBe("#999999");
  });

  it("resolveTerrainFill handles canonical and unknown keys", () => {
    const fillPlains = resolveTerrainFill(DefaultPalette, "plains");
    expect(typeof fillPlains).toBe("string");
    const fillUnknown = resolveTerrainFill(DefaultPalette, "unknown");
    expect(fillUnknown).toBe(DefaultPalette.terrain.plains.fill);
  });

  it("resolveGridLine uses layer override when provided", () => {
    const proj = makeProject();
    const color = resolveGridLine(proj, "m1", { color: "#abcabc" });
    expect(color).toBe("#abcabc");
  });

  it("resolveGridLine falls back to palette when layer color is default/empty", () => {
    const proj = makeProject();
    const color = resolveGridLine(proj, "m1", { color: "#000000" });
    expect(color).toBeDefined();
  });
});
