import { describe, it, expect } from "vitest";
import { weeklySummary, type SetForSummary } from "../weeklySummary.js";

// Monday of "this week" — used as the weekStart for every test.
const WEEK_START = new Date("2026-07-13");

// Factory: sensible defaults for a set, override only what a test cares about.
function makeSet(overrides: Partial<SetForSummary> = {}): SetForSummary {
  return {
    weight: 60,
    reps: 10,
    muscleGroup: "chest",
    exerciseId: "bench",
    date: new Date("2026-07-15"), // Wednesday of this week
    sessionId: "s1",
    dayType: "PUSH",
    ...overrides,
  };
}

describe("weeklySummary", () => {
  // ─── Baseline ──────────────────────────────────────────────────────
  describe("baseline", () => {
    it("returns an all-zero summary when given no sets", () => {
      expect(weeklySummary([], WEEK_START)).toEqual({
        sessionCompleted: { count: 0, dayTypesHit: [] },
        volumeByMuscleGroup: {},
        new1RMs: [],
        beatLastSession: 0,
      });
    });
  });

  // ─── sessionCompleted ─────────────────────────────────────────────
  describe("sessionCompleted", () => {
    it("counts two sets in the same session as one session", () => {
      const sets = [
        makeSet({ sessionId: "s1" }),
        makeSet({ sessionId: "s1", weight: 70, reps: 8 }),
      ];
      expect(weeklySummary(sets, WEEK_START).sessionCompleted).toEqual({
        count: 1,
        dayTypesHit: ["PUSH"],
      });
    });

    it("counts three distinct sessions across different day types", () => {
      const sets = [
        makeSet({ sessionId: "s1", dayType: "PUSH" }),
        makeSet({ sessionId: "s2", dayType: "PULL" }),
        makeSet({ sessionId: "s3", dayType: "LEGS" }),
      ];
      const result = weeklySummary(sets, WEEK_START).sessionCompleted;
      expect(result.count).toBe(3);
      expect(result.dayTypesHit.sort()).toEqual(["LEGS", "PULL", "PUSH"]);
    });

    it("ignores sets from prior weeks", () => {
      const sets = [
        makeSet({ sessionId: "s1", dayType: "PUSH" }),
        makeSet({
          sessionId: "s-old",
          dayType: "PULL",
          date: new Date("2026-07-08"), // last week
        }),
      ];
      expect(weeklySummary(sets, WEEK_START).sessionCompleted).toEqual({
        count: 1,
        dayTypesHit: ["PUSH"],
      });
    });
  });

  // ─── volumeByMuscleGroup ───────────────────────────────────────────
  describe("volumeByMuscleGroup", () => {
    it("delta equals thisWeek when muscle wasn't trained last week", () => {
      const sets = [makeSet({ weight: 60, reps: 10 })]; // volume 600
      expect(
        weeklySummary(sets, WEEK_START).volumeByMuscleGroup,
      ).toEqual({ chest: { thisWeek: 600, delta: 600 } });
    });

    it("reports a positive delta when this week beat last week", () => {
      const sets = [
        makeSet({ weight: 100, reps: 10 }), // this week — 1000
        makeSet({
          weight: 80,
          reps: 10,
          date: new Date("2026-07-08"),      // last week — 800
        }),
      ];
      expect(
        weeklySummary(sets, WEEK_START).volumeByMuscleGroup,
      ).toEqual({ chest: { thisWeek: 1000, delta: 200 } });
    });

    it("reports a negative delta when this week was less than last week", () => {
      const sets = [
        makeSet({ weight: 80, reps: 10 }),   // this week — 800
        makeSet({
          weight: 100,
          reps: 10,
          date: new Date("2026-07-08"),      // last week — 1000
        }),
      ];
      expect(
        weeklySummary(sets, WEEK_START).volumeByMuscleGroup,
      ).toEqual({ chest: { thisWeek: 800, delta: -200 } });
    });

    it("omits muscle groups trained last week but not this week", () => {
      const sets = [
        makeSet({ muscleGroup: "chest" }),                        // this week
        makeSet({
          muscleGroup: "back",
          date: new Date("2026-07-08"),                           // last week only
        }),
      ];
      const result = weeklySummary(sets, WEEK_START).volumeByMuscleGroup;
      expect(result).toHaveProperty("chest");
      expect(result).not.toHaveProperty("back");
    });
  });

  // ─── new1RMs ───────────────────────────────────────────────────────
  describe("new1RMs", () => {
    it("includes brand-new exercises with any positive 1RM", () => {
      const sets = [makeSet({ exerciseId: "bench", weight: 60, reps: 10 })];
      const result = weeklySummary(sets, WEEK_START).new1RMs;
      expect(result).toHaveLength(1);
      expect(result[0]!.exerciseId).toBe("bench");
      expect(result[0]!.estimated1RM).toBeCloseTo(80, 1);
    });

    it("uses this week's max, not the last set logged", () => {
      const sets = [
        makeSet({ weight: 60, reps: 10, date: new Date("2026-07-15") }), // 1RM 80
        makeSet({ weight: 80, reps: 5,  date: new Date("2026-07-17") }), // 1RM 93.33
      ];
      const result = weeklySummary(sets, WEEK_START).new1RMs;
      expect(result[0]!.estimated1RM).toBeCloseTo(93.33, 1);
    });

    it("excludes exercises where this week didn't beat the prior best", () => {
      const sets = [
        makeSet({ weight: 100, reps: 5, date: new Date("2026-06-20") }), // prior 1RM 116.67
        makeSet({ weight: 65,  reps: 10, date: new Date("2026-07-15") }), // this week 86.67
      ];
      expect(weeklySummary(sets, WEEK_START).new1RMs).toEqual([]);
    });
  });

  // ─── beatLastSession ───────────────────────────────────────────────
  describe("beatLastSession", () => {
    it("returns 0 when there's no prior set for the exercise", () => {
      const sets = [makeSet({ weight: 60, reps: 10 })];
      expect(weeklySummary(sets, WEEK_START).beatLastSession).toBe(0);
    });

    it("counts a set that beats the most recent prior same-exercise set", () => {
      const sets = [
        makeSet({ weight: 60, reps: 10, date: new Date("2026-07-08") }), // last week
        makeSet({ weight: 70, reps: 10, date: new Date("2026-07-15") }), // this week — beats
      ];
      expect(weeklySummary(sets, WEEK_START).beatLastSession).toBe(1);
    });

    it("compares against the MOST RECENT prior set, not the all-time best", () => {
      const sets = [
        makeSet({ weight: 100, reps: 5,  date: new Date("2026-06-20") }), // heavy long ago
        makeSet({ weight: 60,  reps: 10, date: new Date("2026-07-08") }), // most recent prior
        makeSet({ weight: 65,  reps: 10, date: new Date("2026-07-15") }), // this week
      ];
      // Most recent prior 1RM = 80. This week's 1RM = 86.67. Wins.
      expect(weeklySummary(sets, WEEK_START).beatLastSession).toBe(1);
    });
  });

  // ─── Week-boundary edges ───────────────────────────────────────────
  describe("week boundaries", () => {
    it("includes a set logged exactly at weekStart 00:00", () => {
      const sets = [makeSet({ date: new Date("2026-07-13T00:00:00Z") })];
      expect(weeklySummary(sets, WEEK_START).sessionCompleted.count).toBe(1);
    });

    it("excludes a set logged exactly one week after weekStart", () => {
      const sets = [makeSet({ date: new Date("2026-07-20T00:00:00Z") })];
      expect(weeklySummary(sets, WEEK_START).sessionCompleted.count).toBe(0);
    });
  });
});