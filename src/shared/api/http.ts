let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshToken() {
    const res = await fetch("/auth/refreshToken", {
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
    const response = await fetch(input, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
    });

    if (response.status !== 401) {
        return response.json();
    }

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

    // Retry original request once
    const retryResponse = await fetch(input, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
    });

    if (!retryResponse.ok) {
        throw new Error("Request failed after refresh");
    }

    return retryResponse.json();
}
