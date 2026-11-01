import { createHexLayout, hexPath, hexTiles } from '@/layers/hex-utils';
import type { LayerAdapter } from '@/layers/types';
import { createPerlinNoise } from '@/lib/noise';
import { resolveTerrainFill } from '@/palettes/terrain-fill';
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
  mode?: 'shape' | 'paint';
  /** The setting terrain painted in paint mode; empty paints the setting's first. */
  terrain?: string;
}

export const HexNoiseAdapter: LayerAdapter<HexNoiseState> = {
  title: 'Hex Noise',
  drawMain(ctx, state, env) {
    const gridSize = Math.max(4, env.grid?.size ?? 16);
    const orientation: 'pointy' | 'flat' = env.grid?.orientation === 'flat' ? 'flat' : 'pointy';
    const perlin = createPerlinNoise(state.seed ?? 'seed');
    const freq = Math.max(0, Number(state.frequency ?? 0.15));
    const ox = Number(state.offsetX ?? 0);
    const oy = Number(state.offsetY ?? 0);
    const intensity = Math.max(0, Math.min(1, Number(state.intensity ?? 1)));
    const gamma = Math.max(0.0001, Number(state.gamma ?? 1));
    const clampMin = Math.max(0, Math.min(1, Number(state.min ?? 0)));
    const clampMax = Math.max(0, Math.min(1, Number(state.max ?? 1)));

    // Use shared hex utilities for tiling and drawing
    const layout = createHexLayout(gridSize, orientation);
    const tilingConfig = {
      size: gridSize,
      orientation,
      center: { x: env.size.w / 2, y: env.size.h / 2 },
      bounds: env.size,
      padding: 2,
    };

    for (const tile of hexTiles(tilingConfig)) {
      // Apply noise calculation using axial coordinates
      let v = perlin.normalized2D(tile.axial.q * freq + ox, tile.axial.r * freq + oy);
      v = v ** gamma;
      if (v < clampMin || v > clampMax) continue;

      const mode = (state.mode as 'shape' | 'paint' | undefined) ?? 'shape';
      if (mode === 'shape') {
        const g = Math.floor(v * 255 * intensity);
        hexPath(ctx as CanvasRenderingContext2D, tile.center, layout);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fill();
        continue;
      }

      // Paint mode: the terrain's colour from the setting
      const fill = resolveTerrainFill(env.palette, state.terrain);

      hexPath(ctx as CanvasRenderingContext2D, tile.center, layout);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  },
  // Note: main renderers draw this layer explicitly; adapter kept for parity/future bridge
  getInvalidationKey(state) {
    return `hexnoise:${state.mode ?? ''}:${state.terrain ?? ''}:${state.seed ?? ''}:${state.frequency ?? ''}:${state.offsetX ?? ''}:${state.offsetY ?? ''}:${state.intensity ?? ''}:${state.gamma ?? ''}:${state.min ?? ''}:${state.max ?? ''}`;
  },
  deserialize(raw) {
    const base = typeof raw === 'object' && raw ? (raw as Partial<HexNoiseState>) : {};
    return {
      seed: base.seed ?? 'seed',
      frequency: base.frequency ?? 0.15,
      offsetX: base.offsetX ?? 0,
      offsetY: base.offsetY ?? 0,
      intensity: base.intensity ?? 1,
      gamma: base.gamma ?? 1,
      min: base.min ?? 0,
      max: base.max ?? 1,
      mode: base.mode ?? 'shape',
      terrain: base.terrain ?? '',
    };
  },
};

export const HexNoiseType = {
  id: 'hex-noise',
  title: 'Hex Noise',
  defaultState: {
    seed: 'seed',
    frequency: 0.15,
    offsetX: 0,
    offsetY: 0,
    intensity: 1,
    gamma: 1,
    min: 0,
    max: 1,
    mode: 'shape',
    terrain: '',
  },
  adapter: HexNoiseAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;

// Properties schema is registered by the hex-noise plugin during activation.
