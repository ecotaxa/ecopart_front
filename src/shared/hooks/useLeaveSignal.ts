import { useCallback, useEffect, useRef } from "react";

/**
 * The signal of the page as it is shown now, aborted when the component unmounts
 * or `resetKey` changes (a route that keeps the page mounted while it moves to
 * another project or sample). A handler hands it to the async work it starts (a
 * task it follows, …), so that work stops instead of acting on a page the user
 * has left. Returns a getter: the signal changes with `resetKey`.
 */
export function useLeaveSignal(resetKey?: unknown): () => AbortSignal {
    const controller = useRef<AbortController | null>(null);

    useEffect(() => {
        const current = new AbortController();
        controller.current = current;
        return () => current.abort();
    }, [resetKey]);

    // Handlers only run once the component is mounted, so the fallback is never used.
    return useCallback(() => controller.current?.signal ?? AbortSignal.abort(), []);
}
