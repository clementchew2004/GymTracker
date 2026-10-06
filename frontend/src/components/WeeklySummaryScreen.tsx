import { useEffect, useMemo, useState } from "react";
import type { User } from "../api/auth";
import { getSessions, type Session } from "../api/sessions";
import { weeklySummary } from "../lib/weeklySummary";
import {
  flattenSets,
  formatWeekRange,
  lastCompletedWeekStart,
  shiftWeeks,
  weekKey,
} from "../lib/summaryData";

type Props = { user: User };

export function WeeklySummaryScreen({ user }: Props) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    lastCompletedWeekStart(new Date()),
  );

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => setError("Couldn't load your training history"));
  }, []);

  const sets = useMemo(
    () => (sessions ? flattenSets(sessions) : []),
    [sessions],
  );

  const summary = useMemo(
    () => weeklySummary(sets, weekStart, user.plannedDayTypes),
    [sets, weekStart, user.plannedDayTypes],
  );

  // new1RMs carries exerciseIds; the UI wants names.
  const exerciseNames = useMemo(() => {
    const map = new Map<string, string>();
    sessions?.forEach((s) =>
      s.sets.forEach((set) => {
        if (set.exercise?.name) map.set(set.exerciseId, set.exercise.name);
      }),
    );
    return map;
  }, [sessions]);

  const latest = weekKey(lastCompletedWeekStart(new Date()));
  const atLatest = weekKey(weekStart) === latest;
  const loggedAnything = summary.sessionsCompleted.count > 0;

  if (error) {
    return (
      <main className="p-6">
        <p className="text-sm text-red-400">{error}</p>
      </main>
    );
  }

  if (!sessions) {
    return (
      <main className="p-6">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl space-y-8 p-6">
      {/* ── Week navigation ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Week of {formatWeekRange(weekStart)}
          </h2>
          <p className="text-sm text-neutral-500">
            {atLatest ? "Your most recent completed week" : "An earlier week"}
          </p>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setWeekStart((w) => shiftWeeks(w, -1))}
            aria-label="Previous week"
            className="rounded border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-100"
          >
            ←
          </button>
          <button
            onClick={() => setWeekStart((w) => shiftWeeks(w, 1))}
            disabled={atLatest}
            aria-label="Next week"
            className="rounded border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-100 disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      {!loggedAnything ? (
        <p className="text-sm text-neutral-500">Nothing logged that week.</p>
      ) : (
        <>
          {/* ── Sessions ───────────────────────────────── */}
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
              Sessions
            </h3>
            <p className="text-2xl font-semibold tabular-nums">
              {summary.sessionsCompleted.count}
              <span className="text-base font-normal text-neutral-500">
                {" "}
                of {user.plannedDayTypes.length} planned
              </span>
            </p>
            {summary.sessionsCompleted.dayTypesHit.length > 0 && (
              <p className="mt-1 text-sm text-neutral-400">
                Hit: {summary.sessionsCompleted.dayTypesHit.join(", ")}
              </p>
            )}
            {summary.sessionsCompleted.dayTypesMissed.length > 0 && (
              <p className="text-sm text-amber-400/80">
                Missed: {summary.sessionsCompleted.dayTypesMissed.join(", ")}
              </p>
            )}
          </section>

          {/* ── Volume ─────────────────────────────────── */}
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
              Volume vs the week before
            </h3>
            <ul className="space-y-1 text-sm">
              {Object.entries(summary.volumeByMuscleGroup).map(([group, v]) => (
                <li key={group} className="flex items-baseline gap-3">
                  <span className="w-28 text-neutral-400">{group}</span>
                  <span className="tabular-nums">
                    {v.thisWeek.toLocaleString()} kg
                  </span>
                  <span
                    className={`text-xs tabular-nums ${
                      v.delta > 0
                        ? "text-emerald-400"
                        : v.delta < 0
                          ? "text-red-400"
                          : "text-neutral-600"
                    }`}
                  >
                    {v.delta > 0 ? "+" : ""}
                    {v.delta.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── New records ────────────────────────────── */}
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
              New records
            </h3>
            {summary.new1RMs.length === 0 ? (
              <p className="text-sm text-neutral-600">
                No new records that week.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {summary.new1RMs.map((pr) => (
                  <li key={pr.exerciseId} className="flex items-baseline gap-3">
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-400">
                      PR
                    </span>
                    <span>
                      {exerciseNames.get(pr.exerciseId) ?? pr.exerciseId}
                    </span>
                    <span className="tabular-nums text-neutral-400">
                      {pr.estimated1RM.toFixed(1)} kg
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Beat last session ──────────────────────── */}
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
              Sets that beat the time before
            </h3>
            <p className="text-2xl font-semibold tabular-nums">
              {summary.beatLastSession}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
