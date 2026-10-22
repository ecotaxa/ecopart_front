import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./http";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Retry once on a network or server failure, never on a 4xx: a refused,
            // missing or invalid request answers the same the second time, and the
            // retry only delayed the "no access" / "not found" state by a second.
            retry: (failureCount, error) =>
                failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
            refetchOnWindowFocus: false,
        },
    },
});
