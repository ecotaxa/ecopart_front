import { useEffect } from "react";
import { Box, Alert, AlertTitle, Typography } from "@mui/material";
import { useShallow } from "zustand/react/shallow";

import {
    useAnnouncementStore,
    isBroadcastVisible,
    toAnnouncementView,
} from "@/features/admin/store/announcement.store";

/**
 * GlobalAnnouncementBanner — renders the admin site-wide broadcast (set from the
 * admin UPDATES tab) on every page, in the layout style the admin chose.
 *
 * Mounted once in `MainLayout`, so it appears above the content of every
 * authenticated page. It fetches the current broadcast from the backend on
 * mount; dismissing it hides the banner for this viewer (persisted per message)
 * without deleting it, and a newly pushed message reappears for everyone.
 */
export default function GlobalAnnouncementBanner() {
    // A single shallow-compared selector, so the fields are read from one
    // consistent snapshot and the component re-renders at most once per update.
    const { broadcast, dismissedKey, refresh, dismiss } = useAnnouncementStore(
        useShallow((s) => ({
            broadcast: s.broadcast,
            dismissedKey: s.dismissedKey,
            refresh: s.refresh,
            dismiss: s.dismiss,
        })),
    );

    // Pull the latest broadcast whenever the layout mounts (i.e. on navigation),
    // so a message an admin just pushed shows up without a full reload.
    useEffect(() => {
        void refresh();
    }, [refresh]);

    if (!isBroadcastVisible(broadcast, dismissedKey)) return null;

    const view = toAnnouncementView(broadcast);

    return (
        <Box sx={{ px: 3, pt: 2 }}>
            <Alert severity={view.severity} onClose={dismiss}>
                <AlertTitle sx={{ mb: view.subMessage ? 0.5 : 0 }}>
                    {view.message}
                </AlertTitle>
                {view.subMessage && (
                    <Typography variant="body2" color="text.secondary">
                        {view.subMessage}
                    </Typography>
                )}
            </Alert>
        </Box>
    );
}
