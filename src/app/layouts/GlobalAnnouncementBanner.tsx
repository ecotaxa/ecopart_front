import { useEffect } from "react";
import { Box, Alert, AlertTitle, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

import { useAuthStore } from "@/features/auth";
import {
    useAnnouncementStore,
    isBroadcastVisible,
    toAnnouncementView,
} from "@/features/admin/store/announcement.store";

/**
 * GlobalAnnouncementBanner — renders the admin site-wide broadcast (set from the
 * admin UPDATES tab) on every page, in the layout style the admin chose.
 *
 * Mounted once in `MainLayout` (a layout route, so it stays mounted across
 * navigations). The backend only serves the broadcast to signed-in users, so it
 * is fetched once a user is known and again on every navigation, so a message an
 * admin just pushed shows up without a full reload. Dismissing it hides the banner
 * for this viewer (persisted per message) without deleting it, and a newly pushed
 * message reappears for everyone.
 */
export default function GlobalAnnouncementBanner() {
    const userId = useAuthStore((s) => s.user?.user_id ?? null);
    const { pathname } = useLocation();
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

    useEffect(() => {
        // Signed out: the endpoint would answer 401 (and trigger a token refresh).
        if (userId === null) return;
        void refresh();
    }, [refresh, userId, pathname]);

    if (userId === null || !isBroadcastVisible(broadcast, dismissedKey)) return null;

    const view = toAnnouncementView(broadcast);

    return (
        <Box sx={{ px: 3, pt: 2 }}>
            {/*
              * Frame, icon and tint carry the semantic colour; the text stays in the
              * body colour, which keeps it readable on every tint (a yellow warning
              * text on a yellow tint fell far below the WCAG contrast minimum).
              */}
            <Alert
                severity={view.severity}
                onClose={dismiss}
                sx={{
                    border: "1px solid",
                    borderColor: `${view.severity}.main`,
                    color: "text.primary",
                    bgcolor: (theme: Theme) => alpha(theme.palette[view.severity].main, 0.2),
                    "& .MuiAlert-icon": { color: `${view.severity}.dark` },
                }}
            >
                <AlertTitle sx={{ mb: view.subMessage ? 0.5 : 0, fontWeight: 700, color: "inherit" }}>
                    {view.message}
                </AlertTitle>
                {view.subMessage && (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "inherit" }}>
                        {view.subMessage}
                    </Typography>
                )}
            </Alert>
        </Box>
    );
}
