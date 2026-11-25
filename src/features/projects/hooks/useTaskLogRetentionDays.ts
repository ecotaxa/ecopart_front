import { useEffect, useState } from "react";
import { getTaskLogRetention } from "../api/projects.api";

/**
 * TASK_LOG_RETENTION_DAYS of the server: how many days the log of a successful task
 * is kept whole. Null until known, and on a backend that does not give it.
 */
export function useTaskLogRetentionDays(): number | null {
    const [days, setDays] = useState<number | null>(null);
    useEffect(() => {
        let alive = true;
        // Started inside the promise chain so that any failure only leaves the delay unknown
        Promise.resolve()
            .then(() => getTaskLogRetention())
            .then((retention) => { if (alive) setDays(retention.task_log_retention_days); })
            .catch(() => undefined);
        return () => { alive = false; };
    }, []);
    return days;
}
