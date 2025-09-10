import type { LayerAdapter } from "@/layers/types";
import { registerPropertySchema } from "@/properties/registry";
import { parseAxialKey, hexPath } from "@/layers/hex-utils";
import type { MapPalette } from "@/palettes/types";
import { resolveTerrainFill } from "@/stores/selectors/palette";

export interface FreeformCell {
  terrainId?: string;
  color?: string; // explicit override
}

export interface FreeformState {
  cells: Record<string, FreeformCell>; // key: "q,r"
  opacity: number; // 0..1
  brushTerrainId?: string;
  brushColor?: string; // if set, overrides terrain color when painting new cells
}

function colorForCell(
  palette: MapPalette | undefined,
  cell: FreeformCell,
): string {
  if (cell.color) return cell.color;
  return resolveTerrainFill(palette, cell.terrainId);
}

export const FreeformAdapter: LayerAdapter<FreeformState> = {
  title: "Freeform",
  drawMain(ctx, state, env) {
    const size = Math.max(4, env.grid?.size ?? 16);
    const orientation = env.grid?.orientation === "flat" ? "flat" : "pointy";
    const origin = { x: env.size.w / 2, y: env.size.h / 2 } as const;
    const layout = { size, orientation, origin } as const;
    const a = Math.max(0, Math.min(1, Number(state.opacity ?? 1)));
    ctx.save();
    ctx.globalAlpha = a;
    for (const [key, cell] of Object.entries(state.cells || {})) {
      const axial = parseAxialKey(key);
      // convert axial to pixel center
      const cx =
        origin.x +
        (orientation === "pointy"
          ? Math.sqrt(3) * size * (axial.q + axial.r / 2)
          : 1.5 * size * axial.q);
      const cy =
        origin.y +
        (orientation === "pointy"
          ? 1.5 * size * axial.r
          : Math.sqrt(3) * size * (axial.r + axial.q / 2));
      hexPath(ctx, { x: cx, y: cy }, layout);
      ctx.fillStyle = colorForCell(env.palette, cell);
      ctx.fill();
    }
    ctx.restore();
  },
  getInvalidationKey(state) {
    const count = Object.keys(state.cells || {}).length;
    // lightweight key: count + opacity + last key for cheap change detection
    const lastKey = Object.keys(state.cells || {}).slice(-1)[0] || "-";
    return `freeform:${count}:${state.opacity ?? 1}:${lastKey}`;
  },
};

export const FreeformType = {
  id: "freeform",
  title: "Freeform",
  defaultState: {
    cells: {},
    opacity: 1,
    brushTerrainId: undefined,
    brushColor: undefined,
  },
  adapter: FreeformAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;

// Register Freeform properties schema
registerPropertySchema("layer:freeform", {
  groups: [
    {
      id: "freeform",
      title: "Freeform",
      rows: [
        {
          kind: "slider",
          id: "opacity",
          label: "Opacity",
          path: "opacity",
          min: 0,
          max: 1,
          step: 0.01,
        },
        [
          {
            kind: "select",
            id: "brushTerrainId",
            label: "Brush Terrain",
            path: "brushTerrainId",
            options: [{ value: "", label: "— Select Terrain —" }],
          },
          {
            kind: "color",
            id: "brushColor",
            label: "Brush Color (Override)",
            path: "brushColor",
          },
        ],
      ],
    },
  ],
});
