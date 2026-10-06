import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getBodyWeights,
  logBodyWeight,
  type BodyWeightEntry,
} from "../api/bodyweight";
import {
  axisLineStroke,
  axisStyle,
  gridStroke,
  tooltipLabelStyle,
  tooltipStyle,
} from "./chartTheme";

export function BodyWeightSection() {
  const [entries, setEntries] = useState<BodyWeightEntry[] | null>(null);
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBodyWeights()
      .then(setEntries)
      .catch(() => setError("Couldn't load your weigh-ins"));
  }, []);

  const points = useMemo(
    () =>
      (entries ?? []).map((e) => ({
        label: new Date(e.date).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        }),
        weightKg: e.weightKg,
      })),
    [entries],
  );

  // Bodyweight moves in a narrow band, so a zero-based axis flattens the
  // line into uselessness. Pad a little either side of the real range.
  const domain = useMemo<[number, number]>(() => {
    if (points.length === 0) return [0, 100];
    const values = points.map((p) => p.weightKg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(1, (max - min) * 0.25);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [points]);

  const latest = entries?.at(-1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(weight);
    if (!Number.isFinite(value) || value <= 0) return;

    setError(null);
    setBusy(true);
    try {
      const created = await logBodyWeight(value);
      setEntries((prev) => [...(prev ?? []), created]);
      setWeight("");
    } catch {
      setError("Couldn't save that weigh-in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Bodyweight</h2>
          <p className="text-sm text-neutral-500">
            {latest
              ? `Last logged ${latest.weightKg} kg on ${new Date(
                  latest.date,
                ).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}`
              : "Track it alongside your lifts."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div>
            <label
              htmlFor="bodyweight"
              className="mb-1 block text-xs text-neutral-500"
            >
              Today (kg)
            </label>
            <input
              id="bodyweight"
              type="number"
              step="0.1"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-24 rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Log
          </button>
        </form>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {!entries ? (
        <p className="text-sm text-neutral-600">Loading…</p>
      ) : points.length === 0 ? (
        <p className="text-sm text-neutral-600">
          No weigh-ins yet. Log one above and a trend will build up here.
        </p>
      ) : points.length === 1 ? (
        <p className="text-sm text-neutral-600">
          One weigh-in so far —{" "}
          <span className="tabular-nums text-neutral-300">
            {points[0]!.weightKg} kg
          </span>
          . Log another to see a trend.
        </p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 4, right: 8, bottom: 4, left: -16 }}
            >
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisStyle}
                tickLine={false}
                axisLine={{ stroke: axisLineStroke }}
              />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                domain={domain}
                unit=" kg"
                width={64}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(v) => [`${Number(v)} kg`, "Bodyweight"]}
              />
              <Line
                type="monotone"
                dataKey="weightKg"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3, fill: "#34d399" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
