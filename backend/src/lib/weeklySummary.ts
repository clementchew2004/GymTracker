import { estimate1RM } from "./estimate1RM.js";
import { weeklyVolume } from "./weeklyVolume.js";

type DayTypes = "PUSH" | "PULL" | "LEGS" | "UPPER";

export type SetForSummary = {
  weight: number;
  reps: number;
  muscleGroup: string;
  exerciseId: string;
  date: Date;
  sessionId: string;
  dayType: DayTypes;
}

export type WeeklySummary = {
    sessionCompleted: {count: number, dayTypesHit: DayTypes[] }
    volumeByMuscleGroup: Record<string, { thisWeek: number; delta: number }>;
    new1RMs: { exerciseId: string; estimated1RM: number }[];
    beatLastSession: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function isInWeek(date: Date, weekStart: Date): boolean {
    const weekEnd = new Date(weekStart.getTime() + 7 * MS_PER_DAY);
    return weekStart <= date && date < weekEnd;
}

function priorWeekStart (weekStart: Date): Date {
    return new Date(weekStart.getTime() - 7 * MS_PER_DAY);
}

function computeSessionCompleted(sets: SetForSummary[], weekStart: Date) : {count: number; dayTypesHit: DayTypes[] } {
    const thisWeek = sets.filter((s) => isInWeek(s.date, weekStart));
    const sessionIds = new Set<string>();
    const dayTypes = new Set<DayTypes>(); 

    for (const s of thisWeek) {
        sessionIds.add(s.sessionId);
        dayTypes.add(s.dayType);
    }
    return {
        count: sessionIds.size, 
        dayTypesHit: Array.from(dayTypes), 
    } 
}

function computeVolumeByMuscleGroup (sets: SetForSummary[], weekStartDate: Date) : Record<string, {thisWeek: number, delta: number}> {
    const thisWeek = sets.filter((s) => isInWeek(s.date, weekStartDate));
    const lastWeek = sets.filter((s) => isInWeek(s.date, priorWeekStart(weekStartDate)));

    const thisWeekVolume = weeklyVolume(thisWeek);
    const lastWeekVolume = weeklyVolume(lastWeek);

    const result: Record<string, {thisWeek: number, delta: number}> = {};
    for (const [muscleGroup, thisWeekTotal] of Object.entries(thisWeekVolume)) {
        const lastWeekTotal = lastWeekVolume[muscleGroup] ?? 0; 
        result [muscleGroup] = { 
            thisWeek: thisWeekTotal,
            delta: thisWeekTotal - lastWeekTotal,
        }
    }
    return result; 
}

function computeNew1RMs(
  sets: SetForSummary[],
  weekStart: Date,
): { exerciseId: string; estimated1RM: number }[] {
  const thisWeek = sets.filter((s) => isInWeek(s.date, weekStart));
  const priorSets = sets.filter((s) => s.date < weekStart);

  const bestByExercise = (arr: SetForSummary[]): Record<string, number> => {
    const best: Record<string, number> = {};
    for (const s of arr) {
      const est = estimate1RM(s.weight, s.reps);
      if (est > (best[s.exerciseId] ?? 0)) {
        best[s.exerciseId] = est;
      }
    }
    return best;
  };

  const thisWeekBest = bestByExercise(thisWeek);
  const priorBest = bestByExercise(priorSets);

  const result: { exerciseId: string; estimated1RM: number }[] = [];
  for (const [exerciseId, best] of Object.entries(thisWeekBest)) {
    if (best > (priorBest[exerciseId] ?? 0)) {
      result.push({ exerciseId, estimated1RM: best });
    }
  }
  return result;
}

function computeBeatLastSession(
  sets: SetForSummary[],
  weekStart: Date,
): number {
  const thisWeek = sets.filter((s) => isInWeek(s.date, weekStart));

  let count = 0;
  for (const currentSet of thisWeek) {
    const priorForSameExercise = sets.filter(
      (s) =>
        s.exerciseId === currentSet.exerciseId && s.date < currentSet.date,
    );
    if (priorForSameExercise.length === 0) continue;

    const mostRecent = priorForSameExercise.reduce((a, b) =>
      a.date > b.date ? a : b,
    );

    const currentEst = estimate1RM(currentSet.weight, currentSet.reps);
    const previousEst = estimate1RM(mostRecent.weight, mostRecent.reps);
    if (currentEst > previousEst) count++;
  }
  return count;
}

// ─── Public entry point ──────────────────────────────────────────────

export function weeklySummary(
  sets: SetForSummary[],
  weekStart: Date,
): WeeklySummary {
  return {
    sessionCompleted: computeSessionCompleted(sets, weekStart),
    volumeByMuscleGroup: computeVolumeByMuscleGroup(sets, weekStart),
    new1RMs: computeNew1RMs(sets, weekStart),
    beatLastSession: computeBeatLastSession(sets, weekStart),
    
  };
}