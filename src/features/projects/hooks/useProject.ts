import { useQuery } from "@tanstack/react-query";

import { fetchProjectById, projectQueryKey } from "../api/projects.api";

/**
 * The project behind `/projects/:id`, shared by the details page and its tabs
 * through the React Query cache (one request, however many consumers). Pass
 * `null` while the id is unknown to hold the fetch.
 */
export function useProject(projectId: number | null) {
    return useQuery({
        queryKey: projectQueryKey(projectId ?? -1),
        queryFn: () => fetchProjectById(projectId as number),
        enabled: projectId !== null,
        staleTime: 15_000,
    });
}
