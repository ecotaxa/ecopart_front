import { http, HttpResponse } from 'msw';

import type {
    ExploreEcoTaxaResponse,
    ExploreGraphs,
    ExploreImage,
    ExploreMapSample,
    ExploreProjectOption,
    ExploreProjectRow,
    ExploreSelectionResponse,
    ExploreSelectionSummary,
    GraphDataset,
    ProfileSeries,
} from '@/features/explore/types/explore.types';

// ---------------------------------------------------------------------------
// The backend /explore routes: two projects, three depth samples (two of them
// exportable), their summary, EcoTaxa part, images and curves. The handlers
// answer whatever the body; /explore/graphs refuses anonymous users (401), like
// the backend.
// ---------------------------------------------------------------------------

const projects: ExploreProjectOption[] = [
    { project_id: 1, project_title: 'Tara Oceans 2009', nb_samples: 120 },
    { project_id: 2, project_title: 'Green Edge 2016', nb_samples: 45 },
];

const mapSamples: ExploreMapSample[] = [
    {
        sample_id: 101, sample_name: 'tara_001', project_id: 1, project_title: 'Tara Oceans 2009',
        latitude: 43.68, longitude: 7.31, instrument_model: 'UVP5HD', privacy_status: 'public', is_my_project: false,
    },
    {
        sample_id: 102, sample_name: 'tara_002', project_id: 1, project_title: 'Tara Oceans 2009',
        latitude: -12.5, longitude: 45.1, instrument_model: 'UVP5HD', privacy_status: 'public', is_my_project: false,
    },
    {
        sample_id: 201, sample_name: 'ge_001', project_id: 2, project_title: 'Green Edge 2016',
        latitude: 67.48, longitude: -63.79, instrument_model: 'UVP6LP', privacy_status: 'private', is_my_project: true,
    },
];

const manager = { user_name: 'Jane Smith', email: 'jane.smith@example.org' };

const taraRow: ExploreProjectRow = {
    project_id: 1,
    project_title: 'Tara Oceans 2009',
    instrument_model: 'UVP5HD',
    ecotaxa_project_name: 'Tara Oceans UVP5',
    nb_selected_samples: 2,
    nb_samples: 120,
    privacy_status: 'public',
    is_my_project: false,
    contact: manager,
    managers: [manager],
};

const greenEdgeRow: ExploreProjectRow = {
    project_id: 2,
    project_title: 'Green Edge 2016',
    instrument_model: 'UVP6LP',
    ecotaxa_project_name: null,
    nb_selected_samples: 1,
    nb_samples: 45,
    privacy_status: 'private',
    is_my_project: true,
    contact: null,
    managers: [{ user_name: 'John Doe', email: 'john@doe.com' }],
};

const allSummary: ExploreSelectionSummary = {
    counts: { projects: 2, samples: 3, particles: 125_000, images: 4200 },
    sample_types: { depth: 3, time: 0, total: 3 },
    pressure_range: { min: 0, max: 450 },
    size_range: { min: 64, max: 2580 },
    time_range: { start: '2009-09-12T08:30:00.000Z', end: '2016-07-02T21:10:00.000Z' },
    instruments: [{ label: 'UVP5HD', count: 2 }, { label: 'UVP6LP', count: 1 }],
    max_pressure_histogram: [
        { max_pressure: 100, nb_profiles: 0 },
        { max_pressure: 200, nb_profiles: 1 },
        { max_pressure: 300, nb_profiles: 0 },
        { max_pressure: 400, nb_profiles: 1 },
        { max_pressure: 500, nb_profiles: 1 },
    ],
    profiles: [
        { date: '2009-09-12T08:30:00.000Z', latitude: 43.68 },
        { date: '2009-11-03T02:15:00.000Z', latitude: -12.5 },
        { date: '2016-07-02T21:10:00.000Z', latitude: 67.48 },
    ],
};

const exportableSummary: ExploreSelectionSummary = {
    ...allSummary,
    counts: { projects: 1, samples: 2, particles: 80_000, images: 3000 },
    sample_types: { depth: 2, time: 0, total: 2 },
    time_range: { start: '2009-09-12T08:30:00.000Z', end: '2009-11-03T02:15:00.000Z' },
    instruments: [{ label: 'UVP5HD', count: 2 }],
    max_pressure_histogram: [
        { max_pressure: 100, nb_profiles: 0 },
        { max_pressure: 200, nb_profiles: 1 },
        { max_pressure: 300, nb_profiles: 0 },
        { max_pressure: 400, nb_profiles: 1 },
    ],
    profiles: allSummary.profiles.slice(0, 2),
};

const selection: ExploreSelectionResponse = {
    all: { summary: allSummary, projects: [taraRow, greenEdgeRow] },
    exportable: { summary: exportableSummary, projects: [taraRow] },
};

const ecotaxa: ExploreEcoTaxaResponse = {
    all: {
        categories: ['Copepoda', 'Rhizaria', 'detritus'],
        classification: { fully_validated: 66.7, fully_predicted: 33.3, partially_validated: 0, partially_predicted: 0 },
        nb_samples_with_stats: 3,
    },
    exportable: {
        categories: ['Copepoda', 'detritus'],
        classification: { fully_validated: 50, fully_predicted: 50, partially_validated: 0, partially_predicted: 0 },
        nb_samples_with_stats: 2,
    },
};

const images: ExploreImage[] = [1001, 1002, 1003, 1004].map((object_id, index) => ({
    object_id,
    image_url: `https://ecotaxa.example.org/vault/${object_id}.jpg`,
    sample_name: index < 2 ? 'tara_001' : 'tara_002',
    depth: 12.5 + index * 40,
    date: null,
}));

/** A depth profile: one value per 5 m bin, from the surface. */
const profile = (sample_id: number, sample_name: string, values: number[]): ProfileSeries => ({
    sample_id,
    sample_name,
    points: values.map((value, index) => ({ position: 2.5 + index * 5, value })),
});

const sizeClasses = (labelOf: (key: string, index: number) => string, scale: number): GraphDataset => {
    const keys = ['64-128 µm', '128-256 µm'];
    return {
        keys,
        axis_labels: Object.fromEntries(keys.map((key, index) => [key, labelOf(key, index)])),
        series: Object.fromEntries(keys.map((key, index) => [key, [
            profile(101, 'tara_001', [42, 30, 18, 9].map((value) => (value * scale) / (index + 1))),
            profile(102, 'tara_002', [38, 25, 12, 6].map((value) => (value * scale) / (index + 1))),
        ]])),
    };
};

const graphs: ExploreGraphs = {
    abundance: sizeClasses((key, index) => `Particle red. class cl${7 + index} (${key}) # l-1`, 1),
    biovolume: sizeClasses((key, index) => `Biovolume red. class bv${7 + index} (${key}) mm3 l-1`, 0.01),
    ctd: {
        keys: ['chloro fluo'],
        axis_labels: { 'chloro fluo': 'CTD chloro fluo [mg chl m-3]' },
        series: {
            'chloro fluo': [
                profile(101, 'tara_001', [0.21, 0.35, 0.28, 0.12]),
                profile(102, 'tara_002', [0.18, 0.4, 0.22, 0.09]),
            ],
        },
    },
    ecotaxa: { keys: [], axis_labels: {}, series: {} },
    warnings: ['1 sample of a private project is not drawn'],
};

/** What the explore handlers answer, for the assertions of the tests. */
export const exploreFixtures = { projects, mapSamples, selection, ecotaxa, images, graphs };

/** The /explore handlers; `isLoggedIn` reads the fake session of the other handlers. */
export const createExploreHandlers = (isLoggedIn: () => boolean) => [
    http.get('*/explore/projects', () => HttpResponse.json({ projects })),
    http.post('*/explore/map', () => HttpResponse.json({ samples: mapSamples })),
    http.post('*/explore/selection', () => HttpResponse.json(selection)),
    http.post('*/explore/ecotaxa', () => HttpResponse.json(ecotaxa)),
    http.post('*/explore/images', () => HttpResponse.json({ images })),
    http.post('*/explore/graphs', () => (isLoggedIn()
        ? HttpResponse.json(graphs)
        : HttpResponse.json({ errors: ['User is not logged in'] }, { status: 401 }))),
];
