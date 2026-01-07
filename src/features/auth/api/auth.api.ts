import { http } from "@/shared/api/http";
import type { User } from "../types/user";

export async function loginRequest(email: string, password: string) {
    const res = await fetch("/auth/login", {
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

export function fetchMe(): Promise<User> {
    return http<User>("/auth/user/me");
}
