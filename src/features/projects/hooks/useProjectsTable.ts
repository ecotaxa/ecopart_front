import { useState, useEffect, useCallback, useRef } from "react";
import { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { searchProjects, searchProjectSamples, Project, SearchFilter } from "../api/projects.api";
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

    // Monotonic id identifying the latest fetch. The async sample-count enrichment
    // checks this before applying so a slow count batch can't clobber the rows of a
    // newer search/pagination request.
    const fetchRequestId = useRef(0);

    // Enrich the freshly-fetched projects with their server sample totals.
    // The project-search endpoint does not return a count, so we ask the samples
    // search endpoint for `search_info.total` (limit=1, one lightweight request per row).
    const enrichWithSampleCounts = useCallback(async (baseProjects: Project[], requestId: number) => {
        if (baseProjects.length === 0) return;

        const results = await Promise.allSettled(
            baseProjects.map((project) =>
                searchProjectSamples(project.project_id, { page: 1, limit: 1, filters: [] }),
            ),
        );

        // Drop the result if a newer fetch has started in the meantime.
        if (requestId !== fetchRequestId.current) return;

        const enriched = baseProjects.map((project, index) => {
            const result = results[index];
            // Only override the count when the samples search actually returned a
            // numeric total. A failed request or a response without `search_info`
            // leaves nbr_sample undefined so the grid shows "—" (unknown) rather
            // than a misleading "0".
            const total =
                result.status === "fulfilled" ? result.value.search_info?.total : undefined;
            return typeof total === "number" ? { ...project, nbr_sample: total } : project;
        });

        setProjects(enriched);
    }, []);

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

        const requestId = ++fetchRequestId.current;

        setLoading(true);
        setError(null);

        try {
            const activeFilters: SearchFilter[] = [];

            // 1. DYNAMIC ATTRIBUTE SEARCH
            if (debouncedSearchText) {
                if (searchAttribute === "project_id") {
                    // Exact match for numeric project ID
                    const parsed = Number.parseInt(debouncedSearchText, 10);
                    if (!Number.isNaN(parsed)) {
                        activeFilters.push({
                            field: "project_id",
                            operator: "=",
                            value: parsed,
                        });
                    }
                } else {
                    activeFilters.push({
                        field: searchAttribute,
                        operator: "LIKE",
                        value: `%${debouncedSearchText}%`
                    });
                }
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
                filters: activeFilters,
                sort_by: "desc(project_id)"
            });

            if (response && response.projects) {
                // Render rows immediately, then backfill the sample counts.
                setProjects(response.projects);
                setTotalRows(response.search_info?.total || 0);
                void enrichWithSampleCounts(response.projects, requestId);
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
    }, [debouncedSearchText, searchAttribute, selectedFilter, paginationModel.page, paginationModel.pageSize, currentUser, enrichWithSampleCounts]);

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