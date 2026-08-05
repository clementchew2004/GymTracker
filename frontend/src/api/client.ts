const API_URL = import.meta.env.VITE_API_URL;

const TOKEN_KEY = ("gymtracker_token")

export function getToken() : string | null{
    return localStorage.getItem(TOKEN_KEY);
};

export function setToken(token: string) : void{
    localStorage.setItem(TOKEN_KEY, token)
};

export function clearToken() : void {
    localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message);
        this.status = status 
    }
} 

export async function apiFetch <T> (
    path: string,
    options : RequestInit = {},
) : Promise<T> {
    const token = getToken(); 

    const headers: Record<string,string> = {
        "Content-type": "application/json", 
        ...(options.headers as Record<string,string> | undefined), 
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(`${API_URL}${path}`, {...options, headers})
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
    }
    return res.json() as Promise<T>;
};