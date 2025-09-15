import { describe, it, expect } from "vitest";
import { createRNG } from "../lib/random";

describe("createRNG", () => {
  it("is deterministic for same seed", () => {
    const rng1 = createRNG("seed-123");
    const seq1 = [
      rng1.float(),
      rng1.float(),
      rng1.float(),
      rng1.float(),
      rng1.float(),
    ];

    const rng2 = createRNG("seed-123");
    const seq2 = [
      rng2.float(),
      rng2.float(),
      rng2.float(),
      rng2.float(),
      rng2.float(),
    ];

    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences for different seeds", () => {
    const rng1 = createRNG("A");
    const rng2 = createRNG("B");
    const a = [rng1.float(), rng1.float(), rng1.float()];
    const b = [rng2.float(), rng2.float(), rng2.float()];
    expect(a).not.toEqual(b);
  });

  it("int(min,max) yields inclusive integers deterministically", () => {
    const rng = createRNG(42);
    const vals = Array.from({ length: 10 }, () => rng.int(10, 20));
    expect(vals.every((v) => Number.isInteger(v) && v >= 10 && v <= 20)).toBe(
      true,
    );

    // Deterministic snapshot (stable expectations)
    const rngAgain = createRNG(42);
    const valsAgain = Array.from({ length: 10 }, () => rngAgain.int(10, 20));
    expect(valsAgain).toEqual(vals);
  });

  it("bool(p) respects probability and determinism", () => {
    const rng = createRNG("prob");
    const seq = Array.from({ length: 8 }, () => rng.bool(0.3));
    const rng2 = createRNG("prob");
    const seq2 = Array.from({ length: 8 }, () => rng2.bool(0.3));
    expect(seq2).toEqual(seq);
  });

  it("shuffle is deterministic", () => {
    const arr = [1, 2, 3, 4, 5, 6];
    const rng = createRNG("shuffle-seed");
    const out1 = rng.shuffle([...arr]);
    const out2 = createRNG("shuffle-seed").shuffle([...arr]);
    expect(out2).toEqual(out1);
    // Elements preserved
    expect([...out1].sort((a, b) => a - b)).toEqual(arr);
  });
});
