import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { BarChart } from "@mui/x-charts/BarChart";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import ScheduleIcon from "@mui/icons-material/Schedule";

import { chartColorAt } from "@/shared/utils/chartColors";
import type { ProjectStatsSamples } from "../../api/projectStats.api";
import StatWarning, { StatWarnings } from "./StatWarning";
import { formatDepth, formatSize, formatUtcMonth, pluralize } from "./statsFormat";

const NONE = "—";

function TypeRow({ title, hint, value }: { title: string; hint: string; value: number }) {
    return (
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderLeft: 2, borderColor: "divider", pl: 1.5 }}>
            <Box>
                <Typography variant="subtitle2">{title}</Typography>
                <Typography variant="caption" color="text.secondary">{hint}</Typography>
            </Box>
            <Typography variant="h6" color="text.secondary">{value}</Typography>
        </Stack>
    );
}

function RangeRow({ icon, title, hint, value }: { icon: ReactNode; title: string; hint: string; value: string }) {
    return (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ display: "flex", p: 0.75, borderRadius: 1, bgcolor: "action.hover", color: "primary.main" }}>{icon}</Box>
            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">{title}</Typography>
                <Typography variant="caption" color="text.secondary">{hint}</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
        </Stack>
    );
}

function Title({ children }: { children: ReactNode }) {
    return <Typography variant="subtitle1" component="h3" color="text.secondary" sx={{ mb: 2 }}>{children}</Typography>;
}

/**
 * The samples of the project: counts per type, the distribution of their maximum
 * pressure, and their pressure, size and time ranges with the consistency warnings.
 */
export default function ProjectSamplesSummary({ samples }: { samples: ProjectStatsSamples }) {
    const { sample_types, pressure_range, size_range, time_range, max_pressure_histogram } = samples;
    const warnings = [
        samples.nb_instrument_parameter_mismatches > 0 && (
            <StatWarning
                key="instrument"
                label="Mismatch in instrument parameters"
                hint={`${pluralize(samples.nb_instrument_parameter_mismatches, "sample")} acquired or processed with other instrument parameters (serial number, calibration, image volume, pixel size, gain, threshold, exposure) than the rest of the project.`}
            />
        ),
        samples.nb_suspicious_dates > 0 && (
            <StatWarning
                key="dates"
                label="Suspicious time range"
                hint={`${pluralize(samples.nb_suspicious_dates, "sample")} dated before 2000, in the future, or with an unreadable date.`}
            />
        ),
        samples.nb_suspicious_pressures > 0 && (
            <StatWarning
                key="pressures"
                label="Suspicious pressure range"
                hint={`${pluralize(samples.nb_suspicious_pressures, "sample")} without a positive maximum pressure, or deeper than 6500 dbar.`}
            />
        ),
    ].filter(Boolean);

    return (
        <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
                <Title>Samples type</Title>
                <Stack spacing={2.5}>
                    <TypeRow title="Depth" hint="Number of individual depth samples" value={sample_types.depth} />
                    <TypeRow title="Time" hint="Number of individual time samples" value={sample_types.time} />
                    <TypeRow title="Total" hint="Total number of samples" value={sample_types.total} />
                </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Title>Maximum sample pressure</Title>
                {max_pressure_histogram.length === 0 ? (
                    <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 1, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="caption" color="text.secondary">No data</Typography>
                    </Box>
                ) : (
                    <BarChart
                        height={220}
                        aria-label="Maximum sample pressure"
                        xAxis={[{ scaleType: "band", data: max_pressure_histogram.map((bin) => bin.max_pressure), label: "Pressure slice [db]", tickLabelStyle: { fontSize: 10 } }]}
                        yAxis={[{ label: "Nb of samples" }]}
                        series={[{ data: max_pressure_histogram.map((bin) => bin.nb_profiles), color: chartColorAt(1) }]}
                        grid={{ horizontal: true }}
                    />
                )}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
                    <Typography variant="subtitle1" component="h3" color="text.secondary">Ranges</Typography>
                    {warnings.length > 0 && <StatWarnings>{warnings}</StatWarnings>}
                </Stack>
                <Stack spacing={2.5}>
                    <RangeRow
                        icon={<TrendingDownIcon fontSize="small" />}
                        title="Pressure range"
                        hint="Acquisition depth range"
                        value={pressure_range ? `${formatDepth(pressure_range.min)} - ${formatDepth(pressure_range.max)}` : NONE}
                    />
                    <RangeRow
                        icon={<OpenInFullIcon fontSize="small" />}
                        title="Size range"
                        hint="Object size range"
                        value={size_range ? `${formatSize(size_range.min)} - ${formatSize(size_range.max)}` : NONE}
                    />
                    <RangeRow
                        icon={<ScheduleIcon fontSize="small" />}
                        title="Time range"
                        hint="From first to last sample"
                        value={time_range ? `${formatUtcMonth(time_range.start)} - ${formatUtcMonth(time_range.end)}` : NONE}
                    />
                </Stack>
            </Grid>
        </Grid>
    );
}
