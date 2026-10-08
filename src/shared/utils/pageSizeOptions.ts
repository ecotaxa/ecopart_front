/** The page sizes every grid offers. */
export const DEFAULT_PAGE_SIZES = [5, 10, 25, 50, 100] as const;

/**
 * Page size of the "All" entry. MUI's own sentinel: the grid then renders every
 * row on a single page, and it is exempt from the 100-row cap the MIT DataGrid
 * enforces on `pageSize` (a size equal to the row total would throw above 100).
 */
export const ALL_PAGE_SIZE = -1;

/**
 * `limit` sent to the backend when "All" is selected. The search endpoints
 * have no upper bound and SQLite needs a positive integer, so a value far above
 * any real table stands for "every row".
 */
const ALL_ROWS_LIMIT = 1_000_000;

/** DataGrid `pageSizeOptions`: the fixed sizes followed by an "All" entry. */
export function buildPageSizeOptions() {
    return [...DEFAULT_PAGE_SIZES, { value: ALL_PAGE_SIZE, label: "All" }];
}

/** Translates a grid page size into the `limit` of a server-paginated request. */
export function toRequestLimit(pageSize: number) {
    return pageSize === ALL_PAGE_SIZE ? ALL_ROWS_LIMIT : pageSize;
}
