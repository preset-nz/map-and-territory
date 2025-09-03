import { describe, it, expect } from 'vitest';
import { fromPoint, toPoint, axialToCube, cubeToAxial, round, distance } from '@/lib/hex';

describe('hex lib basics', () => {
  const pointy = { orientation: 'pointy' as const, size: 24, origin: { x: 0, y: 0 } };
  const flat = { orientation: 'flat' as const, size: 24, origin: { x: 0, y: 0 } };

  it('axial<->cube roundtrip', () => {
    const a = { q: 3, r: -2 };
    const c = axialToCube(a);
    expect(cubeToAxial(c)).toEqual(a);
  });

  it('pointy pixel roundtrip', () => {
    const h = { q: 2, r: -1 };
    const p = toPoint(h, pointy);
    const h2 = fromPoint(p, pointy);
    expect(h2).toEqual(h);
  });

  it('flat pixel roundtrip', () => {
    const h = { q: -1, r: 3 };
    const p = toPoint(h, flat);
    const h2 = fromPoint(p, flat);
    expect(h2).toEqual(h);
  });

  it('distance symmetry', () => {
    const a = { q: 0, r: 0 };
    const b = { q: 3, r: -2 };
    expect(distance(a, b)).toBe(distance(b, a));
  });
});

