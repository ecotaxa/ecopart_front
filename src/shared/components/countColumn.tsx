import { Typography } from "@mui/material";
import type { GridColDef, GridValidRowModel } from "@mui/x-data-grid";

/**
 * Cell of a count: the number, or "—" when it is unknown (not loaded yet, its
 * request failed, or hidden from the user) rather than a misleading "0".
 */
export const renderCountCell = (value: unknown) =>
    typeof value === "number"
        ? <Typography variant="body2">{value}</Typography>
        : <Typography variant="caption" color="text.secondary">—</Typography>;

/**
 * Centered column for such a count. Sorting and filtering it is left to the
 * grid's server fields (see `useServerGridModels`): the grid only holds a page.
 */
export const countColumn = <R extends GridValidRowModel>(field: string, headerName: string): GridColDef<R> => ({
    field,
    headerName,
    width: 140,
    align: "center",
    headerAlign: "center",
    renderCell: (params) => renderCountCell(params.value),
});
