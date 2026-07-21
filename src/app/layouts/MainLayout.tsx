import type { ReactNode } from "react";
import { Box } from "@mui/material";

import TopBar from "@/shared/components/TopBar";
import GlobalAnnouncementBanner from "@/shared/components/GlobalAnnouncementBanner";

export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <Box>
            <TopBar />
            <GlobalAnnouncementBanner />
            <Box sx={{ p: 3 }}>{children}</Box>
        </Box>
    );
}
