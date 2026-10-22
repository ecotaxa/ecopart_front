import type { ApiErrorResponse } from "@/shared/types/apiError";

/**
 * The `errors` entries of a payload as one list: express-validator sends an array,
 * the sample import routes group them by step (`{ import: [...], backup: [...] }`).
 */
function errorEntries(errors: unknown): unknown[] {
    if (Array.isArray(errors)) return errors;
    if (typeof errors === "object" && errors !== null) {
        return Object.values(errors).flatMap((group) => (Array.isArray(group) ? group : [group]));
    }
    return [];
}

/**
 * Pull a human-readable message out of a backend error payload (`{ message }`,
 * express-validator style `{ errors: [string | { msg }] }`, or errors grouped by
 * step `{ errors: { import: [...] } }`). Returns `null` when the payload carries
 * nothing usable.
 */
export function messageFromApiError(errorData: ApiErrorResponse | unknown): string | null {
    if (typeof errorData !== "object" || errorData === null) return null;
    const data = errorData as { errors?: unknown; message?: unknown };
    const errors = errorEntries(data.errors);

    if (errors.length > 0) {
        const first: unknown = errors[0];
        if (typeof first === "string" && first.trim()) return first;
        if (typeof first === "object" && first !== null) {
            const msg = (first as { msg?: unknown }).msg;
            if (typeof msg === "string" && msg.trim()) return msg;
        }
    }

    if (typeof data.message === "string" && data.message.trim()) return data.message;

    return null;
}

/**
 * Extract a readable message from anything a failed call can throw — an `Error`,
 * a plain string, or a raw backend payload — falling back to `fallback`.
 */
export function extractErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
    if (typeof error === "string" && error.trim()) return error;
    // A network failure surfaces as `TypeError: Failed to fetch` — meaningless to a
    // user, so the caller's wording is used instead of the raw message.
    if (error instanceof TypeError) return fallback;
    if (error instanceof Error && error.message.trim()) return error.message;
    return messageFromApiError(error) ?? fallback;
}
