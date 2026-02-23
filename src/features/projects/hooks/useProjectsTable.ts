import { useState, useEffect } from "react";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { searchProjects, Project } from "../api/projects.api";

export const useProjectsTable = () => {
    // --- 1. STATES ---
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);

    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    
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

    // --- 3. FIX: PAGINATION RESET LOGIC ---
    // If the user types a new search or changes a filter, we MUST go back to page 1 (index 0)
    // Otherwise, if they are on page 4 and search for something that has only 1 page, the grid crashes/empties.
    useEffect(() => {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, [debouncedSearchText, selectedFilter]);

    // --- 4. FETCH LOGIC ---
    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await searchProjects({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                search_text: debouncedSearchText,
                // FIX: We now send the filter to the API!
                status_filter: selectedFilter === "All" ? undefined : selectedFilter,
            });

            if (response) {
                setProjects(response.projects || []);
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

    // Trigger fetch when pagination, debounced text, or filter changes
    useEffect(() => {
        fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paginationModel.page, paginationModel.pageSize, debouncedSearchText, selectedFilter]);

    // --- 5. EXPORT EVERYTHING THE UI NEEDS ---
    return {
        // Data
        projects,
        loading,
        totalRows,
        // Search
        searchText,
        setSearchText,
        // Filter
        selectedFilter,
        setSelectedFilter,
        // Pagination
        paginationModel,
        setPaginationModel,
        // Selection
        rowSelectionModel,
        setRowSelectionModel,
    };
};