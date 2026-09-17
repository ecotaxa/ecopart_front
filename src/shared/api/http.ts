import { API_BASE_URL } from '@/config/api';
import { messageFromApiError } from '@/shared/utils/errorMessage';

let refreshPromise: Promise<void> | null = null;

/**
 * Called once the access token could not be refreshed (the session is over).
 * Registered by the app bootstrap so this module stays free of any auth-store
 * dependency (shared code must not import features).
 */
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
    sessionExpiredHandler = handler;
}

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
    try {
        const message = messageFromApiError(await response.json());
        if (message) return message;
    } catch {
        // Body was not valid JSON, keep generic message
    }
    return `HTTP Error: ${response.status}`;
}

/**
 * Perform a request with the cookie-based session, refreshing the access token
 * once on a 401 and retrying the original request. Concurrent 401s share the
 * same refresh call. When the refresh itself fails the session is over: the
 * registered handler is notified (so the UI can drop the user back to login)
 * and a "Session expired" error is thrown.
 */
async function fetchWithRefresh(input: RequestInfo, init: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? `${API_BASE_URL}${input}` : input;
    const request: RequestInit = { ...init, credentials: "include" };

    const response = await fetch(url, request);
    if (response.status !== 401) return response;

    // Access token expired → try refresh (once, shared between callers)
    if (!refreshPromise) {
        refreshPromise = refreshToken().finally(() => {
            refreshPromise = null;
        });
    }

    try {
        await refreshPromise;
    } catch {
        sessionExpiredHandler?.();
        throw new Error("Session expired");
    }

    // Retry original request once
    return fetch(url, request);
}

/** Read a successful JSON response; a 204 / empty body resolves to `undefined`. */
async function readJson<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return undefined as T;
    }
    const text = await response.text();
    if (!text.trim()) return undefined as T;
    return JSON.parse(text) as T;
}

export async function http<T>(
    input: RequestInfo,
    init: RequestInit = {}
): Promise<T> {
    const response = await fetchWithRefresh(input, {
        ...init,
        headers: {
            // A FormData body must let the browser set its own multipart boundary.
            ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...(init.headers || {}),
        },
    });

    if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
    }

    return readJson<T>(response);
}

export async function httpText(
    input: RequestInfo,
    init: RequestInit = {}
): Promise<string> {
    const response = await fetchWithRefresh(input, init);

    if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
    }

    return response.text();
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
    const response = await fetchWithRefresh(input, init);

    if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
    }

    return {
        blob: await response.blob(),
        filename: filenameFromContentDisposition(response.headers.get("Content-Disposition")),
    };
}
