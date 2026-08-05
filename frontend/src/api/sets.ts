import { apiFetch } from "./client";
import type { SetEntry } from "./sessions";

export function logSet(input: {
  sessionId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  rpe?: number;
}): Promise<SetEntry> {
  return apiFetch<SetEntry>("/api/sets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}