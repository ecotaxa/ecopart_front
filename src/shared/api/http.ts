import { API_BASE_URL } from '@/config/api';
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshToken() {
    const res = await fetch(`${API_BASE_URL}/auth/refreshToken`, {
        method: "POST",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Refresh failed");
    }
}

/**
 * Extract a human-readable error message from a failed response body, falling
 * back to a generic `HTTP Error: <status>` when the body is missing or not the
 * expected JSON error shape.
 */
async function extractErrorMessage(response: Response): Promise<string> {
    let errorMessage = `HTTP Error: ${response.status}`;
    try {
        const errorData = await response.json();
        if (typeof errorData?.message === "string" && errorData.message.trim()) {
            errorMessage = errorData.message;
        } else if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
            const firstError = errorData.errors[0];
            if (typeof firstError === "string" && firstError.trim()) {
                errorMessage = firstError;
            } else if (typeof firstError?.msg === "string" && firstError.msg.trim()) {
                errorMessage = firstError.msg;
            }
        }
    } catch {
        // Body was not valid JSON, keep generic message
    }
    return errorMessage;
}

export async function http<T>(
    input: RequestInfo,
    init: RequestInit = {}
): Promise<T> {
    const url = typeof input === 'string' ? `${API_BASE_URL}${input}` : input;

    // 1. Initial Request
    const response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
    });

    // 2. Handle Success (200-299)
    if (response.ok) {
        return response.json();
    }

    // 3. Handle standard errors (400, 403, 404, 500, etc) - EVERYTHING EXCEPT 401
    if (response.status !== 401) {
        throw new Error(await extractErrorMessage(response));
    }

    // 4. Handle 401 Unauthorized (Token Expired)
    // Access token expired → try refresh (once)
    if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken()
            .finally(() => {
                isRefreshing = false;
            });
    }

    try {
        await refreshPromise;
    } catch {
        throw new Error("Session expired");
    }

    // 5. Retry original request once
    const retryResponse = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
    });

    // 6. Handle Retry Success/Failure
    if (!retryResponse.ok) {
        throw new Error(await extractErrorMessage(retryResponse));
    }

    return retryResponse.json();
}

export async function httpText(
    input: RequestInfo,
    init: RequestInit = {}
): Promise<string> {
    const url = typeof input === 'string' ? `${API_BASE_URL}${input}` : input;

    const response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: { ...(init.headers || {}) },
    });

    if (response.ok) {
        return response.text();
    }

    if (response.status !== 401) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken().finally(() => { isRefreshing = false; });
    }

    try {
        await refreshPromise;
    } catch {
        throw new Error("Session expired");
    }

    const retryResponse = await fetch(url, {
        ...init,
        credentials: "include",
        headers: { ...(init.headers || {}) },
    });

    if (!retryResponse.ok) {
        throw new Error(`HTTP Error: ${retryResponse.status}`);
    }

    return retryResponse.text();
}

/**
 * Parse the file name out of a `Content-Disposition` header, falling back to
 * `null` when the header is absent or unparseable. The backend may send a full
 * server path as the filename, so we keep only the trailing basename.
 */
const CONTENT_DISPOSITION_FILENAME = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

function filenameFromContentDisposition(header: string | null): string | null {
    if (!header) return null;

    const match = CONTENT_DISPOSITION_FILENAME.exec(header);
    if (!match) return null;

    let raw = match[1].trim();
    try {
        raw = decodeURIComponent(raw);
    } catch {
        // Malformed percent-encoding: keep the raw matched value rather than
        // letting decodeURIComponent throw and fail an otherwise-good download.
    }
    // Strip any directory part (Windows or POSIX separators).
    const basename = raw.split(/[\\/]/).pop();
    return basename || null;
}

/**
 * Fetches a binary response as a Blob (e.g. a file download), returning the
 * blob together with the server-suggested file name. Shares the same single
 * 401 → refresh → retry flow as `http`/`httpText`.
 */
export async function httpBlob(
    input: RequestInfo,
    init: RequestInit = {}
): Promise<{ blob: Blob; filename: string | null }> {
    const url = typeof input === 'string' ? `${API_BASE_URL}${input}` : input;

    const response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: { ...(init.headers || {}) },
    });

    if (response.ok) {
        return {
            blob: await response.blob(),
            filename: filenameFromContentDisposition(response.headers.get("Content-Disposition")),
        };
    }

    if (response.status !== 401) {
        throw new Error(await extractErrorMessage(response));
    }

    if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken().finally(() => { isRefreshing = false; });
    }

    try {
        await refreshPromise;
    } catch {
        throw new Error("Session expired");
    }

    const retryResponse = await fetch(url, {
        ...init,
        credentials: "include",
        headers: { ...(init.headers || {}) },
    });

    if (!retryResponse.ok) {
        throw new Error(await extractErrorMessage(retryResponse));
    }

    return {
        blob: await retryResponse.blob(),
        filename: filenameFromContentDisposition(retryResponse.headers.get("Content-Disposition")),
    };
}