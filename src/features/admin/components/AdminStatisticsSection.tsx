import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import StorageIcon from "@mui/icons-material/Storage";

import SectionCard from "@/shared/components/SectionCard";

import { useAdminStats } from "../hooks/useAdminStats";
import type { StatsGranularity } from "../api/adminStats.api";
import { formatBytes } from "../utils/formatBytes";
import KpiCard from "./KpiCard";
import EvolutionChart from "./EvolutionChart";
import BreakdownChart from "./BreakdownChart";

type Range = { from?: string; to?: string; granularity?: StatsGranularity };

const GRANULARITY_OPTIONS: Array<{ value: StatsGranularity | "auto"; label: string }> = [
    { value: "auto", label: "Auto" },
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
];

/**
 * AdminStatisticsSection — the full `GET /admin/stats` analytics dashboard shown
 * inside the admin QUICK ACCESS tab, below the headline counters.
 *
 * The basic (SQL) statistics load automatically. The advanced storage/data-size
 * figures walk every project folder on disk, so they are only requested on an
 * explicit "Compute storage & data size" click (include_storage=true), and any
 * period change resets that request so the costly scan never re-runs on its own.
 */
export default function AdminStatisticsSection() {
    const [range, setRange] = useState<Range>({});
    const [includeStorage, setIncludeStorage] = useState(false);

    const { data, isLoading, isFetching, isError, error } = useAdminStats({
        ...range,
        include_storage: includeStorage,
    });

    // Every filter change resets the advanced (storage) request.
    const updateRange = (patch: Partial<Range>) => {
        setRange((prev) => ({ ...prev, ...patch }));
        setIncludeStorage(false);
    };

    return (
        <Box sx={{ mt: 4 }}>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                    Application statistics
                </Typography>
                {data?.generated_at && (
                    <Typography variant="caption" color="text.secondary">
                        Generated at {new Date(data.generated_at).toLocaleString()}
                    </Typography>
                )}
            </Box>

            {isError ? (
                <Alert severity="error">
                    {error instanceof Error ? error.message : "Failed to load statistics."}
                </Alert>
            ) : isLoading || !data ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress aria-label="Loading statistics" />
                </Box>
            ) : (
                <Stack spacing={3}>
                    {/* --- Overview KPIs (totals) ---
                        The four hero metrics (Projects, Users, Exports, Tasks) are already
                        shown as the coloured counters at the top of this tab, so this grid
                        carries the complementary health/quality metrics only. */}
                    <SectionCard>
                        <Typography variant="h6" component="h3" gutterBottom>
                            Overview
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                <KpiCard label="Samples" value={data.totals.samples.total} />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                <KpiCard label="Running tasks" value={data.totals.tasks.running} />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                <KpiCard
                                    label="Failed tasks"
                                    value={data.totals.tasks.failed}
                                    color={data.totals.tasks.failed > 0 ? "error" : "default"}
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                <KpiCard
                                    label="Pending email validations"
                                    value={data.totals.users.pending_validation}
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                <KpiCard
                                    label="Projects backed up"
                                    value={data.totals.projects.backed_up}
                                    sub={`of ${data.totals.projects.total} total`}
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                <KpiCard
                                    label="Linked to EcoTaxa"
                                    value={data.totals.projects.linked_to_ecotaxa}
                                    sub={`of ${data.totals.projects.total} projects`}
                                />
                            </Grid>
                        </Grid>
                    </SectionCard>

                    {/* --- Period selector + evolution charts --- */}
                    <SectionCard>
                        <Typography variant="h6" component="h3" gutterBottom>
                            Activity over time
                        </Typography>

                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "stretch", sm: "flex-end" }}
                            sx={{ mb: 3 }}
                        >
                            <TextField
                                label="From"
                                type="date"
                                size="small"
                                value={range.from ?? ""}
                                onChange={(e) => updateRange({ from: e.target.value || undefined })}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                                label="To"
                                type="date"
                                size="small"
                                value={range.to ?? ""}
                                onChange={(e) => updateRange({ to: e.target.value || undefined })}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Granularity
                                </Typography>
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={range.granularity ?? "auto"}
                                    onChange={(_, value) => {
                                        if (value == null) return; // ignore deselect
                                        updateRange({
                                            granularity: value === "auto" ? undefined : (value as StatsGranularity),
                                        });
                                    }}
                                    aria-label="Granularity"
                                >
                                    {GRANULARITY_OPTIONS.map((opt) => (
                                        <ToggleButton key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            </Box>
                        </Stack>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <EvolutionChart
                                    title="Cumulative growth"
                                    variant="line"
                                    xLabels={data.period.series.map((s) => s.interval)}
                                    series={[
                                        {
                                            label: "Projects",
                                            data: data.period.series.map((s) => s.cumulative_projects),
                                        },
                                        {
                                            label: "Samples",
                                            data: data.period.series.map((s) => s.cumulative_samples),
                                        },
                                    ]}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <EvolutionChart
                                    title="Created per interval"
                                    variant="bar"
                                    xLabels={data.period.series.map((s) => s.interval)}
                                    series={[
                                        {
                                            label: "Projects",
                                            data: data.period.series.map((s) => s.projects_created),
                                        },
                                        {
                                            label: "Samples",
                                            data: data.period.series.map((s) => s.samples_created),
                                        },
                                    ]}
                                />
                            </Grid>
                        </Grid>
                    </SectionCard>

                    {/* --- Breakdowns (totals) --- */}
                    <SectionCard>
                        <Typography variant="h6" component="h3" gutterBottom>
                            Breakdowns
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <BreakdownChart
                                    title="Projects by instrument"
                                    variant="bar"
                                    data={data.totals.projects.by_instrument}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <BreakdownChart
                                    title="Samples by QC status"
                                    variant="pie"
                                    data={data.totals.samples.by_qc_status}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <BreakdownChart
                                    title="Tasks by type"
                                    variant="bar"
                                    data={data.totals.tasks.by_type}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <BreakdownChart
                                    title="Tasks by status"
                                    variant="bar"
                                    data={data.totals.tasks.by_status}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <BreakdownChart
                                    title="Top organisations"
                                    variant="bar"
                                    data={data.totals.top_organisations.map((o) => ({
                                        label: o.organisation,
                                        count: o.users,
                                    }))}
                                />
                            </Grid>
                        </Grid>
                    </SectionCard>

                    {/* --- Advanced: storage & data size (computed on click) --- */}
                    <SectionCard>
                        <Typography variant="h6" component="h3" gutterBottom>
                            Storage &amp; data size
                        </Typography>
                        {data.totals.storage.total_size_bytes === null ? (
                            <Stack spacing={2} alignItems="flex-start">
                                <Alert severity="info" sx={{ width: "100%" }}>
                                    Storage not computed yet — this scans project files and may take a while.
                                </Alert>
                                <Button
                                    variant="contained"
                                    startIcon={
                                        isFetching && includeStorage ? (
                                            <CircularProgress size={18} color="inherit" />
                                        ) : (
                                            <StorageIcon />
                                        )
                                    }
                                    disabled={isFetching && includeStorage}
                                    onClick={() => setIncludeStorage(true)}
                                >
                                    {isFetching && includeStorage ? "Computing…" : "Compute storage & data size"}
                                </Button>
                            </Stack>
                        ) : (
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <KpiCard
                                        label="Total storage"
                                        value={formatBytes(data.totals.storage.total_size_bytes)}
                                        icon={<StorageIcon fontSize="small" color="action" />}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 9 }}>
                                    <EvolutionChart
                                        title="Cumulative data size"
                                        variant="line"
                                        area
                                        xLabels={data.period.series.map((s) => s.interval)}
                                        series={[
                                            {
                                                label: "Data size",
                                                data: data.period.series.map((s) => s.cumulative_data_size_bytes),
                                            },
                                        ]}
                                        valueFormatter={(v) => formatBytes(v)}
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </SectionCard>
                </Stack>
            )}
        </Box>
    );
}
