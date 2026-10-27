import type { ReactNode } from "react";
import {
    Autocomplete, Box, Button, Checkbox, Chip, FormControlLabel, Link, MenuItem, Radio, RadioGroup,
    Slider, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import EditLocationAltIcon from "@mui/icons-material/EditLocationAlt";
import CategoryIcon from "@mui/icons-material/Category";

import PrivacyStatusInfo from "@/shared/components/PrivacyStatusInfo";
import { useInstrumentModels } from "@/shared/api/referenceData.hooks";
import {
    PRIVACY_STATUSES,
    type ClassificationStateFilter,
    type ExploreAggregation,
    type ExploreMode,
    type ExploreProjectOption,
    type PrivacyStatus,
} from "../types/explore.types";
import {
    BOUND_KEYS,
    EMPTY_BOUNDS_DRAFT,
    HOUR_LIMITS,
    PRESSURE_BIN,
    PRIVACY_LABELS,
    PRESSURE_LIMITS,
    TIME_BIN,
    type ExploreFiltersDraft,
} from "../utils/exploreFilters";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];


const formatHour = (hour: number) => `${String(Math.floor(hour)).padStart(2, "0")}:${hour % 1 ? "30" : "00"}`;

/** Title of a criteria block, with its optional "Clear" link. */
function FilterSection({ title, info, onClear, children }: { title: string; info?: ReactNode; onClear?: () => void; children: ReactNode }) {
    return (
        <Box component="section" aria-label={title}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", mb: 1 }}>
                <Typography variant="subtitle1" component="h3">{title}{info}</Typography>
                {onClear && (
                    <Link component="button" type="button" variant="caption" underline="hover" onClick={onClear}>
                        Clear
                    </Link>
                )}
            </Stack>
            {children}
        </Box>
    );
}

interface ExploreFiltersPanelProps {
    mode: ExploreMode;
    draft: ExploreFiltersDraft;
    onChange: (patch: Partial<ExploreFiltersDraft>) => void;
    aggregation: ExploreAggregation;
    onAggregationChange: (patch: Partial<ExploreAggregation>) => void;
    projectOptions: ExploreProjectOption[];
    /** Rectangle drawing on the map is on. */
    drawing: boolean;
    onToggleDrawing: () => void;
    boundsError: string | null;
    dateError: string | null;
    /** The draft differs from the applied filters. */
    dirty: boolean;
    onApply: () => void;
    onClearAll: () => void;
}

/**
 * Left column of the Explore page: the data selection criteria and the data
 * aggregation steps. Nothing is applied until "Apply filters", so the user can
 * set several criteria before the selection is recomputed.
 */
export default function ExploreFiltersPanel({
    mode, draft, onChange, aggregation, onAggregationChange, projectOptions,
    drawing, onToggleDrawing, boundsError, dateError, dirty, onApply, onClearAll,
}: ExploreFiltersPanelProps) {
    const { data: instrumentModels = [] } = useInstrumentModels();
    const instrumentNames = instrumentModels.map((model) => model.instrument_model_name);
    const selectedProjects = projectOptions.filter((project) => draft.project_ids.includes(project.project_id));

    const toggleStatus = (status: PrivacyStatus, checked: boolean) => onChange({
        privacy_statuses: checked
            ? PRIVACY_STATUSES.filter((s) => s === status || draft.privacy_statuses.includes(s))
            : draft.privacy_statuses.filter((s) => s !== status),
    });

    const canApply = !boundsError && !dateError;

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h6" component="h2">Data selection criteria</Typography>
                <Typography variant="body2" color="text.secondary">
                    Select all samples that (partially) cover the selected ranges
                </Typography>
            </Box>

            <FilterSection title="Project" onClear={() => onChange({ project_ids: [] })}>
                <Autocomplete
                    multiple
                    size="small"
                    options={projectOptions}
                    value={selectedProjects}
                    onChange={(_event, value) => onChange({ project_ids: value.map((project) => project.project_id) })}
                    getOptionLabel={(project) => `${project.project_title} (${project.nb_samples})`}
                    isOptionEqualToValue={(option, value) => option.project_id === value.project_id}
                    noOptionsText="No project"
                    renderInput={(params) => <TextField {...params} label="EcoPart" />}
                />
            </FilterSection>

            <FilterSection title="Instrument" onClear={() => onChange({ instrument_models: [] })}>
                <Autocomplete
                    multiple
                    size="small"
                    options={instrumentNames}
                    value={draft.instrument_models}
                    onChange={(_event, value) => onChange({ instrument_models: value })}
                    renderInput={(params) => <TextField {...params} label="Instrument model" />}
                />
            </FilterSection>

            <FilterSection title="Location" onClear={() => onChange({ bounds: EMPTY_BOUNDS_DRAFT })}>
                <Button
                    size="small"
                    variant={drawing ? "contained" : "text"}
                    startIcon={<EditLocationAltIcon />}
                    onClick={onToggleDrawing}
                    sx={{ mb: 1.5 }}
                >
                    {drawing ? "Drag a rectangle on the map…" : "Draw on the map"}
                </Button>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                    {BOUND_KEYS.map((key) => (
                        <TextField
                            key={key}
                            size="small"
                            label={`${key[0].toUpperCase()}${key.slice(1)}`}
                            value={draft.bounds[key]}
                            onChange={(event) => onChange({ bounds: { ...draft.bounds, [key]: event.target.value } })}
                            error={Boolean(boundsError)}
                            slotProps={{ htmlInput: { inputMode: "decimal" } }}
                        />
                    ))}
                </Box>
                {boundsError && <Typography variant="caption" color="error">{boundsError}</Typography>}
            </FilterSection>

            <FilterSection
                title="Date"
                onClear={() => onChange({ date_from: null, date_to: null, months: [] })}
            >
                <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            type="date"
                            size="small"
                            label="From"
                            fullWidth
                            value={draft.date_from ?? ""}
                            onChange={(event) => onChange({ date_from: event.target.value || null })}
                            error={Boolean(dateError)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                            type="date"
                            size="small"
                            label="To"
                            fullWidth
                            value={draft.date_to ?? ""}
                            onChange={(event) => onChange({ date_to: event.target.value || null })}
                            error={Boolean(dateError)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Stack>
                    {dateError && <Typography variant="caption" color="error">{dateError}</Typography>}
                    <TextField
                        select
                        size="small"
                        label="Month"
                        value={draft.months}
                        onChange={(event) => {
                            const value = event.target.value as unknown as number[];
                            onChange({ months: [...value].sort((a, b) => a - b) });
                        }}
                        slotProps={{
                            select: {
                                multiple: true,
                                renderValue: (selected) => (
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                        {(selected as number[]).map((month) => (
                                            <Chip key={month} size="small" label={MONTHS[month - 1]} />
                                        ))}
                                    </Box>
                                ),
                            },
                        }}
                    >
                        {MONTHS.map((label, index) => (
                            <MenuItem key={label} value={index + 1}>{label}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </FilterSection>

            <FilterSection title="Sample" onClear={() => onChange({ sample_names: [] })}>
                <Autocomplete
                    multiple
                    freeSolo
                    size="small"
                    options={[]}
                    value={draft.sample_names}
                    onChange={(_event, value) => onChange({ sample_names: value.map((name) => name.trim()).filter(Boolean) })}
                    renderInput={(params) => (
                        <TextField {...params} label="Name" placeholder="Type a name, then Enter" />
                    )}
                />
            </FilterSection>

            <FilterSection title="Time" onClear={() => onChange({ hour_range: null })}>
                <Box sx={{ px: 1 }}>
                    <Slider
                        size="small"
                        min={HOUR_LIMITS[0]}
                        max={HOUR_LIMITS[1]}
                        step={0.5}
                        value={draft.hour_range ?? HOUR_LIMITS}
                        onChange={(_event, value) => onChange({ hour_range: value as [number, number] })}
                        valueLabelDisplay="auto"
                        valueLabelFormat={formatHour}
                        getAriaLabel={(index) => (index === 0 ? "Start hour" : "End hour")}
                    />
                </Box>
                <Typography variant="caption" color="text.secondary">
                    {draft.hour_range
                        ? `${formatHour(draft.hour_range[0])} - ${formatHour(draft.hour_range[1])} (UTC)`
                        : "Any time of day"}
                </Typography>
            </FilterSection>

            <FilterSection title="Pressure" onClear={() => onChange({ pressure_range: null })}>
                <Box sx={{ px: 1 }}>
                    <Slider
                        size="small"
                        min={PRESSURE_LIMITS[0]}
                        max={PRESSURE_LIMITS[1]}
                        step={10}
                        value={draft.pressure_range ?? PRESSURE_LIMITS}
                        onChange={(_event, value) => onChange({ pressure_range: value as [number, number] })}
                        valueLabelDisplay="auto"
                        getAriaLabel={(index) => (index === 0 ? "Minimum pressure" : "Maximum pressure")}
                    />
                </Box>
                <Typography variant="caption" color="text.secondary">
                    {draft.pressure_range
                        ? `${draft.pressure_range[0]} - ${draft.pressure_range[1]} dbar`
                        : "Any pressure"}
                </Typography>
            </FilterSection>

            <FilterSection title="Status" info={<PrivacyStatusInfo />}>
                <Stack>
                    {PRIVACY_STATUSES.map((status) => (
                        <FormControlLabel
                            key={status}
                            label={PRIVACY_LABELS[status]}
                            control={(
                                <Checkbox
                                    size="small"
                                    checked={draft.privacy_statuses.includes(status)}
                                    onChange={(event) => toggleStatus(status, event.target.checked)}
                                />
                            )}
                        />
                    ))}
                    <FormControlLabel
                        label="My projects"
                        control={(
                            <Checkbox
                                size="small"
                                checked={draft.my_projects}
                                onChange={(event) => onChange({ my_projects: event.target.checked })}
                            />
                        )}
                    />
                </Stack>
            </FilterSection>

            <FilterSection title="CTD">
                <FormControlLabel
                    label="Sample linked to CTD data"
                    control={(
                        <Checkbox
                            size="small"
                            checked={draft.ctd_only}
                            onChange={(event) => onChange({ ctd_only: event.target.checked })}
                        />
                    )}
                />
            </FilterSection>

            <FilterSection title="EcoTaxa">
                <Stack>
                    <FormControlLabel
                        label="Sample imported in EcoTaxa"
                        control={(
                            <Checkbox
                                size="small"
                                checked={draft.ecotaxa_imported_only}
                                onChange={(event) => onChange({ ecotaxa_imported_only: event.target.checked })}
                            />
                        )}
                    />
                    <FormControlLabel
                        label="Exclude not living categories"
                        control={(
                            <Checkbox
                                size="small"
                                checked={draft.ecotaxa_exclude_not_living}
                                onChange={(event) => onChange({ ecotaxa_exclude_not_living: event.target.checked })}
                            />
                        )}
                    />
                </Stack>
            </FilterSection>

            <FilterSection title="Classification state">
                <RadioGroup
                    value={draft.classification_state}
                    onChange={(event) => onChange({ classification_state: event.target.value as ClassificationStateFilter })}
                >
                    <FormControlLabel value="all" label="All classification state" control={<Radio size="small" />} />
                    <FormControlLabel value="fully_predicted" label="Sample fully predicted" control={<Radio size="small" />} />
                    <FormControlLabel value="fully_validated" label="Sample fully validated" control={<Radio size="small" />} />
                </RadioGroup>
            </FilterSection>

            {/* Sticky so the action stays at hand at the bottom of the long criteria list. */}
            <Stack
                direction="row"
                spacing={1}
                sx={{ position: "sticky", bottom: 0, py: 1.5, bgcolor: "background.default", zIndex: 1 }}
            >
                <Button variant="contained" fullWidth onClick={onApply} disabled={!canApply || !dirty}>
                    Apply filters
                </Button>
                <Button variant="outlined" onClick={onClearAll} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                    Clear all
                </Button>
            </Stack>

            <Box>
                <Typography variant="h6" component="h2" sx={{ mb: 1 }}>Data aggregation</Typography>
                {mode === "depth" ? (
                    <FilterSection
                        title="Pressure bin"
                        onClear={() => onAggregationChange({ pressure_bin: PRESSURE_BIN.default })}
                    >
                        <Box sx={{ px: 1 }}>
                            <Slider
                                size="small"
                                min={PRESSURE_BIN.min}
                                max={PRESSURE_BIN.max}
                                value={aggregation.pressure_bin}
                                onChange={(_event, value) => onAggregationChange({ pressure_bin: value as number })}
                                valueLabelDisplay="auto"
                                aria-label="Pressure bin"
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary">{aggregation.pressure_bin} dbar</Typography>
                    </FilterSection>
                ) : (
                    <FilterSection
                        title="Time bin"
                        onClear={() => onAggregationChange({ time_bin: TIME_BIN.default })}
                    >
                        <Box sx={{ px: 1 }}>
                            <Slider
                                size="small"
                                min={TIME_BIN.min}
                                max={TIME_BIN.max}
                                step={0.5}
                                value={aggregation.time_bin}
                                onChange={(_event, value) => onAggregationChange({ time_bin: value as number })}
                                valueLabelDisplay="auto"
                                aria-label="Time bin"
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary">{aggregation.time_bin} h</Typography>
                    </FilterSection>
                )}
                <Tooltip title="Coming soon">
                    <span>
                        <Button size="small" startIcon={<CategoryIcon />} disabled sx={{ mt: 2 }}>
                            Rename/aggregate EcoTaxa categories
                        </Button>
                    </span>
                </Tooltip>
            </Box>
        </Stack>
    );
}
