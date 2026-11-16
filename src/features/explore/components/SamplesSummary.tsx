import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
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
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", borderLeft: 2, borderColor: "divider", pl: 1.5 }}>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>{title}</Typography>
                <Typography variant="caption" color="text.secondary" component="div">{hint}</Typography>
            </Box>
            <Typography variant="h6" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>{value ?? NONE}</Typography>
        </Stack>
    );
}

function RangeRow({ icon, title, hint, value }: { icon: ReactNode; title: string; hint: string; value: string }) {
    return (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ display: "flex", p: 0.75, borderRadius: 1, bgcolor: "action.hover", color: "primary.main" }}>{icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>{title}</Typography>
                <Typography variant="caption" color="text.secondary" component="div">{hint}</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: "nowrap" }}>{value}</Typography>
        </Stack>
    );
}

/**
 * Sample counts per type and the ranges (pressure, object size, time) of the selection,
 * as two columns whose rows face each other. On a phone the columns follow each other.
 */
export default function SamplesSummary({ summary }: { summary: ExploreSummary | null }) {
    const pressure = summary?.pressure_range;
    const size = summary?.size_range;
    const time = summary?.time_range;

    const types = [
        <TypeRow key="depth" title="Depth" hint="Number of individual depth samples" value={summary?.sample_types.depth} />,
        <TypeRow key="time" title="Time" hint="Number of individual time samples" value={summary?.sample_types.time} />,
        <TypeRow key="total" title="Total" hint="Total number of samples" value={summary?.sample_types.total} />,
    ];
    const ranges = [
        <RangeRow
            key="pressure"
            icon={<TrendingDownIcon fontSize="small" />}
            title="Pressure range"
            hint="Acquisition depth range"
            value={pressure ? `${pressure.min}m - ${pressure.max}m` : NONE}
        />,
        <RangeRow
            key="size"
            icon={<OpenInFullIcon fontSize="small" />}
            title="Size range"
            hint="Object size range"
            value={size ? `${formatSize(size.min)} - ${formatSize(size.max)}` : NONE}
        />,
        <RangeRow
            key="time"
            icon={<ScheduleIcon fontSize="small" />}
            title="Time range"
            hint="From first to last sample"
            value={time ? `${formatMonth(time.start)} - ${formatMonth(time.end)}` : NONE}
        />,
    ];

    // Laid out row by row on two columns (a type facing a range); `order` stacks the
    // two columns one after the other on a phone.
    const cell = (child: ReactNode, column: 0 | 1, row: number) => (
        <Box key={`${column}-${row}`} sx={{ order: { xs: column * 10 + row, sm: 0 }, minWidth: 0 }}>{child}</Box>
    );

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                columnGap: 5,
                rowGap: 2.5,
                alignItems: "center",
            }}
        >
            {cell(<Typography variant="subtitle1">Samples type</Typography>, 0, 0)}
            {cell(<Typography variant="subtitle1">Ranges</Typography>, 1, 0)}
            {types.map((type, index) => [cell(type, 0, index + 1), cell(ranges[index], 1, index + 1)])}
        </Box>
    );
}
