import { useState, useEffect, useCallback } from "react";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { searchProjects, Project, SearchFilter } from "../api/projects.api";

export const useProjectsTable = () => {
    // --- 1. STATES ---
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);

    // NEW: Explicit error state to display backend failures in the UI
    const [error, setError] = useState<string | null>(null);

    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    
    // We add a state to track WHICH column the user wants to search in.
    // Default is "project_title" matching the DB column.
    const [searchAttribute, setSearchAttribute] = useState<string>("project_title");
    
    const [selectedFilter, setSelectedFilter] = useState<string>("All");

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });

    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
        type: "include",
        ids: new Set(),
    });

    // --- 2. DEBOUNCE LOGIC ---
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchText(searchText);
        }, 500);
        return () => clearTimeout(timerId);
    }, [searchText]);

    // --- 3. PAGINATION RESET LOGIC ---
    useEffect(() => {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    // FIX: Also reset pagination if the search attribute changes
    }, [debouncedSearchText, selectedFilter, searchAttribute]);

    // --- 4. FETCH LOGIC ---
    // Wrapped in useCallback to ensure the function reference remains stable
    // across renders unless its dependencies change. This resolves the ESLint warning.
    const fetchProjects = useCallback(async () => {
        setLoading(true);
        // NEW: Clear previous error before a new request
        setError(null);

        try {
            const activeFilters: SearchFilter[] = [];

            // Dynamic attribute search
            if (debouncedSearchText) {
                activeFilters.push({
                    // Instead of hardcoding "project_title", we use the state from the dropdown!
                    field: searchAttribute, 
                    operator: "LIKE",       
                    value: `%${debouncedSearchText}%` 
                });
            }

            // EXPLANATION OF WHY 'qc_state' FAILS:
            // Your backend 'filter_params_restricted' array DOES NOT include 'qc_state'.
            // If we send it, the backend throws a 401 error.
            // For now, I am logging a warning instead of crashing the API.
            if (selectedFilter !== "All") {
                console.warn("Backend does not support filtering by qc_state yet. Skipping this filter in API call.");
                /* // UNCOMMENT THIS WHEN BACKEND SUPPORTS IT
                activeFilters.push({
                    field: "qc_state", 
                    operator: "=", 
                    value: selectedFilter 
                });
                */
            }

            const response = await searchProjects({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                filters: activeFilters
            });

            // NEW: Helpful debug log to inspect the real backend response
            console.log("[Projects] search response:", response);

            if (response && response.projects) {
                setProjects(response.projects);
                setTotalRows(response.search_info?.total || 0);
            } else {
                setProjects([]);
                setTotalRows(0);
            }
        } catch (err: any) {
            console.error("Failed to fetch projects", err);
            
            // NEW: Extract the error message from the API response if possible
            // Our custom http client usually throws the backend error directly, 
            // or an Error object. We try to catch both.
            let errorMessage = "Unknown error while fetching projects.";
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === "string") {
                errorMessage = err;
            } else if (err?.errors && Array.isArray(err.errors)) {
                // If backend sends { errors: ["Cannot find privileges"] }
                errorMessage = err.errors.join(", ");
            }

            // Keep the table empty but also expose the backend error
            setError(errorMessage);
            setProjects([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchText, searchAttribute, selectedFilter, paginationModel.page, paginationModel.pageSize]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    return {
        projects, loading, totalRows,
        error, // Export the error state
        searchText, setSearchText,
        // Exporting the attribute states to the UI
        searchAttribute, setSearchAttribute, 
        selectedFilter, setSelectedFilter,
        paginationModel, setPaginationModel,
        rowSelectionModel, setRowSelectionModel,
    };
};