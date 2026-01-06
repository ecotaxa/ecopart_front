import type { ReactNode } from "react";
import { AppBar, Box, Toolbar, Typography } from "@mui/material";

export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <Box>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">Ecopart</Typography>
                </Toolbar>
            </AppBar>
            <Box sx={{ p: 3 }}>{children}</Box>
        </Box>
    );
}
