import { useCallback, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth";
import { isNotFound } from "@/shared/api/http";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { extractErrorMessage } from "@/shared/utils/errorMessage";
import {
    RANDOM_IMAGE_COUNT,
    exploreQueryKeys,
    fetchExploreEcoTaxa,
    fetchExploreGraphs,
    fetchExploreImages,
    fetchExploreMap,
    fetchExploreProjects,
    fetchExploreSelection,
    toExploreRequest,
    type ExploreGraphsRequest,
} from "../api/explore.api";
import {
    SAMPLE_TYPES_OF_MODE,
    type ExploreAggregation,
    type ExploreEcoTaxaResponse,
    type ExploreEcoTaxaSummary,
    type ExploreFilters,
    type ExploreGraphs,
    type ExploreImage,
    type ExploreMapSample,
    type ExploreProjectOption,
    type ExploreSampleType,
    type ExploreSelection,
    type ExploreSelectionPart,
    type ExploreTab,
} from "../types/explore.types";

export interface ExploreDataOptions {
    /** Bin sizes of the graphs. */
    aggregation: ExploreAggregation;
    /** The tab on screen: the graphs are only requested on the graphs tab, the images on the exportable one. */
    tab: ExploreTab;
    /** EcoTaxa graphs: each category also counts the objects of its children (not served by the backend yet). */
    sumChildTaxa: boolean;
}

export interface ExploreData {
    /** Choices of the project filter: every project of the application. */
    projectOptions: ExploreProjectOption[];
    /** Samples on the map: all of them until a selection is applied, then the selection. */
    mapSamples: ExploreMapSample[];
    /** Stats and graphs tabs: every sample of the selection, private ones included. */
    all: ExploreSelection;
    /**
     * Curves of the "Selected data graphs" tab per sample type, over every sample of the
     * selection the user may see (null for a type the page does not search).
     */
    graphs: Record<ExploreSampleType, ExploreGraphs | null>;
    /** Exportable selection tab: only the samples the user may export. */
    exportable: ExploreSelection;
    images: ExploreImage[];
    refreshImages: () => void;
    /** A request is in flight. */
    loading: boolean;
    /** The backend serves the explore data (its project list arrived). */
    available: boolean;
    /** The backend has no explore service (404) or cannot be reached: false while the first answer is awaited. */
    unavailable: boolean;
    /** Message of the first failed request. */
    error: string | null;
}

const PROJECTS_STALE_MS = 5 * 60 * 1000;
/** Switching tabs or filters back and forth reuses the answers instead of asking again. */
const SELECTION_STALE_MS = 30_000;
/** The bin sliders report every step: the graphs are requested once the slider rests. */
const AGGREGATION_DEBOUNCE_MS = 400;
/** A partial EcoTaxa part is asked again this often, until the backend has read every sample from EcoTaxa. */
export const ECOTAXA_POLL_MS = 5000;

const EMPTY_SELECTION: ExploreSelection = { summary: null, projects: [] };
const NO_PROJECTS: ExploreProjectOption[] = [];
const NO_SAMPLES: ExploreMapSample[] = [];
const NO_IMAGES: ExploreImage[] = [];
const NO_ECOTAXA: ExploreEcoTaxaSummary = {
    categories: [],
    classification: { fully_validated: 0, fully_predicted: 0, partially_validated: 0, partially_predicted: 0 },
    nb_samples_with_stats: 0,
    partial: false,
    nb_samples_pending: 0,
};

/**
 * The curves of one sample type, on its own axis. Each type has its own query, so
 * moving the bin of one type leaves the curves of the other alone.
 */
function useGraphsQuery(request: ExploreGraphsRequest, viewer: number | null, enabled: boolean) {
    return useQuery({
        queryKey: exploreQueryKeys.graphs(request, viewer),
        queryFn: () => fetchExploreGraphs(request),
        enabled,
        staleTime: SELECTION_STALE_MS,
        placeholderData: keepPreviousData,
    });
}

/** An older backend without the explore routes, or no backend at all. */
const isServiceMissing = (error: unknown) => isNotFound(error) || error instanceof TypeError;

const isPartial = (ecotaxa: ExploreEcoTaxaResponse | undefined) =>
    ecotaxa !== undefined && (ecotaxa.all.partial || ecotaxa.exportable.partial);

function withEcoTaxa(part: ExploreSelectionPart, ecotaxa: ExploreEcoTaxaSummary): ExploreSelection {
    return {
        projects: part.projects,
        summary: part.summary && {
            ...part.summary,
            ecotaxa_categories: ecotaxa.categories,
            classification: ecotaxa.classification,
            ecotaxa_partial: ecotaxa.partial,
            ecotaxa_pending: ecotaxa.nb_samples_pending,
        },
    };
}

/**
 * Data of the Explore page for the applied filters (`null` before the first
 * "Apply filters": the map then shows every sample of the application, and the
 * tabs stay empty). The sample types of the filters are sent as the `mode` of
 * the requests; the graphs are asked per sample type, each on its own axis.
 *
 * The selection shows as soon as `/explore/selection` answers; its EcoTaxa part
 * (`/explore/ecotaxa`, which calls EcoTaxa) is merged in when it arrives. New
 * filters keep the previous answers on screen until theirs arrive.
 *
 * While the backend still reads the EcoTaxa statistics of some samples (a partial
 * answer), the EcoTaxa part is asked again every `ECOTAXA_POLL_MS`, its figures
 * staying on screen, until it is complete.
 */
export function useExploreData(
    filters: ExploreFilters | null,
    { aggregation, tab }: ExploreDataOptions,
): ExploreData {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const userId = useAuthStore((s) => s.user?.user_id ?? null);
    const viewer = isAuthenticated ? userId : null;
    const bins = useDebounce(aggregation, AGGREGATION_DEBOUNCE_MS);

    const projectsQuery = useQuery({
        queryKey: exploreQueryKeys.projects,
        queryFn: fetchExploreProjects,
        staleTime: PROJECTS_STALE_MS,
    });
    const unavailable = projectsQuery.isError && isServiceMissing(projectsQuery.error);
    const applied = filters !== null && !unavailable;
    const graphsEnabled = applied && isAuthenticated && tab === "graphs";
    const request = toExploreRequest(filters);
    const depthGraphsEnabled = graphsEnabled && SAMPLE_TYPES_OF_MODE[request.mode].includes("depth");
    const timeGraphsEnabled = graphsEnabled && SAMPLE_TYPES_OF_MODE[request.mode].includes("time");
    const imagesEnabled = applied && tab === "exportable";

    const imagesRequest = { ...request, count: RANDOM_IMAGE_COUNT };

    const mapQuery = useQuery({
        queryKey: exploreQueryKeys.map(request, viewer),
        queryFn: () => fetchExploreMap(request),
        enabled: !unavailable,
        staleTime: SELECTION_STALE_MS,
        placeholderData: keepPreviousData,
    });
    const selectionQuery = useQuery({
        queryKey: exploreQueryKeys.selection(request, viewer),
        queryFn: () => fetchExploreSelection(request),
        enabled: applied,
        staleTime: SELECTION_STALE_MS,
        placeholderData: keepPreviousData,
    });
    const ecotaxaQuery = useQuery({
        queryKey: exploreQueryKeys.ecotaxa(request, viewer),
        queryFn: () => fetchExploreEcoTaxa(request),
        enabled: applied,
        staleTime: SELECTION_STALE_MS,
        placeholderData: keepPreviousData,
        refetchInterval: (query) => (isPartial(query.state.data) ? ECOTAXA_POLL_MS : false),
    });
    const depthGraphsQuery = useGraphsQuery(
        { mode: "depth", filters: request.filters, pressure_bin: bins.pressure_bin }, viewer, depthGraphsEnabled,
    );
    const timeGraphsQuery = useGraphsQuery(
        { mode: "time", filters: request.filters, time_bin: bins.time_bin }, viewer, timeGraphsEnabled,
    );
    const imagesQuery = useQuery({
        queryKey: exploreQueryKeys.images(imagesRequest),
        queryFn: () => fetchExploreImages(imagesRequest),
        enabled: imagesEnabled,
        staleTime: SELECTION_STALE_MS,
        placeholderData: keepPreviousData,
    });

    const selection = applied ? selectionQuery.data : undefined;
    // The EcoTaxa part only goes with the selection it was computed for: while the
    // selection of new filters is shown and its EcoTaxa part loads, it stays empty.
    const ecotaxa = applied && ecotaxaQuery.isPlaceholderData === selectionQuery.isPlaceholderData
        ? ecotaxaQuery.data
        : undefined;
    const all = useMemo(
        () => (selection ? withEcoTaxa(selection.all, ecotaxa?.all ?? NO_ECOTAXA) : EMPTY_SELECTION),
        [selection, ecotaxa],
    );
    const exportable = useMemo(
        () => (selection ? withEcoTaxa(selection.exportable, ecotaxa?.exportable ?? NO_ECOTAXA) : EMPTY_SELECTION),
        [selection, ecotaxa],
    );

    const { refetch: refetchImages } = imagesQuery;
    const refreshImages = useCallback(() => {
        void refetchImages();
    }, [refetchImages]);

    // Asking again for a partial EcoTaxa part is no load: the summary says its figures are completing.
    const ecotaxaLoading = ecotaxaQuery.isFetching && (ecotaxaQuery.isPlaceholderData || !isPartial(ecotaxaQuery.data));

    // Every request fails the same way without the service: the page says so once.
    const failure = unavailable ? null : [
        projectsQuery.error,
        mapQuery.error,
        applied ? selectionQuery.error : null,
        applied ? ecotaxaQuery.error : null,
        depthGraphsEnabled ? depthGraphsQuery.error : null,
        timeGraphsEnabled ? timeGraphsQuery.error : null,
        imagesEnabled ? imagesQuery.error : null,
    ].find((error) => error != null);

    return {
        projectOptions: projectsQuery.data ?? NO_PROJECTS,
        mapSamples: unavailable ? NO_SAMPLES : mapQuery.data ?? NO_SAMPLES,
        all,
        graphs: {
            depth: depthGraphsEnabled ? depthGraphsQuery.data ?? null : null,
            time: timeGraphsEnabled ? timeGraphsQuery.data ?? null : null,
        },
        exportable,
        images: imagesEnabled ? imagesQuery.data ?? NO_IMAGES : NO_IMAGES,
        refreshImages,
        loading: ecotaxaLoading
            || [projectsQuery, mapQuery, selectionQuery, depthGraphsQuery, timeGraphsQuery, imagesQuery]
                .some((query) => query.isFetching),
        available: projectsQuery.isSuccess,
        unavailable,
        error: failure ? extractErrorMessage(failure, "The explore data could not be loaded.") : null,
    };
}
