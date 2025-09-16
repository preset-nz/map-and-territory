/**
 * Flood Fill Algorithm Tests
 *
 * BDD-style tests for core flood fill functionality with hex neighbors
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  floodFill,
  createPaperBounds,
  isValidFloodFillConfig,
  type FloodFillConfig,
  type FloodFillResult,
  type PaperBounds,
} from "@/lib/flood-fill";
import type { Axial } from "@/lib/hex";

// Test data setup
interface TestCell {
  terrainId?: string;
}

type TestGrid = Record<string, TestCell>;

function axialKey(q: number, r: number): string {
  return `${q},${r}`;
}

function createTestGrid(
  cells: Array<{ q: number; r: number; terrainId?: string }>,
): TestGrid {
  const grid: TestGrid = {};
  for (const cell of cells) {
    grid[axialKey(cell.q, cell.r)] = { terrainId: cell.terrainId };
  }
  return grid;
}

function createCellLookup(grid: TestGrid) {
  return (axial: Axial): string | undefined => {
    const key = axialKey(axial.q, axial.r);
    return grid[key]?.terrainId;
  };
}

describe("floodFill algorithm", () => {
  describe("when filling empty cells only", () => {
    it("should fill single empty cell at origin", () => {
      const grid = createTestGrid([]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        maxCells: 1, // Limit to single cell to test the specific behavior
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(1);
      expect(result.cells[0]).toEqual({ q: 0, r: 0 });
      expect(result.truncated).toBe(true); // Should truncate at 1 cell
      expect(result.cellsEvaluated).toBeGreaterThan(0);
    });

    it("should fill connected empty region", () => {
      const grid = createTestGrid([
        { q: 1, r: 0, terrainId: "forest" }, // blocks right
        { q: 0, r: 1, terrainId: "plains" }, // blocks bottom-right
      ]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells.length).toBeGreaterThan(1);
      expect(result.cells).toContainEqual({ q: 0, r: 0 });
      expect(result.cells).toContainEqual({ q: -1, r: 0 }); // left neighbor
      expect(result.cells).toContainEqual({ q: 0, r: -1 }); // top-left neighbor
      // Should truncate due to default bounds or max cells limit when filling empty space
      expect(result.truncated).toBe(true);
    });

    it("should not fill non-empty cells", () => {
      const grid = createTestGrid([{ q: 0, r: 0, terrainId: "forest" }]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(0);
      expect(result.truncated).toBe(false);
      expect(result.cellsEvaluated).toBe(1);
    });

    it("should stop at terrain boundaries", () => {
      const grid = createTestGrid([
        { q: 1, r: 0, terrainId: "mountain" },
        { q: -1, r: 0, terrainId: "water" },
        { q: 0, r: 1, terrainId: "forest" },
        { q: 0, r: -1, terrainId: "desert" },
        { q: 1, r: -1, terrainId: "plains" },
        { q: -1, r: 1, terrainId: "swamp" },
      ]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(1);
      expect(result.cells[0]).toEqual({ q: 0, r: 0 });
      expect(result.truncated).toBe(false);
    });
  });

  describe("when filling same-value cells", () => {
    it("should fill connected cells with same terrain", () => {
      const grid = createTestGrid([
        { q: 0, r: 0, terrainId: "forest" },
        { q: 1, r: 0, terrainId: "forest" },
        { q: -1, r: 0, terrainId: "forest" },
        { q: 0, r: 1, terrainId: "plains" }, // different terrain
        { q: 1, r: -1, terrainId: "forest" },
      ]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "same-value",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(4);
      expect(result.cells).toContainEqual({ q: 0, r: 0 });
      expect(result.cells).toContainEqual({ q: 1, r: 0 });
      expect(result.cells).toContainEqual({ q: -1, r: 0 });
      expect(result.cells).toContainEqual({ q: 1, r: -1 });
      expect(result.cells).not.toContainEqual({ q: 0, r: 1 }); // different terrain
      expect(result.truncated).toBe(false);
    });

    it("should fill empty cells when origin is empty", () => {
      const grid = createTestGrid([
        { q: 1, r: 0, terrainId: "forest" }, // blocks expansion
      ]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "same-value",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells.length).toBeGreaterThan(1);
      expect(result.cells).toContainEqual({ q: 0, r: 0 });
      expect(result.cells).toContainEqual({ q: -1, r: 0 }); // empty neighbor
      expect(result.cells).not.toContainEqual({ q: 1, r: 0 }); // has terrain
      // Should truncate due to default bounds for empty regions
      expect(result.truncated).toBe(true);
    });

    it("should handle single cell with same value", () => {
      const grid = createTestGrid([
        { q: 0, r: 0, terrainId: "forest" },
        { q: 1, r: 0, terrainId: "plains" },
        { q: -1, r: 0, terrainId: "water" },
        { q: 0, r: 1, terrainId: "mountain" },
        { q: 0, r: -1, terrainId: "desert" },
        { q: 1, r: -1, terrainId: "swamp" },
        { q: -1, r: 1, terrainId: "tundra" },
      ]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "same-value",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(1);
      expect(result.cells[0]).toEqual({ q: 0, r: 0 });
      expect(result.truncated).toBe(false);
    });
  });

  describe("when respecting maximum cell limits", () => {
    it("should truncate at max cell limit", () => {
      const grid = createTestGrid([]); // all empty
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        maxCells: 5,
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(5);
      expect(result.truncated).toBe(true);
      expect(result.truncationReason).toContain("Maximum cell limit reached");
      expect(result.cellsEvaluated).toBeGreaterThan(5);
    });

    it("should use default max cells when not specified", () => {
      const grid = createTestGrid([]); // all empty
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells.length).toBeLessThanOrEqual(1000); // default limit
      if (result.truncated) {
        expect(result.truncationReason).toContain("1000");
      }
    });
  });

  describe("when respecting paper bounds", () => {
    let paperBounds: PaperBounds;

    beforeEach(() => {
      paperBounds = {
        minQ: -2,
        maxQ: 2,
        minR: -2,
        maxR: 2,
      };
    });

    it("should respect paper boundaries", () => {
      const grid = createTestGrid([]); // all empty
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        paperBounds,
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      // Verify all filled cells are within bounds
      for (const cell of result.cells) {
        expect(cell.q).toBeGreaterThanOrEqual(paperBounds.minQ);
        expect(cell.q).toBeLessThanOrEqual(paperBounds.maxQ);
        expect(cell.r).toBeGreaterThanOrEqual(paperBounds.minR);
        expect(cell.r).toBeLessThanOrEqual(paperBounds.maxR);
      }
      expect(result.truncated).toBe(false);
    });

    it("should return empty when origin is outside bounds", () => {
      const grid = createTestGrid([]);
      const config: FloodFillConfig = {
        origin: { q: 10, r: 10 }, // far outside bounds
        mode: "empty-only",
        paperBounds,
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(0);
      expect(result.truncated).toBe(false);
      expect(result.cellsEvaluated).toBe(1);
    });

    it("should limit expansion to paper bounds", () => {
      const grid = createTestGrid([]);
      const tightBounds: PaperBounds = {
        minQ: -1,
        maxQ: 1,
        minR: -1,
        maxR: 1,
      };
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        paperBounds: tightBounds,
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      // Should fill a 3x3 hex region centered at origin
      expect(result.cells.length).toBeLessThanOrEqual(9);
      for (const cell of result.cells) {
        expect(cell.q).toBeGreaterThanOrEqual(-1);
        expect(cell.q).toBeLessThanOrEqual(1);
        expect(cell.r).toBeGreaterThanOrEqual(-1);
        expect(cell.r).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("when handling edge cases", () => {
    it("should handle single cell grid", () => {
      const grid = createTestGrid([{ q: 0, r: 0, terrainId: "forest" }]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "same-value",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(1);
      expect(result.cells[0]).toEqual({ q: 0, r: 0 });
      expect(result.truncated).toBe(false);
    });

    it("should handle negative coordinates", () => {
      const grid = createTestGrid([
        { q: -5, r: -3, terrainId: "forest" },
        { q: -4, r: -3, terrainId: "forest" },
      ]);
      const config: FloodFillConfig = {
        origin: { q: -5, r: -3 },
        mode: "same-value",
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(2);
      expect(result.cells).toContainEqual({ q: -5, r: -3 });
      expect(result.cells).toContainEqual({ q: -4, r: -3 });
    });

    it("should handle zero max cells gracefully", () => {
      const grid = createTestGrid([]);
      const config: FloodFillConfig = {
        origin: { q: 0, r: 0 },
        mode: "empty-only",
        maxCells: 0,
        getCellValue: createCellLookup(grid),
      };

      const result = floodFill(config);

      expect(result.cells).toHaveLength(0);
      expect(result.truncated).toBe(true);
      expect(result.truncationReason).toContain("Maximum cell limit reached");
    });
  });
});

describe("createPaperBounds utility", () => {
  it("should create square bounds", () => {
    const bounds = createPaperBounds("square", 10);

    expect(bounds.minQ).toBe(-10);
    expect(bounds.maxQ).toBe(10);
    expect(bounds.minR).toBe(-10);
    expect(bounds.maxR).toBe(10);
  });

  it("should create 4:3 aspect bounds", () => {
    const bounds = createPaperBounds("4:3", 10);

    expect(bounds.minQ).toBeLessThan(0);
    expect(bounds.maxQ).toBeGreaterThan(0);
    expect(bounds.minR).toBeLessThan(0);
    expect(bounds.maxR).toBeGreaterThan(0);
    // Should be wider than tall
    expect(bounds.maxQ - bounds.minQ).toBeGreaterThan(
      bounds.maxR - bounds.minR,
    );
  });

  it("should create 16:10 aspect bounds", () => {
    const bounds = createPaperBounds("16:10", 10);

    expect(bounds.minQ).toBeLessThan(0);
    expect(bounds.maxQ).toBeGreaterThan(0);
    expect(bounds.minR).toBeLessThan(0);
    expect(bounds.maxR).toBeGreaterThan(0);
    // Should be much wider than tall
    expect(bounds.maxQ - bounds.minQ).toBeGreaterThan(
      bounds.maxR - bounds.minR,
    );
  });

  it("should handle default radius", () => {
    const bounds = createPaperBounds("square");

    expect(bounds.minQ).toBeLessThan(0);
    expect(bounds.maxQ).toBeGreaterThan(0);
    expect(bounds.minR).toBeLessThan(0);
    expect(bounds.maxR).toBeGreaterThan(0);
  });
});

describe("isValidFloodFillConfig type guard", () => {
  it("should validate complete valid config", () => {
    const config: FloodFillConfig = {
      origin: { q: 0, r: 0 },
      mode: "empty-only",
      maxCells: 500,
      paperBounds: { minQ: -10, maxQ: 10, minR: -10, maxR: 10 },
      getCellValue: () => undefined,
    };

    expect(isValidFloodFillConfig(config)).toBe(true);
  });

  it("should validate minimal valid config", () => {
    const config = {
      origin: { q: 1, r: -1 },
      mode: "same-value" as const,
      getCellValue: () => "forest",
    };

    expect(isValidFloodFillConfig(config)).toBe(true);
  });

  it("should reject config without origin", () => {
    const config = {
      mode: "empty-only" as const,
      getCellValue: () => undefined,
    };

    expect(isValidFloodFillConfig(config)).toBe(false);
  });

  it("should reject config with invalid origin", () => {
    const config = {
      origin: { q: "invalid", r: 0 },
      mode: "empty-only" as const,
      getCellValue: () => undefined,
    };

    expect(isValidFloodFillConfig(config)).toBe(false);
  });

  it("should reject config with invalid mode", () => {
    const config = {
      origin: { q: 0, r: 0 },
      mode: "invalid-mode",
      getCellValue: () => undefined,
    };

    expect(isValidFloodFillConfig(config)).toBe(false);
  });

  it("should reject config without getCellValue function", () => {
    const config = {
      origin: { q: 0, r: 0 },
      mode: "empty-only" as const,
    };

    expect(isValidFloodFillConfig(config)).toBe(false);
  });

  it("should reject config with invalid maxCells", () => {
    const config = {
      origin: { q: 0, r: 0 },
      mode: "empty-only" as const,
      maxCells: -1,
      getCellValue: () => undefined,
    };

    expect(isValidFloodFillConfig(config)).toBe(false);
  });

  it("should reject config with invalid paperBounds", () => {
    const config = {
      origin: { q: 0, r: 0 },
      mode: "empty-only" as const,
      paperBounds: { minQ: "invalid", maxQ: 10, minR: -10, maxR: 10 },
      getCellValue: () => undefined,
    };

    expect(isValidFloodFillConfig(config)).toBe(false);
  });

  it("should reject null or undefined config", () => {
    expect(isValidFloodFillConfig(null)).toBe(false);
    expect(isValidFloodFillConfig(undefined)).toBe(false);
  });

  it("should reject array config", () => {
    expect(isValidFloodFillConfig([])).toBe(false);
  });

  it("should reject primitive config", () => {
    expect(isValidFloodFillConfig("invalid")).toBe(false);
    expect(isValidFloodFillConfig(123)).toBe(false);
  });
});
