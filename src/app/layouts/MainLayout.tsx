import type { ReactNode } from "react";
import { Box } from "@mui/material";

import TopBar from "@/shared/components/TopBar";

export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <Box>
            <TopBar />
            <Box sx={{ p: 3 }}>{children}</Box>
        </Box>
    );
}
