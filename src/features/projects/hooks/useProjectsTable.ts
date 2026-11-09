import { createElement, useCallback, useMemo, useState } from "react";

import { useServerTable } from "@/shared/hooks/useServerTable";
import { ConfirmWarningMessage } from "@/shared/components/ConfirmWarningMessage";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
    PROJECTS_ROOT_QUERY_KEY,
    deleteProjectAndWait,
    enrichProjectsWithQcStates,
    enrichProjectsWithSampleCounts,
    type Project,
    type SearchFilter,
    searchProjects,
} from "../api/projects.api";
import { privacySearchFilters, type PrivacyFilterValue } from "../utils/projectAccess";

/**
 * The scoping choices of the "My projects" filter menu. "All" is every project
 * the user holds a privilege on; "Everything" is every project of the platform.
 */
export type ProjectsScope = "All" | "Manager" | "Validated" | "Everything";

/** Attributes searched with an exact numeric match rather than `LIKE`. */
const NUMERIC_ATTRIBUTES = ["project_id"] as const;

/** Sample totals and QC state of a page of projects, fetched side by side. */
async function enrichProjects(projects: Project[]): Promise<Project[]> {
    const [counted, checked] = await Promise.all([
        enrichProjectsWithSampleCounts(projects),
        enrichProjectsWithQcStates(projects),
    ]);
    return counted.map((project, index) => ({
        ...project,
        qc_state: checked[index].qc_state,
        qc_warnings: checked[index].qc_warnings,
    }));
}

/**
 * Hook backing the user-facing Projects page (`/projects`).
 *
 * By default every request is scoped to projects the current user holds a
 * privilege on (`for_managing`), or strictly to the ones they manage; the
 * "Everything" scope drops that filter (the backend lists every project to any
 * logged-in user, data access then follows the privacy status). The rows are
 * enriched with their sample totals (see `enrichProjectsWithSampleCounts`) and
 * their QC state (see `enrichProjectsWithQcStates`).
 */
export const useProjectsTable = () => {
    const currentUser = useAuthStore((state) => state.user);

    // Default to "All" which is safely scoped to the user's projects
    const [selectedFilter, setSelectedFilter] = useState<ProjectsScope>("All");
    // Applies on top of every scope.
    const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilterValue>("any");

    // SECURITY & SCOPING FILTERS: translate the UI selection into backend queries.
    const scopeFilters = useMemo<SearchFilter[]>(() => {
        if (!currentUser || selectedFilter === "Everything") return [];
        if (selectedFilter === "Manager") {
            // Strictly filter to projects where the user is a manager
            return [{ field: "managers", operator: "=", value: currentUser.user_id }];
        }
        // For "All" or "Validated", we still restrict visibility to projects
        // where the user has at least one privilege (Manager, Member, or Contact)
        const filters: SearchFilter[] = [{ field: "for_managing", operator: "=", value: true }];
        // "Validated QC": the projects whose STATS tab raises no warning (the QC state column shows a check).
        if (selectedFilter === "Validated") {
            filters.push({ field: "qc_state", operator: "=", value: "ok" });
        }
        return filters;
    }, [currentUser, selectedFilter]);

    const extraFilters = useMemo<SearchFilter[]>(
        () => [...scopeFilters, ...privacySearchFilters(privacyFilter)],
        [scopeFilters, privacyFilter],
    );

    const table = useServerTable<Project>({
        queryKey: [...PROJECTS_ROOT_QUERY_KEY, "list", "mine", { userId: currentUser?.user_id ?? null }],
        fetchPage: async ({ page, limit, filters }) => {
            const response = await searchProjects({ page, limit, filters, sort_by: "desc(project_id)" });
            return { rows: response.projects ?? [], total: response.search_info?.total ?? 0 };
        },
        defaultAttribute: "project_title",
        numericAttributes: NUMERIC_ATTRIBUTES,
        extraFilters,
        // Nothing to scope to until the user is loaded into the store.
        enabled: currentUser !== null,
        enrich: enrichProjects,
    });

    const { runBulkAction } = table;

    /**
     * Delete every project in the current selection (after confirmation).
     *
     * Each deletion runs as a task: the projects exist until their task is DONE, so
     * the outcome is only reported once every task has ended. Server-side this is
     * restricted to the project managers (and admins); only the projects whose
     * deletion was refused or whose task failed stay selected, so a retry targets
     * just those.
     */
    const handleDeleteProjects = useCallback(() => runBulkAction({
        action: (projectId, signal) => deleteProjectAndWait(projectId, { signal }),
        confirm: {
            title: "Delete projects",
            message: createElement(ConfirmWarningMessage, null,
                "This also deletes their samples and any linked EcoTaxa project. This cannot be undone."),
            confirmLabel: "Delete",
        },
        successMessage: "Project(s) deleted.",
        failureMessage: "Failed to delete some projects: they stay selected, see their deletion task in the TASKS page.",
    }), [runBulkAction]);

    return {
        projects: table.rows,
        loading: table.loading,
        totalRows: table.totalRows,
        error: table.error,
        searchText: table.searchText,
        setSearchText: table.setSearchText,
        searchAttribute: table.searchAttribute,
        setSearchAttribute: table.setSearchAttribute,
        selectedFilter,
        setSelectedFilter,
        privacyFilter,
        setPrivacyFilter,
        paginationModel: table.paginationModel,
        setPaginationModel: table.setPaginationModel,
        rowSelectionModel: table.selectionModel,
        setRowSelectionModel: table.setSelectionModel,
        isActionRunning: table.isActionRunning,
        handleDeleteProjects,
        snackbar: table.snackbar,
        closeSnackbar: table.closeSnackbar,
    };
};
