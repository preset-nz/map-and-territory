import { describe, expect, it } from 'vitest';
import { HANDS, handLine, handOf, handOutline, handTilt, rectCorners } from '@/render/hand';

// Drawing by hand (design/drawing-by-hand.md): the wobble is seeded, bounded by the hand's
// amplitude, and overshoots open strokes by no more than the hand allows.

const a = { x: 0, y: 0 };
const b = { x: 200, y: 0 };

describe('the hand', () => {
  it('reads unknown and unresolved values as clean', () => {
    expect(handOf('drawn')).toBe('drawn');
    expect(handOf('scratched')).toBe('scratched');
    expect(handOf('map')).toBe('clean');
    expect(handOf(undefined)).toBe('clean');
  });

  it('leaves a clean line, outline and lean exact', () => {
    expect(handLine(a, b, 'clean', 's')).toEqual([a, b]);
    const box = rectCorners(0, 0, 10, 10);
    expect(handOutline(box, 'clean', 's')).toBe(box);
    expect(handTilt('clean', 's')).toBe(0);
  });

  for (const hand of ['drawn', 'scratched'] as const) {
    const spec = HANDS[hand];

    it(`${hand}: the same seed gives the same path, another seed another`, () => {
      expect(handLine(a, b, hand, 'x')).toEqual(handLine(a, b, hand, 'x'));
      expect(handLine(a, b, hand, 'x')).not.toEqual(handLine(a, b, hand, 'y'));
    });

    it(`${hand}: wobbles within ±${spec.amp} px and overshoots by up to ${spec.overshoot} px`, () => {
      for (const seed of ['1', '2', '3', '4', '5']) {
        const pts = handLine(a, b, hand, seed);
        expect(pts.length).toBeGreaterThan(2);
        for (const p of pts) expect(Math.abs(p.y)).toBeLessThanOrEqual(spec.amp + 1e-9);
        expect(pts[0].x).toBeLessThanOrEqual(0);
        expect(pts[0].x).toBeGreaterThanOrEqual(-spec.overshoot);
        expect(pts[pts.length - 1].x).toBeGreaterThanOrEqual(200);
        expect(pts[pts.length - 1].x).toBeLessThanOrEqual(200 + spec.overshoot);
      }
    });

    it(`${hand}: an outline stays within the amplitude of its rect`, () => {
      const out = handOutline(rectCorners(0, 0, 100, 40), hand, 'o');
      for (const p of out) {
        expect(p.x).toBeGreaterThanOrEqual(-2 * spec.amp);
        expect(p.x).toBeLessThanOrEqual(100 + 2 * spec.amp);
        expect(p.y).toBeGreaterThanOrEqual(-2 * spec.amp);
        expect(p.y).toBeLessThanOrEqual(40 + 2 * spec.amp);
      }
    });

    it(`${hand}: leans text by at most ${spec.tilt}°`, () => {
      for (const seed of ['1', '2', '3', '4', '5']) {
        expect(Math.abs(handTilt(hand, seed))).toBeLessThanOrEqual((spec.tilt / 180) * Math.PI);
      }
    });
  }
});
