/** The page sizes every grid offers. */
export const DEFAULT_PAGE_SIZES = [5, 10, 25, 50, 100] as const;

/**
 * DataGrid `pageSizeOptions` with a trailing "All" entry sized to the row
 * total. The fixed size equal to that total is dropped, so the select never
 * holds two entries with the same value (MUI warns about the duplicate keys).
 */
export function buildPageSizeOptions(totalRows: number) {
    const all = Math.max(totalRows, 1);
    return [
        ...DEFAULT_PAGE_SIZES.filter((size) => size !== all),
        { value: all, label: "All" },
    ];
}
