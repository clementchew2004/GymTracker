import { useEffect, useMemo, useState } from "react";
import type { User } from "../api/auth";
import { getExercises, type Exercise } from "../api/exercises";
import { createSession, getSessions, type Session } from "../api/sessions";
import { logSet } from "../api/sets";
import { bestEstimated1RM } from "../lib/chartData";
import { estimate1RM } from "../lib/estimate1RM";
import { LastTimePanel } from "./LastTimePanel";
import { SummaryBanner } from "./SummaryBanner";

type Props = { user: User };

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function LogScreen({ user }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // On mount: keep the full history (needed to know what counts as a PR)
  // and resume today's session if there is one.
  useEffect(() => {
    getSessions()
      .then((all) => {
        setHistory(all);
        const todays = all.find((s) => isToday(s.date));
        if (todays) setSession(todays);
      })
      .catch(() => setError("Couldn't load your sessions"));
  }, []);

  // The record to beat for the selected exercise. Today's own session is
  // excluded — otherwise the set you just logged becomes its own record
  // and nothing would ever register as a PR.
  const priorBest = useMemo(
    () =>
      selectedId && session
        ? bestEstimated1RM(history, selectedId, session.id)
        : 0,
    [history, selectedId, session?.id],
  );

  // The selected exercise's sets from the most recent earlier session, so
  // each set logged today can be compared against its counterpart.
  const lastSessionSets = useMemo(() => {
    if (!selectedId || !session) return [];
    const prior = history
      .filter(
        (s) =>
          s.id !== session.id &&
          s.sets.some((x) => x.exerciseId === selectedId),
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return prior?.sets.filter((x) => x.exerciseId === selectedId) ?? [];
  }, [history, selectedId, session?.id]);

  // Whenever the session changes, load the exercises for its day type.
  useEffect(() => {
    if (!session) return;
    getExercises(session.dayType)
      .then(setExercises)
      .catch(() => setError("Couldn't load exercises"));
  }, [session?.dayType]);

  async function handleStart(dayType: string) {
    setError(null);
    setBusy(true);
    try {
      setSession(await createSession(dayType));
    } catch {
      setError("Couldn't start the session");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogSet(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !selectedId) return;
    setError(null);
    setBusy(true);
    try {
      const created = await logSet({
        sessionId: session.id,
        exerciseId: selectedId,
        weight: Number(weight),
        reps: Number(reps),
      });
      setSession({ ...session, sets: [...session.sets, created] });
      setReps("");
    } catch {
      setError("Couldn't log that set");
    } finally {
      setBusy(false);
    }
  }

  // ── No session yet: pick a day type ───────────────────────
  if (!session) {
    return (
      <main className="p-6 max-w-md">
        <SummaryBanner />
        <h2 className="text-xl font-semibold mb-1">Start a session</h2>
        <p className="text-neutral-500 text-sm mb-5">What are you training today?</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          {user.plannedDayTypes.map((dt) => (
            <button
              key={dt}
              onClick={() => handleStart(dt)}
              disabled={busy}
              className="rounded-lg bg-neutral-900 border border-neutral-800 py-4 font-medium hover:border-neutral-600 disabled:opacity-50"
            >
              {dt}
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ── Active session: log sets ──────────────────────────────
  const setsForSelected = session.sets.filter((s) => s.exerciseId === selectedId);

  return (
    <main className="p-6 max-w-md">
      <SummaryBanner />
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-xl font-semibold">{session.dayType}</h2>
        <span className="text-sm text-neutral-500">
          {session.sets.length} {session.sets.length === 1 ? "set" : "sets"} logged
        </span>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <label className="block text-sm text-neutral-400 mb-1" htmlFor="exercise">
        Exercise
      </label>
      <select
        id="exercise"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full rounded bg-neutral-900 border border-neutral-800 px-3 py-2 mb-5"
      >
        <option value="">Choose an exercise…</option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>{ex.name}</option>
        ))}
      </select>

      {selectedId && (
        <>
          <LastTimePanel exerciseId={selectedId} currentSessionId={session.id} />

          {setsForSelected.length > 0 && (
            <ul className="mb-5 space-y-1 text-sm">
              {setsForSelected.map((s) => {
                const estimate = estimate1RM(s.weight, s.reps);
                // Only a PR if there was something to beat — a first-ever
                // lift is technically a record but saying so is noise.
                const isPR = priorBest > 0 && estimate > priorBest;

                // Same set number, last time round.
                const counterpart = lastSessionSets.find(
                  (p) => p.setNumber === s.setNumber,
                );
                const gain = counterpart
                  ? estimate - estimate1RM(counterpart.weight, counterpart.reps)
                  : 0;
                // A PR already says more than a delta would — don't show both.
                const beatLast = !isPR && gain > 0.05;

                return (
                  <li key={s.id} className="flex items-center gap-3 text-neutral-300">
                    <span className="text-neutral-600 w-10">Set {s.setNumber}</span>
                    <span className="tabular-nums">{s.weight} kg × {s.reps}</span>
                    {isPR && (
                      <span
                        title={`Beats your previous best of ${priorBest.toFixed(1)} kg estimated 1RM`}
                        className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-400"
                      >
                        PR
                      </span>
                    )}
                    {beatLast && (
                      <span
                        title="Stronger than the same set last session"
                        className="text-xs tabular-nums text-emerald-400"
                      >
                        +{gain.toFixed(1)} kg
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleLogSet} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-neutral-400 mb-1" htmlFor="weight">
                Weight (kg)
              </label>
              <input
                id="weight" type="number" step="0.5" required
                value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded bg-neutral-900 border border-neutral-800 px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-neutral-400 mb-1" htmlFor="reps">
                Reps
              </label>
              <input
                id="reps" type="number" required
                value={reps} onChange={(e) => setReps(e.target.value)}
                className="w-full rounded bg-neutral-900 border border-neutral-800 px-3 py-2"
              />
            </div>
            <button
              type="submit" disabled={busy}
              className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              Log
            </button>
          </form>
        </>
      )}
    </main>
  );
}