import { useEffect, useRef, useState } from "react";

const DURATION_KEY = "gymtracker_rest_seconds";
const PRESETS = [60, 90, 120, 180];
export const DEFAULT_REST_SECONDS = 90;

/** Preferred rest length, remembered between visits. */
export function loadRestSeconds(): number {
  try {
    const stored = Number(localStorage.getItem(DURATION_KEY));
    return PRESETS.includes(stored) ? stored : DEFAULT_REST_SECONDS;
  } catch {
    return DEFAULT_REST_SECONDS;
  }
}

function saveRestSeconds(seconds: number) {
  try {
    localStorage.setItem(DURATION_KEY, String(seconds));
  } catch {
    /* non-fatal — the timer still works for this visit */
  }
}

function mmss(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  /** Epoch ms the rest ends at, or null when no timer is running. */
  endsAt: number | null;
  restSeconds: number;
  onChangeRestSeconds: (seconds: number) => void;
  onExtend: (seconds: number) => void;
  onDismiss: () => void;
};

export function RestTimer({
  endsAt,
  restSeconds,
  onChangeRestSeconds,
  onExtend,
  onDismiss,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const buzzedFor = useRef<number | null>(null);

  // Ticking against an absolute end time rather than counting a number down:
  // browsers throttle timers in background tabs, so a decrementing counter
  // drifts badly if you switch away mid-rest.
  useEffect(() => {
    if (endsAt === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  // Buzz once when the rest ends, not on every tick afterwards.
  useEffect(() => {
    if (endsAt === null || now < endsAt) return;
    if (buzzedFor.current === endsAt) return;
    buzzedFor.current = endsAt;
    navigator.vibrate?.([200, 100, 200]);
  }, [endsAt, now]);

  if (endsAt === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span>Rest</span>
        {PRESETS.map((s) => (
          <button
            key={s}
            onClick={() => {
              onChangeRestSeconds(s);
              saveRestSeconds(s);
            }}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              s === restSeconds
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {s < 120 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
      </div>
    );
  }

  const remaining = Math.max(0, endsAt - now);
  const done = remaining === 0;
  const progress = done ? 1 : 1 - remaining / (restSeconds * 1000);

  return (
    <div
      role="timer"
      aria-live="off"
      className={`fixed inset-x-0 bottom-0 border-t ${
        done
          ? "border-emerald-500/40 bg-emerald-950/80"
          : "border-neutral-800 bg-neutral-900/95"
      } backdrop-blur`}
    >
      {/* Progress bar doubles as the at-a-glance read, so you don't have to
          parse the digits mid-set. */}
      <div className="h-0.5 w-full bg-neutral-800">
        <div
          className={`h-full transition-[width] duration-200 ${
            done ? "bg-emerald-400" : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>

      <div className="mx-auto flex max-w-md items-center gap-4 px-6 py-3">
        <span
          className={`text-2xl font-semibold tabular-nums ${
            done ? "text-emerald-400" : "text-neutral-100"
          }`}
        >
          {done ? "Go" : mmss(remaining)}
        </span>
        <span className="flex-1 text-sm text-neutral-500">
          {done ? "Rest over" : "Resting"}
        </span>

        {!done && (
          <button
            onClick={() => onExtend(30)}
            className="rounded border border-neutral-700 px-2.5 py-1 text-sm text-neutral-300 hover:border-neutral-500"
          >
            +30s
          </button>
        )}
        <button
          onClick={onDismiss}
          className="rounded bg-neutral-800 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-700"
        >
          {done ? "Done" : "Skip"}
        </button>
      </div>
    </div>
  );
}
