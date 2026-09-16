import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";

import TopBar from "./TopBar";
import GlobalAnnouncementBanner from "./GlobalAnnouncementBanner";

/**
 * The application chrome (header + site-wide announcement) around every page.
 *
 * Mounted once by the router as a layout route, so pages render into its
 * `<Outlet />` and never import it themselves. `children` is only for the
 * places rendered outside the route tree (the route error page).
 */
export default function MainLayout({ children }: { children?: ReactNode }) {
    return (
        <Box>
            <TopBar />
            <GlobalAnnouncementBanner />
            <Box sx={{ p: 3 }}>{children ?? <Outlet />}</Box>
        </Box>
    );
}
