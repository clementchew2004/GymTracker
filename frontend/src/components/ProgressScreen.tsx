import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getSessions, type Session } from "../api/sessions";
import {
  loggedExercises,
  oneRMSeries,
  volumeByWeek,
} from "../lib/chartData";
import { BodyWeightSection } from "./BodyWeightSection";
import { SERIES_COLORS, axisStyle, tooltipStyle } from "./chartTheme";

export function ProgressScreen() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState("");

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => setError("Couldn't load your training history"));
  }, []);

  // Derived data — recomputed only when sessions or the picked exercise change.
  const exercises = useMemo(
    () => (sessions ? loggedExercises(sessions) : []),
    [sessions],
  );

  const oneRM = useMemo(
    () => (sessions && exerciseId ? oneRMSeries(sessions, exerciseId) : []),
    [sessions, exerciseId],
  );

  const volume = useMemo(
    () => (sessions ? volumeByWeek(sessions) : { weeks: [], muscleGroups: [] }),
    [sessions],
  );

  // Default the picker to the first exercise once history arrives.
  useEffect(() => {
    if (!exerciseId && exercises.length > 0) setExerciseId(exercises[0]!.id);
  }, [exercises, exerciseId]);

  if (error) {
    return <main className="p-6"><p className="text-sm text-red-400">{error}</p></main>;
  }

  if (!sessions) {
    return <main className="p-6"><p className="text-sm text-neutral-600">Loading your history…</p></main>;
  }

  // Bodyweight is independent of training history, so it still renders here —
  // you might weigh in before you've logged a single session.
  if (sessions.length === 0) {
    return (
      <main className="max-w-3xl space-y-10 p-6">
        <section>
          <h2 className="mb-1 text-xl font-semibold">Progress</h2>
          <p className="text-sm text-neutral-500">
            No lift charts yet. Log a few sessions and your 1RM trend and weekly
            volume will show up here.
          </p>
        </section>
        <BodyWeightSection />
      </main>
    );
  }

  return (
    <main className="p-6 max-w-3xl space-y-10">
      {/* ── Estimated 1RM ─────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Estimated 1RM</h2>
            <p className="text-sm text-neutral-500">
              Best set of each session, via the Epley formula.
            </p>
          </div>

          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            aria-label="Exercise"
            className="rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>

        {oneRM.length === 0 ? (
          <p className="text-sm text-neutral-600">No sets logged for this exercise.</p>
        ) : oneRM.length === 1 ? (
          <p className="text-sm text-neutral-600">
            One session so far — <span className="tabular-nums text-neutral-300">
              {oneRM[0]!.estimated1RM} kg
            </span>. Log it again to see a trend.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={oneRM} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid stroke="#262626" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "#404040" }} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} unit=" kg" width={64} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#a3a3a3" }}
                  formatter={(v) => [`${Number(v)} kg`, "Est. 1RM"]}
                />
                <Line
                  type="monotone"
                  dataKey="estimated1RM"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#60a5fa" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Weekly volume ─────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold">Weekly volume</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Total weight moved per muscle group, by week starting Monday.
        </p>

        {volume.weeks.length === 0 ? (
          <p className="text-sm text-neutral-600">No volume recorded yet.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume.weeks} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
                <CartesianGrid stroke="#262626" vertical={false} />
                <XAxis dataKey="week" tick={axisStyle} tickLine={false} axisLine={{ stroke: "#404040" }} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={72} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#a3a3a3" }}
                  cursor={{ fill: "#ffffff0a" }}
                  formatter={(v, name) => [
                    `${Number(v).toLocaleString()} kg`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }} />
                {volume.muscleGroups.map((group, i) => (
                  <Bar
                    key={group}
                    dataKey={group}
                    stackId="volume"
                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Bodyweight ────────────────────────────────────── */}
      <BodyWeightSection />
    </main>
  );
}
