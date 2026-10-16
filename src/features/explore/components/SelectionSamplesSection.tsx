import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";

import { chartColorAt } from "@/shared/utils/chartColors";
import type { ExploreSummary } from "../types/explore.types";
import SamplesSummary from "./SamplesSummary";
import ProfilesTimeline from "./ProfilesTimeline";

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

interface SelectionSamplesSectionProps {
    title: string;
    summary: ExploreSummary | null;
}

/**
 * The samples of a selection: counts per type, ranges, samples per instrument,
 * profiles by date and latitude, and the distribution of the maximum pressure.
 */
export default function SelectionSamplesSection({ title, summary }: SelectionSamplesSectionProps) {
    const instruments = summary?.instruments ?? [];
    const histogram = summary?.max_pressure_histogram ?? [];
    const profiles = summary?.profiles ?? [];

    return (
        <Box component="section" aria-label={title}>
            <Typography variant="h6" component="h3">{title} ({summary?.counts.samples ?? 0})</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Samples matching the selected filters
            </Typography>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Stack spacing={4}>
                        <SamplesSummary summary={summary} />
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
                        <ChartBlock title="Profiles by date and latitude" empty={profiles.length === 0} height={130}>
                            <ProfilesTimeline profiles={profiles} />
                        </ChartBlock>
                    </Stack>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <ChartBlock title="Maximum sample pressure" empty={histogram.length === 0} height={520}>
                        <BarChart
                            height={520}
                            layout="horizontal"
                            yAxis={[{
                                scaleType: "band",
                                data: histogram.map((bin) => bin.max_pressure),
                                label: "Maximum depth [m]",
                            }]}
                            xAxis={[{ label: "Nb of profiles" }]}
                            series={[{ data: histogram.map((bin) => bin.nb_profiles), color: chartColorAt(1) }]}
                        />
                    </ChartBlock>
                </Grid>
            </Grid>
        </Box>
    );
}
