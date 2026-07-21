import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { getAdminStats, type StatsGranularity } from "../api/adminStats.api";

/**
 * React Query hook for the admin statistics endpoint.
 *
 * A single query drives the whole page; `include_storage` is part of the query
 * key so toggling it triggers a fresh fetch. `keepPreviousData` keeps the basic
 * stats on screen while the expensive advanced (storage) fetch is in flight, so
 * the page never flashes back to a loading state.
 */
export function useAdminStats(params: {
    from?: string;
    to?: string;
    granularity?: StatsGranularity;
    include_storage: boolean;
}) {
    return useQuery({
        queryKey: ["admin", "stats", params],
        queryFn: () => getAdminStats(params),
        placeholderData: keepPreviousData,
    });
}
