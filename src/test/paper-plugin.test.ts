import { describe, it, expect, vi, beforeEach } from "vitest";
import { paperPluginManifest, paperPluginModule } from "@/plugin/builtin/paper";

vi.mock("@/layers/registry", () => ({
  registerLayerType: vi.fn(),
}));

vi.mock("@/layers/adapters/paper", () => ({
  PaperType: {
    id: "paper",
    name: "Paper",
    canDelete: false,
    canDuplicate: false,
    maxInstances: 1,
  },
}));

describe("Paper Plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Paper Plugin Manifest", () => {
    it("has correct plugin manifest properties", () => {
      expect(paperPluginManifest.id).toBe("core.paper");
      expect(paperPluginManifest.name).toBe("Paper Layer");
      expect(paperPluginManifest.version).toBe("1.0.0");
      expect(paperPluginManifest.priority).toBe(100);
    });

    it("has high priority for anchor layer status", () => {
      expect(paperPluginManifest.priority).toBe(100);
    });

    it("has required manifest fields", () => {
      expect(typeof paperPluginManifest.id).toBe("string");
      expect(typeof paperPluginManifest.name).toBe("string");
      expect(typeof paperPluginManifest.version).toBe("string");
      expect(typeof paperPluginManifest.priority).toBe("number");
    });
  });

  describe("Paper Plugin Module", () => {
    it("has activate function", () => {
      expect(paperPluginModule.activate).toBeDefined();
      expect(typeof paperPluginModule.activate).toBe("function");
    });

    it("registers paper layer type on activation", async () => {
      const { registerLayerType } = await import("@/layers/registry");
      const { PaperType } = await import("@/layers/adapters/paper");

      const mockCtx = {
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        app: {},
      };
      await paperPluginModule.activate?.(mockCtx);

      expect(registerLayerType).toHaveBeenCalledTimes(1);
      expect(registerLayerType).toHaveBeenCalledWith(PaperType);
    });

    it("does not throw error during activation", async () => {
      const mockCtx = {
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        app: {},
      };
      await expect(
        paperPluginModule.activate?.(mockCtx),
      ).resolves.not.toThrow();
    });
  });

  describe("Paper Plugin Integration", () => {
    it("provides expected plugin interface", () => {
      // Verify plugin exports match expected interface
      expect(paperPluginManifest).toBeDefined();
      expect(paperPluginModule).toBeDefined();

      // Verify manifest structure
      expect(paperPluginManifest).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        version: expect.any(String),
        priority: expect.any(Number),
      });

      // Verify module structure
      expect(paperPluginModule).toMatchObject({
        activate: expect.any(Function),
      });
    });

    it("maintains plugin consistency with other builtin plugins", () => {
      // Verify ID follows expected naming convention
      expect(paperPluginManifest.id).toMatch(/^core\./);

      // Verify anchor layer priority
      expect(paperPluginManifest.priority).toBeGreaterThanOrEqual(100);

      // Verify version format
      expect(paperPluginManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
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
      await expect(paperPluginModule.activate?.(mockCtx)).rejects.toThrow(
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
});
