import { apiFetch, setToken } from "./client";

export type User = {
  id: string;
  email: string;
  plannedDayTypes: string[];
};

type AuthResponse = {
  token: string;
  user: User;
};

export async function register(email: string, password: string): Promise<User> {
  const data = await apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export function getMe(): Promise<User> {
  return apiFetch<User> ("/api/auth/me");
}