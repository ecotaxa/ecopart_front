import type { ReactNode } from "react";
import { Paper } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface SectionCardProps {
    children: ReactNode;
    /** Extra styles merged after the defaults. */
    sx?: SxProps<Theme>;
}

/**
 * Standard "card" wrapper for project tab content and page sections.
 *
 * Single source of truth for card styling so every tab renders identically
 * (outlined, no shadow, consistent padding & radius) instead of each screen
 * re-inventing its own Paper/Box. Fills the width of its parent container.
 */
export default function SectionCard({ children, sx }: SectionCardProps) {
    return (
        <Paper
            variant="outlined"
            sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2, ...sx }}
        >
            {children}
        </Paper>
    );
}
