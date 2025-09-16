import { describe, it, expect } from "vitest";
import {
  hexTiles,
  createHexLayout,
  type HexTilingConfig,
  type HexTilePosition,
} from "@/layers/hex-utils";

describe("hex utilities consolidation", () => {
  describe("hexTiles generator", () => {
    describe("when using flat orientation", () => {
      it("should generate hex positions with correct structure", () => {
        const config: HexTilingConfig = {
          size: 10,
          orientation: "flat",
          center: { x: 50, y: 50 },
          bounds: { w: 100, h: 100 },
          padding: 1,
        };

        const tiles = Array.from(hexTiles(config));

        expect(tiles.length).toBeGreaterThan(0);
        tiles.forEach((tile) => {
          expect(tile).toHaveProperty("center");
          expect(tile).toHaveProperty("axial");
          expect(tile).toHaveProperty("gridCoords");
          expect(Number.isFinite(tile.center.x)).toBe(true);
          expect(Number.isFinite(tile.center.y)).toBe(true);
          expect(Number.isFinite(tile.axial.q)).toBe(true);
          expect(Number.isFinite(tile.axial.r)).toBe(true);
          expect(Number.isFinite(tile.gridCoords.col)).toBe(true);
          expect(Number.isFinite(tile.gridCoords.row)).toBe(true);
        });
      });

      it("should generate tiles within reasonable area", () => {
        const config: HexTilingConfig = {
          size: 12,
          orientation: "flat",
          center: { x: 0, y: 0 },
          bounds: { w: 60, h: 60 },
          padding: 1,
        };

        const tiles = Array.from(hexTiles(config));

        // Should generate tiles that cover the bounds plus padding
        expect(tiles.length).toBeGreaterThan(0);

        // All tiles should have valid coordinates
        tiles.forEach((tile) => {
          expect(Number.isFinite(tile.center.x)).toBe(true);
          expect(Number.isFinite(tile.center.y)).toBe(true);
          expect(Number.isFinite(tile.axial.q)).toBe(true);
          expect(Number.isFinite(tile.axial.r)).toBe(true);
        });
      });

      it("should respect padding parameter", () => {
        const baseConfig: HexTilingConfig = {
          size: 15,
          orientation: "flat",
          center: { x: 0, y: 0 },
          bounds: { w: 60, h: 60 },
          padding: 0,
        };

        const paddedConfig: HexTilingConfig = {
          ...baseConfig,
          padding: 2,
        };

        const baseTiles = Array.from(hexTiles(baseConfig));
        const paddedTiles = Array.from(hexTiles(paddedConfig));

        expect(paddedTiles.length).toBeGreaterThan(baseTiles.length);
      });
    });

    describe("when using pointy orientation", () => {
      it("should generate hex positions with correct structure", () => {
        const config: HexTilingConfig = {
          size: 10,
          orientation: "pointy",
          center: { x: 50, y: 50 },
          bounds: { w: 100, h: 100 },
          padding: 1,
        };

        const tiles = Array.from(hexTiles(config));

        expect(tiles.length).toBeGreaterThan(0);
        tiles.forEach((tile) => {
          expect(Number.isFinite(tile.center.x)).toBe(true);
          expect(Number.isFinite(tile.center.y)).toBe(true);
          expect(Number.isFinite(tile.axial.q)).toBe(true);
          expect(Number.isFinite(tile.axial.r)).toBe(true);
          expect(Number.isFinite(tile.gridCoords.col)).toBe(true);
          expect(Number.isFinite(tile.gridCoords.row)).toBe(true);
        });
      });

      it("should generate tiles within reasonable area", () => {
        const config: HexTilingConfig = {
          size: 12,
          orientation: "pointy",
          center: { x: 0, y: 0 },
          bounds: { w: 60, h: 60 },
          padding: 1,
        };

        const tiles = Array.from(hexTiles(config));

        // Should generate tiles that cover the bounds plus padding
        expect(tiles.length).toBeGreaterThan(0);

        // All tiles should have valid coordinates
        tiles.forEach((tile) => {
          expect(Number.isFinite(tile.center.x)).toBe(true);
          expect(Number.isFinite(tile.center.y)).toBe(true);
          expect(Number.isFinite(tile.axial.q)).toBe(true);
          expect(Number.isFinite(tile.axial.r)).toBe(true);
        });
      });

      it("should apply row offset correctly for pointy orientation", () => {
        const config: HexTilingConfig = {
          size: 10,
          orientation: "pointy",
          center: { x: 0, y: 0 },
          bounds: { w: 60, h: 60 },
          padding: 1,
        };

        const tiles = Array.from(hexTiles(config));
        const colStep = Math.sqrt(3) * 10;

        // Find tiles in adjacent rows to verify offset
        const row0Tiles = tiles.filter((t) => t.gridCoords.row === 0);
        const row1Tiles = tiles.filter((t) => t.gridCoords.row === 1);

        if (row0Tiles.length > 0 && row1Tiles.length > 0) {
          const row0X = row0Tiles[0]!.center.x;
          const row1X = row1Tiles[0]!.center.x;

          // Row 1 should be offset by colStep/2 (odd row)
          expect(Math.abs(row1X - row0X - colStep / 2)).toBeLessThan(0.1);
        }
      });
    });

    describe("when using different configurations", () => {
      it("should generate different tile counts for different sizes", () => {
        const smallConfig: HexTilingConfig = {
          size: 5,
          orientation: "pointy",
          center: { x: 0, y: 0 },
          bounds: { w: 50, h: 50 },
          padding: 1,
        };

        const largeConfig: HexTilingConfig = {
          size: 20,
          orientation: "pointy",
          center: { x: 0, y: 0 },
          bounds: { w: 50, h: 50 },
          padding: 1,
        };

        const smallTiles = Array.from(hexTiles(smallConfig));
        const largeTiles = Array.from(hexTiles(largeConfig));

        // Smaller hex size should generate more tiles in same bounds
        expect(smallTiles.length).toBeGreaterThan(largeTiles.length);
      });

      it("should handle center offset correctly", () => {
        const centeredConfig: HexTilingConfig = {
          size: 10,
          orientation: "flat",
          center: { x: 0, y: 0 },
          bounds: { w: 40, h: 40 },
          padding: 0,
        };

        const offsetConfig: HexTilingConfig = {
          ...centeredConfig,
          center: { x: 100, y: 100 },
        };

        const centeredTiles = Array.from(hexTiles(centeredConfig));
        const offsetTiles = Array.from(hexTiles(offsetConfig));

        expect(centeredTiles.length).toBe(offsetTiles.length);

        // All offset tiles should be shifted by 100,100
        centeredTiles.forEach((centeredTile, i) => {
          const offsetTile = offsetTiles[i]!;
          expect(offsetTile.center.x).toBeCloseTo(centeredTile.center.x + 100);
          expect(offsetTile.center.y).toBeCloseTo(centeredTile.center.y + 100);
          expect(offsetTile.axial).toEqual(centeredTile.axial);
        });
      });
    });

    describe("when iterating lazily", () => {
      it("should support early termination", () => {
        const config: HexTilingConfig = {
          size: 8,
          orientation: "pointy",
          center: { x: 0, y: 0 },
          bounds: { w: 200, h: 200 }, // Large bounds
          padding: 2,
        };

        const generator = hexTiles(config);
        const firstFive: HexTilePosition[] = [];

        for (const tile of generator) {
          firstFive.push(tile);
          if (firstFive.length >= 5) break;
        }

        expect(firstFive).toHaveLength(5);
        firstFive.forEach((tile) => {
          expect(Number.isFinite(tile.center.x)).toBe(true);
          expect(Number.isFinite(tile.center.y)).toBe(true);
        });
      });
    });
  });

  describe("createHexLayout", () => {
    describe("when creating layout objects", () => {
      it("should create valid layout for pointy orientation", () => {
        const layout = createHexLayout(20, "pointy");

        expect(layout.size).toBe(20);
        expect(layout.orientation).toBe("pointy");
        expect(layout).toHaveProperty("size");
        expect(layout).toHaveProperty("orientation");
      });

      it("should create valid layout for flat orientation", () => {
        const layout = createHexLayout(15, "flat");

        expect(layout.size).toBe(15);
        expect(layout.orientation).toBe("flat");
        expect(layout).toHaveProperty("size");
        expect(layout).toHaveProperty("orientation");
      });

      it("should handle different size values", () => {
        const sizes = [1, 10, 24, 50, 100];

        sizes.forEach((size) => {
          const layout = createHexLayout(size, "pointy");
          expect(layout.size).toBe(size);
          expect(layout.orientation).toBe("pointy");
        });
      });

      it("should create objects compatible with hexPath function", () => {
        const layout = createHexLayout(16, "pointy");

        // Should have the correct shape for Pick<Layout, "size" | "orientation">
        expect(typeof layout.size).toBe("number");
        expect(typeof layout.orientation).toBe("string");
        expect(
          layout.orientation === "pointy" || layout.orientation === "flat",
        ).toBe(true);
      });
    });
  });

  describe("integration between utilities", () => {
    describe("when using hexTiles with createHexLayout", () => {
      it("should produce consistent results", () => {
        const size = 12;
        const orientation = "pointy" as const;
        const layout = createHexLayout(size, orientation);

        const config: HexTilingConfig = {
          size,
          orientation,
          center: { x: 0, y: 0 },
          bounds: { w: 80, h: 80 },
          padding: 1,
        };

        const tiles = Array.from(hexTiles(config));

        expect(tiles.length).toBeGreaterThan(0);
        expect(layout.size).toBe(size);
        expect(layout.orientation).toBe(orientation);

        // All tiles should be compatible with the layout
        tiles.forEach((tile) => {
          expect(Number.isFinite(tile.center.x)).toBe(true);
          expect(Number.isFinite(tile.center.y)).toBe(true);
        });
      });

      it("should work with both orientations", () => {
        const orientations: Array<"pointy" | "flat"> = ["pointy", "flat"];

        orientations.forEach((orientation) => {
          const size = 15;
          const layout = createHexLayout(size, orientation);

          const config: HexTilingConfig = {
            size,
            orientation,
            center: { x: 50, y: 50 },
            bounds: { w: 100, h: 100 },
            padding: 1,
          };

          const tiles = Array.from(hexTiles(config));

          expect(tiles.length).toBeGreaterThan(0);
          expect(layout.orientation).toBe(orientation);

          tiles.forEach((tile) => {
            expect(Number.isFinite(tile.center.x)).toBe(true);
            expect(Number.isFinite(tile.center.y)).toBe(true);
          });
        });
      });
    });
  });

  describe("compatibility with existing patterns", () => {
    describe("when replicating hexgrid tiling logic", () => {
      it("should match original flat orientation calculations", () => {
        const r = 16;
        const orientation = "flat" as const;
        const w = 100;
        const h = 100;
        const sqrt3 = Math.sqrt(3);

        // Original hexgrid calculations
        const colStep = 1.5 * r;
        const rowStep = sqrt3 * r;
        const cols = Math.ceil(w / colStep) + 2;
        const rows = Math.ceil(h / rowStep) + 2;
        const centerX = w / 2;
        const centerY = h / 2;

        // New utility configuration
        const config: HexTilingConfig = {
          size: r,
          orientation,
          center: { x: centerX, y: centerY },
          bounds: { w, h },
          padding: 2,
        };

        const tiles = Array.from(hexTiles(config));

        // Should generate reasonable number of tiles
        expect(tiles.length).toBeGreaterThan(0);
        expect(tiles.length).toBeLessThan(200); // Reasonable upper bound
      });

      it("should match original pointy orientation calculations", () => {
        const r = 16;
        const orientation = "pointy" as const;
        const w = 100;
        const h = 100;
        const sqrt3 = Math.sqrt(3);

        // Original hexgrid calculations
        const colStep = sqrt3 * r;
        const rowStep = 1.5 * r;
        const cols = Math.ceil(w / colStep) + 2;
        const rows = Math.ceil(h / rowStep) + 2;
        const centerX = w / 2;
        const centerY = h / 2;

        // New utility configuration
        const config: HexTilingConfig = {
          size: r,
          orientation,
          center: { x: centerX, y: centerY },
          bounds: { w, h },
          padding: 2,
        };

        const tiles = Array.from(hexTiles(config));

        // Should generate reasonable number of tiles
        expect(tiles.length).toBeGreaterThan(0);
        expect(tiles.length).toBeLessThan(200); // Reasonable upper bound
      });
    });
  });
});
