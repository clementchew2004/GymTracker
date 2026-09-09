import { apiFetch } from "./client";
import type { Exercise } from "./exercises";

export type SetEntry = {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  exerciseId: string;
  exercise?: Exercise;
};

export type Session = {
  id: string;
  date: string;
  dayType: string;
  sets: SetEntry[];
};

export function getSessions(): Promise<Session[]> {
  return apiFetch<Session[]>("/api/sessions");
}

export function createSession(dayType: string): Promise<Session> {
  return apiFetch<Session>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ dayType }),
  });
}

// Most recent session containing this exercise, with only that exercise's
// sets included. Returns null when the exercise has never been logged.
export function getLastSessionFor(exerciseId: string): Promise<Session | null> {
  return apiFetch<Session | null>(
    `/api/sessions/last?exerciseId=${encodeURIComponent(exerciseId)}`,
  );
}