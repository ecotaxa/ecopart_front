import { Box, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";

import { chartColorAt } from "../utils/chartColors";

export interface EvolutionSeries {
    label: string;
    /** One value per x-axis interval; use `null` for gaps to skip the point. */
    data: Array<number | null>;
    /** Optional explicit colour; defaults to the palette position by index. */
    color?: string;
}

interface EvolutionChartProps {
    title: string;
    /** X-axis category labels (one per interval), e.g. series[].interval. */
    xLabels: string[];
    series: EvolutionSeries[];
    variant?: "line" | "bar";
    /** Render line series as filled areas (used for the storage curve). */
    area?: boolean;
    height?: number;
    /** Formats axis ticks + tooltip values (e.g. formatBytes for storage). */
    valueFormatter?: (value: number | null) => string;
}

/**
 * Time-series chart for the admin dashboard: a band X axis of interval labels
 * and one or more numeric series, rendered as a line or a grouped bar chart.
 * Mirrors QcProfileChart's wrapper conventions (caption title, `height` prop,
 * "No data" placeholder, margins/grid, brand colours).
 */
export default function EvolutionChart({
    title,
    xLabels,
    series,
    variant = "line",
    area = false,
    height = 260,
    valueFormatter,
}: EvolutionChartProps) {
    const hasData = xLabels.length > 0 && series.some((s) => s.data.some((v) => v != null));

    // Only attach a valueFormatter / custom yAxis when one is actually provided:
    // never pass `valueFormatter: undefined`, which some chart code paths spread
    // over the built-in default.
    const fmt = valueFormatter ? { valueFormatter: (v: number | null) => valueFormatter(v) } : {};
    const yAxis = valueFormatter ? [{ valueFormatter: (v: number | null) => valueFormatter(v) }] : undefined;

    // Angle the interval labels so MUI's overlap-avoidance keeps them: upright
    // "band" labels (e.g. "2026-01") are wider than their slot and get dropped,
    // whereas angled labels need almost no horizontal room. `height` reserves
    // space for the taller angled text so it isn't clipped.
    const xAxis = [
        {
            scaleType: "band" as const,
            data: xLabels,
            tickLabelStyle: { angle: 45, textAnchor: "start" as const, fontSize: 11 },
            height: 64,
        },
    ];

    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, minHeight: 20 }}>
                {title}
            </Typography>
            {!hasData ? (
                <Box
                    sx={{
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 1,
                        height,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        No data
                    </Typography>
                </Box>
            ) : variant === "bar" ? (
                <BarChart
                    height={height}
                    aria-label={title}
                    xAxis={xAxis}
                    yAxis={yAxis}
                    series={series.map((s, i) => ({
                        label: s.label,
                        data: s.data.map((v) => (v == null ? 0 : v)),
                        color: s.color ?? chartColorAt(i),
                        ...fmt,
                    }))}
                    grid={{ horizontal: true }}
                />
            ) : (
                <LineChart
                    height={height}
                    aria-label={title}
                    xAxis={xAxis}
                    yAxis={yAxis}
                    series={series.map((s, i) => ({
                        label: s.label,
                        data: s.data,
                        color: s.color ?? chartColorAt(i),
                        area,
                        showMark: false,
                        connectNulls: true,
                        ...fmt,
                    }))}
                    grid={{ horizontal: true }}
                />
            )}
        </Box>
    );
}
