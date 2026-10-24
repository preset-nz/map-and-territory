import { describe, expect, it, vi } from 'vitest';
import { createTextureLoader, texturePaths } from '@/app/scene/textures';
import type { SceneFrame } from '@/render/types';

const frame = (...textures: (string | undefined)[]): SceneFrame => ({
  size: { w: 1, h: 1 },
  pixelRatio: 1,
  paper: { aspect: '16:10', color: '#fff' },
  camera: { x: 0, y: 0, zoom: 1 },
  layers: textures.map((texture, i) => ({
    id: `l${i}`,
    type: 'freeform',
    visible: true,
    state: { texture },
  })),
});

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('texture loader', () => {
  it('names each referenced path once', () => {
    expect(texturePaths(frame('a.png', undefined, 'a.png', '/b.png'))).toEqual(['a.png', '/b.png']);
  });

  it('loads a path once and sends the bitmap', async () => {
    const bmp = {} as ImageBitmap;
    const deps = {
      load: vi.fn(async () => new ArrayBuffer(1)),
      decode: vi.fn(async () => bmp),
      send: vi.fn(),
    };
    const loader = createTextureLoader(deps);
    loader.want(frame('a.png'));
    loader.want(frame('a.png'));
    expect(loader.status('a.png')).toBe('loading');
    await tick();
    expect(deps.load).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith('a.png', bmp);
    expect(loader.status('a.png')).toBe('ready');
  });

  it('marks a failed path missing and tries again after retry', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('gone'))
      .mockResolvedValue(new ArrayBuffer(1));
    const send = vi.fn();
    const loader = createTextureLoader({ load, decode: async () => ({}) as ImageBitmap, send });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    loader.want(frame('a.png'));
    await tick();
    expect(loader.status('a.png')).toBe('missing');
    loader.want(frame('a.png'));
    expect(load).toHaveBeenCalledTimes(1);
    loader.retry('a.png');
    loader.want(frame('a.png'));
    await tick();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('retries every missing path when told, and says whether there were any', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('gone'))
      .mockResolvedValue(new ArrayBuffer(1));
    const send = vi.fn();
    const loader = createTextureLoader({ load, decode: async () => ({}) as ImageBitmap, send });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    loader.want(frame('a.png'));
    await tick();
    expect(loader.retryMissing()).toBe(true);
    loader.want(frame('a.png'));
    await tick();
    expect(send).toHaveBeenCalledTimes(1);
    expect(loader.retryMissing()).toBe(false);
  });
});
