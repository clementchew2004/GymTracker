// Glue between the API's nested session shape and what weeklySummary expects.
// Pure: data in, data out. No network, no React, no ambient dates.

import type { SetForSummary } from "./weeklySummary";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Minimum shape needed — declared structurally so lib/ stays decoupled from api/.
export type SessionLike = {
  id: string;
  date: string;
  dayType: string;
  sets: {
    weight: number;
    reps: number;
    exerciseId: string;
    exercise?: { name?: string; muscleGroup: string };
  }[];
};

/**
 * Nested sessions → the flat set list weeklySummary expects, with session
 * date, id and dayType denormalised onto each set.
 *
 * Sets whose exercise wasn't joined in are dropped: without a muscleGroup
 * they can't contribute to volume, and a blank group would show as its own
 * category in the breakdown.
 */
export function flattenSets(sessions: SessionLike[]): SetForSummary[] {
  const out: SetForSummary[] = [];

  for (const session of sessions) {
    const date = new Date(session.date);
    for (const set of session.sets) {
      const muscleGroup = set.exercise?.muscleGroup;
      if (!muscleGroup) continue;

      out.push({
        weight: set.weight,
        reps: set.reps,
        muscleGroup,
        exerciseId: set.exerciseId,
        date,
        sessionId: session.id,
        dayType: session.dayType,
      });
    }
  }

  return out;
}

/**
 * Monday of the most recent week that has fully ended.
 *
 * Takes `today` rather than reading the clock so it stays pure and testable —
 * the component passes `new Date()`.
 */
export function lastCompletedWeekStart(today: Date): Date {
  const d = new Date(today);
  const day = d.getUTCDay(); // 0 = Sunday
  const shift = day === 0 ? -6 : 1 - day; // back to this week's Monday
  d.setUTCDate(d.getUTCDate() + shift - 7); // then one week further back
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function shiftWeeks(weekStart: Date, weeks: number): Date {
  return new Date(weekStart.getTime() + weeks * 7 * MS_PER_DAY);
}

/** "28 Sep – 4 Oct" */
export function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart.getTime() + 6 * MS_PER_DAY);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

/** Stable key for "have I already seen this week's summary?" */
export function weekKey(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}
