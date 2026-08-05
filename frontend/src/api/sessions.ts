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