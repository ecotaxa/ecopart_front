import { Typography } from "@mui/material";
import type { GridColDef, GridValidRowModel } from "@mui/x-data-grid";

/**
 * Cell of a count filled in after the page loaded (per-row requests): the number,
 * or "—" while unknown or when its request failed, rather than a misleading "0".
 */
export const renderCountCell = (value: unknown) =>
    typeof value === "number"
        ? <Typography variant="body2">{value}</Typography>
        : <Typography variant="caption" color="text.secondary">—</Typography>;

/**
 * Centered, non-sortable column for such a count. Not sortable: the counts land
 * after the rows, so a sort on them would reshuffle the page once they arrive.
 */
export const countColumn = <R extends GridValidRowModel>(field: string, headerName: string): GridColDef<R> => ({
    field,
    headerName,
    width: 140,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: (params) => renderCountCell(params.value),
});
