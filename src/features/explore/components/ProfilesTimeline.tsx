import { Box, useTheme } from "@mui/material";

import type { ProfilePoint } from "../types/explore.types";
import { niceTicks } from "../utils/chartScales";

const WIDTH = 560;
const HEIGHT = 130;
const MARGIN = { top: 8, right: 12, bottom: 34, left: 78 };

/** Latitude bands, north to south. */
const BANDS = [
    { label: "(30, 90]", contains: (latitude: number) => latitude > 30 },
    { label: "(-30, 30]", contains: (latitude: number) => latitude > -30 && latitude <= 30 },
    { label: "[-90, -30]", contains: (latitude: number) => latitude <= -30 },
];

const YEAR_MS = 365.25 * 24 * 3_600_000;

/** One tick per profile, along time, in its latitude band: when and where the selection was sampled. */
export default function ProfilesTimeline({ profiles }: { profiles: ProfilePoint[] }) {
    const theme = useTheme();
    const times = profiles.map((profile) => Date.parse(profile.date)).filter(Number.isFinite);
    const start = Math.min(...times);
    const end = Math.max(...times);
    const span = end - start || YEAR_MS;
    const plotLeft = MARGIN.left;
    const plotRight = WIDTH - MARGIN.right;
    const bandHeight = (HEIGHT - MARGIN.top - MARGIN.bottom) / BANDS.length;
    const xOf = (time: number) => plotLeft + ((time - start) / span) * (plotRight - plotLeft);

    const firstYear = new Date(start).getUTCFullYear();
    const lastYear = new Date(end).getUTCFullYear();
    const years = niceTicks(firstYear, lastYear + 1, 6).filter(Number.isInteger);

    return (
        <Box
            component="svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Profiles by date and latitude"
            sx={{ width: "100%", height: "auto", display: "block", fontFamily: theme.typography.fontFamily }}
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
                        <text x={plotLeft - 6} y={top + bandHeight / 2 + 3} fontSize={10} textAnchor="end" fill={theme.palette.text.secondary}>
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
                    <text key={year} x={x} y={HEIGHT - MARGIN.bottom + 14} fontSize={10} textAnchor="middle" fill={theme.palette.text.secondary}>
                        {year}
                    </text>
                );
            })}
            <text x={(plotLeft + plotRight) / 2} y={HEIGHT - 4} fontSize={10.5} textAnchor="middle" fill={theme.palette.text.primary}>
                Date of profile
            </text>
            <text transform={`translate(12 ${(HEIGHT - MARGIN.bottom + MARGIN.top) / 2}) rotate(-90)`} fontSize={10.5} textAnchor="middle" fill={theme.palette.text.primary}>
                Latitude
            </text>
        </Box>
    );
}
