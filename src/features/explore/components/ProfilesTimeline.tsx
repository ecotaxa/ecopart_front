import { Box, useTheme } from "@mui/material";

import { useElementSize } from "@/shared/hooks/useElementSize";
import type { ProfilePoint } from "../types/explore.types";
import { niceTicks } from "../utils/chartScales";

/** Width used until the container is measured. */
const DEFAULT_WIDTH = 560;
const HEIGHT = 150;
const MARGIN = { top: 8, right: 16, bottom: 38, left: 84 };
/** Room left for each year label along the time axis. */
const YEAR_LABEL_PX = 90;

/** Latitude bands, north to south. */
const BANDS = [
    { label: "(30, 90]", contains: (latitude: number) => latitude > 30 },
    { label: "(-30, 30]", contains: (latitude: number) => latitude > -30 && latitude <= 30 },
    { label: "[-90, -30]", contains: (latitude: number) => latitude <= -30 },
];

const YEAR_MS = 365.25 * 24 * 3_600_000;

/**
 * One tick per profile, along time, in its latitude band: when and where the selection was sampled.
 * Drawn at the width of its container rather than scaled, so that a wide row spreads the dates
 * without enlarging the text.
 */
export default function ProfilesTimeline({ profiles }: { profiles: ProfilePoint[] }) {
    const theme = useTheme();
    const [containerRef, size] = useElementSize<HTMLDivElement>();
    const width = size.width > 0 ? size.width : DEFAULT_WIDTH;
    const times = profiles.map((profile) => Date.parse(profile.date)).filter(Number.isFinite);
    const start = Math.min(...times);
    const end = Math.max(...times);
    const span = end - start || YEAR_MS;
    const plotLeft = MARGIN.left;
    const plotRight = width - MARGIN.right;
    const bandHeight = (HEIGHT - MARGIN.top - MARGIN.bottom) / BANDS.length;
    const xOf = (time: number) => plotLeft + ((time - start) / span) * (plotRight - plotLeft);

    const firstYear = new Date(start).getUTCFullYear();
    const lastYear = new Date(end).getUTCFullYear();
    const maxYearLabels = Math.max(2, Math.floor((plotRight - plotLeft) / YEAR_LABEL_PX));
    const years = niceTicks(firstYear, lastYear + 1, maxYearLabels).filter(Number.isInteger);

    return (
        <Box ref={containerRef}>
            <Box
                component="svg"
                viewBox={`0 0 ${width} ${HEIGHT}`}
                role="img"
                aria-label="Profiles by date and latitude"
                sx={{ width: "100%", height: HEIGHT, display: "block", fontFamily: theme.typography.fontFamily }}
            >
                {BANDS.map((band, index) => {
                    const top = MARGIN.top + index * bandHeight;
                    const bandTimes = profiles
                        .filter((profile) => band.contains(profile.latitude))
                        .map((profile) => Date.parse(profile.date))
                        .filter(Number.isFinite);
                    return (
                        <g key={band.label}>
                            <rect x={plotLeft} y={top + 2} width={plotRight - plotLeft} height={bandHeight - 4} fill={theme.palette.action.hover} />
                            <text x={plotLeft - 6} y={top + bandHeight / 2 + 4} fontSize={12} textAnchor="end" fill={theme.palette.text.secondary}>
                                {band.label}
                            </text>
                            {bandTimes.map((time, i) => (
                                <line
                                    key={`${time}-${i}`}
                                    x1={xOf(time)}
                                    x2={xOf(time)}
                                    y1={top + 4}
                                    y2={top + bandHeight - 4}
                                    stroke={theme.palette.text.primary}
                                    strokeWidth={1.5}
                                />
                            ))}
                        </g>
                    );
                })}
                {years.map((year) => {
                    const x = xOf(Date.UTC(year, 0, 1));
                    return x >= plotLeft && x <= plotRight && (
                        <text key={year} x={x} y={HEIGHT - MARGIN.bottom + 16} fontSize={12} textAnchor="middle" fill={theme.palette.text.secondary}>
                            {year}
                        </text>
                    );
                })}
                <text x={(plotLeft + plotRight) / 2} y={HEIGHT - 4} fontSize={12.5} textAnchor="middle" fill={theme.palette.text.primary}>
                    Date of profile
                </text>
                <text transform={`translate(14 ${(HEIGHT - MARGIN.bottom + MARGIN.top) / 2}) rotate(-90)`} fontSize={12.5} textAnchor="middle" fill={theme.palette.text.primary}>
                    Latitude
                </text>
            </Box>
        </Box>
    );
}
