import { describe, it, expect } from "vitest";
import {
  flattenSets,
  lastCompletedWeekStart,
  shiftWeeks,
  weekKey,
} from "../summaryData";

describe("lastCompletedWeekStart", () => {
  it("from a Wednesday, returns the previous Monday-week", () => {
    // Wed 2026-10-07 → this week started Mon 10-05 → last completed Mon 09-28
    const r = lastCompletedWeekStart(new Date("2026-10-07T12:00:00Z"));
    expect(weekKey(r)).toBe("2026-09-28");
  });

  it("from a Monday, returns the week that just ended", () => {
    const r = lastCompletedWeekStart(new Date("2026-10-05T09:00:00Z"));
    expect(weekKey(r)).toBe("2026-09-28");
  });

  it("treats Sunday as the end of the current week, not the start of a new one", () => {
    // Sun 2026-10-11 is still in the week of Mon 10-05, so last completed is 09-28
    const r = lastCompletedWeekStart(new Date("2026-10-11T23:00:00Z"));
    expect(weekKey(r)).toBe("2026-09-28");
  });

  it("normalises to midnight UTC", () => {
    const r = lastCompletedWeekStart(new Date("2026-10-07T17:43:11Z"));
    expect(r.toISOString()).toBe("2026-09-28T00:00:00.000Z");
  });
});

describe("shiftWeeks", () => {
  it("moves back and forward by whole weeks", () => {
    const base = new Date("2026-09-28T00:00:00Z");
    expect(weekKey(shiftWeeks(base, -1))).toBe("2026-09-21");
    expect(weekKey(shiftWeeks(base, 1))).toBe("2026-10-05");
  });
});

describe("flattenSets", () => {
  const session = {
    id: "s1",
    date: "2026-09-30T10:00:00Z",
    dayType: "PUSH",
    sets: [
      {
        weight: 60,
        reps: 10,
        exerciseId: "bench",
        exercise: { name: "Bench", muscleGroup: "chest" },
      },
    ],
  };

  it("denormalises session fields onto each set", () => {
    const [flat] = flattenSets([session]);
    expect(flat).toMatchObject({
      weight: 60,
      reps: 10,
      muscleGroup: "chest",
      exerciseId: "bench",
      sessionId: "s1",
      dayType: "PUSH",
    });
    expect(flat!.date.toISOString()).toBe("2026-09-30T10:00:00.000Z");
  });

  it("drops sets whose exercise wasn't joined in", () => {
    const broken = {
      ...session,
      sets: [{ weight: 60, reps: 10, exerciseId: "bench" }],
    };
    expect(flattenSets([broken])).toEqual([]);
  });

  it("flattens across multiple sessions", () => {
    expect(flattenSets([session, { ...session, id: "s2" }])).toHaveLength(2);
  });
});
