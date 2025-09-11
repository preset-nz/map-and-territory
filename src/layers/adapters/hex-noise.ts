import type { LayerAdapter } from "@/layers/types";
import { DefaultPalette } from "@/palettes/defaults";
import { createPerlinNoise } from "@/lib/noise";
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
  // When painting, allow selecting a specific terrain entry from active setting
  terrainId?: string;
  // Cache resolved color for terrainId to avoid cross-thread API calls
  paintColor?: string;
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
      // Prefer explicit paintColor (from selected terrainId), fall back to palette by base type
      let fill = state.paintColor;
      if (!fill) {
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
        fill = fromEnv || DefaultPalette.terrain.plains.fill;
      }
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
  serialize(state) {
    // Do not persist derived/cache fields like paintColor
    const { paintColor: _paintColor, ...rest } = state;
    void _paintColor; // avoid unused var warning while omitting from output
    return rest;
  },
  deserialize(raw) {
    const base =
      typeof raw === "object" && raw ? (raw as Partial<HexNoiseState>) : {};
    return {
      seed: base.seed ?? "seed",
      frequency: base.frequency ?? 0.15,
      offsetX: base.offsetX ?? 0,
      offsetY: base.offsetY ?? 0,
      intensity: base.intensity ?? 1,
      gamma: base.gamma ?? 1,
      min: base.min ?? 0,
      max: base.max ?? 1,
      mode: base.mode ?? "shape",
      terrain: base.terrain ?? "plains",
      terrainId: base.terrainId,
      paintColor: undefined, // recomputed later from palette/terrainId
    };
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
    terrainId: undefined,
    paintColor: undefined,
  },
  adapter: HexNoiseAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;

// Properties schema is registered by the hex-noise plugin during activation.
