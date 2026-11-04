import { describe, expect, it } from 'vitest';
import { layoutRows } from './rows';

describe('layoutRows', () => {
  it('puts two rows at one scale, each centred, with a gap between', () => {
    const { width, height, placed } = layoutRows(
      [
        [
          { w: 1200, h: 1200 },
          { w: 675, h: 1200 },
        ],
        [
          { w: 1200, h: 900 },
          { w: 1200, h: 750 },
        ],
      ],
      24,
    );
    expect(width).toBe(2424);
    expect(height).toBe(1200 + 24 + 900);
    expect(placed.map((p) => [p.x, p.y])).toEqual([
      [263, 0],
      [1487, 0],
      [0, 1224],
      [1224, 1299],
    ]);
  });

  it('is just the piece for one piece', () => {
    const { width, height, placed } = layoutRows([[{ w: 10, h: 5 }]], 24);
    expect([width, height]).toEqual([10, 5]);
    expect(placed[0]).toMatchObject({ x: 0, y: 0 });
  });
});
