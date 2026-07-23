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
});
