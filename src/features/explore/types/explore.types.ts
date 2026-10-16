/*
 * Data shown by the Explore page.
 *
 * The backend has no explore endpoint yet: these types describe what the page
 * renders, and `useExploreData` is the single place the requests will plug in.
 */

import type { GeoBox } from "@/shared/components/map";

/** Explore page flavour: depth profiles or time series (the sample type). */
export type ExploreMode = "depth" | "time";

/** Data access status of a project, from its privacy / visible / public durations. */
export type PrivacyStatus = "private" | "visible" | "public" | "open";

export const PRIVACY_STATUSES: readonly PrivacyStatus[] = ["private", "visible", "public", "open"];

export type ClassificationStateFilter = "all" | "fully_predicted" | "fully_validated";

/** Geographic bounding box, in decimal degrees. */
export type GeoBounds = GeoBox;

/** The selection criteria. Empty lists / nulls mean "no constraint". */
export interface ExploreFilters {
    project_ids: number[];
    instrument_models: string[];
    bounds: GeoBounds | null;
    /** Sampling date range (inclusive), ISO `YYYY-MM-DD`. */
    date_from: string | null;
    date_to: string | null;
    /** Months of the year (1–12), whatever the year. */
    months: number[];
    /** Sample name fragments (any of them). */
    sample_names: string[];
    /** Time of day range, in hours (0–24, UTC). */
    hour_range: [number, number] | null;
    /** Pressure range covered by the sample, in dbar. */
    pressure_range: [number, number] | null;
    privacy_statuses: PrivacyStatus[];
    /** Also keep the projects the user is a member or manager of. */
    my_projects: boolean;
    ctd_only: boolean;
    ecotaxa_imported_only: boolean;
    ecotaxa_exclude_not_living: boolean;
    classification_state: ClassificationStateFilter;
}

/** Bin sizes of the "Data aggregation" block (the binned export steps). */
export interface ExploreAggregation {
    /** dbar */
    pressure_bin: number;
    /** hours */
    time_bin: number;
}

/** A project offered by the project filter. */
export interface ExploreProjectOption {
    project_id: number;
    project_title: string;
    nb_samples: number;
}

/** One sample drawn on the map. */
export interface ExploreMapSample {
    sample_id: number;
    sample_name: string;
    project_id: number;
    project_title: string;
    latitude: number;
    longitude: number;
    instrument_model: string;
    privacy_status: PrivacyStatus;
    /** The user is a member or manager of the sample's project. */
    is_my_project: boolean;
}

export interface LabelCount {
    label: string;
    count: number;
}

export interface PressureHistogramBin {
    /** Upper edge of the bin, in dbar (bins are contiguous from 0). */
    max_pressure: number;
    nb_profiles: number;
}

export interface ProfilePoint {
    /** ISO date-time of the sample. */
    date: string;
    latitude: number;
}

export interface ClassificationShares {
    /** Share of the samples in each state, in percent (0–100). */
    fully_validated: number;
    fully_predicted: number;
    partially_validated: number;
    partially_predicted: number;
}

/** Everything the tabs show about a selection. */
export interface ExploreSummary {
    counts: { projects: number; samples: number; particles: number; images: number };
    sample_types: { depth: number; time: number; total: number };
    /** dbar */
    pressure_range: { min: number; max: number } | null;
    /** µm */
    size_range: { min: number; max: number } | null;
    /** ISO date-times of the first and last sample. */
    time_range: { start: string; end: string } | null;
    instruments: LabelCount[];
    max_pressure_histogram: PressureHistogramBin[];
    profiles: ProfilePoint[];
    ecotaxa_categories: string[];
    classification: ClassificationShares;
}

export interface ExploreContact {
    user_name: string;
    email: string;
}

/** A project holding at least one sample of the selection. */
export interface ExploreProjectRow {
    project_id: number;
    project_title: string;
    instrument_model: string;
    ecotaxa_project_name: string | null;
    /** Samples of the project matching the selection. */
    nb_selected_samples: number;
    nb_samples: number;
    privacy_status: PrivacyStatus;
    is_my_project: boolean;
    contact: ExploreContact | null;
    /** The managers, who grant access to the project data. */
    managers: ExploreContact[];
}

/** One object image of the selection. */
export interface ExploreImage {
    object_id: number;
    image_url: string;
    sample_name: string;
    /** Depth of the object, in m (depth mode). */
    depth?: number | null;
    /** Acquisition date-time of the object (time mode). */
    date?: string | null;
}

/** The selection as seen by one family of tabs: everything, or only what can be exported. */
export interface ExploreSelection {
    summary: ExploreSummary | null;
    projects: ExploreProjectRow[];
}

// ---------------------------------------------------------------------------
// Selected data graphs
// ---------------------------------------------------------------------------

/** Scale of a value axis: linear, square root, log10(x + 1) or log10. */
export type ValueScale = "linear" | "sqrt" | "log1p" | "log10";

/** Time axis of the time series graphs: dates, or hours since the start of each sample. */
export type TimeScale = "absolute" | "relative";

/** The curve of one sample. */
export interface ProfileSeries {
    sample_id: number;
    sample_name: string;
    /**
     * `position` is the depth (m) in depth mode, the epoch time (ms) in time mode;
     * `value` the measure at that position.
     */
    points: { position: number; value: number }[];
}

/** The curves of one graph card, per size class / CTD variable / taxon. */
export interface GraphDataset {
    /** The size classes, variables or taxa the selection has data for, in display order. */
    keys: string[];
    /** Title of the value axis, per key (e.g. "Particle red. class cl7 (64-128 µm) # l-1"). */
    axis_labels: Record<string, string>;
    series: Record<string, ProfileSeries[]>;
}

export interface ExploreGraphs {
    abundance: GraphDataset;
    biovolume: GraphDataset;
    ctd: GraphDataset;
    /** Concentrations (depth) or abundances (time) per EcoTaxa category. */
    ecotaxa: GraphDataset;
}
