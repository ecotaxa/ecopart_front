import type { ProjectStats } from '@/features/projects/api/projectStats.api';

/** The statistics of a project without any sample, as the backend answers them. */
export const makeEmptyProjectStats = (project_id = 101): ProjectStats => ({
    project_id,
    generated_at: '2026-10-23T12:00:00.000Z',
    counts: { stations: 0, samples: 0, particles: 0, vignettes: 0, exports: 0 },
    privacy: { status: 'private', oldest_sample_utc_date_time: null, visible_utc_date_time: null, public_utc_date_time: null, open_utc_date_time: null },
    raw_backup: { last_backup_utc_date_time: null, nb_samples_not_backed_up: 0 },
    map: { samples: [], nb_samples_without_ctd: 0, nb_coordinates_mismatches: 0, nb_samples_on_land: 0 },
    samples: {
        sample_types: { depth: 0, time: 0, total: 0 },
        pressure_range: null,
        size_range: null,
        time_range: null,
        max_pressure_histogram: [],
        nb_instrument_parameter_mismatches: 0,
        nb_object_size_mismatches: 0,
        nb_suspicious_dates: 0,
        time_span_over_a_year: false,
        nb_suspicious_pressures: 0,
        unfiltered_uvp5hd: false,
    },
    ecotaxa: {
        linked: false,
        categories: [],
        classification: { fully_validated: 0, fully_predicted: 0, partially_validated: 0, partially_predicted: 0 },
        objects: { total: 0, validated: 0, predicted: 0 },
        nb_samples_with_stats: 0,
        partial: false,
        nb_samples_pending: 0,
        nb_samples_not_imported: 0,
        classification_completed: false,
    },
});

/**
 * The statistics of the mockup project (uvp5_sn000_tara2011): 6 stations, 56 depth
 * samples, every warning raised, two samples on the map (one with a mismatching
 * CTD position), half of the objects validated. `last_backup_utc_date_time` is
 * three weeks before `now`.
 */
export const makeProjectStatsFixture = (overrides: Partial<ProjectStats> = {}, now = new Date()): ProjectStats => ({
    ...makeEmptyProjectStats(),
    counts: { stations: 6, samples: 56, particles: 1_250_000, vignettes: 640, exports: 7 },
    privacy: {
        status: 'private',
        oldest_sample_utc_date_time: '2021-05-05T10:00:00Z',
        visible_utc_date_time: '2021-07-05T00:00:00.000Z',
        public_utc_date_time: '2023-05-05T00:00:00.000Z',
        open_utc_date_time: '2024-05-05T00:00:00.000Z',
    },
    raw_backup: { last_backup_utc_date_time: new Date(now.getTime() - 21 * 24 * 3600 * 1000).toISOString(), nb_samples_not_backed_up: 3 },
    map: {
        samples: [
            { sample_id: 1, sample_name: 'tara_001', latitude: 43.68, longitude: 7.31, ctd_latitude: 43.69, ctd_longitude: 7.32, use_ctd_coordinates: false, coordinates_mismatch: false, on_land: false },
            { sample_id: 2, sample_name: 'tara_002', latitude: 36.5, longitude: -3.2, ctd_latitude: 38.5, ctd_longitude: -3.2, use_ctd_coordinates: true, coordinates_mismatch: true, on_land: false },
            { sample_id: 3, sample_name: 'tara_003', latitude: 45.76, longitude: 4.83, ctd_latitude: null, ctd_longitude: null, use_ctd_coordinates: false, coordinates_mismatch: false, on_land: true },
        ],
        nb_samples_without_ctd: 1,
        nb_coordinates_mismatches: 1,
        nb_samples_on_land: 1,
    },
    samples: {
        sample_types: { depth: 56, time: 0, total: 56 },
        pressure_range: { min: 0, max: 3056 },
        size_range: { min: 42, max: 81000 },
        time_range: { start: '1997-05-02T00:00:00.000Z', end: '2010-06-15T00:00:00.000Z' },
        max_pressure_histogram: [
            { max_pressure: 500, nb_profiles: 14 },
            { max_pressure: 1000, nb_profiles: 5 },
            { max_pressure: 2000, nb_profiles: 6 },
            { max_pressure: 3000, nb_profiles: 1 },
        ],
        nb_instrument_parameter_mismatches: 2,
        nb_object_size_mismatches: 4,
        nb_suspicious_dates: 1,
        time_span_over_a_year: true,
        nb_suspicious_pressures: 1,
        unfiltered_uvp5hd: true,
    },
    ecotaxa: {
        linked: true,
        categories: ['Acartiidae', 'Copepoda', 'detritus'],
        classification: { fully_validated: 50, fully_predicted: 49, partially_validated: 0, partially_predicted: 1 },
        objects: { total: 1000, validated: 500, predicted: 500 },
        nb_samples_with_stats: 53,
        partial: false,
        nb_samples_pending: 0,
        nb_samples_not_imported: 3,
        classification_completed: false,
    },
    ...overrides,
});
