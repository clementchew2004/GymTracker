import { describe, it, expect } from "vitest";
import {
  oneRMSeries,
  volumeByWeek,
  startOfWeek,
  type SessionInput,
} from "../chartData";

function session(date: string, sets: SessionInput["sets"]): SessionInput {
  return { date, sets };
}

function set(
  weight: number,
  reps: number,
  exerciseId = "bench",
  muscleGroup = "chest",
) {
  return { weight, reps, exerciseId, exercise: { muscleGroup } };
}

describe("startOfWeek", () => {
  it("returns the same day when given a Monday", () => {
    // 2026-08-03 is a Monday
    expect(startOfWeek("2026-08-03T10:00:00Z")).toBe("2026-08-03");
  });

  it("walks back to Monday from mid-week", () => {
    // Thursday 2026-08-06
    expect(startOfWeek("2026-08-06T10:00:00Z")).toBe("2026-08-03");
  });

  it("puts Sunday in the week that just ended, not the one starting", () => {
    // Sunday 2026-08-09 belongs to the week beginning Mon 2026-08-03
    expect(startOfWeek("2026-08-09T10:00:00Z")).toBe("2026-08-03");
  });
});

describe("oneRMSeries", () => {
  it("returns an empty array when the exercise was never logged", () => {
    const sessions = [session("2026-08-03T10:00:00Z", [set(60, 10, "squat")])];
    expect(oneRMSeries(sessions, "bench")).toEqual([]);
  });

  it("takes the best set of each session, not the last", () => {
    const sessions = [
      session("2026-08-03T10:00:00Z", [
        set(60, 10), // 1RM 80
        set(80, 5), // 1RM 93.3  ← best
        set(70, 8), // 1RM 88.7
      ]),
    ];
    const series = oneRMSeries(sessions, "bench");
    expect(series).toHaveLength(1);
    expect(series[0]!.estimated1RM).toBeCloseTo(93.3, 1);
  });

  it("sorts oldest to newest regardless of input order", () => {
    const sessions = [
      session("2026-08-10T10:00:00Z", [set(70, 10)]),
      session("2026-08-03T10:00:00Z", [set(60, 10)]),
    ];
    const series = oneRMSeries(sessions, "bench");
    expect(series.map((p) => p.date)).toEqual([
      "2026-08-03T10:00:00Z",
      "2026-08-10T10:00:00Z",
    ]);
  });

  it("ignores sets belonging to other exercises", () => {
    const sessions = [
      session("2026-08-03T10:00:00Z", [
        set(60, 10, "bench"),
        set(200, 5, "squat"), // much heavier, must not leak in
      ]),
    ];
    expect(oneRMSeries(sessions, "bench")[0]!.estimated1RM).toBeCloseTo(80, 1);
  });
});

describe("volumeByWeek", () => {
  it("returns empty series for no sessions", () => {
    expect(volumeByWeek([])).toEqual({ weeks: [], muscleGroups: [] });
  });

  it("sums volume per muscle group within a week", () => {
    const sessions = [
      session("2026-08-03T10:00:00Z", [
        set(60, 10, "bench", "chest"), // 600
        set(100, 8, "row", "back"), // 800
      ]),
    ];
    const { weeks, muscleGroups } = volumeByWeek(sessions);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]!.chest).toBe(600);
    expect(weeks[0]!.back).toBe(800);
    expect(muscleGroups).toEqual(["back", "chest"]);
  });

  it("merges sessions that fall in the same week", () => {
    const sessions = [
      session("2026-08-03T10:00:00Z", [set(60, 10)]), // Mon, 600
      session("2026-08-06T10:00:00Z", [set(60, 10)]), // Thu, 600
    ];
    const { weeks } = volumeByWeek(sessions);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]!.chest).toBe(1200);
  });

  it("separates sessions in different weeks", () => {
    const sessions = [
      session("2026-08-03T10:00:00Z", [set(60, 10)]),
      session("2026-08-10T10:00:00Z", [set(70, 10)]),
    ];
    expect(volumeByWeek(sessions).weeks).toHaveLength(2);
  });

  it("orders weeks chronologically, not alphabetically by label", () => {
    // "12 Oct" sorts before "5 Aug" as a string — this catches that bug.
    const sessions = [
      session("2026-10-12T10:00:00Z", [set(70, 10)]),
      session("2026-08-03T10:00:00Z", [set(60, 10)]),
    ];
    const { weeks } = volumeByWeek(sessions);
    expect(weeks[0]!.chest).toBe(600); // August first
    expect(weeks[1]!.chest).toBe(700); // October second
  });

  it("skips sets whose exercise wasn't joined in", () => {
    const sessions = [
      session("2026-08-03T10:00:00Z", [
        { weight: 60, reps: 10, exerciseId: "bench" }, // no exercise field
      ]),
    ];
    expect(volumeByWeek(sessions).weeks).toEqual([]);
  });
});
