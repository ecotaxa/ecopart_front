import { useEffect, useState } from "react";

/**
 * Returns `value` once it has stopped changing for `delayMs` — the usual
 * search-box debounce so a request is sent per pause in typing, not per key.
 */
export function useDebounce<T>(value: T, delayMs = 500): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timerId = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timerId);
    }, [value, delayMs]);

    return debounced;
}
