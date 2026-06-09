import { useState, useEffect, useCallback } from "react";
import { AlertColor } from "@mui/material";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";

import { deleteProjectTask, SearchFilter, searchProjectTasks, Task } from "../api/projects.api";

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

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    const buildTasksFilters = (): SearchFilter[] => {
        const activeFilters: SearchFilter[] = [];

        if (debouncedSearchText) {
            activeFilters.push({
                field: searchAttribute,
                operator: "LIKE",
                value: `%${debouncedSearchText}%`,
            });
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
            for (const taskId of selectedIds) {
                await deleteProjectTask(taskId);
            }

            showSnackbar("Selected tasks removed successfully.", "success");
            setSelectedTasks(createEmptySelectionModel());
            fetchTasks();
        } catch (error) {
            console.error("[Tasks Hook] Delete batch operation failed:", error);
            showSnackbar("Failed to clean up some server tasks.", "error");
        } finally {
            setIsActionRunning(false);
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
        snackbar,
        closeSnackbar,
    };
};