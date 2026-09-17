import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AlertColor } from "@mui/material";
import type { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";

import type { SearchFilter } from "@/shared/types/api";
import { confirmDialog, type ConfirmOptions } from "@/shared/confirm/confirm.store";
import { extractErrorMessage } from "@/shared/utils/errorMessage";
import { useDebounce } from "./useDebounce";

/** One page of rows as the backend returns it. */
export interface ServerTablePage<Row> {
    rows: Row[];
    total: number;
}

export interface ServerTableFetchParams {
    /** 1-based page number, as the backend expects it. */
    page: number;
    limit: number;
    /** The attribute search (if any) followed by the caller's extra filters. */
    filters: SearchFilter[];
}

export interface UseServerTableOptions<Row> {
    /**
     * React Query key identifying this table's data (e.g. `["tasks"]`). Page,
     * size and filters are appended automatically. Invalidating this key (from
     * anywhere) refetches the table.
     */
    queryKey: readonly unknown[];
    /** Loads one page. Called whenever the page, size or filters change. */
    fetchPage: (params: ServerTableFetchParams) => Promise<ServerTablePage<Row>>;
    /** Attribute searched by default (e.g. `"task_status"`). */
    defaultAttribute: string;
    /**
     * Attributes searched with an exact numeric match instead of `LIKE`: only
     * fully-numeric input produces a filter (parseInt would turn "42abc" into 42).
     */
    numericAttributes?: readonly string[];
    /**
     * Filters merged into every request on top of the attribute search (e.g.
     * a project scope). Must be referentially stable across renders (useMemo).
     */
    extraFilters?: SearchFilter[];
    /** Set to false to hold the fetch (e.g. until the current user is known). */
    enabled?: boolean;
    /**
     * Optional asynchronous enrichment of the rows of the current page (e.g.
     * per-row counts fetched separately). The bare rows render first and are
     * replaced when the enrichment resolves; a result belonging to a page that
     * is no longer displayed is dropped. Must be referentially stable.
     */
    enrich?: (rows: Row[]) => Promise<Row[]>;
    initialPageSize?: number;
}

export interface BulkActionOptions {
    /** The ids to act on (defaults to the current selection). */
    ids?: number[];
    /** The per-id request; one rejection must not abort the others. */
    action: (id: number) => Promise<unknown>;
    /** When set, the user is asked first and a refusal cancels everything. */
    confirm?: ConfirmOptions;
    successMessage: string;
    failureMessage: string;
}

const NO_FILTERS: SearchFilter[] = [];

const createEmptySelectionModel = (): GridRowSelectionModel => ({ type: "include", ids: new Set() });

/**
 * Everything a server-paginated MUI DataGrid screen needs, in one place:
 * debounced attribute search, pagination, checkbox selection, the fetch itself
 * (through React Query — cached, deduplicated, and immune to out-of-order
 * responses), and the confirm → run → report → refetch flow of bulk actions.
 *
 * The user-facing hooks (`useTasksTable`, `useProjectsTable`, the admin
 * tables…) are thin wrappers around this one.
 */
export function useServerTable<Row>({
    queryKey,
    fetchPage,
    defaultAttribute,
    numericAttributes = [],
    extraFilters = NO_FILTERS,
    enabled = true,
    enrich,
    initialPageSize = 10,
}: UseServerTableOptions<Row>) {
    const queryClient = useQueryClient();

    // --- Search -------------------------------------------------------------
    const [searchText, setSearchText] = useState("");
    const debouncedSearchText = useDebounce(searchText, 500);
    const [searchAttribute, setSearchAttribute] = useState(defaultAttribute);

    const searchFilters = useMemo<SearchFilter[]>(() => {
        const text = debouncedSearchText.trim();
        if (!text) return [];
        if (numericAttributes.includes(searchAttribute)) {
            // Numeric exact-match column: only fully-numeric input produces a filter.
            return /^\d+$/.test(text) ? [{ field: searchAttribute, operator: "=", value: Number(text) }] : [];
        }
        return [{ field: searchAttribute, operator: "LIKE", value: `%${debouncedSearchText}%` }];
    }, [debouncedSearchText, searchAttribute, numericAttributes]);

    const filters = useMemo(() => [...searchFilters, ...extraFilters], [searchFilters, extraFilters]);

    // --- Pagination ---------------------------------------------------------
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: initialPageSize });

    // Any change of the filters sends the user back to the first page. Done as
    // a state adjustment during render (not in an effect) so no request is ever
    // issued for the stale page with the new filters.
    const filtersKey = JSON.stringify(filters);
    const [lastFiltersKey, setLastFiltersKey] = useState(filtersKey);
    if (filtersKey !== lastFiltersKey) {
        setLastFiltersKey(filtersKey);
        if (paginationModel.page !== 0) setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }

    // --- Fetch --------------------------------------------------------------
    const pageParams: ServerTableFetchParams = useMemo(() => ({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        filters,
    }), [paginationModel.page, paginationModel.pageSize, filters]);

    const query = useQuery({
        queryKey: [...queryKey, pageParams],
        queryFn: () => fetchPage(pageParams),
        enabled,
        // Keep the previous page on screen while the next one loads (no flash of empty grid).
        placeholderData: keepPreviousData,
    });

    // Callers pass the key as a literal array; read it through a ref so `refetch`
    // keeps a stable identity (it is a dependency of the bulk-action callback).
    const queryKeyRef = useRef(queryKey);
    useEffect(() => {
        queryKeyRef.current = queryKey;
    });
    const refetch = useCallback(
        () => queryClient.invalidateQueries({ queryKey: [...queryKeyRef.current] }),
        [queryClient],
    );

    // --- Enrichment ---------------------------------------------------------
    const pageRows = query.data?.rows;
    const [enriched, setEnriched] = useState<{ source: Row[]; rows: Row[] } | null>(null);
    useEffect(() => {
        if (!enrich || !pageRows || pageRows.length === 0) return;
        let cancelled = false;
        enrich(pageRows)
            .then((rows) => { if (!cancelled) setEnriched({ source: pageRows, rows }); })
            .catch((err) => console.warn("[ServerTable] Row enrichment failed", err));
        return () => { cancelled = true; };
    }, [enrich, pageRows]);

    const rows: Row[] = query.isError
        ? []
        : enriched && enriched.source === pageRows
            ? enriched.rows
            : pageRows ?? [];
    const totalRows = query.isError ? 0 : query.data?.total ?? 0;
    const error = query.isError ? extractErrorMessage(query.error, "Unknown error") : null;
    const loading = enabled && (query.isPending || query.isFetching);

    // --- Selection ----------------------------------------------------------
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>(createEmptySelectionModel);

    const selectedIds = useMemo<number[]>(() => {
        if (selectionModel.type === "exclude") {
            // Every grid sets `disableRowSelectionExcludeModel`; an exclude model
            // would need the full id list the server never sends.
            console.warn("[ServerTable] Exclude selection model is not supported.");
            return [];
        }
        return Array.from(selectionModel.ids).map(Number);
    }, [selectionModel]);

    const selectionCount = selectionModel.type === "exclude"
        ? Math.max(totalRows - selectionModel.ids.size, 0)
        : selectionModel.ids.size;

    // --- Snackbar -----------------------------------------------------------
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });
    const showSnackbar = useCallback((message: string, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    }, []);
    const closeSnackbar = useCallback(() => setSnackbar((prev) => ({ ...prev, open: false })), []);

    // --- Bulk actions -------------------------------------------------------
    const [isActionRunning, setIsActionRunning] = useState(false);

    /**
     * Run `action` on every id (a single failure must not abort the rest), then
     * keep only the ids that actually failed selected so a retry targets just
     * those, and refetch so the grid reflects what really happened.
     */
    const runBulkAction = useCallback(async ({ ids, action, confirm, successMessage, failureMessage }: BulkActionOptions) => {
        const targetIds = ids ?? selectedIds;
        if (targetIds.length === 0) return;

        if (confirm && !(await confirmDialog(confirm))) return;

        setIsActionRunning(true);
        try {
            const results = await Promise.allSettled(targetIds.map((id) => action(id)));
            const failedIds = targetIds.filter((_, i) => results[i].status === "rejected");

            if (failedIds.length === 0) {
                showSnackbar(successMessage, "success");
            } else {
                console.error("[ServerTable] Some actions failed:", failedIds);
                showSnackbar(failureMessage, "error");
            }

            setSelectionModel(
                failedIds.length > 0
                    ? { type: "include", ids: new Set<number>(failedIds) }
                    : createEmptySelectionModel(),
            );
            await refetch();
        } finally {
            setIsActionRunning(false);
        }
    }, [selectedIds, showSnackbar, refetch]);

    return {
        rows,
        loading,
        error,
        totalRows,
        refetch,

        paginationModel,
        setPaginationModel,

        selectionModel,
        setSelectionModel,
        selectedIds,
        selectionCount,

        searchText,
        setSearchText,
        searchAttribute,
        setSearchAttribute,

        isActionRunning,
        runBulkAction,

        snackbar,
        showSnackbar,
        closeSnackbar,
    };
}
