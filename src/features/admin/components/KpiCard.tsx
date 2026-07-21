import type { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";

type KpiColor = "default" | "error" | "success" | "warning";

interface KpiCardProps {
    label: string;
    /** Primary value; string so callers can pre-format (e.g. formatBytes). */
    value: ReactNode;
    /** Optional secondary line under the value (e.g. "12 / 40 backed up"). */
    sub?: ReactNode;
    /** Semantic tint for the value (e.g. `error` for failed tasks > 0). */
    color?: KpiColor;
    icon?: ReactNode;
}

const VALUE_COLOR: Record<KpiColor, string> = {
    default: "text.primary",
    error: "error.main",
    success: "success.main",
    warning: "warning.main",
};

/**
 * Compact KPI tile for the admin statistics dashboard. Outlined, no shadow,
 * full-height so a row of cards in a grid lines up regardless of how many lines
 * of sub-text each one carries.
 *
 * Distinct from the large coloured headline counters in AdminQuickAccessTab:
 * those are the four hero metrics from the mockup, this is the dense KPI grid of
 * the /admin/stats overview.
 */
export default function KpiCard({ label, value, sub, color = "default", icon }: KpiCardProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {icon}
                <Typography variant="body2" color="text.secondary">
                    {label}
                </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: VALUE_COLOR[color] }}>
                {value}
            </Typography>
            {sub != null && (
                <Typography variant="caption" color="text.secondary">
                    {sub}
                </Typography>
            )}
        </Paper>
    );
}
