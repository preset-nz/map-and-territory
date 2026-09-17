import { describe, expect, it, vi } from "vitest";
import { AppAPI } from "@/appapi";
import type { SelectFieldDef } from "@/properties/registry";

describe("Property SelectField optionsProvider", () => {
  it("returns dynamic options from AppAPI", () => {
    const spy = vi.spyOn(AppAPI.palette, "list");
    spy.mockReturnValueOnce([
      { id: "a", themedName: "Alpha", color: "#111" } as any,
      { id: "b", themedName: "Beta", color: "#222" } as any,
    ]);

    const field: SelectFieldDef = {
      kind: "select",
      id: "terrain",
      path: "terrainId",
      label: "Terrain",
      optionsProvider: (app) =>
        (app as typeof AppAPI).palette
          .list()
          .map((e) => ({ value: e.id, label: e.themedName })),
    };

    const opts = field.optionsProvider!(AppAPI);
    expect(opts).toEqual([
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ]);

    spy.mockRestore();
  });
});
