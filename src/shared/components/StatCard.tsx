import type { ReactNode } from "react";
import { Box, Paper, Skeleton, Typography } from "@mui/material";

/**
 * Headline-counter accents drawn from the app theme (teal-led EcoPart palette),
 * shared by the admin quick access and the explore counters so both read alike.
 */
export const STAT_CARD_COLORS = ["primary.main", "secondary.main", "info.main", "success.main"] as const;

interface StatCardProps {
    label: string;
    /** Pre-formatted value; `null` (unknown / nothing selected) renders "—". */
    value: ReactNode;
    loading?: boolean;
    color: string;
    icon: ReactNode;
}

/** One brand-coloured headline counter: icon, big value, label. */
export default function StatCard({ label, value, loading = false, color, icon }: StatCardProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                backgroundColor: color,
                color: "common.white",
                borderRadius: 2,
                p: 2.5,
                height: "100%",
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
            }}
        >
            <Box sx={{ "& svg": { fontSize: 30 } }}>{icon}</Box>
            <Box>
                {loading ? (
                    <Skeleton variant="text" width={70} height={44} sx={{ bgcolor: "rgba(255,255,255,0.35)" }} />
                ) : (
                    <Typography variant="h3" component="div" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                        {value ?? "—"}
                    </Typography>
                )}
                <Typography variant="h6" component="div" sx={{ fontWeight: 400, mt: 0.5 }}>
                    {label}
                </Typography>
            </Box>
        </Paper>
    );
}
