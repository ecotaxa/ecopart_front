import { http } from "@/shared/api/http";

import type {
    ExploreAggregation,
    ExploreEcoTaxaResponse,
    ExploreFilters,
    ExploreGraphs,
    ExploreImage,
    ExploreMapSample,
    ExploreMode,
    ExploreProjectOption,
    ExploreSelectionResponse,
} from "../types/explore.types";

// ============================================================================
// EXPLORE API
// ============================================================================
// Every route but GET /explore/projects takes `{ mode, filters }` as a JSON
// body: `mode` restricts the samples to one type (depth / time), `filters: null`
// means no criterion. Anonymous users may call them all except /explore/graphs
// (401 without a session).
// ============================================================================

/** Number of random object images drawn per request (the backend default). */
export const RANDOM_IMAGE_COUNT = 4;

/** The selection criteria sent to every POST route. */
export interface ExploreRequest {
    mode: ExploreMode;
    filters: ExploreFilters | null;
}

export interface ExploreImagesRequest extends ExploreRequest {
    /** 1 to 12. */
    count?: number;
}

export type ExploreGraphsRequest = ExploreRequest & Partial<ExploreAggregation>;

/** User the cached answers were computed for (the selection, map and graphs depend on it). */
type Viewer = number | null;

const EXPLORE_ROOT_QUERY_KEY = ["explore"] as const;

export const exploreQueryKeys = {
    root: EXPLORE_ROOT_QUERY_KEY,
    projects: [...EXPLORE_ROOT_QUERY_KEY, "projects"] as const,
    map: (request: ExploreRequest, viewer: Viewer) => [...EXPLORE_ROOT_QUERY_KEY, "map", { ...request, viewer }] as const,
    selection: (request: ExploreRequest, viewer: Viewer) =>
        [...EXPLORE_ROOT_QUERY_KEY, "selection", { ...request, viewer }] as const,
    ecotaxa: (request: ExploreRequest, viewer: Viewer) =>
        [...EXPLORE_ROOT_QUERY_KEY, "ecotaxa", { ...request, viewer }] as const,
    graphs: (request: ExploreGraphsRequest, viewer: Viewer) =>
        [...EXPLORE_ROOT_QUERY_KEY, "graphs", { ...request, viewer }] as const,
    images: (request: ExploreImagesRequest) => [...EXPLORE_ROOT_QUERY_KEY, "images", request] as const,
};

const post = <T>(path: string, body: unknown) => http<T>(path, { method: "POST", body: JSON.stringify(body) });

/** GET /explore/projects: every project of the application, for the project filter. */
export async function fetchExploreProjects(): Promise<ExploreProjectOption[]> {
    const response = await http<{ projects: ExploreProjectOption[] }>("/explore/projects");
    return response.projects;
}

/** POST /explore/map: the samples to draw on the map (those with coordinates). */
export async function fetchExploreMap(request: ExploreRequest): Promise<ExploreMapSample[]> {
    const response = await post<{ samples: ExploreMapSample[] }>("/explore/map", request);
    return response.samples;
}

/** POST /explore/selection: counts, ranges and projects of the whole and of the exportable selection. */
export function fetchExploreSelection(request: ExploreRequest): Promise<ExploreSelectionResponse> {
    return post<ExploreSelectionResponse>("/explore/selection", request);
}

/** POST /explore/ecotaxa: the EcoTaxa categories and classification shares of both selections (slow). */
export function fetchExploreEcoTaxa(request: ExploreRequest): Promise<ExploreEcoTaxaResponse> {
    return post<ExploreEcoTaxaResponse>("/explore/ecotaxa", request);
}

/** POST /explore/images: random object images of the selection, different at each call. */
export async function fetchExploreImages(request: ExploreImagesRequest): Promise<ExploreImage[]> {
    const response = await post<{ images: ExploreImage[] }>("/explore/images", request);
    return response.images;
}

/** POST /explore/graphs: the curves of the selection, binned with the given steps (logged-in users only). */
export function fetchExploreGraphs(request: ExploreGraphsRequest): Promise<ExploreGraphs> {
    return post<ExploreGraphs>("/explore/graphs", request);
}
