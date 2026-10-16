import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import ScheduleIcon from "@mui/icons-material/Schedule";

import type { ExploreSummary } from "../types/explore.types";

const NONE = "—";

const formatMonth = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** A size in µm, switched to mm from 1 mm. */
const formatSize = (um: number) => (um >= 1000 ? `${Math.round(um / 100) / 10}mm` : `${Math.round(um)}µm`);

function TypeRow({ title, hint, value }: { title: string; hint: string; value: number | undefined }) {
    return (
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderLeft: 2, borderColor: "divider", pl: 1.5 }}>
            <Box>
                <Typography variant="subtitle2">{title}</Typography>
                <Typography variant="caption" color="text.secondary">{hint}</Typography>
            </Box>
            <Typography variant="h6" color="text.secondary">{value ?? NONE}</Typography>
        </Stack>
    );
}

function RangeRow({ icon, title, hint, value }: { icon: ReactNode; title: string; hint: string; value: string }) {
    return (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ display: "flex", p: 0.75, borderRadius: 1, bgcolor: "action.hover", color: "primary.main" }}>{icon}</Box>
            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">{title}</Typography>
                <Typography variant="caption" color="text.secondary">{hint}</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
        </Stack>
    );
}

/** Sample counts per type and the ranges (pressure, object size, time) of the selection. */
export default function SamplesSummary({ summary }: { summary: ExploreSummary | null }) {
    const pressure = summary?.pressure_range;
    const size = summary?.size_range;
    const time = summary?.time_range;

    return (
        <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Samples type</Typography>
                <Stack spacing={2.5}>
                    <TypeRow title="Depth" hint="Number of individual depth samples" value={summary?.sample_types.depth} />
                    <TypeRow title="Time" hint="Number of individual time samples" value={summary?.sample_types.time} />
                    <TypeRow title="Total" hint="Total number of samples" value={summary?.sample_types.total} />
                </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Ranges</Typography>
                <Stack spacing={2.5}>
                    <RangeRow
                        icon={<TrendingDownIcon fontSize="small" />}
                        title="Pressure range"
                        hint="Acquisition depth range"
                        value={pressure ? `${pressure.min}m - ${pressure.max}m` : NONE}
                    />
                    <RangeRow
                        icon={<OpenInFullIcon fontSize="small" />}
                        title="Size range"
                        hint="Object size range"
                        value={size ? `${formatSize(size.min)} - ${formatSize(size.max)}` : NONE}
                    />
                    <RangeRow
                        icon={<ScheduleIcon fontSize="small" />}
                        title="Time range"
                        hint="From first to last sample"
                        value={time ? `${formatMonth(time.start)} - ${formatMonth(time.end)}` : NONE}
                    />
                </Stack>
            </Grid>
        </Grid>
    );
}
