import { RegisterPayload } from "../types/user";

function extractErrorMessage(data: any): string | null {

    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const first = data.errors[0];

        if (typeof first === "string") return first;
        if (typeof first?.msg === "string") return first.msg;
    }

    if (typeof data?.message === "string") return data.message;

    return null;
}

export async function registerUser(payload: RegisterPayload) {
    const res = await fetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        // handle JSON OR empty-body responses safely
        let data: any = null;
        try {
            data = await res.json();
        } catch {
            data = null;
        }

        const message =
            extractErrorMessage(data) ??
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
