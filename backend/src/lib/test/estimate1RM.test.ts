import { describe, it, expect } from "vitest";
import { estimate1RM } from "../estimate1RM.js";

describe("Estimate 1RM", () => {
  it("returns the weight itself for 1 rep", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it ("estimate 80kg for 60kg x 10 reps", () => {
    expect(estimate1RM(60, 10)).toBeCloseTo(80, 1);
  })

  it("returns the weight itself for 0 rep", () => {
    expect(estimate1RM(50, 0)).toBe(50);
  })

  // The single-rep rule is about REPS, not a particular weight.
  it("applies the single-rep rule at any weight, not just 100kg", () => {
    expect(estimate1RM(60, 1)).toBe(60);
    expect(estimate1RM(142.5, 1)).toBe(142.5);
  })

  it("still extrapolates for multi-rep sets at 100kg", () => {
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
  })
});
