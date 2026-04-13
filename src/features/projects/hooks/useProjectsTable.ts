import { useState, useEffect, useCallback } from "react";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { searchProjects, Project, SearchFilter } from "../api/projects.api";
import { useAuthStore } from "@/features/auth/store/auth.store";

export const useProjectsTable = () => {
    // State to hold the current authenticated user directly in the hook
    const currentUser = useAuthStore((state) => state.user);

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);

    const [error, setError] = useState<string | null>(null);

    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");

    const [searchAttribute, setSearchAttribute] = useState<string>("project_title");

    // Default to "All" which will now be safely scoped to the user's projects
    const [selectedFilter, setSelectedFilter] = useState<string>("All");

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });

    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
        type: "include",
        ids: new Set(),
    });

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchText(searchText);
        }, 500);
        return () => clearTimeout(timerId);
    }, [searchText]);

    useEffect(() => {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, [debouncedSearchText, selectedFilter, searchAttribute]);

    const fetchProjects = useCallback(async () => {
        // Guard clause to prevent fetching if the user is not yet loaded into the store
        if (!currentUser) return;

        setLoading(true);
        setError(null);

        try {
            const activeFilters: SearchFilter[] = [];

            // 1. DYNAMIC ATTRIBUTE SEARCH
            if (debouncedSearchText) {
                activeFilters.push({
                    field: searchAttribute,
                    operator: "LIKE",
                    value: `%${debouncedSearchText}%`
                });
            }

            // 2. SECURITY & SCOPING FILTERS
            // We translate the UI selection into backend security queries
            if (selectedFilter === "Manager") {
                // Strictly filter to projects where the user is a manager
                activeFilters.push({
                    field: "managers",
                    operator: "=",
                    value: currentUser.user_id
                });
            } else {
                // For "All" or "Validated", we still restrict visibility to projects 
                // where the user has at least one privilege (Manager, Member, or Contact)
                activeFilters.push({
                    field: "for_managing",
                    operator: "=",
                    value: true
                });

                if (selectedFilter === "Validated") {
                    // Note: Ensure 'qc_state' is added to the backend's allowed filters list
                    activeFilters.push({
                        field: "qc_state",
                        operator: "=",
                        value: "validated"
                    });
                }
            }

            const response = await searchProjects({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                filters: activeFilters
            });

            if (response && response.projects) {
                setProjects(response.projects);
                setTotalRows(response.search_info?.total || 0);
            } else {
                setProjects([]);
                setTotalRows(0);
            }
        } catch (err: unknown) {
            console.error("Failed to fetch projects", err);

            let errorMessage = "Unknown error while fetching projects.";
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === "string") {
                errorMessage = err;
            } else if (typeof err === "object" && err !== null) {
                const errorObj = err as Record<string, unknown>;
                if (Array.isArray(errorObj.errors)) {
                    errorMessage = errorObj.errors.join(", ");
                }
            }

            setError(errorMessage);
            setProjects([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchText, searchAttribute, selectedFilter, paginationModel.page, paginationModel.pageSize, currentUser]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    return {
        projects, loading, totalRows,
        error,
        searchText, setSearchText,
        searchAttribute, setSearchAttribute,
        selectedFilter, setSelectedFilter,
        paginationModel, setPaginationModel,
        rowSelectionModel, setRowSelectionModel,
    };
};