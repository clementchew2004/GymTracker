import { useEffect, useState } from "react";
import { getLastSessionFor, type Session } from "../api/sessions";

type Props = {
  exerciseId: string;
  currentSessionId: string;
};

export function LastTimePanel({ exerciseId, currentSessionId }: Props) {
  const [last, setLast] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guards against a slow earlier request resolving after a newer one
    // and overwriting the correct data.
    let cancelled = false;
    setLoading(true);

    getLastSessionFor(exerciseId)
      .then((s) => {
        if (cancelled) return;
        // The endpoint returns the most recent session with this exercise,
        // which is today's once you've logged a set. Showing "last time"
        // for the session you're in is useless, so drop it.
        const usable = s && s.id !== currentSessionId && s.sets.length > 0;
        setLast(usable ? s : null);
      })
      .catch(() => {
        if (!cancelled) setLast(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId, currentSessionId]);

  if (loading) {
    return <p className="mb-5 text-sm text-neutral-600">Checking your history…</p>;
  }

  if (!last) {
    return (
      <p className="mb-5 text-sm text-neutral-600">First time logging this one.</p>
    );
  }

  const when = new Date(last.date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const best = last.sets.reduce((a, b) =>
    a.weight * a.reps > b.weight * b.reps ? a : b,
  );

  return (
    <div className="mb-5 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          Last time
        </span>
        <span className="text-xs text-neutral-600">{when}</span>
      </div>
      <ul className="space-y-1 text-sm">
        {last.sets.map((s) => (
          <li key={s.id} className="flex gap-3">
            <span className="w-12 text-neutral-600">Set {s.setNumber}</span>
            <span className="tabular-nums text-neutral-300">
              {s.weight} kg × {s.reps}
            </span>
            {s.id === best.id && last.sets.length > 1 && (
              <span className="self-center text-xs text-neutral-500">best</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
