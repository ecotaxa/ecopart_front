import { GRID_CHECKBOX_SELECTION_COL_DEF, type GridColDef, type GridValidRowModel } from "@mui/x-data-grid";

import { PageSelectAllCheckbox } from "./PageSelectAllCheckbox";

/**
 * Checkbox column whose header selects the current page only. Put it first in the columns of a
 * client-paginated grid that has `checkboxSelection`: the grid then uses it instead of its own.
 */
export const pageSelectionCheckboxColumn = <R extends GridValidRowModel>(): GridColDef<R> => ({
    ...(GRID_CHECKBOX_SELECTION_COL_DEF as GridColDef<R>),
    renderHeader: (params) => <PageSelectAllCheckbox field={params.field} />,
});
