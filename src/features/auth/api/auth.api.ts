import { http } from "@/shared/api/http";
import type { User } from "../types/user";
import { API_BASE_URL } from '@/config/api';

export async function loginRequest(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        throw new Error("Invalid credentials");
    }

    return res.json();
}

export async function fetchMe(): Promise<User> {
    // Uses shared http function to benefit from automatic token refresh
    return http<User>("/auth/user/me");
}
