import { memo, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Box, IconButton, Paper, Typography, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import type { ValueScale } from "../types/explore.types";
import { createScale, extent, formatTick } from "../utils/chartScales";
import { decimate } from "../utils/decimate";

const WIDTH = 420;
const HEIGHT = 300;
const MARGIN = { top: 12, right: 14, bottom: 44, left: 56 };
/** Width (viewBox units) of the invisible band around a curve that catches the pointer. */
const HIT_WIDTH = 7;

export interface ChartSeries {
    id: string;
    label: string;
    /** Extra lines of the curve's popup (its project…). */
    details?: string[];
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
    /** Axis of the measured values (the other one being the depth or the time): a long curve keeps its extremes on it. */
    valueAxis?: "x" | "y";
    /** Accessible name of the chart. */
    title: string;
}

/** The popup of a curve, at the pointer (px from the top left corner of the chart). */
interface CurvePopup {
    id: string;
    left: number;
    top: number;
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
 * because a selection can hold thousands of points per curve (a curve longer than
 * the chart can show is thinned out, its extremes kept).
 *
 * Hovering a curve brings it forward and names its sample, as the map popups do;
 * a click keeps that popup open until it is closed or another place is clicked.
 */
function ProfileChart({ series, x, y, step, valueAxis = "y", title }: ProfileChartProps) {
    const theme = useTheme();
    const axisColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;
    const boxRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState<CurvePopup | null>(null);
    const [pinned, setPinned] = useState<CurvePopup | null>(null);

    const { xScale, yScale, paths } = useMemo(() => {
        const xs: number[] = [];
        const ys: number[] = [];
        for (const s of series) {
            for (const [px, py] of s.points) {
                xs.push(px);
                ys.push(py);
            }
        }
        const xRange: [number, number] = x.reversed ? [WIDTH - MARGIN.right, MARGIN.left] : [MARGIN.left, WIDTH - MARGIN.right];
        const yRange: [number, number] = y.reversed ? [MARGIN.top, HEIGHT - MARGIN.bottom] : [HEIGHT - MARGIN.bottom, MARGIN.top];
        const xScale = createScale(x.scale, domainOf(xs, x), xRange);
        const yScale = createScale(y.scale, domainOf(ys, y), yRange);

        const valueIndex = valueAxis === "x" ? 0 : 1;
        const paths = series.map((s) => {
            let d = "";
            let drawing = false;
            for (const [px, py] of decimate(s.points, valueIndex)) {
                const sx = xScale.map(px);
                const sy = yScale.map(py);
                // A value the scale cannot draw (≤ 0 in log10) breaks the curve.
                if (!Number.isFinite(sx) || !Number.isFinite(sy)) {
                    drawing = false;
                    continue;
                }
                if (!drawing) d += `M${sx.toFixed(1)},${sy.toFixed(1)}`;
                else if (step === "vertical") d += `V${sy.toFixed(1)}H${sx.toFixed(1)}`;
                else if (step === "horizontal") d += `H${sx.toFixed(1)}V${sy.toFixed(1)}`;
                else d += `L${sx.toFixed(1)},${sy.toFixed(1)}`;
                drawing = true;
            }
            return { id: s.id, color: s.color, d };
        });
        return { xScale, yScale, paths };
    }, [series, x, y, step, valueAxis]);

    const popup = pinned ?? hovered;
    const popupSeries = popup ? series.find((s) => s.id === popup.id) : undefined;
    const activePath = popupSeries ? paths.find((path) => path.id === popupSeries.id) : undefined;

    const popupAt = (event: PointerEvent | MouseEvent, id: string): CurvePopup => {
        const rect = boxRef.current?.getBoundingClientRect();
        return { id, left: event.clientX - (rect?.left ?? 0), top: event.clientY - (rect?.top ?? 0) };
    };

    const formatX = x.format ?? formatTick;
    const formatY = y.format ?? formatTick;
    const plotLeft = MARGIN.left;
    const plotRight = WIDTH - MARGIN.right;
    const plotTop = MARGIN.top;
    const plotBottom = HEIGHT - MARGIN.bottom;

    return (
        <Box ref={boxRef} sx={{ position: "relative" }}>
            <Box
                component="svg"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label={title}
                onClick={() => setPinned(null)}
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

                {/* Curves: the one with a popup on top, the others faded */}
                <g strokeOpacity={activePath ? 0.3 : 0.85}>
                    {paths.map((path) => (
                        <path key={path.id} d={path.d} fill="none" stroke={path.color} strokeWidth={1.1} strokeLinejoin="round" />
                    ))}
                </g>
                {activePath && (
                    <path d={activePath.d} fill="none" stroke={activePath.color} strokeWidth={2.4} strokeLinejoin="round" pointerEvents="none" />
                )}
                {/* Invisible wider copies of the curves, which catch the pointer */}
                <g fill="none" stroke="transparent" strokeWidth={HIT_WIDTH} pointerEvents="stroke" style={{ cursor: "pointer" }}>
                    {paths.map((path) => (
                        <path
                            key={path.id}
                            d={path.d}
                            data-testid="curve"
                            onPointerEnter={(event) => setHovered(popupAt(event, path.id))}
                            onPointerMove={(event) => setHovered(popupAt(event, path.id))}
                            onPointerLeave={() => setHovered(null)}
                            onClick={(event) => {
                                event.stopPropagation();
                                setPinned(popupAt(event, path.id));
                            }}
                        />
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

            {popup && popupSeries && (
                <Paper
                    elevation={4}
                    role={pinned ? "dialog" : "tooltip"}
                    aria-label={popupSeries.label}
                    sx={{
                        position: "absolute",
                        left: popup.left,
                        top: popup.top - 10,
                        transform: "translate(-50%, -100%)",
                        px: 1.5,
                        py: 1,
                        pr: pinned ? 4 : 1.5,
                        borderRadius: 1.5,
                        maxWidth: 280,
                        zIndex: 1,
                        // A hover popup never steals the pointer from the curves under it.
                        pointerEvents: pinned ? "auto" : "none",
                    }}
                >
                    {pinned && (
                        <IconButton
                            size="small"
                            aria-label="Close"
                            onClick={() => setPinned(null)}
                            sx={{ position: "absolute", top: 2, right: 2 }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    )}
                    <Typography variant="subtitle2">{popupSeries.label}</Typography>
                    {(popupSeries.details ?? []).map((line) => (
                        <Typography key={line} variant="caption" color="text.secondary" component="div">{line}</Typography>
                    ))}
                </Paper>
            )}
        </Box>
    );
}

export default memo(ProfileChart);
