import { useState, useEffect } from "react";

import {
    EXPORT_TASK_TYPE_LABELS,
    SearchFilter,
    searchProjects,
    searchProjectTasks,
} from "@/features/projects/api/projects.api";
import { searchUsers } from "../api/adminUsers.api";

/** The calendar window the quick-access counters are scoped to. */
export type QuickAccessPeriod = "all" | "today" | "month" | "year";

export interface QuickAccessPeriodOption {
    value: QuickAccessPeriod;
    label: string;
}

export const QUICK_ACCESS_PERIODS: QuickAccessPeriodOption[] = [
    { value: "all", label: "All time" },
    { value: "today", label: "Today" },
    { value: "month", label: "This month" },
    { value: "year", label: "This year" },
];

/** A count that is `null` when its request failed (rendered as "—"). */
export interface QuickAccessStats {
    projects: number | null;
    users: number | null;
    exports: number | null;
    tasks: number | null;
}

const EMPTY_STATS: QuickAccessStats = { projects: null, users: null, exports: null, tasks: null };

/**
 * `LIKE` prefix matching a period's creation dates, or `null` for "all time".
 *
 * The backend rejects the `>=`/`<=` operators for anything but a *numeric* value
 * (search-repository.ts → formatFilters), and the creation-date columns are ISO
 * 8601 UTC *strings* — so a rolling window is impossible. Instead we match a
 * calendar prefix with `LIKE` (a string operator). The prefix is built in UTC to
 * line up with the stored UTC timestamps, and it works for both the ISO form
 * ("2026-07-16T…Z") and the legacy SQLite form ("2026-07-16 …").
 */
const computeDatePrefix = (period: QuickAccessPeriod): string | null => {
    if (period === "all") return null;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = now.getUTCFullYear();
    const month = pad(now.getUTCMonth() + 1);
    const day = pad(now.getUTCDate());

    switch (period) {
        case "year": return `${year}%`;
        case "month": return `${year}-${month}%`;
        case "today": return `${year}-${month}-${day}%`;
    }
};

/** `search_info.total` from a fulfilled search, or `null` if the request failed. */
const totalFrom = (
    result: PromiseSettledResult<{ search_info?: { total?: number } }>,
): number | null =>
    result.status === "fulfilled" ? result.value.search_info?.total ?? 0 : null;

/**
 * Hook backing the admin QUICK ACCESS panel.
 *
 * Fetches the four headline counters (projects, users, exports, tasks) in
 * parallel, each scoped to the selected time window via a `>=` filter on the
 * entity's creation-date column. Every count uses a `limit: 1` search and reads
 * `search_info.total`, so no rows are transferred. Failures are isolated per
 * counter (Promise.allSettled): a single failing endpoint shows "—" while the
 * others still render, and the error banner only appears if all four fail.
 */
export const useAdminQuickAccess = () => {
    const [period, setPeriod] = useState<QuickAccessPeriod>("all");
    const [stats, setStats] = useState<QuickAccessStats>(EMPTY_STATS);
    const [error, setError] = useState<string | null>(null);
    // The period whose counts `stats` currently reflect (null until the first
    // fetch resolves). Loading is derived from it rather than set synchronously,
    // so the effect never triggers a cascading render.
    const [loadedPeriod, setLoadedPeriod] = useState<QuickAccessPeriod | null>(null);
    const loading = loadedPeriod !== period;

    useEffect(() => {
        // Per-run cancellation flag: a period change starts a new effect and marks
        // the previous run cancelled, so a slow response can't clobber newer counts.
        let cancelled = false;

        const datePrefix = computeDatePrefix(period);
        const dateFilter = (field: string): SearchFilter[] =>
            datePrefix ? [{ field, operator: "LIKE", value: datePrefix }] : [];

        (async () => {
            const results = await Promise.allSettled([
                searchProjects({ page: 1, limit: 1, filters: dateFilter("project_creation_utc_date_time") }),
                searchUsers({ page: 1, limit: 1, filters: dateFilter("user_creation_utc_date_time") }),
                searchProjectTasks({
                    page: 1,
                    limit: 1,
                    // An explicit sort_by is required: omitting it lets the backend fall back to its
                    // bogus default `asc(user_id)` (a copy-paste from the users search), whose ORDER BY
                    // makes the tasks query 500. desc(task_id) is the same valid sort the Tasks page uses.
                    sort_by: "desc(task_id)",
                    // The backend resolves the task_type labels to their ids before filtering
                    // (search-tasks.ts → applyTaskTypeFilter), so an IN on the labels is safe.
                    filters: [
                        { field: "task_type", operator: "IN", value: [...EXPORT_TASK_TYPE_LABELS] },
                        ...dateFilter("task_creation_utc_date_time"),
                    ],
                }),
                searchProjectTasks({ page: 1, limit: 1, sort_by: "desc(task_id)", filters: dateFilter("task_creation_utc_date_time") }),
            ]);

            if (cancelled) return;

            const [projectsRes, usersRes, exportsRes, tasksRes] = results;
            setStats({
                projects: totalFrom(projectsRes),
                users: totalFrom(usersRes),
                exports: totalFrom(exportsRes),
                tasks: totalFrom(tasksRes),
            });

            if (results.every((result) => result.status === "rejected")) {
                console.error("[Admin Quick Access] all counters failed", results);
                setError("Failed to load the administration statistics.");
            } else {
                setError(null);
            }

            setLoadedPeriod(period);
        })();

        return () => { cancelled = true; };
    }, [period]);

    return { stats, loading, error, period, setPeriod };
};
