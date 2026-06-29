import { useState, useEffect, useCallback } from "react";
import { AlertColor } from "@mui/material";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";

import { deleteProjectTask, downloadTaskFile, SearchFilter, searchProjectTasks, Task } from "../api/projects.api";

export const useProjectTasksTab = (projectId: number) => {
    const createEmptySelectionModel = (): GridRowSelectionModel => ({ type: "include", ids: new Set() });

    const getSelectionCount = (selectionModel: GridRowSelectionModel, totalCount: number): number => {
        return selectionModel.type === "exclude"
            ? Math.max(totalCount - selectionModel.ids.size, 0)
            : selectionModel.ids.size;
    };

    const getSelectedTaskIds = (selectionModel: GridRowSelectionModel): number[] => {
        if (selectionModel.type === "exclude") {
            console.warn("[Tasks Hook] Exclude selection model is disabled for this grid.");
            return [];
        }

        return Array.from(selectionModel.ids).map(Number);
    };

    const [tasks, setTasks] = useState<Task[]>([]);
    const [totalRows, setTotalRows] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    const [searchText, setSearchText] = useState<string>("");
    const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
    const [searchAttribute, setSearchAttribute] = useState<string>("task_type");

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });
    const [selectedTasks, setSelectedTasks] = useState<GridRowSelectionModel>(createEmptySelectionModel());
    const [isActionRunning, setIsActionRunning] = useState<boolean>(false);
    const [downloadingTaskId, setDownloadingTaskId] = useState<number | null>(null);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    const buildTasksFilters = (): SearchFilter[] => {
        const activeFilters: SearchFilter[] = [];

        if (debouncedSearchText) {
            if (searchAttribute === "task_id") {
                // task_id is a numeric exact-match column: only accept fully-numeric
                // input (parseInt would otherwise turn "42abc" into 42).
                const trimmed = debouncedSearchText.trim();
                if (/^\d+$/.test(trimmed)) {
                    activeFilters.push({ field: "task_id", operator: "=", value: Number(trimmed) });
                }
            } else {
                // task_status is resolved server-side via its label; task_type / task_owner
                // are sent as LIKE too (these depend on a backend fix to actually match).
                activeFilters.push({
                    field: searchAttribute,
                    operator: "LIKE",
                    value: `%${debouncedSearchText}%`,
                });
            }
        }

        return activeFilters;
    };

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
        try {
            const response = await searchProjectTasks({
                projectId,
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                sort_by: "desc(task_id)",
                filters: buildTasksFilters(),
            });

            setTasks(response.tasks || []);
            setTotalRows(response.search_info?.total || 0);
        } catch (error) {
            console.error("[Tasks Hook] Core fetch failed:", error);
            setTasks([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [projectId, paginationModel.page, paginationModel.pageSize, debouncedSearchText, searchAttribute]);

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
            // Attempt every deletion (a single failure must not abort the rest),
            // then keep only the tasks that actually failed selected so a retry
            // targets just those instead of re-deleting already-removed ids.
            const results = await Promise.allSettled(
                selectedIds.map((taskId) => deleteProjectTask(taskId)),
            );
            const failedIds = selectedIds.filter((_, i) => results[i].status === "rejected");

            if (failedIds.length === 0) {
                showSnackbar("Selected tasks removed successfully.", "success");
            } else {
                console.error("[Tasks Hook] Some deletions failed:", failedIds);
                showSnackbar("Failed to clean up some server tasks.", "error");
            }

            setSelectedTasks(
                failedIds.length > 0
                    ? { type: "include", ids: new Set<number>(failedIds) }
                    : createEmptySelectionModel(),
            );
            // Always refetch so the grid reflects what was really removed.
            fetchTasks();
        } finally {
            setIsActionRunning(false);
        }
    };

    const handleDownloadTaskFile = async (taskId: number) => {
        setDownloadingTaskId(taskId);
        try {
            await downloadTaskFile(taskId);
        } catch (error) {
            console.error("[Tasks Hook] Download failed:", error);
            showSnackbar(
                error instanceof Error ? error.message : "Failed to download the export file.",
                "error",
            );
        } finally {
            setDownloadingTaskId(null);
        }
    };

    return {
        tasks,
        loading,
        totalRows,
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
        downloadingTaskId,
        handleDownloadTaskFile,
        snackbar,
        closeSnackbar,
    };
};