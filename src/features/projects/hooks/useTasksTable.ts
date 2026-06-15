import { useState, useEffect, useCallback } from "react";
import { AlertColor } from "@mui/material";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";

import { deleteProjectTask, SearchFilter, searchProjectTasks, Task } from "../api/projects.api";

/**
 * Hook backing the global Tasks page (`/tasks`).
 *
 * Unlike `useProjectTasksTab`, it does NOT scope the search to a single project:
 * it calls `searchProjectTasks` WITHOUT `projectId` and WITHOUT a `for_managing`
 * filter, so the backend's own `applyUserCanGetFilter` restricts the result to
 * tasks of the projects the current user has access to (admins see everything).
 */
export const useTasksTable = () => {
    const createEmptySelectionModel = (): GridRowSelectionModel => ({ type: "include", ids: new Set() });

    const getSelectionCount = (selectionModel: GridRowSelectionModel, totalCount: number): number => {
        return selectionModel.type === "exclude"
            ? Math.max(totalCount - selectionModel.ids.size, 0)
            : selectionModel.ids.size;
    };

    const getSelectedTaskIds = (selectionModel: GridRowSelectionModel): number[] => {
        if (selectionModel.type === "exclude") {
            console.warn("[Tasks Page] Exclude selection model is disabled for this grid.");
            return [];
        }

        return Array.from(selectionModel.ids).map(Number);
    };

    const [tasks, setTasks] = useState<Task[]>([]);
    const [totalRows, setTotalRows] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [searchText, setSearchText] = useState<string>("");
    const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
    // Only task_status (resolved via its label) and task_id (exact) are accepted by
    // the backend task search; task_type/task_owner/task_progress_msg are rejected
    // or buggy server-side, so they are not offered as search attributes.
    const [searchAttribute, setSearchAttribute] = useState<string>("task_status");

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });
    const [selectedTasks, setSelectedTasks] = useState<GridRowSelectionModel>(createEmptySelectionModel());
    const [isActionRunning, setIsActionRunning] = useState<boolean>(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchText(searchText);
        }, 500);

        return () => clearTimeout(timerId);
    }, [searchText]);

    useEffect(() => {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, [debouncedSearchText, searchAttribute]);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: SearchFilter[] = [];
            if (debouncedSearchText) {
                if (searchAttribute === "task_id") {
                    // task_id is a numeric exact-match column: ignore non-numeric input.
                    const parsedId = Number.parseInt(debouncedSearchText, 10);
                    if (!Number.isNaN(parsedId)) {
                        filters.push({ field: "task_id", operator: "=", value: parsedId });
                    }
                } else {
                    // task_status is resolved server-side via its label (LIKE, case-insensitive).
                    filters.push({ field: searchAttribute, operator: "LIKE", value: `%${debouncedSearchText}%` });
                }
            }

            // No projectId and no for_managing: the backend scopes the result to the
            // current user's accessible projects (applyUserCanGetFilter).
            const response = await searchProjectTasks({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                sort_by: "desc(task_id)",
                filters,
            });

            setTasks(response.tasks || []);
            setTotalRows(response.search_info?.total || 0);
        } catch (err) {
            console.error("[Tasks Page] fetch failed", err);
            setTasks([]);
            setTotalRows(0);
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [paginationModel.page, paginationModel.pageSize, debouncedSearchText, searchAttribute]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        const handler = () => fetchTasks();
        window.addEventListener("ecopart:tasks:refresh", handler);
        return () => window.removeEventListener("ecopart:tasks:refresh", handler);
    }, [fetchTasks]);

    const showSnackbar = (message: string, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const handleDeleteTasks = async () => {
        const selectedIds = getSelectedTaskIds(selectedTasks);
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} tasks?`)) return;

        setIsActionRunning(true);
        try {
            for (const taskId of selectedIds) {
                await deleteProjectTask(taskId);
            }

            showSnackbar("Selected tasks removed successfully.", "success");
            setSelectedTasks(createEmptySelectionModel());
            fetchTasks();
        } catch (err) {
            console.error("[Tasks Page] Delete batch operation failed:", err);
            showSnackbar("Failed to clean up some server tasks.", "error");
        } finally {
            setIsActionRunning(false);
        }
    };

    return {
        tasks,
        loading,
        totalRows,
        error,
        paginationModel,
        setPaginationModel,
        selectedTasks,
        setSelectedTasks,
        selectionCount: getSelectionCount(selectedTasks, totalRows),
        searchText,
        setSearchText,
        searchAttribute,
        setSearchAttribute,
        isActionRunning,
        handleDeleteTasks,
        snackbar,
        closeSnackbar,
    };
};
