import { RegisterPayload } from "../types/user";
import { API_BASE_URL } from '@/config/api';
import type { ApiErrorResponse } from "@/shared/types/apiError";

function extractErrorMessage(errorData: ApiErrorResponse): string | null {

    if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const first = errorData.errors[0];

        if (typeof first === "string") return first;
        if (typeof first === "object" && first?.msg === "string") return first.msg;
    }

    if (typeof errorData?.message === "string") return errorData.message;

    return null;
}

export async function registerUser(payload: RegisterPayload) {
    const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        // handle JSON OR empty-body responses safely
        let data: unknown = null;
        try {
            data = await res.json();
        } catch {
            data = null;
        }

        const message =
            extractErrorMessage(data as ApiErrorResponse) ??
            `Registration failed (HTTP ${res.status})`;

        throw new Error(message);
    }

    // If backend returns no json on success, don't crash
    try {
        return await res.json();
    } catch {
        return null;
    }
}
