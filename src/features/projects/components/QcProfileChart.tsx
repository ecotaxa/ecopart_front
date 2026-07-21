import React from "react";
import { Box, Typography } from "@mui/material";
import { ScatterChart } from "@mui/x-charts/ScatterChart";

import { QcAxisScale } from "../api/projects.api";

/**
 * A single plotted series. `y` is always DEPTH in metres (the shared vertical axis of every QC
 * profile); `x` is the value being profiled — image index for the pressure graph, imaged volume or
 * particle counts for the binned graphs.
 */
export interface QcChartSeries {
    label: string;
    color: string;
    points: { x: number; y: number }[];
}

interface QcProfileChartProps {
    title: string;
    series: QcChartSeries[];
    xLabel: string;
    yLabel?: string;
    /** X-axis rendering; depth (Y) is always linear and reversed (shallow on top). */
    xScale?: QcAxisScale;
    height?: number;
    showLegend?: boolean;
}

/**
 * Vertical oceanographic profile rendered with MUI X ScatterChart: depth on a reversed Y axis
 * (shallow at the top, like a real water column) and the measured value on X. Scatter (rather than
 * a line) is used because MUI X line charts can't run vertically and the profiles are non-monotonic
 * in depth; with hundreds of closely spaced points the markers read as a continuous curve.
 */
export const QcProfileChart: React.FC<QcProfileChartProps> = ({
    title, series, xLabel, yLabel = "depth (m)", xScale = "linear", height = 220, showLegend = false,
}) => {
    // Log X can't plot 0/negative counts; only switch to log when there is something positive to show,
    // and drop the non-positive points so the scale stays valid.
    const anyPositive = series.some((s) => s.points.some((p) => p.x > 0));
    const scaleType: QcAxisScale = xScale === "log" && anyPositive ? "log" : "linear";
    const clampNonPositive = scaleType === "log";

    // Drop series that end up empty (e.g. an all-zero pixel class under a log scale): MUI X Charts
    // builds a spatial index per series and throws on a series with zero points.
    const scatterSeries = series
        .map((s, si) => ({
            id: `s${si}`,
            label: s.label,
            color: s.color,
            markerSize: 2,
            data: (clampNonPositive ? s.points.filter((p) => p.x > 0) : s.points)
                .map((p, pi) => ({ x: p.x, y: p.y, id: pi })),
        }))
        .filter((s) => s.data.length > 0);

    const hasData = scatterSeries.length > 0;

    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, minHeight: 32 }}>
                {title}
            </Typography>
            {!hasData ? (
                <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 1, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography variant="caption" color="text.secondary">No data</Typography>
                </Box>
            ) : (
                <ScatterChart
                    height={height}
                    series={scatterSeries}
                    // `height`/`width` reserve room for the axis TITLE *plus* a line
                    // of tick labels. Without an explicit size MUI can auto-size the
                    // axis too small, and since these axes carry a title it then has
                    // no room left for the tick labels and blanks them entirely
                    // (empty text under every tick). These sizes keep both visible.
                    xAxis={[{ label: xLabel, scaleType, height: 56 }]}
                    yAxis={[{ label: yLabel, reverse: true, width: 64 }]}
                    hideLegend={!showLegend}
                    disableVoronoi
                    grid={{ horizontal: true, vertical: true }}
                    margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
                />
            )}
        </Box>
    );
};
