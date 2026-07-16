import { useState, useEffect, useCallback } from "react";
import { AlertColor } from "@mui/material";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";

import type { SearchFilter } from "@/features/projects/api/projects.api";
import { AdminUser, searchUsers, setUserAdmin } from "../api/adminUsers.api";

/**
 * Hook backing the admin USERS tab.
 *
 * Mirrors `useTasksTable`: server-side pagination + debounced attribute search
 * against POST /users/searches, checkbox selection, and a snackbar. Adds the
 * admin bulk action `handleSetAdmin` (grant/revoke admin on the selection).
 */
export const useAdminUsersTable = () => {
    const createEmptySelectionModel = (): GridRowSelectionModel => ({ type: "include", ids: new Set() });

    const getSelectionCount = (selectionModel: GridRowSelectionModel, totalCount: number): number => {
        return selectionModel.type === "exclude"
            ? Math.max(totalCount - selectionModel.ids.size, 0)
            : selectionModel.ids.size;
    };

    const getSelectedUserIds = (selectionModel: GridRowSelectionModel): number[] => {
        if (selectionModel.type === "exclude") {
            console.warn("[Admin Users] Exclude selection model is disabled for this grid.");
            return [];
        }

        return Array.from(selectionModel.ids).map(Number);
    };

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [totalRows, setTotalRows] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [searchText, setSearchText] = useState<string>("");
    const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
    // last_name (Name), email, organisation and country are LIKE attributes;
    // user_id is an exact numeric match.
    const [searchAttribute, setSearchAttribute] = useState<string>("last_name");

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });
    const [selectedUsers, setSelectedUsers] = useState<GridRowSelectionModel>(createEmptySelectionModel());
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

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: SearchFilter[] = [];
            if (debouncedSearchText) {
                if (searchAttribute === "user_id") {
                    // user_id is a numeric exact-match column: only accept fully-numeric
                    // input (parseInt would otherwise turn "42abc" into 42).
                    const trimmed = debouncedSearchText.trim();
                    if (/^\d+$/.test(trimmed)) {
                        filters.push({ field: "user_id", operator: "=", value: Number(trimmed) });
                    }
                } else {
                    filters.push({ field: searchAttribute, operator: "LIKE", value: `%${debouncedSearchText}%` });
                }
            }

            const response = await searchUsers({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                sort_by: "desc(user_id)",
                filters,
            });

            setUsers(response.users || []);
            setTotalRows(response.search_info?.total || 0);
        } catch (err) {
            console.error("[Admin Users] fetch failed", err);
            setUsers([]);
            setTotalRows(0);
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [paginationModel.page, paginationModel.pageSize, debouncedSearchText, searchAttribute]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const showSnackbar = (message: string, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    /** Grant (makeAdmin=true) or revoke (false) admin rights on the selection. */
    const handleSetAdmin = async (makeAdmin: boolean) => {
        const selectedIds = getSelectedUserIds(selectedUsers);
        if (selectedIds.length === 0) return;

        const verb = makeAdmin ? "grant admin rights to" : "revoke admin rights from";
        if (!window.confirm(`Are you sure you want to ${verb} ${selectedIds.length} user(s)?`)) return;

        setIsActionRunning(true);
        try {
            // Attempt every update (a single failure must not abort the rest),
            // then keep only the users that actually failed selected so a retry
            // targets just those.
            const results = await Promise.allSettled(
                selectedIds.map((userId) => setUserAdmin(userId, makeAdmin)),
            );
            const failedIds = selectedIds.filter((_, i) => results[i].status === "rejected");

            if (failedIds.length === 0) {
                showSnackbar(makeAdmin ? "Admin rights granted." : "Admin rights revoked.", "success");
            } else {
                console.error("[Admin Users] Some admin updates failed:", failedIds);
                showSnackbar("Failed to update some users.", "error");
            }

            setSelectedUsers(
                failedIds.length > 0
                    ? { type: "include", ids: new Set<number>(failedIds) }
                    : createEmptySelectionModel(),
            );
            fetchUsers();
        } finally {
            setIsActionRunning(false);
        }
    };

    return {
        users,
        loading,
        totalRows,
        error,
        paginationModel,
        setPaginationModel,
        selectedUsers,
        setSelectedUsers,
        selectionCount: getSelectionCount(selectedUsers, totalRows),
        searchText,
        setSearchText,
        searchAttribute,
        setSearchAttribute,
        isActionRunning,
        handleSetAdmin,
        snackbar,
        closeSnackbar,
    };
};
