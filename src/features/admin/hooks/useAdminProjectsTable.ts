import { createElement, useCallback } from "react";

import { useServerTable } from "@/shared/hooks/useServerTable";
import { ConfirmWarningMessage } from "@/shared/components/ConfirmWarningMessage";
import {
    PROJECTS_ROOT_QUERY_KEY,
    deleteProject,
    enrichProjectsWithSampleCounts,
    type Project,
    type SearchFilter,
    searchProjects,
} from "@/features/projects/api/projects.api";

// Stable default so callers that pass no extra filters don't get a fresh array
// reference every render (which would make the query key unstable → refetch loop).
const NO_EXTRA_FILTERS: SearchFilter[] = [];

// project_title, project_acronym, instrument_model, ... are LIKE attributes.
// project_id, managers and members are numeric exact matches: the backend
// resolves managers/members to the projects where that user id has the
// privilege (operator "=", numeric value — see search-projects.ts).
const NUMERIC_ATTRIBUTES = ["project_id", "managers", "members"] as const;

/**
 * Hook backing the admin PROJECTS tab.
 *
 * Unlike the user-facing `useProjectsTable`, it deliberately omits the
 * `for_managing` scoping filter: the backend project search is unscoped by
 * default, so an admin sees EVERY project. Rows are enriched with their sample
 * totals the same way, and `handleDeleteProjects` is the bulk DELETE action.
 *
 * `extraFilters` are merged into every request on top of the attribute search —
 * used to pre-scope the list to a set of user ids (granted_users → projects where
 * the user is manager OR member) when opened from the admin USERS tab. Callers
 * must memoize the array so it stays referentially stable across renders.
 */
export const useAdminProjectsTable = (extraFilters: SearchFilter[] = NO_EXTRA_FILTERS) => {
    const table = useServerTable<Project>({
        queryKey: [...PROJECTS_ROOT_QUERY_KEY, "list", "admin"],
        fetchPage: async ({ page, limit, filters }) => {
            const response = await searchProjects({ page, limit, filters, sort_by: "desc(project_id)" });
            return { rows: response.projects ?? [], total: response.search_info?.total ?? 0 };
        },
        defaultAttribute: "project_title",
        numericAttributes: NUMERIC_ATTRIBUTES,
        extraFilters,
        enrich: enrichProjectsWithSampleCounts,
    });

    const { runBulkAction } = table;

    /** Delete every project in the current selection (after confirmation). */
    const handleDeleteProjects = useCallback(() => runBulkAction({
        action: deleteProject,
        confirm: {
            title: "Delete projects",
            message: createElement(ConfirmWarningMessage, null,
                "This also deletes their samples and any linked EcoTaxa project. This cannot be undone."),
            confirmLabel: "Delete",
        },
        successMessage: "Project(s) deleted.",
        failureMessage: "Failed to delete some projects.",
    }), [runBulkAction]);

    return {
        projects: table.rows,
        loading: table.loading,
        totalRows: table.totalRows,
        error: table.error,
        paginationModel: table.paginationModel,
        setPaginationModel: table.setPaginationModel,
        selectedProjects: table.selectionModel,
        setSelectedProjects: table.setSelectionModel,
        selectedProjectIds: table.selectedIds,
        selectionCount: table.selectionCount,
        searchText: table.searchText,
        setSearchText: table.setSearchText,
        searchAttribute: table.searchAttribute,
        setSearchAttribute: table.setSearchAttribute,
        isActionRunning: table.isActionRunning,
        handleDeleteProjects,
        snackbar: table.snackbar,
        closeSnackbar: table.closeSnackbar,
    };
};
