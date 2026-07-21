import { Box, Alert, AlertTitle, Typography } from "@mui/material";
import { useShallow } from "zustand/react/shallow";

import { useAnnouncementStore } from "@/features/admin/store/announcement.store";

/**
 * GlobalAnnouncementBanner — renders the admin site-wide message (set from the
 * admin UPDATES tab) on every page, in the layout style the admin chose.
 *
 * Mounted once in `MainLayout`, so it appears above the content of every
 * authenticated page. Dismissing it hides the banner for the current session
 * (until a full reload) without deleting the message.
 */
export default function GlobalAnnouncementBanner() {
    // A single shallow-compared selector, so the three fields are read from one
    // consistent snapshot and the component re-renders at most once per update.
    const { announcement, dismissed, dismiss } = useAnnouncementStore(
        useShallow((s) => ({
            announcement: s.announcement,
            dismissed: s.dismissed,
            dismiss: s.dismiss,
        })),
    );

    if (!announcement || dismissed) return null;

    return (
        <Box sx={{ px: 3, pt: 2 }}>
            <Alert severity={announcement.severity} onClose={dismiss}>
                <AlertTitle sx={{ mb: announcement.subMessage ? 0.5 : 0 }}>
                    {announcement.message}
                </AlertTitle>
                {announcement.subMessage && (
                    <Typography variant="body2" color="text.secondary">
                        {announcement.subMessage}
                    </Typography>
                )}
            </Alert>
        </Box>
    );
}
