import { http, httpText } from "@/shared/api/http";

// ============================================================================
// BROADCAST MESSAGES API
// ============================================================================
// A single application-wide banner an admin pushes to every user's front-end
// (maintenance notice, incident warning, …). The backend holds at most ONE
// message at a time: POST sets/replaces it, DELETE clears it, GET returns it.
//
// Backend endpoints (all cookie-authed via http()):
//  - GET    /broadcast_messages  → the current message, or null (readable by any user)
//  - POST   /broadcast_messages  → set/replace the message (admin only)
//  - DELETE /broadcast_messages  → clear the message (admin only)
// ============================================================================

// --- TYPES ---

/** Visual style of a broadcast, mapped 1:1 to MUI's `AlertColor`. */
export type BroadcastLevel = "info" | "warning" | "error";

/** The single persisted broadcast row returned by the backend. */
export interface BroadcastMessage {
    // Pinned to 1 (the app keeps a single message) — never used to tell one
    // message from another; use `message_creation_utc_date_time` for that.
    broadcast_message_id: number;
    message: string;
    sub_message: string | null;
    level: BroadcastLevel;
    created_by_user_id: number | null;
    message_creation_utc_date_time: string; // ISO
}

/** Body sent when an admin sets/replaces the current broadcast. */
export interface BroadcastMessageInput {
    message: string;
    sub_message?: string | null;
    level: BroadcastLevel;
}

// --- API FUNCTIONS ---

/**
 * Fetches the current broadcast message, or `null` when none is set.
 *
 * The endpoint answers `200` with an EMPTY body when there is no message, so we
 * read it as text (via `httpText`, which keeps the 401 → refresh → retry flow)
 * and treat an empty/`null` payload as "no message". `http()` cannot be used
 * here because it always calls `response.json()`, which throws on an empty body.
 */
export async function getBroadcastMessage(): Promise<BroadcastMessage | null> {
    const text = await httpText("/broadcast_messages");
    if (!text || !text.trim()) return null;
    try {
        return (JSON.parse(text) as BroadcastMessage | null) ?? null;
    } catch {
        return null;
    }
}

/**
 * Sets or replaces the broadcast message (admin only). Returns the stored row.
 * Endpoint: POST /broadcast_messages
 */
export async function setBroadcastMessage(
    input: BroadcastMessageInput,
): Promise<BroadcastMessage> {
    return http<BroadcastMessage>("/broadcast_messages", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/**
 * Clears the broadcast message for everyone (admin only). Succeeds even when no
 * message is currently set.
 * Endpoint: DELETE /broadcast_messages
 */
export async function deleteBroadcastMessage(): Promise<void> {
    await http<{ message: string }>("/broadcast_messages", { method: "DELETE" });
}
