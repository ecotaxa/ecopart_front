import type { ReactNode } from "react";
import { Box, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";

import { chartColorAt } from "@/shared/utils/chartColors";
import type { ExploreSummary, PressureClass } from "../types/explore.types";
import { bandLabelStep } from "../utils/chartScales";
import SamplesSummary from "./SamplesSummary";
import ProfilesTimeline from "./ProfilesTimeline";

/** Height of a bar of the maximum pressure chart, and the bounds of its height. */
const PRESSURE_BAR_PX = 16;
const PRESSURE_CHART_HEIGHT = { min: 220, max: 520 };
/** Height of the maximum pressure chart outside its bars (margins, value axis). */
const PRESSURE_CHART_OVERHEAD_PX = 80;
/** Room kept for each depth label: past about 27 bars the chart stops growing and only some bars are labelled. */
const PRESSURE_LABEL_PX = 16;
/** Height of the instrument pie, and of the empty placeholders of the row it shares with the table of maximum depths. */
const SIDE_BY_SIDE_HEIGHT = 266;

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
 * The profiles per class of maximum depth: a few fixed classes, finer near the surface, every one
 * shown even when empty so that the table keeps its size.
 */
function PressureClassesTable({ classes }: { classes: PressureClass[] }) {
    const total = classes.reduce((sum, row) => sum + row.nb_profiles, 0);
    return (
        // No fixed height: every class shows at once, without a scroll bar.
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "visible" }}>
            <Table size="small" aria-label="Profiles per maximum depth">
                <TableHead>
                    <TableRow>
                        <TableCell>Maximum depth [m]</TableCell>
                        <TableCell align="right">Profiles</TableCell>
                        <TableCell align="right">Distribution</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {classes.map((row) => (
                        <TableRow key={row.min_pressure}>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                                {row.max_pressure === null ? `≥ ${row.min_pressure}` : `${row.min_pressure} - ${row.max_pressure}`}
                            </TableCell>
                            <TableCell align="right">{row.nb_profiles}</TableCell>
                            <TableCell align="right">{total > 0 ? `${Math.round((row.nb_profiles / total) * 1000) / 10}%` : "—"}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow>
                        <TableCell sx={{ fontWeight: 500, borderBottom: 0 }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500, borderBottom: 0 }}>{total}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500, borderBottom: 0 }}>100%</TableCell>
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
 * The samples of a selection: counts per type facing the ranges, samples per instrument next to
 * the profiles per class of maximum depth, the distribution of the maximum pressure in 100 dbar
 * slices, then profiles by date and latitude over the whole width (dates squeezed in half a row
 * could not be told apart).
 */
export default function SelectionSamplesSection({ title, summary }: SelectionSamplesSectionProps) {
    const instruments = summary?.instruments ?? [];
    const histogram = summary?.max_pressure_histogram ?? [];
    const pressureClasses = summary?.max_pressure_classes ?? [];
    const profiles = summary?.profiles ?? [];
    const pressureHeight = Math.min(
        Math.max(histogram.length * PRESSURE_BAR_PX + PRESSURE_CHART_OVERHEAD_PX, PRESSURE_CHART_HEIGHT.min),
        PRESSURE_CHART_HEIGHT.max,
    );
    // Deep selections have more bars than the capped height can label: one label every few bars.
    const labelStep = bandLabelStep(histogram.length, pressureHeight - PRESSURE_CHART_OVERHEAD_PX, PRESSURE_LABEL_PX);
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
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ChartBlock title="Sample count per instrument" empty={instruments.length === 0} height={SIDE_BY_SIDE_HEIGHT}>
                            <PieChart
                                height={SIDE_BY_SIDE_HEIGHT}
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
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ChartBlock title="Profiles per maximum depth" empty={pressureClasses.length === 0} height={SIDE_BY_SIDE_HEIGHT}>
                            <PressureClassesTable classes={pressureClasses} />
                        </ChartBlock>
                    </Grid>
                </Grid>

                <ChartBlock title="Maximum sample pressure" empty={histogram.length === 0} height={PRESSURE_CHART_HEIGHT.min}>
                    <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                        Each bar counts the profiles whose deepest point falls in a {slice} m slice: the bar
                        &quot;{slice}&quot; holds the profiles that stop before {slice} m, the next one those
                        that stop between {slice} and {(slice ?? 0) * 2} m, and so on.
                    </Typography>
                    <BarChart
                        height={pressureHeight}
                        layout="horizontal"
                        yAxis={[{
                            scaleType: "band",
                            data: histogram.map((bin) => bin.max_pressure),
                            label: "Maximum depth [m]",
                            tickInterval: (_value: number, index: number) => (index + 1) % labelStep === 0,
                        }]}
                        xAxis={[{ label: "Nb of profiles" }]}
                        series={[{ data: histogram.map((bin) => bin.nb_profiles), color: chartColorAt(1), label: "Profiles" }]}
                        hideLegend
                    />
                </ChartBlock>

                <ChartBlock title="Profiles by date and latitude" empty={profiles.length === 0} height={150}>
                    <ProfilesTimeline profiles={profiles} />
                </ChartBlock>
            </Stack>
        </Box>
    );
}
