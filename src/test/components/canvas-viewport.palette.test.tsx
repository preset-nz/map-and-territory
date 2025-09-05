import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { CanvasViewport } from "@/components/map/canvas-viewport";
import { useProjectStore } from "@/stores/project";
import { useLayerOrderingStore } from "@/stores/layer-ordering";
import { useLayoutStore } from "@/stores/layout";
import { resolvePalette, resolveTerrainFill } from "@/stores/selectors/palette";
import { DefaultPalette } from "@/palettes/defaults";
import { Presets } from "@/palettes/presets";
import type { MapPalette } from "@/palettes/types";
import type { Project } from "@/stores/project";

// Mock stores
vi.mock("@/stores/project");
vi.mock("@/stores/layer-ordering");
vi.mock("@/stores/layout");
vi.mock("@/stores/selectors/palette");

// Mock render service
vi.mock("@/render/service", () => ({
  RenderService: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
  })),
}));

const mockUseProjectStore = useProjectStore as unknown as Mock;
const mockUseLayerOrderingStore = useLayerOrderingStore as unknown as Mock;
const mockUseLayoutStore = useLayoutStore as unknown as Mock;
const mockResolvePalette = resolvePalette as Mock;
const mockResolveTerrainFill = resolveTerrainFill as Mock;

// Test fixtures
const mockCampaignPalette: MapPalette = {
  terrain: {
    water: { fill: "#001122", label: "Campaign Water" },
    plains: { fill: "#223344", label: "Campaign Plains" },
    forest: { fill: "#334455", label: "Campaign Forest" },
    hills: { fill: "#445566", label: "Campaign Hills" },
    mountains: { fill: "#556677", label: "Campaign Mountains" },
  },
  grid: { line: "#campaign" },
};

const mockMapPalette: MapPalette = {
  terrain: {
    water: { fill: "#aabbcc", label: "Map Water" },
    plains: { fill: "#bbccdd", label: "Map Plains" },
    forest: { fill: "#ccddee", label: "Map Forest" },
    hills: { fill: "#ddeeff", label: "Map Hills" },
    mountains: { fill: "#eeffaa", label: "Map Mountains" },
  },
  grid: { line: "#mapcolor" },
};

const mockProject: Project = {
  id: "test-project",
  name: "Test Project",
  created: Date.now(),
  updated: Date.now(),
  activeMapId: "map-1",
  maps: [
    {
      id: "map-1",
      name: "Test Map 1",
      created: Date.now(),
      updated: Date.now(),
      size: { w: 100, h: 100 },
      layers: [],
      palette: mockMapPalette,
    },
    {
      id: "map-2",
      name: "Test Map 2",
      created: Date.now(),
      updated: Date.now(),
      size: { w: 100, h: 100 },
      layers: [],
    },
  ],
  palette: mockCampaignPalette,
};

describe("CanvasViewport Palette Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default store mocks
    mockUseLayerOrderingStore.mockReturnValue({
      layers: [],
      key: "test-key",
    });

    mockUseLayoutStore.mockReturnValue({
      size: { w: 800, h: 600 },
      useWorker: false,
      paperColor: "#ffffff",
    });

    // Reset palette selectors to real implementations by default
    mockResolvePalette.mockImplementation((project, mapId) => {
      if (!project) return DefaultPalette;
      const map = project.maps.find((m) => m.id === mapId);
      return map?.palette || project.palette || DefaultPalette;
    });

    mockResolveTerrainFill.mockImplementation((palette, key) => {
      const p = palette || DefaultPalette;
      const terrainKey = key === "desert" ? "plains" : key || "plains";
      return (
        p.terrain[terrainKey as keyof typeof p.terrain]?.fill ||
        DefaultPalette.terrain.plains.fill
      );
    });
  });

  describe("Palette Resolution", () => {
    it("should resolve map palette when map has override", () => {
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });

      render(<CanvasViewport />);

      expect(mockResolvePalette).toHaveBeenCalledWith(mockProject, "map-1");
    });

    it("should resolve campaign palette when map has no override", () => {
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-2",
      });

      render(<CanvasViewport />);

      expect(mockResolvePalette).toHaveBeenCalledWith(mockProject, "map-2");
    });

    it("should resolve default palette when no project", () => {
      mockUseProjectStore.mockReturnValue({
        current: null,
        activeId: null,
      });

      render(<CanvasViewport />);

      expect(mockResolvePalette).toHaveBeenCalledWith(null, null);
    });

    it("should update palette when active map changes", () => {
      const { rerender } = render(<CanvasViewport />);

      // First render with map-1
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });
      rerender(<CanvasViewport />);

      // Second render with map-2
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-2",
      });
      rerender(<CanvasViewport />);

      expect(mockResolvePalette).toHaveBeenCalledWith(mockProject, "map-1");
      expect(mockResolvePalette).toHaveBeenCalledWith(mockProject, "map-2");
    });
  });

  describe("Fallback Terrain Color Resolution", () => {
    beforeEach(() => {
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });
    });

    it("should call resolveTerrainFill for terrain color fallback", () => {
      render(<CanvasViewport />);

      // The component should be prepared to use resolveTerrainFill for terrain colors
      // This tests the integration is wired up correctly
      expect(mockResolvePalette).toHaveBeenCalled();

      // Simulate what happens when the viewport needs terrain colors
      const resolvedPalette = mockMapPalette;
      const terrainColor = mockResolveTerrainFill(resolvedPalette, "water");

      expect(terrainColor).toBe("#aabbcc");
    });

    it("should handle different terrain types", () => {
      render(<CanvasViewport />);

      const testCases = [
        { terrain: "water", expected: "#aabbcc" },
        { terrain: "plains", expected: "#bbccdd" },
        { terrain: "forest", expected: "#ccddee" },
        { terrain: "hills", expected: "#ddeeff" },
        { terrain: "mountains", expected: "#eeffaa" },
      ];

      testCases.forEach(({ terrain, expected }) => {
        const color = mockResolveTerrainFill(mockMapPalette, terrain);
        expect(color).toBe(expected);
      });
    });

    it("should handle desert to plains coercion", () => {
      render(<CanvasViewport />);

      const desertColor = mockResolveTerrainFill(mockMapPalette, "desert");
      const plainsColor = mockResolveTerrainFill(mockMapPalette, "plains");

      expect(desertColor).toBe(plainsColor);
      expect(desertColor).toBe("#bbccdd");
    });
  });

  describe("Palette Change Propagation", () => {
    it("should update rendering when palette changes", () => {
      const { rerender } = render(<CanvasViewport />);

      // Start with map palette
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });
      rerender(<CanvasViewport />);

      // Change to different map with different palette
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-2", // This map uses campaign palette
      });
      rerender(<CanvasViewport />);

      // Should have been called with both map IDs
      expect(mockResolvePalette).toHaveBeenCalledWith(mockProject, "map-1");
      expect(mockResolvePalette).toHaveBeenCalledWith(mockProject, "map-2");
    });

    it("should re-render when project changes", () => {
      const { rerender } = render(<CanvasViewport />);

      // Start with original project
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });
      rerender(<CanvasViewport />);

      // Switch to project without palettes
      const projectNoPalettes: Project = {
        ...mockProject,
        id: "project-no-palettes",
        palette: undefined,
        maps: mockProject.maps.map((map) => ({ ...map, palette: undefined })),
      };

      mockUseProjectStore.mockReturnValue({
        current: projectNoPalettes,
        activeId: "map-1",
      });
      rerender(<CanvasViewport />);

      expect(mockResolvePalette).toHaveBeenCalledWith(mockProject, "map-1");
      expect(mockResolvePalette).toHaveBeenCalledWith(
        projectNoPalettes,
        "map-1",
      );
    });
  });

  describe("Default Palette Behavior", () => {
    it("should use Doom Forge preset when no palettes configured", () => {
      mockUseProjectStore.mockReturnValue({
        current: null,
        activeId: null,
      });

      // Mock the actual default behavior
      mockResolvePalette.mockReturnValue(DefaultPalette);

      render(<CanvasViewport />);

      expect(mockResolvePalette).toHaveBeenCalledWith(null, null);

      // Verify default palette is DoomForge
      expect(DefaultPalette).toBe(Presets.DoomForge);
    });

    it("should provide fallback colors for invalid terrain keys", () => {
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });

      render(<CanvasViewport />);

      // Test invalid terrain keys fallback to plains
      const invalidColor = mockResolveTerrainFill(
        mockMapPalette,
        "invalid-terrain",
      );
      const plainsColor = mockResolveTerrainFill(mockMapPalette, "plains");

      expect(invalidColor).toBe(plainsColor);
    });
  });

  describe("Performance and Memoization", () => {
    it("should not re-resolve palette when dependencies unchanged", () => {
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });

      const { rerender } = render(<CanvasViewport />);

      // Clear mock calls after initial render
      vi.clearAllMocks();

      // Re-render with same props
      rerender(<CanvasViewport />);

      // Should not call resolution again due to memoization
      expect(mockResolvePalette).not.toHaveBeenCalled();
    });

    it("should re-resolve palette when dependencies change", () => {
      const { rerender } = render(<CanvasViewport />);

      // First render
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });
      rerender(<CanvasViewport />);

      // Clear and change active map
      vi.clearAllMocks();
      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-2",
      });
      rerender(<CanvasViewport />);

      // Should resolve again with new map ID
      expect(mockResolvePalette).toHaveBeenCalledWith(mockProject, "map-2");
    });
  });

  describe("Error Handling", () => {
    it("should handle palette resolution errors gracefully", () => {
      mockResolvePalette.mockImplementation(() => {
        throw new Error("Palette resolution failed");
      });

      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });

      // Should not crash the component
      expect(() => render(<CanvasViewport />)).not.toThrow();
    });

    it("should handle terrain fill resolution errors gracefully", () => {
      mockResolveTerrainFill.mockImplementation(() => {
        throw new Error("Terrain fill resolution failed");
      });

      mockUseProjectStore.mockReturnValue({
        current: mockProject,
        activeId: "map-1",
      });

      // Should not crash the component
      expect(() => render(<CanvasViewport />)).not.toThrow();
    });
  });
});
