import { describe, expect, it, vi } from 'vitest';
import { texturePaths } from '@/app/scene/textures';
import { PaperAdapter, type PaperState } from '@/layers/adapters/paper';
import type { RenderEnv } from '@/layers/types';
import type { SceneFrame } from '@/render/types';

const env = (textures?: Map<string, ImageBitmap>): RenderEnv => ({
  zoom: 1,
  pixelRatio: 1,
  size: { w: 200, h: 100 },
  paperRect: { x: 0, y: 0, w: 200, h: 100 },
  camera: { x: 0, y: 0, zoom: 1 },
  textures,
});

const base: PaperState = { aspect: '16:10', color: '#ffffff', texture: '/img/scan.png' };
const bitmap = { width: 50, height: 100 } as ImageBitmap;
const loaded = () => env(new Map([['/img/scan.png', bitmap]]));

function ctx() {
  const c = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    createPattern: vi.fn(() => ({})),
    fillStyle: '',
    globalCompositeOperation: 'source-over',
  };
  return c as unknown as CanvasRenderingContext2D & typeof c;
}

describe('paper texture', () => {
  it('draws just the colour until the bitmap has arrived, or with no texture', () => {
    const c = ctx();
    PaperAdapter.drawMain?.(c, base, env());
    expect(c.fillRect).toHaveBeenCalledTimes(1);
    expect(c.drawImage).not.toHaveBeenCalled();
    PaperAdapter.drawMain?.(c, { ...base, texture: undefined }, loaded());
    expect(c.drawImage).not.toHaveBeenCalled();
  });

  it('covers: fills the sheet, centred, cropping the long side, multiplied by default', () => {
    const c = ctx();
    let op = '';
    c.drawImage.mockImplementation(() => {
      op = c.globalCompositeOperation;
    });
    PaperAdapter.drawMain?.(c, base, loaded());
    // 50x100 covering 200x100: scale 4 -> 200x400, centred vertically
    expect(c.drawImage).toHaveBeenCalledWith(bitmap, 0, -150, 200, 400);
    expect(op).toBe('multiply');
  });

  it('fits inside for contain, scaled by textureScale, source-over for image only', () => {
    const c = ctx();
    let op = '';
    c.drawImage.mockImplementation(() => {
      op = c.globalCompositeOperation;
    });
    PaperAdapter.drawMain?.(
      c,
      { ...base, textureFit: 'contain', textureBlend: 'normal', textureScale: 0.5 },
      loaded(),
    );
    // contain ratio 1 * 0.5 -> 25x50, centred
    expect(c.drawImage).toHaveBeenCalledWith(bitmap, 87.5, 25, 25, 50);
    expect(op).toBe('source-over');
  });

  it('repeats at the image size times the scale', () => {
    const c = ctx();
    PaperAdapter.drawMain?.(c, { ...base, textureFit: 'repeat', textureScale: 2 }, loaded());
    expect(c.createPattern).toHaveBeenCalledWith(bitmap, 'repeat');
    expect(c.scale).toHaveBeenCalledWith(2, 2);
    expect(c.fillRect).toHaveBeenLastCalledWith(0, 0, 100, 50);
    expect(c.drawImage).not.toHaveBeenCalled();
  });

  it('keys on the texture and every new value', () => {
    const k = (s: Partial<PaperState>) => PaperAdapter.getInvalidationKey({ ...base, ...s });
    const key = k({});
    expect(k({ texture: '/img/other.png' })).not.toEqual(key);
    expect(k({ texture: undefined })).not.toEqual(key);
    expect(k({ textureBlend: 'normal' })).not.toEqual(key);
    expect(k({ textureFit: 'repeat' })).not.toEqual(key);
    expect(k({ textureScale: 2 })).not.toEqual(key);
  });

  it('names a paper layer’s texture for the loader', () => {
    const frame: SceneFrame = {
      size: { w: 1, h: 1 },
      pixelRatio: 1,
      paper: { aspect: '16:10', color: '#fff' },
      camera: { x: 0, y: 0, zoom: 1 },
      layers: [{ id: 'p', type: 'paper', visible: true, state: { texture: '/img/scan.png' } }],
    };
    expect(texturePaths(frame)).toEqual(['/img/scan.png']);
  });
});
