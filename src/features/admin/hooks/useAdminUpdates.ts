import { useEffect, useState } from "react";

import {
    AnnouncementSeverity,
    Announcement,
    toAnnouncementView,
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
 * Owns the creation form's local state and bridges it to the announcement store,
 * whose `publish`/`clear` actions hit the backend `/broadcast_messages` endpoint
 * and update the shared broadcast the global banner reads. The tab shows the
 * form only while no broadcast is active; once one exists `activeAnnouncement`
 * is set and the tab renders it instead.
 */
export const useAdminUpdates = () => {
    const broadcast = useAnnouncementStore((s) => s.broadcast);
    const refresh = useAnnouncementStore((s) => s.refresh);
    const publish = useAnnouncementStore((s) => s.publish);
    const clear = useAnnouncementStore((s) => s.clear);

    const [message, setMessage] = useState("");
    const [subMessage, setSubMessage] = useState("");
    const [severity, setSeverity] = useState<AnnouncementSeverity>("info");
    const [confirmed, setConfirmed] = useState(false);
    const [justCreated, setJustCreated] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load the current broadcast so the tab reflects the backend on first open.
    useEffect(() => {
        void refresh();
    }, [refresh]);

    // CREATE is enabled only with a non-empty message, the confirmation ticked,
    // and no request already in flight.
    const canCreate = message.trim().length > 0 && confirmed && !submitting;

    const create = async () => {
        if (!canCreate) return;
        setSubmitting(true);
        setError(null);
        try {
            await publish({
                message: message.trim(),
                sub_message: subMessage.trim() || null,
                level: severity,
            });
            // Reset the form so removing the message later shows a blank one.
            setMessage("");
            setSubMessage("");
            setSeverity("info");
            setConfirmed(false);
            setJustCreated(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not publish the message.");
        } finally {
            setSubmitting(false);
        }
    };

    const remove = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await clear();
            setJustCreated(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not remove the message.");
        } finally {
            setSubmitting(false);
        }
    };

    const activeAnnouncement: Announcement | null = broadcast
        ? toAnnouncementView(broadcast)
        : null;

    return {
        // Current active announcement (drives form vs. active-message view).
        activeAnnouncement,
        // Transient "message created" confirmation toast.
        justCreated,
        dismissJustCreated: () => setJustCreated(false),
        // Form state.
        message, setMessage,
        subMessage, setSubMessage,
        severity, setSeverity,
        confirmed, setConfirmed,
        canCreate,
        // Request state.
        submitting,
        error,
        dismissError: () => setError(null),
        // Actions.
        create,
        remove,
    };
};
