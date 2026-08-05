import { apiFetch } from "./client";

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  defaultDayType: string[];
};

export function getExercises(dayType?: string): Promise<Exercise[]> {
  const qs = dayType ? `?dayType=${encodeURIComponent(dayType)}` : "";
  return apiFetch<Exercise[]>(`/api/exercises${qs}`);
}