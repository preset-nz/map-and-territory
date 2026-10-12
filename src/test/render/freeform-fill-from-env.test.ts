import { FreeformAdapter, type FreeformState } from '@/layers/adapters/freeform-hex';
import type { RenderEnv } from '@/layers/types';
import { DefaultPalette } from '@/palettes/defaults';
import type { MapPalette } from '@/palettes/types';

function recordingCtx() {
  const fills: string[] = [];
  const ctx = {
    fillStyle: '',
    globalAlpha: 1,
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {
      fills.push(String(ctx.fillStyle));
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills };
}

describe('freeform adapter fill', () => {
  it('draws the terrain fill from the palette the host gives it', () => {
    const palette: MapPalette = {
      ...DefaultPalette,
      terrain: {
        ...DefaultPalette.terrain,
        forest: { ...DefaultPalette.terrain.forest, fill: '#123456' },
      },
    };
    const env: RenderEnv = {
      zoom: 1,
      pixelRatio: 1,
      size: { w: 200, h: 200 },
      paperRect: { x: 0, y: 0, w: 200, h: 200 },
      camera: { x: 0, y: 0, zoom: 1 },
      grid: { size: 24, orientation: 'pointy' },
      palette,
    };
    const state: FreeformState = { cells: { '0,0': { terrainId: 'forest' } }, opacity: 1 };
    const { ctx, fills } = recordingCtx();
    FreeformAdapter.drawMain?.(ctx, state, env);
    expect(fills).toEqual(['#123456']);
  });
});
