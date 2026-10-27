import { useQuery } from "@tanstack/react-query";

import { fetchProjectStats, projectStatsQueryKey, type ProjectStats } from "../api/projectStats.api";

/** A partial EcoTaxa part is asked again this often, until the backend has read every sample from EcoTaxa. */
export const PROJECT_STATS_POLL_MS = 5000;

const STATS_STALE_MS = 30_000;

const isPartial = (stats: ProjectStats | undefined) => stats?.ecotaxa.partial === true;

/**
 * The statistics of the project behind the STATS tab. Pass `null` to hold the
 * fetch. While the EcoTaxa part is partial (the backend is still reading the
 * statistics of some samples from EcoTaxa), the query polls every
 * `PROJECT_STATS_POLL_MS`, keeping the figures on screen, until it is complete.
 */
export function useProjectStats(projectId: number | null) {
    return useQuery({
        queryKey: projectStatsQueryKey(projectId ?? -1),
        queryFn: () => fetchProjectStats(projectId as number),
        enabled: projectId !== null,
        staleTime: STATS_STALE_MS,
        refetchInterval: (query) => (isPartial(query.state.data) ? PROJECT_STATS_POLL_MS : false),
    });
}
