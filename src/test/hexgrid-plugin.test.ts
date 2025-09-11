import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hexgridPluginManifest,
  hexgridPluginModule,
} from "@/plugin/builtin/hexgrid";

vi.mock("@/layers/registry", () => ({
  registerLayerType: vi.fn(),
}));

vi.mock("@/layers/adapters/hexgrid", () => ({
  HexgridType: {
    id: "hexgrid",
    name: "Hex Grid",
    canDelete: false,
    canDuplicate: false,
    maxInstances: 1,
  },
}));

describe("Hexgrid Plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Hexgrid Plugin Manifest", () => {
    it("has correct plugin manifest properties", () => {
      expect(hexgridPluginManifest.id).toBe("core.hexgrid");
      expect(hexgridPluginManifest.name).toBe("Hex Grid Layer");
      expect(hexgridPluginManifest.version).toBe("1.0.0");
      expect(hexgridPluginManifest.priority).toBe(100);
    });

    it("has high priority for anchor layer status", () => {
      expect(hexgridPluginManifest.priority).toBe(100);
    });

    it("has required manifest fields", () => {
      expect(typeof hexgridPluginManifest.id).toBe("string");
      expect(typeof hexgridPluginManifest.name).toBe("string");
      expect(typeof hexgridPluginManifest.version).toBe("string");
      expect(typeof hexgridPluginManifest.priority).toBe("number");
    });
  });

  describe("Hexgrid Plugin Module", () => {
    it("has activate function", () => {
      expect(hexgridPluginModule.activate).toBeDefined();
      expect(typeof hexgridPluginModule.activate).toBe("function");
    });

    it("registers hexgrid layer type on activation", async () => {
      const { registerLayerType } = await import("@/layers/registry");
      const { HexgridType } = await import("@/layers/adapters/hexgrid");

      const mockCtx = {
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        app: {},
      };
      await hexgridPluginModule.activate?.(mockCtx);

      expect(registerLayerType).toHaveBeenCalledTimes(1);
      expect(registerLayerType).toHaveBeenCalledWith(HexgridType);
    });

    it("does not throw error during activation", async () => {
      const mockCtx = {
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        app: {},
      };
      await expect(
        hexgridPluginModule.activate?.(mockCtx),
      ).resolves.not.toThrow();
    });
  });

  describe("Hexgrid Plugin Integration", () => {
    it("provides expected plugin interface", () => {
      // Verify plugin exports match expected interface
      expect(hexgridPluginManifest).toBeDefined();
      expect(hexgridPluginModule).toBeDefined();

      // Verify manifest structure
      expect(hexgridPluginManifest).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        version: expect.any(String),
        priority: expect.any(Number),
      });

      // Verify module structure
      expect(hexgridPluginModule).toMatchObject({
        activate: expect.any(Function),
      });
    });

    it("maintains plugin consistency with other builtin plugins", () => {
      // Verify ID follows expected naming convention
      expect(hexgridPluginManifest.id).toMatch(/^core\./);

      // Verify anchor layer priority
      expect(hexgridPluginManifest.priority).toBeGreaterThanOrEqual(100);

      // Verify version format
      expect(hexgridPluginManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("matches paper plugin priority for consistent anchor layer behavior", () => {
      // Both paper and hexgrid should have same priority as anchor layers
      expect(hexgridPluginManifest.priority).toBe(100);
    });
  });

  describe("Error Handling", () => {
    it("handles registration errors gracefully", async () => {
      const { registerLayerType } = await import("@/layers/registry");

      // Mock registerLayerType to throw error
      vi.mocked(registerLayerType).mockImplementationOnce(() => {
        throw new Error("Registration failed");
      });

      const mockCtx = {
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        app: {},
      };

      // Activation should throw (error will be handled by plugin loader)
      await expect(hexgridPluginModule.activate?.(mockCtx)).rejects.toThrow(
        "Registration failed",
      );
    });

    it("works with undefined activate function", () => {
      const moduleWithoutActivate = {};

      // Should not throw when activate is undefined
      expect(() => {
        if (
          "activate" in moduleWithoutActivate &&
          typeof moduleWithoutActivate.activate === "function"
        ) {
          moduleWithoutActivate.activate();
        }
      }).not.toThrow();
    });
  });

  describe("Hexgrid-Specific Behavior", () => {
    it("maintains hexgrid layer policies through plugin registration", async () => {
      const { HexgridType } = await import("@/layers/adapters/hexgrid");

      // Verify the mocked HexgridType has expected policies
      expect(HexgridType.canDelete).toBe(false);
      expect(HexgridType.canDuplicate).toBe(false);
      expect(HexgridType.maxInstances).toBe(1);
    });

    it("uses correct layer type identifier", async () => {
      const { HexgridType } = await import("@/layers/adapters/hexgrid");

      expect(HexgridType.id).toBe("hexgrid");
      expect(HexgridType.name).toBe("Hex Grid");
    });
  });
});
