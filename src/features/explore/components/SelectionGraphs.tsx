import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
    Alert, Autocomplete, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, LinearProgress, Link, Paper,
    Radio, RadioGroup, Slider, Stack,
    TextField, Tooltip, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AddIcon from "@mui/icons-material/Add";
import CategoryIcon from "@mui/icons-material/Category";

import type {
    ExploreGraphs, ExploreSampleType, ExploreSizeClasses, GraphDataset, ProfileSeries, TimeScale, ValueScale,
} from "../types/explore.types";
import { PRESSURE_BIN, TIME_BIN, timeBinIndex } from "../utils/exploreFilters";
import ProfileChart, { type ChartAxis, type ChartSeries } from "./ProfileChart";

type GraphId = Exclude<keyof ExploreGraphs, "warnings" | "size_classes">;

const GRAPH_IDS: readonly GraphId[] = ["abundance", "biovolume", "ctd", "ecotaxa"];

const VALUE_SCALES: { value: ValueScale; label: string }[] = [
    { value: "linear", label: "linear" },
    { value: "sqrt", label: "sqrt" },
    { value: "log1p", label: "log(x+1)" },
    { value: "log10", label: "log10" },
];

/** Graphs drawn side by side when nothing is picked yet (none for the size classes). */
const DEFAULT_SELECTION_SIZE = 2;
const HOUR_MS = 3_600_000;
/** A request taking longer than this gets a "computing" message. */
const COMPUTING_NOTICE_DELAY_MS = 1000;

/** The graphs of the particle size classes: no class drawn until picked, presets offered. */
const SIZE_CLASS_GRAPHS: ReadonlySet<GraphId> = new Set(["abundance", "biovolume"]);

type SizeClassPreset = { label: string; range: [number, number] | null };

/** Presets of the size class pickers, as in legacy EcoPart (class numbers, inclusive), per histogram. */
const SIZE_CLASS_PRESETS: Record<ExploreSizeClasses, SizeClassPreset[]> = {
    reduced: [
        { label: "All", range: [1, 15] },
        { label: "Class 1-5", range: [1, 5] },
        { label: "UVP class 6-12", range: [6, 12] },
        { label: "None", range: null },
    ],
    detailed: [
        { label: "All", range: [1, 45] },
        { label: "Class 1-16", range: [1, 16] },
        { label: "UVP class 17-45", range: [17, 45] },
        { label: "None", range: null },
    ],
};

const SIZE_CLASS_OPTIONS: { value: ExploreSizeClasses; label: string }[] = [
    { value: "reduced", label: "Reduced (15 classes)" },
    { value: "detailed", label: "Detailed (45 classes)" },
];

const defaultSelection = (id: GraphId, keys: string[]) =>
    SIZE_CLASS_GRAPHS.has(id) ? NO_SELECTION : keys.slice(0, DEFAULT_SELECTION_SIZE);

/** Number of a size class (1–15 reduced, 1–45 detailed), read from its axis label ("Particle red. class cl7 (64-128 µm) # l-1"). */
const sizeClassNumber = (axisLabel: string | undefined) => {
    const match = /\b(?:cl|bv)(\d+)\b/.exec(axisLabel ?? "");
    return match ? Number(match[1]) : null;
};

/** `value`, once it has been true for `delay` ms (false at once). */
function useDelayedFlag(value: boolean, delay: number) {
    const [flag, setFlag] = useState(false);
    useEffect(() => {
        if (!value) return;
        const timer = setTimeout(() => setFlag(true), delay);
        return () => {
            clearTimeout(timer);
            setFlag(false);
        };
    }, [value, delay]);
    return value && flag;
}

const NO_KEYS: string[] = [];
const NO_SELECTION: string[] = [];
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
        const start = sample.positions[0] ?? 0;
        return {
            id: String(sample.sample_id),
            label: sample.sample_name,
            color: seriesColor(index),
            points: sample.positions.map((position, i): [number, number] => {
                const value = sample.values[i];
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
    /** Histogram of the size class graphs, which sets their presets. */
    sizeClasses?: ExploreSizeClasses;
    /** Shown above the picker (EcoTaxa available taxa). */
    header?: ReactNode;
}

const GraphCard = memo(function GraphCard({
    id, mode, dataset, settings, onSettingsChange, onReset, onClose, extra, header, sizeClasses = "reduced",
}: GraphCardProps) {
    const text = cardText(id, mode);
    const keys = dataset?.keys ?? NO_KEYS;
    const selected = useMemo(
        () => (settings.selected ?? defaultSelection(id, keys)).filter((key) => keys.includes(key)),
        [id, settings.selected, keys],
    );
    const isSizeClass = SIZE_CLASS_GRAPHS.has(id);
    const classNumbers = useMemo(
        () => new Map(keys.map((key) => [key, isSizeClass ? sizeClassNumber(dataset?.axis_labels[key]) : null])),
        [keys, isSizeClass, dataset],
    );
    const optionLabel = (key: string) => {
        const number = classNumbers.get(key);
        return number ? `${String(number).padStart(2, "0")} : ${key}` : key;
    };
    /** The classes of a preset the selection has data for. */
    const presetKeys = (range: [number, number] | null) => (range
        ? keys.filter((key) => {
            const number = classNumbers.get(key);
            return number != null && number >= range[0] && number <= range[1];
        })
        : NO_SELECTION);

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

            {isSizeClass && (
                <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", gap: 0.75, mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Presets:</Typography>
                    {SIZE_CLASS_PRESETS[sizeClasses].map(({ label, range }) => {
                        const preset = presetKeys(range);
                        const active = preset.length === selected.length && preset.every((key) => selected.includes(key));
                        return (
                            <Chip
                                key={label}
                                size="small"
                                label={label}
                                color={active ? "primary" : "default"}
                                variant={active ? "filled" : "outlined"}
                                disabled={range !== null && preset.length === 0}
                                onClick={() => onSettingsChange(id, { selected: preset })}
                            />
                        );
                    })}
                </Stack>
            )}

            <Autocomplete
                multiple
                size="small"
                options={keys}
                getOptionLabel={optionLabel}
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
    /** Bin of the curves: pressure bin (dbar) for depth profiles, time bin (h) for time series. */
    bin: number;
    onBinChange: (value: number) => void;
    /** Particle histogram asked for: the 15 reduced or the 45 detailed size classes. */
    sizeClasses: ExploreSizeClasses;
    onSizeClassesChange: (value: ExploreSizeClasses) => void;
    /** The curves are being computed: a long computation gets a message. */
    computing?: boolean;
}

interface DataAggregationProps {
    mode: ExploreSampleType;
    bin: number;
    onBinChange: (value: number) => void;
    sizeClasses: ExploreSizeClasses;
    onSizeClassesChange: (value: ExploreSizeClasses) => void;
}

/** The "Data aggregation" block of a sample type: the bin of its curves and the particle histogram. */
function DataAggregation({ mode, bin, onBinChange, sizeClasses, onSizeClassesChange }: DataAggregationProps) {
    const depth = mode === "depth";
    const default_bin = depth ? PRESSURE_BIN.default : TIME_BIN.default;
    const title = depth ? "Pressure bin" : "Time bin";
    // The time slider moves over the allowed steps, evenly spaced: its value is an index in TIME_BIN.allowed.
    const toSlider = (b: number) => (depth ? b : timeBinIndex(b));
    const toBin = (v: number) => (depth ? v : TIME_BIN.allowed[v]);
    const label = (v: number) => `${toBin(v)} ${depth ? "dbar" : "h"}`;
    // The slider moves freely, the bin only changes on release: each change recomputes every curve.
    const [value, setValue] = useState(toSlider(bin));
    // A bin set from outside (reset) moves the slider; adjusted during render, not in an effect.
    const [shownBin, setShownBin] = useState(bin);
    if (shownBin !== bin) {
        setShownBin(bin);
        setValue(toSlider(bin));
    }
    return (
        <Box component="section" aria-label="Data aggregation">
            <Typography variant="subtitle1" component="h3" sx={{ mb: 1 }}>Data aggregation</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ columnGap: 4, rowGap: 1, alignItems: { sm: "center" } }}>
                <Box sx={{ flex: 1, maxWidth: 420 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                        <Typography variant="body2">{title}</Typography>
                        <Typography variant="caption" color="text.secondary">{label(value)}</Typography>
                        {bin !== default_bin && (
                            <Link component="button" type="button" variant="caption" underline="hover" onClick={() => onBinChange(default_bin)}>
                                Reset
                            </Link>
                        )}
                    </Stack>
                    <Box sx={{ px: 1 }}>
                        <Slider
                            size="small"
                            min={depth ? PRESSURE_BIN.min : 0}
                            max={depth ? PRESSURE_BIN.max : TIME_BIN.allowed.length - 1}
                            step={1}
                            marks={!depth}
                            value={value}
                            onChange={(_event, next) => setValue(next as number)}
                            onChangeCommitted={(_event, next) => onBinChange(toBin(next as number))}
                            valueLabelDisplay="auto"
                            valueLabelFormat={label}
                            getAriaValueText={label}
                            aria-label={title}
                        />
                    </Box>
                </Box>
                <RadioRow label="Particle histogram" value={sizeClasses} options={SIZE_CLASS_OPTIONS} onChange={onSizeClassesChange} />
                <Tooltip title="Coming soon">
                    <span>
                        <Button size="small" startIcon={<CategoryIcon />} disabled>
                            Rename/aggregate EcoTaxa categories
                        </Button>
                    </span>
                </Tooltip>
            </Stack>
        </Box>
    );
}

/**
 * "Selected data graphs" tab: particle abundance and biovolume per size class,
 * CTD variables and EcoTaxa categories of every sample of the selection, as depth
 * profiles or time series. Each graph has its own picks and scales, can be reset
 * or hidden, and a hidden graph can be brought back.
 */
export default function SelectionGraphs({
    mode, title = "Selected data graphs", graphs, sumChildTaxa, onSumChildTaxaChange, bin, onBinChange,
    sizeClasses, onSizeClassesChange, computing = false,
}: SelectionGraphsProps) {
    const showComputing = useDelayedFlag(computing, COMPUTING_NOTICE_DELAY_MS);
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

            <DataAggregation
                mode={mode}
                bin={bin}
                onBinChange={onBinChange}
                sizeClasses={sizeClasses}
                onSizeClassesChange={onSizeClassesChange}
            />

            {showComputing && (
                <Alert severity="info" variant="outlined" role="status" sx={{ "& .MuiAlert-message": { flex: 1 } }}>
                    Computing the graphs: this can take a while for many samples or a small bin.
                    <LinearProgress aria-label="Computing the graphs" sx={{ mt: 1 }} />
                </Alert>
            )}

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
                    // The histogram of the curves on screen, which may still be the previous one while the new one loads.
                    sizeClasses={graphs?.size_classes ?? "reduced"}
                    extra={id === "ecotaxa" ? sumChildrenOption : undefined}
                />
            ))}
        </Stack>
    );
}
