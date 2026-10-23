import { http } from "@/shared/api/http";
import type { ProjectPrivacyStatus } from "../utils/projectAccess";
import { PROJECTS_ROOT_QUERY_KEY } from "./projects.api";

// ============================================================================
// PROJECT STATISTICS API
// ============================================================================
// Everything the STATS tab of a project shows, served in one call by
// GET /projects/:project_id/stats (ecopart_back project-stats.ts). Any logged-in
// user may read it; `raw_backup` is null for a user without privilege on the
// project. The EcoTaxa part comes from the statistics the backend keeps per
// sample: while some are still being read from EcoTaxa (`ecotaxa.partial`),
// the hook asks again until they are complete.
// ============================================================================

export interface ProjectStatsCounts {
    /** Distinct station ids of the samples. */
    stations: number;
    samples: number;
    /** Sum of the samples' particle counts (unknown counts as 0). */
    particles: number;
    /** Sum of the samples' vignette counts. */
    vignettes: number;
    /** Export tasks of the project, whatever their status. */
    exports: number;
}

/** The privacy timeline: the dates are null while the project has no sample. */
export interface ProjectStatsPrivacy {
    status: ProjectPrivacyStatus;
    oldest_sample_utc_date_time: string | null;
    visible_utc_date_time: string | null;
    public_utc_date_time: string | null;
    open_utc_date_time: string | null;
}

export interface ProjectStatsRawBackup {
    last_backup_utc_date_time: string | null;
    /** Samples imported after the last backup (every sample when there was none). */
    nb_samples_not_backed_up: number;
}

export interface ProjectStatsMapSample {
    sample_id: number;
    sample_name: string;
    /** Position of the sample metadata. */
    latitude: number | null;
    longitude: number | null;
    /** Position read from the CTD file, when it has one. */
    ctd_latitude: number | null;
    ctd_longitude: number | null;
    /** Which of the two positions the project uses as the sample position. */
    use_ctd_coordinates: boolean;
    /** Both positions are known and more than 5 km apart. */
    coordinates_mismatch: boolean;
}

export interface ProjectStatsMap {
    samples: ProjectStatsMapSample[];
    nb_samples_without_ctd: number;
    nb_coordinates_mismatches: number;
}

export interface PressureHistogramBin {
    /** Upper edge of the 100 dbar bin. */
    max_pressure: number;
    nb_profiles: number;
}

export interface ProjectStatsSamples {
    sample_types: { depth: number; time: number; total: number };
    /** dbar */
    pressure_range: { min: number; max: number } | null;
    /** µm (ESD) */
    size_range: { min: number; max: number } | null;
    time_range: { start: string; end: string } | null;
    max_pressure_histogram: PressureHistogramBin[];
    /** Samples whose instrument parameters differ from the most common ones of the project. */
    nb_instrument_parameter_mismatches: number;
    /** Samples dated before 2000, in the future, or with an unreadable date. */
    nb_suspicious_dates: number;
    /** Depth samples without a positive maximum pressure, and samples deeper than 6500 dbar. */
    nb_suspicious_pressures: number;
}

export interface ClassificationShares {
    /** Share of the samples with EcoTaxa stats in each state, in percent (0–100). */
    fully_validated: number;
    fully_predicted: number;
    partially_validated: number;
    partially_predicted: number;
}

export interface ProjectStatsEcoTaxa {
    /** The project is linked to an EcoTaxa project; every other field is empty otherwise. */
    linked: boolean;
    /** Display names of the taxa used, sorted. */
    categories: string[];
    classification: ClassificationShares;
    /** The objects of the samples with EcoTaxa stats, by classification state. */
    objects: { total: number; validated: number; predicted: number };
    nb_samples_with_stats: number;
    /** Some samples have no stats yet: the backend reads them from EcoTaxa in the background. */
    partial: boolean;
    nb_samples_pending: number;
    /** Samples of the project not imported in EcoTaxa. */
    nb_samples_not_imported: number;
    /** Every sample imported in EcoTaxa has its stats and every object of theirs is validated. */
    classification_completed: boolean;
}

export interface ProjectStats {
    project_id: number;
    generated_at: string;
    counts: ProjectStatsCounts;
    privacy: ProjectStatsPrivacy;
    /** Null for a user without privilege on the project. */
    raw_backup: ProjectStatsRawBackup | null;
    map: ProjectStatsMap;
    samples: ProjectStatsSamples;
    ecotaxa: ProjectStatsEcoTaxa;
}

/** React Query key of one project's statistics (invalidated with the project). */
export const projectStatsQueryKey = (projectId: number) => [...PROJECTS_ROOT_QUERY_KEY, "stats", projectId] as const;

/**
 * The statistics of a project.
 * Endpoint: GET /projects/:project_id/stats
 */
export function fetchProjectStats(projectId: number): Promise<ProjectStats> {
    return http<ProjectStats>(`/projects/${projectId}/stats`);
}
