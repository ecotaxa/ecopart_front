import {
    PRIVACY_STATUSES,
    SAMPLE_TYPES,
    type ExploreAggregation,
    type ExploreFilters,
    type ExploreMode,
    type ExploreSampleType,
    type GeoBounds,
    type PrivacyStatus,
} from "../types/explore.types";

/** Bounds of the "Data aggregation" sliders: the steps accepted by the binned export. */
export const PRESSURE_BIN = { default: 5, min: 1, max: 100 } as const;
export const TIME_BIN = { default: 1, min: 0.5, max: 24 } as const;

/** Bounds of the pressure filter slider, in dbar. */
export const PRESSURE_LIMITS: [number, number] = [0, 6000];
export const HOUR_LIMITS: [number, number] = [0, 24];

export const DEFAULT_AGGREGATION: ExploreAggregation = {
    pressure_bin: PRESSURE_BIN.default,
    time_bin: TIME_BIN.default,
};

export const BOUND_KEYS = ["north", "south", "east", "west"] as const;

/** The location fields as typed in the panel (free text until applied). */
export type BoundsDraft = Record<keyof GeoBounds, string>;

/** The panel state: the filters, with the location still as typed. */
export type ExploreFiltersDraft = Omit<ExploreFilters, "bounds"> & { bounds: BoundsDraft };

export const EMPTY_BOUNDS_DRAFT: BoundsDraft = { north: "", south: "", east: "", west: "" };

/** A fresh selection panel: both sample types, every field empty, every status kept. */
export const createEmptyDraft = (): ExploreFiltersDraft => ({
    sample_types: [...SAMPLE_TYPES],
    project_ids: [],
    instrument_models: [],
    bounds: EMPTY_BOUNDS_DRAFT,
    date_from: null,
    date_to: null,
    months: [],
    sample_names: [],
    hour_range: null,
    pressure_range: null,
    privacy_statuses: [...PRIVACY_STATUSES],
    my_projects: true,
    ctd_only: false,
    ecotaxa_imported_only: false,
    ecotaxa_exclude_not_living: false,
    classification_state: "all",
});

const LATITUDE_KEYS: readonly (keyof GeoBounds)[] = ["north", "south"];

/** Why the typed location cannot be applied, or null when it can (all empty or all valid). */
export function boundsError(bounds: BoundsDraft): string | null {
    const values = BOUND_KEYS.map((key) => bounds[key].trim());
    if (values.every((value) => value === "")) return null;
    if (values.some((value) => value === "")) return "Fill the four coordinates, or none.";

    for (const key of BOUND_KEYS) {
        const value = Number(bounds[key]);
        const limit = LATITUDE_KEYS.includes(key) ? 90 : 180;
        if (!Number.isFinite(value) || Math.abs(value) > limit) {
            return `${key[0].toUpperCase()}${key.slice(1)} must be between -${limit} and ${limit}.`;
        }
    }
    if (Number(bounds.south) > Number(bounds.north)) return "South must be below North.";
    return null;
}

/** Why the sample types cannot be applied, or null. */
export function sampleTypesError(types: readonly ExploreSampleType[]): string | null {
    return types.length === 0 ? "Check at least one sample type." : null;
}

/** The `mode` of the requests for the checked sample types: one of them, or all. */
export function modeOf(types: readonly ExploreSampleType[]): ExploreMode {
    return types.length === 1 ? types[0] : "all";
}

/** Why the date range cannot be applied, or null. */
export function dateRangeError(from: string | null, to: string | null): string | null {
    return from && to && from > to ? "The start date must be before the end date." : null;
}

export function toBoundsDraft(bounds: GeoBounds): BoundsDraft {
    const format = (value: number) => String(Math.round(value * 1000) / 1000);
    return {
        north: format(bounds.north),
        south: format(bounds.south),
        east: format(bounds.east),
        west: format(bounds.west),
    };
}

/** The location of a valid typed location (callers check `boundsError` first), null when empty. */
export function toBounds(bounds: BoundsDraft): GeoBounds | null {
    const hasBounds = BOUND_KEYS.every((key) => bounds[key].trim() !== "");
    return hasBounds
        ? {
            north: Number(bounds.north),
            south: Number(bounds.south),
            east: Number(bounds.east),
            west: Number(bounds.west),
        }
        : null;
}

/** The applied filters of a valid draft (callers check `boundsError` first). */
export function toFilters(draft: ExploreFiltersDraft): ExploreFilters {
    return { ...draft, bounds: toBounds(draft.bounds) };
}

export const SAMPLE_TYPE_LABELS: Record<ExploreSampleType, string> = {
    depth: "Depth",
    time: "Time",
};

export const PRIVACY_LABELS: Record<PrivacyStatus, string> = {
    private: "Private",
    visible: "Visible",
    public: "Public",
    open: "Open",
};
