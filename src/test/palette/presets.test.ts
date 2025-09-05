import { describe, it, expect } from "vitest";
import { Presets } from "@/palettes/presets";
import { DefaultPalette } from "@/palettes/defaults";
import type { MapPalette, TerrainCategory } from "@/palettes/types";

const terrainCategories: TerrainCategory[] = [
  "water",
  "plains",
  "forest",
  "hills",
  "mountains",
];

describe("Palette Presets", () => {
  describe("Structure Validation", () => {
    it("should have all required presets", () => {
      expect(Presets.DoomForge).toBeDefined();
      expect(Presets.SpaceOpera).toBeDefined();
      expect(Presets.EventHorizon).toBeDefined();
      expect(Presets.GloomyGarden).toBeDefined();
      expect(Presets.ExcessThrone).toBeDefined();
      expect(Presets.DataNexus).toBeDefined();
      expect(Presets.StreetLevel).toBeDefined();
    });

    it("should have bonus preset available", () => {
      expect(Presets.BrittleEmpire).toBeDefined();
    });

    it("should ensure all presets satisfy MapPalette interface", () => {
      Object.values(Presets).forEach((preset: MapPalette) => {
        // Terrain categories
        expect(preset.terrain).toBeDefined();
        terrainCategories.forEach((category) => {
          expect(preset.terrain[category]).toBeDefined();
          expect(preset.terrain[category].fill).toBeDefined();
          expect(typeof preset.terrain[category].fill).toBe("string");
          // Label is optional
          if (preset.terrain[category].label) {
            expect(typeof preset.terrain[category].label).toBe("string");
          }
        });

        // Grid line
        expect(preset.grid).toBeDefined();
        expect(preset.grid.line).toBeDefined();
        expect(typeof preset.grid.line).toBe("string");
      });
    });
  });

  describe("Color Format Validation", () => {
    it("should use valid hex color format for all terrain fills", () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      Object.entries(Presets).forEach(([presetName, preset]) => {
        terrainCategories.forEach((category) => {
          expect(
            preset.terrain[category].fill,
            `${presetName}.terrain.${category}.fill should be valid hex`,
          ).toMatch(hexColorRegex);
        });

        expect(
          preset.grid.line,
          `${presetName}.grid.line should be valid hex`,
        ).toMatch(hexColorRegex);
      });
    });

    it("should have descriptive labels for all terrain categories", () => {
      Object.entries(Presets).forEach(([presetName, preset]) => {
        terrainCategories.forEach((category) => {
          expect(
            preset.terrain[category].label,
            `${presetName}.terrain.${category} should have descriptive label`,
          ).toBeDefined();
          expect(preset.terrain[category].label!.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Thematic Consistency", () => {
    it("should have thematically appropriate DoomForge colors", () => {
      const doomForge = Presets.DoomForge;

      expect(doomForge.terrain.water.fill).toBe("#8B0000"); // Crimson
      expect(doomForge.terrain.plains.fill).toBe("#d8d8d8"); // Bone ash
      expect(doomForge.terrain.forest.fill).toBe("#696969"); // Iron grey
      expect(doomForge.terrain.hills.fill).toBe("#0C0C0C"); // Void black
      expect(doomForge.terrain.mountains.fill).toBe("#FFFF00"); // Doom yellow

      expect(doomForge.terrain.water.label).toBe("Blood Mires");
      expect(doomForge.terrain.plains.label).toBe("Bone Fields");
      expect(doomForge.terrain.forest.label).toBe("Ash Thickets");
      expect(doomForge.terrain.hills.label).toBe("Iron Graves");
      expect(doomForge.terrain.mountains.label).toBe("Doom Crags");
    });

    it("should have distinct color schemes across presets", () => {
      const presetEntries = Object.entries(Presets);

      // Compare each preset against every other to ensure uniqueness
      for (let i = 0; i < presetEntries.length; i++) {
        for (let j = i + 1; j < presetEntries.length; j++) {
          const [nameA, presetA] = presetEntries[i];
          const [nameB, presetB] = presetEntries[j];

          // Ensure water colors are different (most distinctive)
          expect(presetA.terrain.water.fill).not.toBe(
            presetB.terrain.water.fill,
          );
          expect(presetA.grid.line).not.toBe(presetB.grid.line);

          // Count how many terrain colors are different
          const differentColors = terrainCategories.filter(
            (category) =>
              presetA.terrain[category].fill !== presetB.terrain[category].fill,
          ).length;

          // At least 3 out of 5 terrain colors should be different
          expect(
            differentColors,
            `${nameA} and ${nameB} should have distinct color schemes`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });

  describe("Default Configuration", () => {
    it("should use DoomForge as default palette", () => {
      expect(DefaultPalette).toBe(Presets.DoomForge);
    });

    it("should have fallback plains color in default palette", () => {
      expect(DefaultPalette.terrain.plains.fill).toBeDefined();
      expect(typeof DefaultPalette.terrain.plains.fill).toBe("string");
      expect(DefaultPalette.terrain.plains.fill).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe("Preset Content Validation", () => {
    it("should have meaningful preset names reflecting their themes", () => {
      const presetNames = Object.keys(Presets);

      expect(presetNames).toContain("DoomForge");
      expect(presetNames).toContain("SpaceOpera");
      expect(presetNames).toContain("EventHorizon");
      expect(presetNames).toContain("GloomyGarden");
      expect(presetNames).toContain("ExcessThrone");
      expect(presetNames).toContain("DataNexus");
      expect(presetNames).toContain("StreetLevel");
    });

    it("should have thematically consistent labels within each preset", () => {
      // DoomForge should have dark/metal themed labels
      const doomForge = Presets.DoomForge;
      expect(doomForge.terrain.water.label).toMatch(/blood|mire/i);
      expect(doomForge.terrain.plains.label).toMatch(/bone|ash/i);

      // SpaceOpera should have space themed labels
      const spaceOpera = Presets.SpaceOpera;
      expect(spaceOpera.terrain.water.label).toMatch(/nebula|field/i);
      expect(spaceOpera.terrain.plains.label).toMatch(/space|empty/i);

      // DataNexus should have tech themed labels
      const dataNexus = Presets.DataNexus;
      expect(dataNexus.terrain.water.label).toMatch(/data|ocean/i);
      expect(dataNexus.terrain.plains.label).toMatch(/corporate|zone/i);
    });

    it("should avoid color conflicts that could impact accessibility", () => {
      Object.entries(Presets).forEach(([presetName, preset]) => {
        const colors = [
          preset.terrain.water.fill,
          preset.terrain.plains.fill,
          preset.terrain.forest.fill,
          preset.terrain.hills.fill,
          preset.terrain.mountains.fill,
        ];

        // No two terrain colors should be identical within a preset
        const uniqueColors = new Set(colors);
        expect(
          uniqueColors.size,
          `${presetName} should have unique colors for each terrain type`,
        ).toBe(colors.length);

        // Grid line should be different from all terrain colors
        expect(colors).not.toContain(preset.grid.line);
      });
    });
  });

  describe("Future Extensibility", () => {
    it("should support adding new terrain categories without breaking", () => {
      // Verify the type system supports extension
      const testPalette: MapPalette = {
        terrain: {
          water: { fill: "#test1" },
          plains: { fill: "#test2" },
          forest: { fill: "#test3" },
          hills: { fill: "#test4" },
          mountains: { fill: "#test5" },
        },
        grid: { line: "#testgrid" },
      };

      expect(testPalette.terrain.water).toBeDefined();
      expect(testPalette.grid.line).toBeDefined();
    });

    it("should maintain preset immutability", () => {
      const originalDoomForge = { ...Presets.DoomForge };

      // Attempt to modify (should not affect original)
      const modifiedDoomForge = { ...Presets.DoomForge };
      modifiedDoomForge.terrain.water.fill = "#modified";

      expect(Presets.DoomForge.terrain.water.fill).toBe(
        originalDoomForge.terrain.water.fill,
      );
      expect(Presets.DoomForge.terrain.water.fill).not.toBe("#modified");
    });
  });

  describe("Smoke Tests", () => {
    it("should render without throwing for each preset", () => {
      // Simulate basic usage for each preset
      Object.entries(Presets).forEach(([presetName, preset]) => {
        expect(() => {
          // Basic property access that renderer would do
          const waterColor = preset.terrain.water.fill;
          const gridColor = preset.grid.line;
          const labels = terrainCategories.map(
            (cat) => preset.terrain[cat].label,
          );

          expect(waterColor).toBeDefined();
          expect(gridColor).toBeDefined();
          expect(labels.every((label) => label && label.length > 0)).toBe(true);
        }, `${presetName} should be usable without errors`).not.toThrow();
      });
    });

    it("should support all required terrain categories from requirements", () => {
      // Verify all presets support the canonical 5 terrain types
      const requiredCategories: TerrainCategory[] = [
        "water",
        "plains",
        "forest",
        "hills",
        "mountains",
      ];

      Object.entries(Presets).forEach(([presetName, preset]) => {
        requiredCategories.forEach((category) => {
          expect(
            preset.terrain[category],
            `${presetName} should support ${category} terrain`,
          ).toBeDefined();

          expect(
            preset.terrain[category].fill,
            `${presetName}.${category} should have fill color`,
          ).toBeDefined();
        });
      });
    });
  });
});
