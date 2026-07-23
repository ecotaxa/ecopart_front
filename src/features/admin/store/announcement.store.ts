import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
    getBroadcastMessage,
    setBroadcastMessage,
    deleteBroadcastMessage,
    type BroadcastMessage,
    type BroadcastMessageInput,
    type BroadcastLevel,
} from "../api/broadcastMessages.api";

/** Visual style of a global announcement, mapped 1:1 to MUI's `AlertColor`. */
export type AnnouncementSeverity = BroadcastLevel;

export type { BroadcastMessage };

/** UI view of the active broadcast, as the banner and admin card render it. */
export interface Announcement {
    message: string;
    /** Secondary line shown under the main message; empty string when there is none. */
    subMessage: string;
    severity: AnnouncementSeverity;
}

/** Map a backend broadcast row to the banner's view shape. */
export const toAnnouncementView = (broadcast: BroadcastMessage): Announcement => ({
    message: broadcast.message,
    subMessage: broadcast.sub_message ?? "",
    severity: broadcast.level,
});

interface AnnouncementState {
    /** The current broadcast fetched from the backend, or `null` when none. */
    broadcast: BroadcastMessage | null;
    /** Whether the initial fetch has completed at least once. */
    loaded: boolean;
    /**
     * Creation timestamp of the broadcast this viewer has dismissed (persisted
     * to localStorage). The banner hides while it matches the current broadcast,
     * so dismissal survives reloads but a NEWLY pushed message reappears — the
     * `broadcast_message_id` is pinned to 1, so only the timestamp changes.
     */
    dismissedKey: string | null;

    /** Fetch the current broadcast from the backend. Swallows errors (banner is best-effort). */
    refresh: () => Promise<void>;
    /** Admin: push a new broadcast, replacing any existing one. Returns the stored row. */
    publish: (input: BroadcastMessageInput) => Promise<BroadcastMessage>;
    /** Admin: clear the broadcast for everyone. */
    clear: () => Promise<void>;
    /** Viewer: hide the current broadcast for themselves without deleting it. */
    dismiss: () => void;
}

/**
 * Store backing the admin UPDATES broadcast and the global banner it drives.
 *
 * The message itself is owned by the backend (`/broadcast_messages`): `refresh`
 * loads it, `publish`/`clear` are the admin mutations. Only the per-viewer
 * `dismissedKey` is persisted locally — everything else comes from the server.
 */
export const useAnnouncementStore = create<AnnouncementState>()(
    persist(
        (set) => ({
            broadcast: null,
            loaded: false,
            dismissedKey: null,

            refresh: async () => {
                try {
                    const broadcast = await getBroadcastMessage();
                    set({ broadcast, loaded: true });
                } catch {
                    // Never let a failed banner fetch break the page it sits on.
                    set({ loaded: true });
                }
            },

            publish: async (input) => {
                const broadcast = await setBroadcastMessage(input);
                set({ broadcast, loaded: true });
                return broadcast;
            },

            clear: async () => {
                await deleteBroadcastMessage();
                set({ broadcast: null });
            },

            dismiss: () =>
                set((state) => ({
                    dismissedKey: state.broadcast?.message_creation_utc_date_time ?? null,
                })),
        }),
        {
            name: "ecopart-admin-announcement",
            // Persist only the per-viewer dismissal — the message lives on the backend.
            partialize: (state) => ({ dismissedKey: state.dismissedKey }),
        },
    ),
);

/** Whether the given viewer state should show the banner right now. */
export const isBroadcastVisible = (
    broadcast: BroadcastMessage | null,
    dismissedKey: string | null,
): broadcast is BroadcastMessage =>
    broadcast != null && broadcast.message_creation_utc_date_time !== dismissedKey;
