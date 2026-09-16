import { http } from "@/shared/api/http";
import type { User } from "../types/user";
import { API_BASE_URL } from '@/config/api';

/** Thrown when the backend rejects the email / password pair (400 or 401). */
export class InvalidCredentialsError extends Error {
    constructor() {
        super("Invalid credentials");
        this.name = "InvalidCredentialsError";
    }
}

export async function loginRequest(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new InvalidCredentialsError();
    }
    if (!res.ok) {
        // Anything else (5xx, gateway…) is a server problem, not a wrong password.
        throw new Error(`Login failed (HTTP ${res.status})`);
    }

    return res.json();
}

export async function fetchMe(): Promise<User> {
    // Uses shared http function to benefit from automatic token refresh
    return http<User>("/auth/user/me");
}

/** Ends the server session (clears the auth cookies). Errors are left to the caller. */
export async function logoutRequest(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
    });
}
