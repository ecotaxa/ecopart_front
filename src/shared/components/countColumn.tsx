import { Typography } from "@mui/material";
import type { GridColDef, GridComparatorFn, GridSortDirection, GridValidRowModel } from "@mui/x-data-grid";

/**
 * Cell of a count filled in after the page loaded (per-row requests): the number,
 * or "—" while unknown or when its request failed, rather than a misleading "0".
 */
export const renderCountCell = (value: unknown) =>
    typeof value === "number"
        ? <Typography variant="body2">{value}</Typography>
        : <Typography variant="caption" color="text.secondary">—</Typography>;

/**
 * Comparator of a count column for the given direction: numbers in that
 * direction, unknown counts ("—") always last whatever the direction.
 */
export const getCountSortComparator = (sortDirection: GridSortDirection): GridComparatorFn<unknown> => (a, b) => {
    const aKnown = typeof a === "number";
    const bKnown = typeof b === "number";
    if (!aKnown || !bKnown) return Number(!aKnown) - Number(!bKnown);
    return sortDirection === "desc" ? b - a : a - b;
};

/**
 * Centered column for such a count, sorted client-side: it orders the rows
 * loaded in the grid (every project with the "All" page size, the current page
 * otherwise). A sort applied before the counts arrive reorders once they do.
 */
export const countColumn = <R extends GridValidRowModel>(field: string, headerName: string): GridColDef<R> => ({
    field,
    headerName,
    width: 140,
    align: "center",
    headerAlign: "center",
    getSortComparator: getCountSortComparator,
    renderCell: (params) => renderCountCell(params.value),
});
