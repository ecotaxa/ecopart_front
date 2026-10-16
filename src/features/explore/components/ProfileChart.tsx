import { useMemo } from "react";
import { Box, useTheme } from "@mui/material";

import type { ValueScale } from "../types/explore.types";
import { createScale, extent, formatTick } from "../utils/chartScales";

const WIDTH = 420;
const HEIGHT = 300;
const MARGIN = { top: 12, right: 14, bottom: 44, left: 56 };

export interface ChartSeries {
    id: string;
    label: string;
    color: string;
    /** [x, y] in data units. */
    points: [number, number][];
}

export interface ChartAxis {
    label: string;
    scale: ValueScale;
    /** Grows downwards (y) or leftwards (x), e.g. a depth axis. */
    reversed?: boolean;
    /** Starts at 0 whatever the data (abundances, depths). */
    fromZero?: boolean;
    format?: (value: number) => string;
}

interface ProfileChartProps {
    series: ChartSeries[];
    x: ChartAxis;
    y: ChartAxis;
    /**
     * Draw each curve as steps (binned values): "vertical" holds the x value down
     * to the next point (depth bins), "horizontal" holds the y value up to it (time bins).
     */
    step?: "vertical" | "horizontal";
    /** Accessible name of the chart. */
    title: string;
}

function domainOf(values: number[], axis: ChartAxis): [number, number] {
    const range = extent(values, axis.scale) ?? [0, 1];
    const min = axis.fromZero && axis.scale !== "log10" ? Math.min(0, range[0]) : range[0];
    return [min, range[1] === min ? min + 1 : range[1]];
}

/**
 * Light SVG line chart for sample profiles: one curve per sample, each axis on
 * its own scale (linear, sqrt, log(x+1), log10). Hand-rolled because profiles run
 * along the vertical axis (depth), which line charts drawn along x cannot do, and
 * because a selection can hold thousands of points per curve.
 */
export default function ProfileChart({ series, x, y, step, title }: ProfileChartProps) {
    const theme = useTheme();
    const axisColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;

    const { xScale, yScale, paths } = useMemo(() => {
        const xs = series.flatMap((s) => s.points.map(([px]) => px));
        const ys = series.flatMap((s) => s.points.map(([, py]) => py));
        const xRange: [number, number] = x.reversed ? [WIDTH - MARGIN.right, MARGIN.left] : [MARGIN.left, WIDTH - MARGIN.right];
        const yRange: [number, number] = y.reversed ? [MARGIN.top, HEIGHT - MARGIN.bottom] : [HEIGHT - MARGIN.bottom, MARGIN.top];
        const xScale = createScale(x.scale, domainOf(xs, x), xRange);
        const yScale = createScale(y.scale, domainOf(ys, y), yRange);

        const paths = series.map((s) => {
            let d = "";
            let previous: [number, number] | null = null;
            for (const [px, py] of s.points) {
                const sx = xScale.map(px);
                const sy = yScale.map(py);
                // A value the scale cannot draw (≤ 0 in log10) breaks the curve.
                if (!Number.isFinite(sx) || !Number.isFinite(sy)) {
                    previous = null;
                    continue;
                }
                if (!previous) d += `M${sx.toFixed(1)},${sy.toFixed(1)}`;
                else if (step === "vertical") d += `V${sy.toFixed(1)}H${sx.toFixed(1)}`;
                else if (step === "horizontal") d += `H${sx.toFixed(1)}V${sy.toFixed(1)}`;
                else d += `L${sx.toFixed(1)},${sy.toFixed(1)}`;
                previous = [sx, sy];
            }
            return { id: s.id, label: s.label, color: s.color, d };
        });
        return { xScale, yScale, paths };
    }, [series, x, y, step]);

    const formatX = x.format ?? formatTick;
    const formatY = y.format ?? formatTick;
    const plotLeft = MARGIN.left;
    const plotRight = WIDTH - MARGIN.right;
    const plotTop = MARGIN.top;
    const plotBottom = HEIGHT - MARGIN.bottom;

    return (
        <Box
            component="svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={title}
            sx={{ width: "100%", height: "auto", display: "block", fontFamily: theme.typography.fontFamily }}
        >
            {/* Grid + ticks */}
            {xScale.ticks.map((tick) => {
                const sx = xScale.map(tick);
                return Number.isFinite(sx) && (
                    <g key={`x${tick}`}>
                        <line x1={sx} x2={sx} y1={plotTop} y2={plotBottom} stroke={gridColor} />
                        <text x={sx} y={plotBottom + 14} fontSize={10} fill={axisColor} textAnchor="middle">{formatX(tick)}</text>
                    </g>
                );
            })}
            {yScale.ticks.map((tick) => {
                const sy = yScale.map(tick);
                return Number.isFinite(sy) && (
                    <g key={`y${tick}`}>
                        <line x1={plotLeft} x2={plotRight} y1={sy} y2={sy} stroke={gridColor} />
                        <text x={plotLeft - 6} y={sy + 3} fontSize={10} fill={axisColor} textAnchor="end">{formatY(tick)}</text>
                    </g>
                );
            })}
            <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="none" stroke={axisColor} strokeOpacity={0.6} />

            {/* Curves */}
            <g>
                {paths.map((path) => (
                    <path key={path.id} d={path.d} fill="none" stroke={path.color} strokeWidth={1.1} strokeOpacity={0.85} strokeLinejoin="round">
                        <title>{path.label}</title>
                    </path>
                ))}
            </g>

            {/* Axis titles */}
            <text x={(plotLeft + plotRight) / 2} y={HEIGHT - 8} fontSize={10.5} fill={theme.palette.text.primary} textAnchor="middle">
                {x.label}
            </text>
            <text
                transform={`translate(13 ${(plotTop + plotBottom) / 2}) rotate(-90)`}
                fontSize={10.5}
                fill={theme.palette.text.primary}
                textAnchor="middle"
            >
                {y.label}
            </text>
        </Box>
    );
}
