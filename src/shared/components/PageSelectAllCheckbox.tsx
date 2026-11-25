import React from "react";
import {
    createRowSelectionManager,
    gridClasses,
    gridPaginatedVisibleSortedGridRowIdsSelector,
    gridRowSelectionStateSelector,
    gridTabIndexColumnHeaderSelector,
    useGridApiContext,
    useGridRootProps,
    useGridSelector,
    type GridApi,
    type GridRowId,
} from "@mui/x-data-grid";

// The selectable rows of the current page, read from the grid state by a selector so that the
// header only re-renders when that list changes.
const pageSelectableIdsSelector = (apiRef: React.RefObject<GridApi>): GridRowId[] =>
    gridPaginatedVisibleSortedGridRowIdsSelector(apiRef).filter(
        (id) => apiRef.current.getRow(id) !== null && apiRef.current.isRowSelectable(id),
    );

const sameIds = <T,>(a: T, b: T): boolean => {
    const left = a as GridRowId[];
    const right = b as GridRowId[];
    return left.length === right.length && left.every((id, i) => id === right[i]);
};

/**
 * Header checkbox that selects or clears the selectable rows of the current page only, keeping
 * what was selected on the other pages. The MIT DataGrid forces `checkboxSelectionVisibleOnly`
 * to false (a Pro feature): its own header checkbox selects every row of every page.
 */
export const PageSelectAllCheckbox: React.FC<{ field: string }> = ({ field }) => {
    const apiRef = useGridApiContext();
    const rootProps = useGridRootProps();
    const selection = useGridSelector(apiRef, gridRowSelectionStateSelector);
    const pageSelectableIds = useGridSelector(apiRef, pageSelectableIdsSelector, undefined, sameIds);
    const tabIndexState = useGridSelector(apiRef, gridTabIndexColumnHeaderSelector);

    const selectionManager = createRowSelectionManager(selection);
    const selectedOnPage = pageSelectableIds.filter((id) => selectionManager.has(id)).length;
    const allSelected = pageSelectableIds.length > 0 && selectedOnPage === pageSelectableIds.length;
    const someSelected = selectedOnPage > 0 && !allSelected;

    const togglePage = (select: boolean) => {
        const ids = new Set<GridRowId>(
            selection.type === "include"
                ? selection.ids
                : apiRef.current.getAllRowIds().filter((id) => selectionManager.has(id)),
        );
        for (const id of pageSelectableIds) {
            if (select) ids.add(id);
            else ids.delete(id);
        }
        apiRef.current.setRowSelectionModel({ type: "include", ids });
    };

    // Same focus handling as the grid's own header checkbox: the checkbox, not the header cell,
    // takes the tab stop, and Space is handled here because the grid prevents its default action.
    const tabIndex = tabIndexState !== null && tabIndexState.field === field ? 0 : -1;
    React.useLayoutEffect(() => {
        const element = apiRef.current.getColumnHeaderElement(field);
        if (tabIndex === 0 && element) element.tabIndex = -1;
    }, [tabIndex, apiRef, field]);

    const Checkbox = rootProps.slots.baseCheckbox;
    return (
        <Checkbox
            {...rootProps.slotProps?.baseCheckbox}
            className={gridClasses.checkboxInput}
            checked={allSelected}
            indeterminate={someSelected}
            disabled={pageSelectableIds.length === 0}
            onChange={() => togglePage(!allSelected)}
            onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key === " ") togglePage(!allSelected);
            }}
            tabIndex={tabIndex}
            slotProps={{
                htmlInput: {
                    "aria-label": allSelected ? "Unselect all rows on this page" : "Select all rows on this page",
                    name: "select_all_rows",
                },
            }}
        />
    );
};
