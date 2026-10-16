import type {
    ExploreFilters,
    ExploreGraphs,
    ExploreImage,
    ExploreMapSample,
    ExploreMode,
    ExploreProjectOption,
    ExploreSelection,
} from "../types/explore.types";

export interface ExploreGraphOptions {
    /** EcoTaxa graphs: each category also counts the objects of its children. */
    sumChildTaxa: boolean;
}

export interface ExploreData {
    /** Choices of the project filter: every project of the application. */
    projectOptions: ExploreProjectOption[];
    /** Samples on the map: all of them until a selection is applied, then the selection. */
    mapSamples: ExploreMapSample[];
    /** Stats and graphs tabs: every sample of the selection, private ones included. */
    all: ExploreSelection;
    /** Curves of the "Selected data graphs" tab, over every sample of the selection. */
    graphs: ExploreGraphs | null;
    /** Exportable selection tab: only the samples the user may export. */
    exportable: ExploreSelection;
    images: ExploreImage[];
    refreshImages: () => void;
    loading: boolean;
    /** False until the backend serves the explore data. */
    available: boolean;
}

const EMPTY_SELECTION: ExploreSelection = { summary: null, projects: [] };

const NO_DATA: ExploreData = {
    projectOptions: [],
    mapSamples: [],
    all: EMPTY_SELECTION,
    graphs: null,
    exportable: EMPTY_SELECTION,
    images: [],
    refreshImages: () => {},
    loading: false,
    available: false,
};

/**
 * Data of the Explore page for the applied filters (`null` before the first
 * "Apply filters": the map then shows every project of the application).
 *
 * The backend explore endpoints are not built yet, so the page renders its empty
 * state. This hook is the only place their requests will go: the components
 * already take the data as props.
 */
export function useExploreData(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mode: ExploreMode, _filters: ExploreFilters | null, _graphOptions: ExploreGraphOptions,
): ExploreData {
    return NO_DATA;
}
