import type { ReactNode } from "react";
import { Box, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";

import { chartColorAt } from "@/shared/utils/chartColors";
import type { ExploreSummary, PressureHistogramBin } from "../types/explore.types";
import SamplesSummary from "./SamplesSummary";
import ProfilesTimeline from "./ProfilesTimeline";

/** Height of a bar of the maximum pressure chart, and the bounds of its height. */
const PRESSURE_BAR_PX = 16;
const PRESSURE_CHART_HEIGHT = { min: 220, max: 520 };

function ChartBlock({ title, empty, height, children }: { title: string; empty: boolean; height: number; children: ReactNode }) {
    return (
        <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{title}</Typography>
            {empty ? (
                <Box
                    sx={{
                        border: "1px dashed", borderColor: "divider", borderRadius: 1, height,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <Typography variant="caption" color="text.secondary">No data</Typography>
                </Box>
            ) : children}
        </Box>
    );
}

/**
 * The bars of the maximum pressure chart, as a table: the depth slice of each bar (bins
 * are contiguous from 0, `max_pressure` being the upper edge) and its share of the profiles.
 * Empty slices are left out.
 */
function PressureHistogramTable({ histogram, height }: { histogram: PressureHistogramBin[]; height: number }) {
    const total = histogram.reduce((sum, bin) => sum + bin.nb_profiles, 0);
    const rows = histogram
        .map((bin, index) => ({ ...bin, from: index === 0 ? 0 : histogram[index - 1].max_pressure }))
        .filter((bin) => bin.nb_profiles > 0);
    return (
        <TableContainer sx={{ maxHeight: height, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Table size="small" stickyHeader aria-label="Profiles per maximum depth">
                <TableHead>
                    <TableRow>
                        <TableCell>Maximum depth [m]</TableCell>
                        <TableCell align="right">Profiles</TableCell>
                        <TableCell align="right">Share</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((bin) => (
                        <TableRow key={bin.max_pressure}>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{bin.from} - {bin.max_pressure}</TableCell>
                            <TableCell align="right">{bin.nb_profiles}</TableCell>
                            <TableCell align="right">{total > 0 ? `${Math.round((bin.nb_profiles / total) * 1000) / 10}%` : "—"}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow>
                        <TableCell sx={{ fontWeight: 500 }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{total}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>100%</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
}

interface SelectionSamplesSectionProps {
    title: string;
    summary: ExploreSummary | null;
}

/**
 * The samples of a selection: counts per type facing the ranges, samples per instrument,
 * profiles by date and latitude, and the distribution of the maximum pressure (a chart
 * and the table of its bars).
 */
export default function SelectionSamplesSection({ title, summary }: SelectionSamplesSectionProps) {
    const instruments = summary?.instruments ?? [];
    const histogram = summary?.max_pressure_histogram ?? [];
    const profiles = summary?.profiles ?? [];
    const pressureHeight = Math.min(
        Math.max(histogram.length * PRESSURE_BAR_PX + 80, PRESSURE_CHART_HEIGHT.min),
        PRESSURE_CHART_HEIGHT.max,
    );
    // The bins are contiguous from 0: the first one gives the width of every slice.
    const slice = histogram[0]?.max_pressure;

    return (
        <Box component="section" aria-label={title}>
            <Typography variant="h6" component="h3">{title} ({summary?.counts.samples ?? 0})</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Samples matching the selected filters
            </Typography>

            <Stack spacing={4}>
                <SamplesSummary summary={summary} />

                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <ChartBlock title="Sample count per instrument" empty={instruments.length === 0} height={220}>
                            <PieChart
                                height={220}
                                series={[{
                                    data: instruments.map((instrument, index) => ({
                                        id: instrument.label,
                                        label: instrument.label,
                                        value: instrument.count,
                                        color: chartColorAt(index),
                                    })),
                                    innerRadius: 45,
                                    paddingAngle: 1,
                                    cornerRadius: 3,
                                    arcLabel: "value",
                                }]}
                            />
                        </ChartBlock>
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <ChartBlock title="Profiles by date and latitude" empty={profiles.length === 0} height={130}>
                            <ProfilesTimeline profiles={profiles} />
                        </ChartBlock>
                    </Grid>
                </Grid>

                <Box>
                    <ChartBlock title="Maximum sample pressure" empty={histogram.length === 0} height={PRESSURE_CHART_HEIGHT.min}>
                        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                            Each bar counts the profiles whose deepest point falls in a {slice} m slice: the bar
                            &quot;{slice}&quot; holds the profiles that stop before {slice} m, the next one those
                            that stop between {slice} and {(slice ?? 0) * 2} m, and so on.
                        </Typography>
                        <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
                            <Grid size={{ xs: 12, md: 7 }}>
                                <BarChart
                                    height={pressureHeight}
                                    layout="horizontal"
                                    yAxis={[{
                                        scaleType: "band",
                                        data: histogram.map((bin) => bin.max_pressure),
                                        label: "Maximum depth [m]",
                                    }]}
                                    xAxis={[{ label: "Nb of profiles" }]}
                                    series={[{ data: histogram.map((bin) => bin.nb_profiles), color: chartColorAt(1), label: "Profiles" }]}
                                    hideLegend
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 5 }}>
                                <PressureHistogramTable histogram={histogram} height={pressureHeight} />
                            </Grid>
                        </Grid>
                    </ChartBlock>
                </Box>
            </Stack>
        </Box>
    );
}
