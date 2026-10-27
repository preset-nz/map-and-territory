import { describe, expect, it, vi } from 'vitest';
import { texturePaths } from '@/app/scene/textures';
import { ImageAdapter, type ImageState } from '@/layers/adapters/image';
import type { RenderEnv } from '@/layers/types';
import type { SceneFrame } from '@/render/types';

const env = (textures?: Map<string, ImageBitmap>): RenderEnv => ({
  zoom: 1,
  pixelRatio: 1,
  deviceScale: 1,
  size: { w: 200, h: 100 },
  paperRect: { x: 0, y: 0, w: 200, h: 100 },
  camera: { x: 0, y: 0, zoom: 1 },
  textures,
});

const base: ImageState = { file: '/img/scan.png' };
const bitmap = { width: 50, height: 100 } as ImageBitmap;
const loaded = () => env(new Map([['/img/scan.png', bitmap]]));

function ctx() {
  const c = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    createPattern: vi.fn(() => ({})),
    fillStyle: '',
    globalCompositeOperation: 'source-over',
  };
  return c as unknown as CanvasRenderingContext2D & typeof c;
}

describe('image layer', () => {
  it('draws nothing until the bitmap arrives, or with no file', () => {
    const c = ctx();
    ImageAdapter.drawMain?.(c, base, env());
    ImageAdapter.drawMain?.(c, { ...base, file: undefined }, loaded());
    expect(c.drawImage).not.toHaveBeenCalled();
    expect(c.fillRect).not.toHaveBeenCalled();
    expect(c.save).not.toHaveBeenCalled();
  });

  it('covers, clipped to the paper, with no blend of its own', () => {
    const c = ctx();
    ImageAdapter.drawMain?.(c, base, loaded());
    expect(c.rect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(c.clip).toHaveBeenCalled();
    expect(c.drawImage).toHaveBeenCalledWith(bitmap, 0, -150, 200, 400);
    expect(c.globalCompositeOperation).toBe('source-over');
  });

  it('contains, scaled', () => {
    const c = ctx();
    ImageAdapter.drawMain?.(c, { ...base, fit: 'contain', scale: 0.5 }, loaded());
    expect(c.drawImage).toHaveBeenCalledWith(bitmap, 87.5, 25, 25, 50);
  });

  it('repeats at the image size times the scale, over a bled area', () => {
    const c = ctx();
    ImageAdapter.drawMain?.(c, { ...base, fit: 'repeat', scale: 2 }, loaded());
    expect(c.createPattern).toHaveBeenCalledWith(bitmap, 'repeat');
    expect(c.scale).toHaveBeenCalledWith(2, 2);
    const [x, y, fw, fh] = c.fillRect.mock.calls[0] as number[];
    expect(x).toBeLessThan(0);
    expect(y).toBeLessThan(0);
    expect(fw).toBeGreaterThan(100);
    expect(fh).toBeGreaterThan(50);
    expect(c.drawImage).not.toHaveBeenCalled();
  });

  it('offsets in paper px and rotates in degrees about the paper centre', () => {
    const c = ctx();
    ImageAdapter.drawMain?.(c, { ...base, offsetX: 10, offsetY: -5, rotation: 90 }, loaded());
    expect(c.translate).toHaveBeenNthCalledWith(1, 110, 45);
    expect(c.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(c.translate).toHaveBeenNthCalledWith(2, -100, -50);
    expect(c.drawImage).toHaveBeenCalledWith(bitmap, 0, -150, 200, 400);
  });

  it('keys on the file and every value', () => {
    const k = (s: Partial<ImageState>) => ImageAdapter.getInvalidationKey({ ...base, ...s });
    const key = k({});
    expect(k({ file: '/img/other.png' })).not.toEqual(key);
    expect(k({ file: undefined })).not.toEqual(key);
    expect(k({ fit: 'repeat' })).not.toEqual(key);
    expect(k({ scale: 2 })).not.toEqual(key);
    expect(k({ offsetX: 1 })).not.toEqual(key);
    expect(k({ offsetY: 1 })).not.toEqual(key);
    expect(k({ rotation: 5 })).not.toEqual(key);
  });

  it('names an image layer’s file for the loader', () => {
    const frame: SceneFrame = {
      size: { w: 1, h: 1 },
      pixelRatio: 1,
      paper: { aspect: '16:10', color: '#fff' },
      camera: { x: 0, y: 0, zoom: 1 },
      layers: [{ id: 'i', type: 'image', visible: true, state: { file: '/img/scan.png' } }],
    };
    expect(texturePaths(frame)).toEqual(['/img/scan.png']);
  });
});
