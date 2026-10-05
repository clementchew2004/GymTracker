// Transformations from raw session data into chart-ready arrays.
// Pure: data in, data out. No network, no React, no ambient dates.

import { estimate1RM } from "./estimate1RM";
import { weeklyVolume, type SetForVolume } from "./weeklyVolume";

// Minimum shape these functions need. Declared structurally so lib/ stays
// decoupled from the api/ layer — anything with these fields works.
export type SetInput = {
  weight: number;
  reps: number;
  exerciseId: string;
  exercise?: { name?: string; muscleGroup: string };
};

export type SessionInput = {
  date: string;
  sets: SetInput[];
};

// ── Exercise index ───────────────────────────────────────────────

export type LoggedExercise = { id: string; name: string };

/**
 * Exercises that actually appear in the history, alphabetical. The progress
 * screen offers these rather than the full seeded catalogue — picking an
 * exercise you've never done would only ever show an empty chart.
 */
export function loggedExercises(sessions: SessionInput[]): LoggedExercise[] {
  const byId = new Map<string, string>();

  for (const session of sessions) {
    for (const set of session.sets) {
      if (byId.has(set.exerciseId)) continue;
      byId.set(set.exerciseId, set.exercise?.name ?? set.exerciseId);
    }
  }

  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── 1RM progression ──────────────────────────────────────────────

export type OneRMPoint = {
  date: string; // ISO, for sorting and tooltips
  label: string; // short display form for the axis
  estimated1RM: number;
};

/**
 * One point per session that included the exercise, holding that session's
 * best estimated 1RM. Sorted oldest to newest so the line reads left to right.
 */
export function oneRMSeries(
  sessions: SessionInput[],
  exerciseId: string,
): OneRMPoint[] {
  const points: OneRMPoint[] = [];

  for (const session of sessions) {
    const relevant = session.sets.filter((s) => s.exerciseId === exerciseId);
    if (relevant.length === 0) continue;

    const best = Math.max(
      ...relevant.map((s) => estimate1RM(s.weight, s.reps)),
    );

    points.push({
      date: session.date,
      label: shortDate(session.date),
      estimated1RM: Math.round(best * 10) / 10,
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Weekly volume ────────────────────────────────────────────────

export type VolumeWeek = { week: string } & Record<string, number | string>;

export type VolumeSeries = {
  weeks: VolumeWeek[];
  muscleGroups: string[]; // every group present, so the chart knows its bars
};

/**
 * Total volume per muscle group, bucketed into Monday-start weeks.
 * Shaped for a stacked bar chart: one row per week, one key per muscle group.
 */
export function volumeByWeek(sessions: SessionInput[]): VolumeSeries {
  const buckets = new Map<string, SetForVolume[]>();

  for (const session of sessions) {
    const usable: SetForVolume[] = [];

    for (const set of session.sets) {
      const muscleGroup = set.exercise?.muscleGroup;
      if (!muscleGroup) continue; // set came back without its exercise joined
      usable.push({ weight: set.weight, reps: set.reps, muscleGroup });
    }

    // Don't open a bucket for a session with nothing chartable in it —
    // that produces a labelled week with no bars.
    if (usable.length === 0) continue;

    const weekKey = startOfWeek(session.date);
    buckets.set(weekKey, [...(buckets.get(weekKey) ?? []), ...usable]);
  }

  // Sort on the ISO week key (yyyy-mm-dd sorts chronologically as a string)
  // BEFORE converting to display labels — "12 Oct" would sort before "5 Aug".
  const ordered = [...buckets.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const groups = new Set<string>();
  const weeks: VolumeWeek[] = [];

  for (const [weekKey, sets] of ordered) {
    const volume = weeklyVolume(sets);
    Object.keys(volume).forEach((g) => groups.add(g));
    weeks.push({ week: shortDate(weekKey), ...volume });
  }

  return { weeks, muscleGroups: [...groups].sort() };
}

// ── Date helpers ─────────────────────────────────────────────────

/**
 * ISO date (yyyy-mm-dd) of the Monday on or before the given date.
 *
 * Everything here is UTC. Reading the weekday locally but serialising as UTC
 * shifts the result by a day for any non-zero timezone offset.
 */
export function startOfWeek(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const shift = day === 0 ? -6 : 1 - day; // Sunday belongs to the week that just ended
  d.setUTCDate(d.getUTCDate() + shift);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
