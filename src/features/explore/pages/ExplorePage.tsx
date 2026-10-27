import { useCallback, useMemo, useState, type ReactElement } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    Alert, Box, Button, Container, Divider, LinearProgress, Stack, Tab, Tabs, Tooltip, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import { useAuthStore } from "@/features/auth";
import SectionCard from "@/shared/components/SectionCard";
import { pageContainerSx, pageHeaderSx, pageTabsSx } from "@/shared/layout/pageLayout";
import ExploreFiltersPanel from "../components/ExploreFiltersPanel";
import ExploreMap from "../components/ExploreMap";
import SelectionCounters from "../components/SelectionCounters";
import SelectionProjectsTable from "../components/SelectionProjectsTable";
import SelectionSamplesSection from "../components/SelectionSamplesSection";
import SelectionGraphs from "../components/SelectionGraphs";
import EcoTaxaSummary from "../components/EcoTaxaSummary";
import RandomImages from "../components/RandomImages";
import { useExploreData } from "../hooks/useExploreData";
import {
    SAMPLE_TYPES_OF_MODE,
    type ExploreAggregation,
    type ExploreFilters,
    type ExploreMode,
    type ExploreSampleType,
    type ExploreTab,
    type GeoBounds,
} from "../types/explore.types";
import {
    DEFAULT_AGGREGATION,
    boundsError,
    createEmptyDraft,
    dateRangeError,
    modeOf,
    parseProjectIds,
    sampleTypesError,
    toBounds,
    toBoundsDraft,
    toFilters,
    type ExploreFiltersDraft,
} from "../utils/exploreFilters";

const MAP_HEIGHT = 420;

/** Title of each block of graphs when the page shows both sample types. */
const GRAPHS_TITLE_OF_TYPE: Record<ExploreSampleType, string> = {
    depth: "Selected data graphs: depth profiles",
    time: "Selected data graphs: time series",
};

const TABS: { slug: ExploreTab; label: string; icon: ReactElement }[] = [
    { slug: "stats", label: "Selected data stats", icon: <InsertChartIcon /> },
    { slug: "graphs", label: "Selected data graphs", icon: <ViewModuleIcon /> },
    { slug: "exportable", label: "Exportable selection", icon: <FileDownloadIcon /> },
];

/**
 * ExplorePage — browse the particle data of every project (route
 * `/explore/:tabName?`).
 *
 * The criteria of the left panel are applied together with "Apply filters", and
 * then drive the map and the three tabs. The sample type criterion searches
 * depth profiles, time series or both; the graphs are drawn per sample type,
 * each on its own axis (two blocks when both are searched). Stats and graphs
 * cover every matching sample, private ones included; the exportable selection
 * only what the user may export. Before any filter is applied the map shows
 * every project.
 *
 * The project pages open it on their projects (`?projects=12,15`): that project
 * filter is applied from the start.
 */
export default function ExplorePage() {
    const { tabName } = useParams<{ tabName?: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const tab: ExploreTab = TABS.find((t) => t.slug === tabName)?.slug ?? "stats";

    const [draft, setDraft] = useState<ExploreFiltersDraft>(() => ({
        ...createEmptyDraft(),
        project_ids: parseProjectIds(searchParams.get("projects")),
    }));
    const [applied, setApplied] = useState<ExploreFilters | null>(
        () => (draft.project_ids.length > 0 ? toFilters(draft) : null),
    );
    const [aggregation, setAggregation] = useState<ExploreAggregation>(DEFAULT_AGGREGATION);
    const [drawing, setDrawing] = useState(false);
    const [sumChildTaxa, setSumChildTaxa] = useState(true);

    const data = useExploreData(applied, { aggregation, tab, sumChildTaxa });
    // The sample types of the applied selection: both before any filter.
    const sampleType: ExploreMode = applied ? modeOf(applied.sample_types) : "all";

    const draftBoundsError = boundsError(draft.bounds);
    const draftDateError = dateRangeError(draft.date_from, draft.date_to);
    const draftSampleTypesError = sampleTypesError(draft.sample_types);
    const draftFilters = useMemo(() => (draftBoundsError ? null : toFilters(draft)), [draft, draftBoundsError]);
    // Only the location reaches the map: editing another criterion leaves it as it is.
    const draftBounds = useMemo(() => (draftBoundsError ? null : toBounds(draft.bounds)), [draft.bounds, draftBoundsError]);
    const dirty = applied === null || JSON.stringify(draftFilters) !== JSON.stringify(applied);

    const updateDraft = useCallback(
        (patch: Partial<ExploreFiltersDraft>) => setDraft((prev) => ({ ...prev, ...patch })),
        [],
    );

    const apply = () => {
        if (!draftFilters || draftDateError || draftSampleTypesError) return;
        setDrawing(false);
        setApplied(draftFilters);
    };

    const clearAll = () => {
        setDraft(createEmptyDraft());
        setApplied(null);
        setDrawing(false);
    };

    const handleBoundsDrawn = useCallback((bounds: GeoBounds) => {
        updateDraft({ bounds: toBoundsDraft(bounds) });
        setDrawing(false);
    }, [updateDraft]);

    const goTo = (nextTab: ExploreTab) => navigate(`/explore/${nextTab}`);

    const noSelectionHint = applied === null && (
        <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
            Set your data selection criteria, then click <strong>Apply filters</strong>.
        </Alert>
    );

    const exportDisabledReason = !isAuthenticated
        ? "Log in to export data"
        : !data.available || !data.exportable.summary?.counts.samples
            ? "No exportable sample in the selection"
            : null;

    return (
        <Container
            maxWidth={false}
            // At least 17% of the screen free on each side on wide screens; below, the two
            // columns need the whole width.
            sx={{ width: { xs: "100%", lg: "66%" }, mx: "auto", ...pageContainerSx }}
        >
            <Stack sx={{ ...pageHeaderSx, alignItems: "center" }}>
                <Typography variant="h4" component="h1">Explore data</Typography>
            </Stack>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 4, xl: 3 }}>
                    <ExploreFiltersPanel
                        appliedSampleType={sampleType}
                        draft={draft}
                        onChange={updateDraft}
                        aggregation={aggregation}
                        onAggregationChange={(patch) => setAggregation((prev) => ({ ...prev, ...patch }))}
                        projectOptions={data.projectOptions}
                        drawing={drawing}
                        onToggleDrawing={() => setDrawing((on) => !on)}
                        boundsError={draftBoundsError}
                        dateError={draftDateError}
                        sampleTypesError={draftSampleTypesError}
                        dirty={dirty}
                        onApply={apply}
                        onClearAll={clearAll}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 8, xl: 9 }}>
                    {data.unavailable && (
                        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
                            The explore data service is not available yet: the map and the selection stay empty.
                        </Alert>
                    )}
                    {data.error && (
                        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>{data.error}</Alert>
                    )}

                    <ExploreMap
                        samples={data.mapSamples}
                        bounds={draftBounds}
                        drawing={drawing}
                        onBoundsDrawn={handleBoundsDrawn}
                        height={MAP_HEIGHT}
                    />

                    <Box sx={{ ...pageTabsSx, mt: 3, position: "relative" }}>
                        <Tabs
                            value={tab}
                            onChange={(_event, next: ExploreTab) => goTo(next)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {TABS.map((t) => (
                                <Tab key={t.slug} value={t.slug} icon={t.icon} iconPosition="start" label={t.label} />
                            ))}
                        </Tabs>
                        {data.loading && (
                            <LinearProgress
                                aria-label="Loading the explore data"
                                sx={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2 }}
                            />
                        )}
                    </Box>

                    {noSelectionHint}

                    {tab === "stats" && (
                        <SectionCard>
                            <Stack spacing={5}>
                                <SelectionCounters counts={data.all.summary?.counts ?? null} />
                                <SelectionProjectsTable
                                    title="Selected projects"
                                    subtitle="Projects for which at least one sample is matching the selected filters, private ones included"
                                    rows={data.all.projects}
                                    mode={sampleType}
                                />
                                <SelectionSamplesSection title="Selected samples" summary={data.all.summary} />
                                <Divider />
                                <EcoTaxaSummary summary={data.all.summary} />
                            </Stack>
                        </SectionCard>
                    )}

                    {tab === "graphs" && !isAuthenticated && (
                        <Alert severity="info" variant="outlined">Log in to see the graphs of the selection.</Alert>
                    )}

                    {tab === "graphs" && isAuthenticated && (
                        <Stack spacing={4}>
                            {SAMPLE_TYPES_OF_MODE[sampleType].map((type) => {
                                const graphs = data.graphs[type];
                                return (
                                    <Box key={type}>
                                        {graphs && graphs.warnings.length > 0 && (
                                            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                                                {graphs.warnings.map((warning) => <div key={warning}>{warning}</div>)}
                                            </Alert>
                                        )}
                                        <SectionCard>
                                            <SelectionGraphs
                                                mode={type}
                                                title={sampleType === "all" ? GRAPHS_TITLE_OF_TYPE[type] : undefined}
                                                graphs={graphs}
                                                sumChildTaxa={sumChildTaxa}
                                                onSumChildTaxaChange={setSumChildTaxa}
                                            />
                                        </SectionCard>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}

                    {tab === "exportable" && (
                        <SectionCard>
                            <Stack spacing={5}>
                                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                                    <Typography variant="h5" component="h2">Exportable selection</Typography>
                                    <Tooltip title={exportDisabledReason ?? ""}>
                                        <span>
                                            <Button
                                                variant="outlined"
                                                endIcon={<FileDownloadIcon />}
                                                disabled={exportDisabledReason !== null}
                                            >
                                                Export selection
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </Stack>
                                <SelectionCounters counts={data.exportable.summary?.counts ?? null} />
                                <SelectionProjectsTable
                                    title="Exportable selected projects"
                                    subtitle="Projects for which at least one sample is matching the selected filters"
                                    rows={data.exportable.projects}
                                    mode={sampleType}
                                />
                                <SelectionSamplesSection title="Exportable selected samples" summary={data.exportable.summary} />
                                <Divider />
                                <EcoTaxaSummary summary={data.exportable.summary} />
                                <Divider />
                                <RandomImages
                                    images={data.images}
                                    mode={sampleType}
                                    onRefresh={data.refreshImages}
                                    disabled={!data.available || applied === null}
                                />
                            </Stack>
                        </SectionCard>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
