/**
 * Flood Fill Tool Integration Tests
 *
 * Tests the integration between flood fill algorithm and the freeform plugin tool system
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ToolHandler, ToolContext } from "@/plugin/types";
import { freeformModule } from "@/plugin/builtin/freeform";
import type { RenderEnv } from "@/layers/types";
import type { BatchResult } from "@/types/batch-operations";
import { AppAPI } from "@/appapi";

describe("Freeform flood fill tool integration", () => {
  let toolHandler: ToolHandler | undefined;
  let mockContext: ToolContext;

  beforeEach(() => {
    // Find the flood fill tool handler
    toolHandler = freeformModule.tools?.find((tool) => tool.id === "fill");

    // Create mock ToolContext with batch API
    mockContext = {
      app: AppAPI,
      selection: { kind: "layer", id: "test-layer" },
      updateLayerState: vi.fn(),
      applyLayerState: vi.fn(),
      getActiveLayerState: vi.fn().mockReturnValue({
        brushTerrainId: "grass",
        brushColor: "#22c55e",
        fillMode: "auto", // Default to auto mode
        cells: {
          "1,0": { terrainId: "stone" }, // Adjacent to origin, different terrain
          "2,0": { terrainId: "water" }, // Further away, different terrain
        },
      }),
      applyCellsDelta: vi.fn().mockReturnValue({
        success: true,
        metrics: { executionTimeMs: 5, operationCount: 1 },
      } as BatchResult<void>),
      applyLayerStateBatch: vi.fn(),
    };
  });

  describe("when tool is registered", () => {
    it("should have flood fill tool handler with correct ID", () => {
      expect(toolHandler).toBeDefined();
      expect(toolHandler?.id).toBe("fill");
      expect(toolHandler?.onPointerDown).toBeDefined();
    });
  });

  describe("when clicking on empty cell", () => {
    it("should trigger flood fill with batch API", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: {
          orientation: "pointy",
          size: 16,
        },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 }; // Center of canvas, should map to (0,0) hex

      // Trigger tool event
      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Verify batch API was called with flood fill results
      expect(mockContext.applyCellsDelta).toHaveBeenCalledWith(
        "test-layer",
        expect.objectContaining({
          set: expect.objectContaining({
            "0,0": expect.objectContaining({
              terrainId: "grass",
              color: "#22c55e",
            }),
          }),
        }),
      );
    });

    it("should not operate on non-layer selection", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      // Set non-layer selection
      mockContext.selection = { kind: "map", id: "test-map" };
      const point = { x: 400, y: 300 };

      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Should not call batch API
      expect(mockContext.applyCellsDelta).not.toHaveBeenCalled();
    });

    it("should not operate without grid environment", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        // grid: undefined, // No grid
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 };

      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Should not call batch API
      expect(mockContext.applyCellsDelta).not.toHaveBeenCalled();
    });

    it("should not operate without brush configuration", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      // Mock layer state without brush configuration
      mockContext.getActiveLayerState = vi.fn().mockReturnValue({
        fillMode: "auto",
        cells: {},
        // No brushTerrainId or brushColor
      });

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 };

      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Should not call batch API
      expect(mockContext.applyCellsDelta).not.toHaveBeenCalled();
    });
  });

  describe("when batch API fails", () => {
    it("should handle batch operation failure gracefully", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      // Mock batch API failure
      mockContext.applyCellsDelta = vi.fn().mockReturnValue({
        success: false,
        error: "Test error",
      } as BatchResult<void>);

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 };

      // Spy on console.error
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Should not throw error
      expect(() => {
        toolHandler!.onPointerDown(point, mockEnv, mockContext);
      }).not.toThrow();

      // Should log error
      expect(consoleSpy).toHaveBeenCalledWith(
        "Flood fill: Batch operation failed:",
        "Test error",
      );

      consoleSpy.mockRestore();
    });

    it("should fall back to individual updates when batch API unavailable", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      // Remove batch API from context
      mockContext.applyCellsDelta = undefined;

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 };

      // Should not throw error
      expect(() => {
        toolHandler!.onPointerDown(point, mockEnv, mockContext);
      }).not.toThrow();

      // Should fall back to applyLayerState
      expect(mockContext.applyLayerState).toHaveBeenCalled();
    });
  });

  describe("fill mode behaviors", () => {
    it("should use same-value mode when clicking filled cell in auto mode", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      // Create layer state with terrain at origin and auto mode
      mockContext.getActiveLayerState = vi.fn().mockReturnValue({
        brushTerrainId: "grass",
        brushColor: "#22c55e",
        fillMode: "auto",
        cells: {
          "0,0": { terrainId: "stone" }, // Origin has terrain
          "1,0": { terrainId: "stone" }, // Adjacent cell with same terrain
        },
      });

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 }; // Maps to (0,0) - has terrain

      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Should use same-value mode (replace stone with grass)
      expect(mockContext.applyCellsDelta).toHaveBeenCalledWith(
        "test-layer",
        expect.objectContaining({
          set: expect.objectContaining({
            "0,0": expect.objectContaining({
              terrainId: "grass",
              color: "#22c55e",
            }),
            "1,0": expect.objectContaining({
              terrainId: "grass",
              color: "#22c55e",
            }),
          }),
        }),
      );
    });

    it("should use empty-only mode when clicking empty cell in auto mode", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      // Create layer state with empty origin and auto mode
      mockContext.getActiveLayerState = vi.fn().mockReturnValue({
        brushTerrainId: "grass",
        brushColor: "#22c55e",
        fillMode: "auto",
        cells: {
          "1,0": { terrainId: "stone" }, // Adjacent cell has terrain (should not be filled)
        },
      });

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 }; // Maps to (0,0) - empty

      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Should use empty-only mode (fill only empty cells)
      expect(mockContext.applyCellsDelta).toHaveBeenCalledWith(
        "test-layer",
        expect.objectContaining({
          set: expect.objectContaining({
            "0,0": expect.objectContaining({
              terrainId: "grass",
              color: "#22c55e",
            }),
          }),
        }),
      );

      // Verify that adjacent terrain cell was not included in the fill
      const callArgs = (mockContext.applyCellsDelta as any).mock.calls[0];
      const delta = callArgs[1];
      expect(delta.set["1,0"]).toBeUndefined();
    });

    it("should respect manual same-value mode setting", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      // Force same-value mode even on empty origin
      mockContext.getActiveLayerState = vi.fn().mockReturnValue({
        brushTerrainId: "grass",
        brushColor: "#22c55e",
        fillMode: "same-value",
        cells: {}, // Empty grid
      });

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 }; // Maps to (0,0) - empty

      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Should use same-value mode (fill cells with same value as origin, which is undefined)
      expect(mockContext.applyCellsDelta).toHaveBeenCalled();
    });

    it("should respect manual empty-only mode setting", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      // Force empty-only mode even on filled origin
      mockContext.getActiveLayerState = vi.fn().mockReturnValue({
        brushTerrainId: "grass",
        brushColor: "#22c55e",
        fillMode: "empty-only",
        cells: {
          "0,0": { terrainId: "stone" }, // Origin has terrain
        },
      });

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 }; // Maps to (0,0) - has terrain

      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Should not fill anything because origin is not empty and mode is empty-only
      expect(mockContext.applyCellsDelta).not.toHaveBeenCalled();
    });
  });

  describe("performance constraints", () => {
    it("should respect max cells limit", () => {
      if (!toolHandler?.onPointerDown) {
        throw new Error("Tool handler not found or missing onPointerDown");
      }

      // Create layer state with large empty region that would exceed max cells
      mockContext.getActiveLayerState = vi.fn().mockReturnValue({
        brushTerrainId: "grass",
        brushColor: "#22c55e",
        fillMode: "auto",
        cells: {}, // Empty grid should trigger large flood fill
      });

      const mockEnv: RenderEnv = {
        size: { w: 800, h: 600 },
        grid: { orientation: "pointy", size: 16 },
        zoom: 1,
        pixelRatio: 1,
        paperRect: { x: 0, y: 0, w: 800, h: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        palette: { entries: [] },
      };

      const point = { x: 400, y: 300 };

      toolHandler.onPointerDown(point, mockEnv, mockContext);

      // Should be called with batch operation (maxCells=1000 enforced in algorithm)
      expect(mockContext.applyCellsDelta).toHaveBeenCalled();

      // Get the called delta and verify it doesn't exceed reasonable limits
      const callArgs = (mockContext.applyCellsDelta as any).mock.calls[0];
      const delta = callArgs[1];
      const operationCount = Object.keys(delta.set || {}).length;

      // Should respect the 1000 cell limit from the tool
      expect(operationCount).toBeLessThanOrEqual(1000);
    });
  });
});
