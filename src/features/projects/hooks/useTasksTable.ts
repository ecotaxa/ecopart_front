import { useCallback, useState } from "react";

import { useServerTable } from "@/shared/hooks/useServerTable";
import type { ServerFields } from "@/shared/hooks/useServerGridModels";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { deleteProjectTask, downloadTaskFile, type SearchFilter, searchProjectTasks, type Task } from "../api/projects.api";
import { isDeletableTask } from "../utils/taskColumns";

// Stable default so callers that pass no extra filters don't get a fresh array
// reference every render (which would make the query key unstable → refetch loop).
const NO_EXTRA_FILTERS: SearchFilter[] = [];

/**
 * What the task search can sort and filter on, per column of the task grids. The
 * label, owner and status filter on the text the columns show (resolved by the
 * backend) but are not sorted: the backend would sort on their ids. The "Last
 * update" column shows `task_last_update` (end date, else creation date).
 */
const TASK_FIELDS: ServerFields = {
    task_id: { sort: "task_id", filter: "task_id", type: "number" },
    task_type: { filter: "task_type" },
    task_owner: { filter: "task_owner" },
    task_status: { filter: "task_status" },
    task_creation_utc_date_time: { sort: "task_creation_utc_date_time" },
    task_end_utc_date_time: { sort: "task_last_update" },
};

// An explicit sort_by is required: omitting it lets the backend fall back to its
// bogus default `asc(user_id)`, whose ORDER BY makes the query 500. task_id keeps
// the order stable across pages on equal dates.
const TASKS_DEFAULT_SORT = "desc(task_last_update),desc(task_id)";

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
 * Searchable attributes: task_id (exact), task_status and task_type (LIKE on
 * their label, resolved to ids by the backend) and task_owner (LIKE on the
 * "First Last (email)" string the Owner column shows).
 *
 * `extraFilters` must be memoized by the caller so it stays referentially stable.
 */
export const useTasksTable = (
    extraFilters: SearchFilter[] = NO_EXTRA_FILTERS,
    { projectId, defaultAttribute = "task_status" }: UseTasksTableOptions = {},
) => {
    const table = useServerTable<Task>({
        queryKey: [...TASKS_QUERY_KEY, { projectId: projectId ?? null }],
        fetchPage: async ({ page, limit, filters, sort_by }) => {
            const response = await searchProjectTasks({
                // Only set when scoped: an explicit `undefined` would still be a key the
                // global search must not carry.
                ...(projectId !== undefined ? { projectId } : {}),
                page,
                limit,
                sort_by,
                filters,
            });
            return { rows: response.tasks ?? [], total: response.search_info?.total ?? 0 };
        },
        defaultAttribute,
        numericAttributes: ["task_id"],
        extraFilters,
        serverFields: TASK_FIELDS,
        defaultSort: TASKS_DEFAULT_SORT,
    });

    const { runBulkAction, showSnackbar, rows, selectedIds } = table;

    // The backend only lets an admin delete a task.
    const canDeleteTasks = useAuthStore((state) => state.user?.is_admin === true);

    // A task still running (or being cancelled) is cancelled, not deleted, so
    // DELETE stays disabled while the selection holds one. Selected ids whose row
    // is no longer loaded are left for the server to accept or reject.
    const canDeleteSelection = canDeleteTasks && selectedIds.length > 0 && selectedIds.every((taskId) => {
        const task = rows.find((row) => row.task_id === taskId);
        return !task || isDeletableTask(task);
    });

    const handleDeleteTasks = useCallback(() => runBulkAction({
        action: (taskId) => deleteProjectTask(taskId),
        confirm: {
            title: "Delete tasks",
            message: "This removes the selected background tasks, their logs and the archives of the export tasks, with their copy in the FTP export folder. It does not undo work a completed task already performed. This cannot be undone.",
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
        gridProps: table.gridProps,
        serverColumns: table.serverColumns,
        selectedTasks: table.selectionModel,
        setSelectedTasks: table.setSelectionModel,
        selectionCount: table.selectionCount,
        searchText: table.searchText,
        setSearchText: table.setSearchText,
        searchAttribute: table.searchAttribute,
        setSearchAttribute: table.setSearchAttribute,
        isActionRunning: table.isActionRunning,
        canDeleteTasks,
        canDeleteSelection,
        handleDeleteTasks,
        downloadingTaskId,
        handleDownloadTaskFile,
        snackbar: table.snackbar,
        closeSnackbar: table.closeSnackbar,
    };
};
