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
        // Try to extract the backend error message
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
        throw new Error(errorMessage);
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
        // Try to extract the backend error message
        let errorMessage = `HTTP Error: ${retryResponse.status}`;
        try {
            const errorData = await retryResponse.json();
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
        throw new Error(errorMessage);
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