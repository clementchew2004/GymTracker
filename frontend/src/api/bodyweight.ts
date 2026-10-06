import { apiFetch } from "./client";

export type BodyWeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

/** Oldest first — the API already returns them in chart order. */
export function getBodyWeights(): Promise<BodyWeightEntry[]> {
  return apiFetch<BodyWeightEntry[]>("/api/bodyweight");
}

export function logBodyWeight(weightKg: number): Promise<BodyWeightEntry> {
  return apiFetch<BodyWeightEntry>("/api/bodyweight", {
    method: "POST",
    body: JSON.stringify({ weightKg }),
  });
}
