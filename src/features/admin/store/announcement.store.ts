import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Visual style of a global announcement, mapped 1:1 to MUI's `AlertColor`. */
export type AnnouncementSeverity = "info" | "warning" | "error";

/** A site-wide message an admin broadcasts to every user, or `null` when none. */
export interface Announcement {
    message: string;
    /** Optional secondary line shown under the main message. */
    subMessage: string;
    severity: AnnouncementSeverity;
}

interface AnnouncementState {
    /** The active announcement (persisted to localStorage), or `null`. */
    announcement: Announcement | null;
    /**
     * Whether the current viewer has dismissed the banner. In-memory only (not
     * persisted): dismissal survives client-side navigation but resets on a full
     * reload, so a persisted message reappears — matching "visible on each page".
     */
    dismissed: boolean;

    /** Broadcast a new announcement, clearing any previous dismissal. */
    setAnnouncement: (announcement: Announcement) => void;
    /** Remove the announcement entirely (admin action — affects the stored value). */
    clearAnnouncement: () => void;
    /** Hide the banner for this viewer without deleting the announcement. */
    dismiss: () => void;
}

/**
 * Store backing the admin UPDATES broadcast and the global banner it drives.
 *
 * There is no backend endpoint for site announcements, so the message lives in
 * `localStorage` (via the `persist` middleware) — the best available stand-in
 * for "show a message to all users". Only `announcement` is persisted; the
 * per-viewer `dismissed` flag is deliberately kept in memory.
 */
export const useAnnouncementStore = create<AnnouncementState>()(
    persist(
        (set) => ({
            announcement: null,
            dismissed: false,

            setAnnouncement: (announcement) => set({ announcement, dismissed: false }),
            clearAnnouncement: () => set({ announcement: null, dismissed: false }),
            dismiss: () => set({ dismissed: true }),
        }),
        {
            name: "ecopart-admin-announcement",
            // Persist only the message itself — never the transient dismissal.
            partialize: (state) => ({ announcement: state.announcement }),
        },
    ),
);
