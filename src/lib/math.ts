// Small math utilities for procedural generation

// Map a value from [omin, omax] into [nmin, nmax].
export function fit(
  value: number,
  omin: number,
  omax: number,
  nmin: number,
  nmax: number,
): number {
  if (omax === omin) {
    throw new Error('fit(): input range cannot be zero (omin === omax)');
  }
  const t = (value - omin) / (omax - omin);
  return nmin + t * (nmax - nmin);
}

// Clamp a value to [min, max]
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Maps a value from [-1, 1] into [0, 1]
export function fit01(value: number): number {
  return fit(value, -1, 1, 0, 1);
}

// Linear interpolation between a and b by t
// Matches VEX lerp: a + t * (b - a)
export function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

const math = { fit, fit01, lerp, clamp };
export default math;
