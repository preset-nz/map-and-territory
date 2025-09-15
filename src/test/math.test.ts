import { describe, it, expect } from "vitest";
import { fit, fit01, lerp, clamp } from "../lib/math";

describe("math utils", () => {
  it("fit01 maps [-1,1] -> [0,1]", () => {
    expect(fit01(-1)).toBe(0);
    expect(fit01(0)).toBe(0.5);
    expect(fit01(1)).toBe(1);
  });

  it("lerp interpolates between a and b", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.25)).toBeCloseTo(2.5, 10);
    expect(lerp(5, 15, 0.5)).toBe(10);
    // Outside [0,1] is allowed
    expect(lerp(0, 10, -0.5)).toBe(-5);
    expect(lerp(0, 10, 1.5)).toBe(15);
  });

  it("fit maps ranges correctly", () => {
    // Simple mapping 0..10 -> 0..1
    expect(fit(0, 0, 10, 0, 1)).toBe(0);
    expect(fit(5, 0, 10, 0, 1)).toBe(0.5);
    expect(fit(10, 0, 10, 0, 1)).toBe(1);

    // Reversed output range 0..10 -> 1..0
    expect(fit(0, 0, 10, 1, 0)).toBe(1);
    expect(fit(10, 0, 10, 1, 0)).toBe(0);

    // Use clamp separately for clamped mapping
    expect(fit(clamp(-5, 0, 10), 0, 10, 0, 1)).toBe(0);
    expect(fit(clamp(15, 0, 10), 0, 10, 0, 1)).toBe(1);

    // Negative ranges
    expect(fit(-5, -10, 0, 0, 100)).toBe(50);
  });

  it("fit throws on zero input range", () => {
    expect(() => fit(1, 5, 5, 0, 1)).toThrow();
  });

  it("clamp bounds values to [min,max]", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});
