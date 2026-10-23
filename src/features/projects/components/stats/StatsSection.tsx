import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

interface StatsSectionProps {
    title: string;
    /** Second line under the title. */
    subtitle?: string;
    /** The warnings of the section, on the right of the title. */
    warnings?: ReactNode;
    children: ReactNode;
}

/** A titled block of the STATS tab, its warnings aligned right. */
export default function StatsSection({ title, subtitle, warnings, children }: StatsSectionProps) {
    return (
        <Box component="section" aria-label={title}>
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
                <Box>
                    <Typography variant="subtitle1" component="h3" color="text.secondary">{title}</Typography>
                    {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
                </Box>
                {warnings}
            </Stack>
            {children}
        </Box>
    );
}
