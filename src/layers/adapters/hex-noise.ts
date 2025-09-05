import type { LayerAdapter } from "@/layers/types";
import { DefaultPalette } from "@/palettes/defaults";
import { createPerlinNoise } from "@/lib/noise";
import { registerPropertySchema } from "@/properties/registry";
// (no direct adapter drawing; rendering handled elsewhere)

export interface HexNoiseState {
  seed: string | number;
  frequency: number; // scale applied to axial coords
  offsetX: number;
  offsetY: number;
  intensity: number; // 0..1 multiplier
  gamma: number; // >0 contrast curve
  min: number; // 0..1 lower threshold (transparent below)
  max: number; // 0..1 upper threshold (transparent above)
  mode?: "shape" | "paint";
  terrain?: "water" | "plains" | "forest" | "hills" | "mountains";
}

export const HexNoiseAdapter: LayerAdapter<HexNoiseState> = {
  title: "Hex Noise",
  drawMain(ctx, state, env) {
    const gridSize = Math.max(4, env.grid?.size ?? 16);
    const orientation: "pointy" | "flat" =
      env.grid?.orientation === "flat" ? "flat" : "pointy";
    const r = gridSize;
    const sqrt3 = Math.sqrt(3);
    const perlin = createPerlinNoise(state.seed ?? "seed");
    const freq = Math.max(0, Number(state.frequency ?? 0.15));
    const ox = Number(state.offsetX ?? 0);
    const oy = Number(state.offsetY ?? 0);
    const intensity = Math.max(0, Math.min(1, Number(state.intensity ?? 1)));
    const gamma = Math.max(0.0001, Number(state.gamma ?? 1));
    const clampMin = Math.max(0, Math.min(1, Number(state.min ?? 0)));
    const clampMax = Math.max(0, Math.min(1, Number(state.max ?? 1)));

    const drawHexFilled = (
      cx: number,
      cy: number,
      startAngle: number,
      aq: number,
      ar: number,
    ) => {
      let v = perlin.normalized2D(aq * freq + ox, ar * freq + oy);
      v = Math.pow(v, gamma);
      if (v < clampMin || v > clampMax) return;
      const mode = (state.mode as "shape" | "paint" | undefined) ?? "shape";
      if (mode === "shape") {
        const g = Math.floor(v * 255 * intensity);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = startAngle + i * (Math.PI / 3);
          const px = cx + Math.cos(ang) * r;
          const py = cy + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fill();
        return;
      }
      const terrain = (state.terrain as string | undefined) ?? "plains";
      const key = (():
        | "water"
        | "plains"
        | "forest"
        | "hills"
        | "mountains" => {
        switch (terrain) {
          case "water":
          case "plains":
          case "forest":
          case "hills":
          case "mountains":
            return terrain;
          default:
            return "plains";
        }
      })();
      const fromEnv =
        env.palette?.terrain?.[
          key as "water" | "plains" | "forest" | "hills" | "mountains"
        ]?.fill;
      const fill = fromEnv || DefaultPalette.terrain.plains.fill;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = startAngle + i * (Math.PI / 3);
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    if (orientation === "flat") {
      const colStep = 1.5 * r;
      const rowStep = sqrt3 * r;
      const cols = Math.ceil(env.size.w / colStep) + 2;
      const rows = Math.ceil(env.size.h / rowStep) + 2;
      const centerX = env.size.w / 2;
      const centerY = env.size.h / 2;
      const cmin = -Math.ceil(cols / 2),
        cmax = Math.ceil(cols / 2);
      const rmin = -Math.ceil(rows / 2),
        rmax = Math.ceil(rows / 2);
      for (let c = cmin; c <= cmax; c++) {
        const yOffset = c & 1 ? rowStep / 2 : 0;
        for (let rr = rmin; rr <= rmax; rr++) {
          const x = c * colStep + centerX;
          const y = rr * rowStep + yOffset + centerY;
          drawHexFilled(x, y, 0, c, rr);
        }
      }
    } else {
      const colStep = sqrt3 * r;
      const rowStep = 1.5 * r;
      const cols = Math.ceil(env.size.w / colStep) + 2;
      const rows = Math.ceil(env.size.h / rowStep) + 2;
      const centerX = env.size.w / 2;
      const centerY = env.size.h / 2;
      const rmin = -Math.ceil(rows / 2),
        rmax = Math.ceil(rows / 2);
      const cmin = -Math.ceil(cols / 2),
        cmax = Math.ceil(cols / 2);
      for (let rr = rmin; rr <= rmax; rr++) {
        const xOffset = rr & 1 ? colStep / 2 : 0;
        for (let c = cmin; c <= cmax; c++) {
          const x = c * colStep + xOffset + centerX;
          const y = rr * rowStep + centerY;
          drawHexFilled(x, y, -Math.PI / 6, c, rr);
        }
      }
    }
  },
  // Note: main renderers draw this layer explicitly; adapter kept for parity/future bridge
  getInvalidationKey(state) {
    return `hexnoise:${state.mode ?? ""}:${state.terrain ?? ""}:${state.seed ?? ""}:${state.frequency ?? ""}:${state.offsetX ?? ""}:${state.offsetY ?? ""}:${state.intensity ?? ""}:${state.gamma ?? ""}:${state.min ?? ""}:${state.max ?? ""}`;
  },
};

export const HexNoiseType = {
  id: "hexnoise",
  title: "Hex Noise",
  defaultState: {
    seed: "seed",
    frequency: 0.15,
    offsetX: 0,
    offsetY: 0,
    intensity: 1,
    gamma: 1,
    min: 0,
    max: 1,
    mode: "shape",
    terrain: "plains",
  },
  adapter: HexNoiseAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;

registerPropertySchema("layer:hexnoise", {
  groups: [
    {
      id: "noise",
      title: "Hex Noise",
      rows: [
        [
          {
            kind: "select",
            id: "mode",
            label: "Mode",
            path: "mode",
            options: [
              { value: "shape", label: "Shape (Grayscale)" },
              { value: "paint", label: "Paint (Terrain)" },
            ],
          },
          {
            kind: "select",
            id: "terrain",
            label: "Terrain",
            path: "terrain",
            options: [
              {
                value: "water",
                label: DefaultPalette.terrain.water.label ?? "Water",
              },
              {
                value: "plains",
                label: DefaultPalette.terrain.plains.label ?? "Plains",
              },
              {
                value: "forest",
                label: DefaultPalette.terrain.forest.label ?? "Forest",
              },
              {
                value: "hills",
                label: DefaultPalette.terrain.hills.label ?? "Hills",
              },
              {
                value: "mountains",
                label: DefaultPalette.terrain.mountains.label ?? "Mountains",
              },
            ],
          },
        ],
        [
          { kind: "text", id: "seed", label: "Seed", path: "seed" },
          {
            kind: "number",
            id: "frequency",
            label: "Frequency",
            path: "frequency",
            min: 0.01,
            max: 5,
            step: 0.01,
          },
        ],
        [
          {
            kind: "number",
            id: "offsetX",
            label: "Offset X",
            path: "offsetX",
            min: -1000,
            max: 1000,
            step: 0.1,
          },
          {
            kind: "number",
            id: "offsetY",
            label: "Offset Y",
            path: "offsetY",
            min: -1000,
            max: 1000,
            step: 0.1,
          },
        ],
        [
          {
            kind: "number",
            id: "gamma",
            label: "Gamma",
            path: "gamma",
            min: 0.1,
            max: 5,
            step: 0.1,
          },
          {
            kind: "slider",
            id: "intensity",
            label: "Intensity",
            path: "intensity",
            min: 0,
            max: 1,
            step: 0.01,
          },
        ],
        [
          {
            kind: "number",
            id: "min",
            label: "Clamp Min",
            path: "min",
            min: 0,
            max: 1,
            step: 0.01,
          },
          {
            kind: "number",
            id: "max",
            label: "Clamp Max",
            path: "max",
            min: 0,
            max: 1,
            step: 0.01,
          },
        ],
      ],
    },
  ],
});
