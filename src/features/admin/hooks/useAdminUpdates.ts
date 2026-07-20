import { useState } from "react";

import {
    AnnouncementSeverity,
    useAnnouncementStore,
} from "../store/announcement.store";

/** The three layout styles offered in the UPDATES form (order matches the mockup). */
export const ANNOUNCEMENT_STYLES: { value: AnnouncementSeverity; label: string }[] = [
    { value: "info", label: "Info" },
    { value: "warning", label: "Warning" },
    { value: "error", label: "Error" },
];

/**
 * Hook backing the admin UPDATES panel.
 *
 * Owns the creation form's local state and bridges it to the shared
 * announcement store (which persists the message and feeds the global banner).
 * The tab shows the form only while no announcement is active; once one exists
 * `activeAnnouncement` is set and the tab renders it instead.
 */
export const useAdminUpdates = () => {
    const announcement = useAnnouncementStore((s) => s.announcement);
    const setAnnouncement = useAnnouncementStore((s) => s.setAnnouncement);
    const clearAnnouncement = useAnnouncementStore((s) => s.clearAnnouncement);

    const [message, setMessage] = useState("");
    const [subMessage, setSubMessage] = useState("");
    const [severity, setSeverity] = useState<AnnouncementSeverity>("info");
    const [confirmed, setConfirmed] = useState(false);
    const [justCreated, setJustCreated] = useState(false);

    // CREATE is enabled only with a non-empty message and the confirmation ticked.
    const canCreate = message.trim().length > 0 && confirmed;

    const create = () => {
        if (!canCreate) return;
        setAnnouncement({ message: message.trim(), subMessage: subMessage.trim(), severity });
        // Reset the form so removing the message later shows a blank one.
        setMessage("");
        setSubMessage("");
        setSeverity("info");
        setConfirmed(false);
        setJustCreated(true);
    };

    const remove = () => {
        clearAnnouncement();
        setJustCreated(false);
    };

    return {
        // Current active announcement (drives form vs. active-message view).
        activeAnnouncement: announcement,
        // Transient "message created" confirmation toast.
        justCreated,
        dismissJustCreated: () => setJustCreated(false),
        // Form state.
        message, setMessage,
        subMessage, setSubMessage,
        severity, setSeverity,
        confirmed, setConfirmed,
        canCreate,
        // Actions.
        create,
        remove,
    };
};
