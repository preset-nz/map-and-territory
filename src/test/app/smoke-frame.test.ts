import { smokeFrame } from '@/app/smoke-frame';

describe('smoke frame', () => {
  it('holds exactly the paper and hexgrid layers, in that order', () => {
    const frame = smokeFrame({ w: 800, h: 600 }, 2);
    expect(frame.layers.map((l) => l.type)).toEqual(['paper', 'hexgrid']);
    expect(frame.layers.every((l) => l.visible)).toBe(true);
    expect(frame.size).toEqual({ w: 800, h: 600 });
    expect(frame.pixelRatio).toBe(2);
  });
});
