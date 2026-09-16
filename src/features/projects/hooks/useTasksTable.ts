import { useCallback, useState } from "react";

import { useServerTable } from "@/shared/hooks/useServerTable";
import { deleteProjectTask, downloadTaskFile, type SearchFilter, searchProjectTasks, type Task } from "../api/projects.api";

// Stable default so callers that pass no extra filters don't get a fresh array
// reference every render (which would make the query key unstable → refetch loop).
const NO_EXTRA_FILTERS: SearchFilter[] = [];

/** React Query key of every task list; invalidate it to refresh them all. */
export const TASKS_QUERY_KEY = ["tasks"] as const;

export interface UseTasksTableOptions {
    /**
     * Scope the search to one project (`task_project_id = …`). Without it the
     * backend's own `applyUserCanGetFilter` restricts the result to the tasks of
     * the projects the current user has access to (admins see everything).
     */
    projectId?: number;
    /** Attribute searched by default. */
    defaultAttribute?: string;
}

/**
 * Hook backing every task grid: the global Tasks page (`/tasks`), the admin
 * TASKS tab (with `extraFilters` pre-scoping the list to a set of task owners
 * / projects) and, through `useProjectTasksTab`, a project's TASKS tab.
 *
 * task_status (resolved via its label) and task_id (exact) are fully supported
 * by the backend task search. task_type (Label) and task_owner (Owner) are also
 * offered as LIKE attributes, but they only match once the backend filter bugs
 * are fixed (task_type filters on the id instead of the label; task_owner has
 * no SQL column).
 *
 * `extraFilters` must be memoized by the caller so it stays referentially stable.
 */
export const useTasksTable = (
    extraFilters: SearchFilter[] = NO_EXTRA_FILTERS,
    { projectId, defaultAttribute = "task_status" }: UseTasksTableOptions = {},
) => {
    const table = useServerTable<Task>({
        queryKey: [...TASKS_QUERY_KEY, { projectId: projectId ?? null }],
        fetchPage: async ({ page, limit, filters }) => {
            const response = await searchProjectTasks({
                // Only set when scoped: an explicit `undefined` would still be a key the
                // global search must not carry.
                ...(projectId !== undefined ? { projectId } : {}),
                page,
                limit,
                // An explicit sort_by is required: omitting it lets the backend fall back
                // to its bogus default `asc(user_id)`, whose ORDER BY makes the query 500.
                sort_by: "desc(task_id)",
                filters,
            });
            return { rows: response.tasks ?? [], total: response.search_info?.total ?? 0 };
        },
        defaultAttribute,
        numericAttributes: ["task_id"],
        extraFilters,
    });

    const { runBulkAction, showSnackbar } = table;

    const handleDeleteTasks = useCallback(() => runBulkAction({
        action: deleteProjectTask,
        confirm: {
            title: "Delete tasks",
            message: "This removes the selected background tasks and their logs. It does not undo work a completed task already performed. This cannot be undone.",
            confirmLabel: "Delete",
        },
        successMessage: "Selected tasks removed successfully.",
        failureMessage: "Failed to clean up some server tasks.",
    }), [runBulkAction]);

    const [downloadingTaskId, setDownloadingTaskId] = useState<number | null>(null);

    const handleDownloadTaskFile = useCallback(async (taskId: number) => {
        setDownloadingTaskId(taskId);
        try {
            await downloadTaskFile(taskId);
        } catch (error) {
            console.error("[Tasks] Download failed:", error);
            showSnackbar(
                error instanceof Error ? error.message : "Failed to download the export file.",
                "error",
            );
        } finally {
            setDownloadingTaskId(null);
        }
    }, [showSnackbar]);

    return {
        tasks: table.rows,
        loading: table.loading,
        totalRows: table.totalRows,
        error: table.error,
        refetch: table.refetch,
        paginationModel: table.paginationModel,
        setPaginationModel: table.setPaginationModel,
        selectedTasks: table.selectionModel,
        setSelectedTasks: table.setSelectionModel,
        selectionCount: table.selectionCount,
        searchText: table.searchText,
        setSearchText: table.setSearchText,
        searchAttribute: table.searchAttribute,
        setSearchAttribute: table.setSearchAttribute,
        isActionRunning: table.isActionRunning,
        handleDeleteTasks,
        downloadingTaskId,
        handleDownloadTaskFile,
        snackbar: table.snackbar,
        closeSnackbar: table.closeSnackbar,
    };
};
