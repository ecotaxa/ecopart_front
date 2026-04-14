import { useState, useEffect } from "react";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { searchProjects, Project, SearchFilter } from "../api/projects.api";

export const useProjectsTable = () => {
    // --- 1. STATES ---
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);

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
    const fetchProjects = async () => {
        setLoading(true);
        try {
            const activeFilters: SearchFilter[] = [];

            // FIX: Dynamic attribute search
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

            if (response && response.projects) {
                setProjects(response.projects);
                setTotalRows(response.search_info?.total || 0);
            } else {
                setProjects([]);
                setTotalRows(0);
            }
        } catch (error) {
            console.error("Failed to fetch projects", error);
            setProjects([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paginationModel.page, paginationModel.pageSize, debouncedSearchText, selectedFilter, searchAttribute]);

    return {
        projects, loading, totalRows,
        searchText, setSearchText,
        // Exporting the attribute states to the UI
        searchAttribute, setSearchAttribute, 
        selectedFilter, setSelectedFilter,
        paginationModel, setPaginationModel,
        rowSelectionModel, setRowSelectionModel,
    };
};