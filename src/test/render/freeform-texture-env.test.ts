import { describe, expect, it, vi } from 'vitest';
import { FreeformAdapter, type FreeformState } from '@/layers/adapters/freeform-hex';
import type { RenderEnv } from '@/layers/types';

const env = (textures?: Map<string, ImageBitmap>): RenderEnv => ({
  zoom: 1,
  pixelRatio: 1,
  deviceScale: 1,
  size: { w: 100, h: 100 },
  paperRect: { x: 0, y: 0, w: 100, h: 100 },
  camera: { x: 0, y: 0, zoom: 1 },
  grid: { size: 10, orientation: 'pointy' },
  textures,
});

const state: FreeformState = {
  cells: { '0,0': {} },
  opacity: 1,
  renderMode: 'texture-fill',
  texture: '/img/rock.png',
};

function ctx() {
  const c = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    createPattern: vi.fn(() => ({})),
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
  };
  return c as unknown as CanvasRenderingContext2D & typeof c;
}

describe('freeform texture from env.textures', () => {
  it('draws nothing until the bitmap has arrived', () => {
    const c = ctx();
    FreeformAdapter.drawMain?.(c, state, env());
    expect(c.drawImage).not.toHaveBeenCalled();
  });

  it('draws the bitmap the host loaded for the path as written', () => {
    const c = ctx();
    const bitmap = { width: 64, height: 64 } as ImageBitmap;
    FreeformAdapter.drawMain?.(c, state, env(new Map([['/img/rock.png', bitmap]])));
    expect(c.drawImage).toHaveBeenCalled();
  });

  it('keys on the path', () => {
    expect(FreeformAdapter.getInvalidationKey(state)).toContain('/img/rock.png');
  });
});
