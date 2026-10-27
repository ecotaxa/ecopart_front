import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import {
    Autocomplete, Box, Checkbox, Chip, FormControlLabel, IconButton, Paper, Radio, RadioGroup, Stack,
    TextField, Tooltip, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AddIcon from "@mui/icons-material/Add";

import type {
    ExploreGraphs, ExploreSampleType, GraphDataset, ProfileSeries, TimeScale, ValueScale,
} from "../types/explore.types";
import ProfileChart, { type ChartAxis, type ChartSeries } from "./ProfileChart";

type GraphId = Exclude<keyof ExploreGraphs, "warnings">;

const GRAPH_IDS: readonly GraphId[] = ["abundance", "biovolume", "ctd", "ecotaxa"];

const VALUE_SCALES: { value: ValueScale; label: string }[] = [
    { value: "linear", label: "linear" },
    { value: "sqrt", label: "sqrt" },
    { value: "log1p", label: "log(x+1)" },
    { value: "log10", label: "log10" },
];

/** Graphs drawn side by side when nothing is picked yet. */
const DEFAULT_SELECTION_SIZE = 2;
const HOUR_MS = 3_600_000;

const NO_KEYS: string[] = [];
const NO_SERIES: ProfileSeries[] = [];

/**
 * One colour per sample, hues spread by the golden angle so that neighbouring
 * curves never look alike, however many samples the selection holds.
 */
const seriesColor = (index: number) => `hsl(${Math.round((index * 137.508) % 360)}, 70%, 45%)`;

interface GraphSettings {
    /** null: the first keys of the dataset. */
    selected: string[] | null;
    scale: ValueScale;
    timeScale: TimeScale;
}

const DEFAULT_SETTINGS: GraphSettings = { selected: null, scale: "log10", timeScale: "absolute" };

/** Wording of a card, which differs between the depth and the time pages. */
function cardText(id: GraphId, mode: ExploreSampleType) {
    const depth = mode === "depth";
    switch (id) {
        case "abundance":
            return { title: depth ? "Particles abundance" : "LPM abundance", picker: "Size classes", scale: depth ? "Scale abundances" : "Scale data" };
        case "biovolume":
            return { title: depth ? "Particles biovolume" : "LPM biovolume", picker: "Size classes", scale: depth ? "Scale biovolume" : "Scale data" };
        case "ctd":
            return { title: "CTD data", picker: "Variable", scale: "Scale data" };
        case "ecotaxa":
            return { title: depth ? "EcoTaxa concentrations" : "EcoTaxa classification", picker: "Selected taxa", scale: depth ? "Scale concentrations" : "Scale data" };
    }
}

const formatDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The curves of one key, laid out for the page: value along x for depth profiles, along y for time series. */
function toChartSeries(series: ProfileSeries[], mode: ExploreSampleType, timeScale: TimeScale): ChartSeries[] {
    return series.map((sample, index) => {
        const start = sample.points[0]?.position ?? 0;
        return {
            id: String(sample.sample_id),
            label: sample.sample_name,
            color: seriesColor(index),
            points: sample.points.map(({ position, value }): [number, number] => {
                if (mode === "depth") return [value, position];
                return [timeScale === "relative" ? (position - start) / HOUR_MS : position, value];
            }),
        };
    });
}

function axes(mode: ExploreSampleType, valueLabel: string, scale: ValueScale, timeScale: TimeScale): { x: ChartAxis; y: ChartAxis } {
    const value: ChartAxis = { label: valueLabel, scale, fromZero: true };
    if (mode === "depth") {
        return { x: value, y: { label: "Depth [m]", scale: "linear", reversed: true, fromZero: true } };
    }
    return {
        x: timeScale === "relative"
            ? { label: "Time since sample start [h]", scale: "linear", fromZero: true }
            : { label: "Date", scale: "linear", format: formatDate },
        y: value,
    };
}

function RadioRow<T extends string>({ label, value, options, onChange }: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <RadioGroup row value={value} onChange={(event) => onChange(event.target.value as T)} aria-label={label}>
                {options.map((option) => (
                    <FormControlLabel key={option.value} value={option.value} label={option.label} control={<Radio size="small" />} />
                ))}
            </RadioGroup>
        </Box>
    );
}

function NoGraph() {
    return (
        <Box
            sx={{
                border: "1px dashed", borderColor: "divider", borderRadius: 1, height: 200,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
        >
            <Typography variant="caption" color="text.secondary">No data</Typography>
        </Box>
    );
}

interface GraphChartProps {
    title: string;
    series: ProfileSeries[];
    mode: ExploreSampleType;
    valueLabel: string;
    scale: ValueScale;
    timeScale: TimeScale;
    step?: "vertical" | "horizontal";
}

/** One chart of a card: its curves and axes are only rebuilt when they change, not when another chart does. */
function GraphChart({ title, series, mode, valueLabel, scale, timeScale, step }: GraphChartProps) {
    const chartSeries = useMemo(() => toChartSeries(series, mode, timeScale), [series, mode, timeScale]);
    const chartAxes = useMemo(() => axes(mode, valueLabel, scale, timeScale), [mode, valueLabel, scale, timeScale]);
    return (
        <ProfileChart
            title={title}
            series={chartSeries}
            x={chartAxes.x}
            y={chartAxes.y}
            step={step}
            valueAxis={mode === "depth" ? "x" : "y"}
        />
    );
}

interface GraphCardProps {
    id: GraphId;
    mode: ExploreSampleType;
    dataset: GraphDataset | null;
    settings: GraphSettings;
    onSettingsChange: (id: GraphId, patch: Partial<GraphSettings>) => void;
    onReset: (id: GraphId) => void;
    onClose: (id: GraphId) => void;
    /** Extra controls under the picker (EcoTaxa options). */
    extra?: ReactNode;
    /** Shown above the picker (EcoTaxa available taxa). */
    header?: ReactNode;
}

const GraphCard = memo(function GraphCard({
    id, mode, dataset, settings, onSettingsChange, onReset, onClose, extra, header,
}: GraphCardProps) {
    const text = cardText(id, mode);
    const keys = dataset?.keys ?? NO_KEYS;
    const selected = useMemo(
        () => (settings.selected ?? keys.slice(0, DEFAULT_SELECTION_SIZE)).filter((key) => keys.includes(key)),
        [settings.selected, keys],
    );

    return (
        <Paper variant="outlined" component="section" aria-label={text.title} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6" component="h3">{text.title}</Typography>
                <Box>
                    <Tooltip title="Reset this graph">
                        <IconButton size="small" onClick={() => onReset(id)} aria-label={`Reset ${text.title}`}>
                            <RestartAltIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Hide this graph">
                        <IconButton size="small" onClick={() => onClose(id)} aria-label={`Hide ${text.title}`}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Stack>

            {header}

            <Autocomplete
                multiple
                size="small"
                options={keys}
                value={selected}
                onChange={(_event, value) => onSettingsChange(id, { selected: value })}
                noOptionsText="No data"
                renderInput={(params) => <TextField {...params} label={text.picker} />}
            />
            {extra}

            <Stack direction={{ xs: "column", sm: "row" }} sx={{ columnGap: 4, mt: 1.5 }}>
                <RadioRow label={text.scale} value={settings.scale} options={VALUE_SCALES} onChange={(scale) => onSettingsChange(id, { scale })} />
                {mode === "time" && (
                    <RadioRow
                        label="Scale time"
                        value={settings.timeScale}
                        options={[{ value: "absolute", label: "Absolute" }, { value: "relative", label: "Relative" }]}
                        onChange={(timeScale) => onSettingsChange(id, { timeScale })}
                    />
                )}
            </Stack>

            <Grid container spacing={2} sx={{ mt: 1 }}>
                {selected.length === 0 ? (
                    <Grid size={12}><NoGraph /></Grid>
                ) : selected.map((key) => (
                    <Grid key={key} size={{ xs: 12, md: 6 }}>
                        <GraphChart
                            title={`${text.title}: ${key}`}
                            series={dataset?.series[key] ?? NO_SERIES}
                            mode={mode}
                            valueLabel={dataset?.axis_labels[key] ?? key}
                            scale={settings.scale}
                            timeScale={settings.timeScale}
                            // EcoTaxa concentrations come per depth bin.
                            step={id === "ecotaxa" && mode === "depth" ? "vertical" : undefined}
                        />
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
});

interface SelectionGraphsProps {
    /** The sample type drawn: depth profiles or time series. */
    mode: ExploreSampleType;
    /** Heading of the block, "Selected data graphs" by default. */
    title?: string;
    graphs: ExploreGraphs | null;
    /** EcoTaxa: each category also counts the objects of its children. */
    sumChildTaxa: boolean;
    onSumChildTaxaChange: (value: boolean) => void;
}

/**
 * "Selected data graphs" tab: particle abundance and biovolume per size class,
 * CTD variables and EcoTaxa categories of every sample of the selection, as depth
 * profiles or time series. Each graph has its own picks and scales, can be reset
 * or hidden, and a hidden graph can be brought back.
 */
export default function SelectionGraphs({
    mode, title = "Selected data graphs", graphs, sumChildTaxa, onSumChildTaxaChange,
}: SelectionGraphsProps) {
    const [settings, setSettings] = useState<Record<GraphId, GraphSettings>>({
        abundance: DEFAULT_SETTINGS,
        biovolume: DEFAULT_SETTINGS,
        ctd: DEFAULT_SETTINGS,
        ecotaxa: DEFAULT_SETTINGS,
    });
    const [hidden, setHidden] = useState<GraphId[]>([]);
    const [showTaxa, setShowTaxa] = useState(true);

    // Stable callbacks: a card only renders again when its own data or settings change.
    const update = useCallback((id: GraphId, patch: Partial<GraphSettings>) =>
        setSettings((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })), []);
    const reset = useCallback((id: GraphId) => update(id, DEFAULT_SETTINGS), [update]);
    const hide = useCallback((id: GraphId) => setHidden((prev) => [...prev, id]), []);

    const taxa = graphs?.ecotaxa.keys ?? NO_KEYS;
    const selectedTaxa = useMemo(
        () => settings.ecotaxa.selected ?? taxa.slice(0, DEFAULT_SELECTION_SIZE),
        [settings.ecotaxa.selected, taxa],
    );

    const taxaHeader = useMemo(() => (
        <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <Typography variant="subtitle2">Available taxa</Typography>
                <Tooltip title={showTaxa ? "Hide the list" : "Show the list"}>
                    <IconButton size="small" onClick={() => setShowTaxa((on) => !on)} aria-label="Toggle available taxa">
                        {showTaxa ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Stack>
            {showTaxa && (taxa.length === 0 ? (
                <Typography variant="body2" color="text.secondary">—</Typography>
            ) : (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {taxa.map((taxon) => (
                        <Chip
                            key={taxon}
                            size="small"
                            label={taxon}
                            color={selectedTaxa.includes(taxon) ? "primary" : "default"}
                            variant={selectedTaxa.includes(taxon) ? "filled" : "outlined"}
                            // A click adds the taxon to the graphs (or removes it).
                            onClick={() => update("ecotaxa", {
                                selected: selectedTaxa.includes(taxon)
                                    ? selectedTaxa.filter((other) => other !== taxon)
                                    : [...selectedTaxa, taxon],
                            })}
                        />
                    ))}
                </Box>
            ))}
        </Box>
    ), [showTaxa, taxa, selectedTaxa, update]);

    const sumChildrenOption = useMemo(() => (
        <FormControlLabel
            sx={{ mt: 1 }}
            label={mode === "depth" ? "Sum concentrations of children categories" : "Sum abundance of children categories"}
            control={(
                <Checkbox
                    size="small"
                    checked={sumChildTaxa}
                    onChange={(event) => onSumChildTaxaChange(event.target.checked)}
                />
            )}
        />
    ), [mode, sumChildTaxa, onSumChildTaxaChange]);

    return (
        <Stack spacing={3}>
            <Typography variant="h5" component="h2">{title}</Typography>

            {hidden.length > 0 && (
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Hidden graphs:</Typography>
                    {hidden.map((id) => (
                        <Chip
                            key={id}
                            size="small"
                            icon={<AddIcon />}
                            label={cardText(id, mode).title}
                            onClick={() => setHidden((prev) => prev.filter((other) => other !== id))}
                        />
                    ))}
                </Stack>
            )}

            {GRAPH_IDS.filter((id) => !hidden.includes(id)).map((id) => (
                <GraphCard
                    key={id}
                    id={id}
                    mode={mode}
                    dataset={graphs?.[id] ?? null}
                    settings={settings[id]}
                    onSettingsChange={update}
                    onReset={reset}
                    onClose={hide}
                    header={id === "ecotaxa" ? taxaHeader : undefined}
                    extra={id === "ecotaxa" ? sumChildrenOption : undefined}
                />
            ))}
        </Stack>
    );
}
