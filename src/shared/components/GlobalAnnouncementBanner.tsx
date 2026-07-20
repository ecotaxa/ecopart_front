import { Box, Alert, AlertTitle, Typography } from "@mui/material";

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
    const announcement = useAnnouncementStore((s) => s.announcement);
    const dismissed = useAnnouncementStore((s) => s.dismissed);
    const dismiss = useAnnouncementStore((s) => s.dismiss);

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
