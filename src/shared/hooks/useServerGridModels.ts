import { useMemo, useState } from "react";
import {
    getGridNumericOperators,
    getGridStringOperators,
    type GridColDef,
    type GridFilterModel,
    type GridSortModel,
    type GridValidRowModel,
} from "@mui/x-data-grid";

import type { SearchFilter } from "@/shared/types/api";
import { useDebounce } from "./useDebounce";

/**
 * What the backend search can do with one grid column. A server-paginated grid
 * only holds the current page, so its column menus must sort and filter on the
 * server: a column the backend cannot sort or filter on loses that menu entry.
 */
export interface ServerField {
    /** Backend field(s) the column sorts on, in order (e.g. last then first name). */
    sort?: string | readonly string[];
    /** Backend field the column filters on. */
    filter?: string;
    /**
     * "number": =, ≠, >, ≥, <, ≤ on the value. "string" (default): contains,
     * equals, starts with, ends with — a case-insensitive `LIKE`.
     */
    type?: "string" | "number";
}

/** Grid column field → what the backend can do with it. */
export type ServerFields = Readonly<Record<string, ServerField>>;

const STRING_PATTERNS: Readonly<Partial<Record<string, (text: string) => string>>> = {
    contains: (text) => `%${text}%`,
    equals: (text) => text,
    startsWith: (text) => `${text}%`,
    endsWith: (text) => `%${text}`,
};

const NUMBER_OPERATORS: Readonly<Partial<Record<string, string>>> = {
    "=": "=",
    "!=": "<>",
    ">": ">",
    ">=": ">=",
    "<": "<",
    "<=": "<=",
};

const STRING_FILTER_OPERATORS = getGridStringOperators().filter((operator) => operator.value in STRING_PATTERNS);
const NUMBER_FILTER_OPERATORS = getGridNumericOperators().filter((operator) => operator.value in NUMBER_OPERATORS);

const asList = (sort: ServerField["sort"]): readonly string[] =>
    sort === undefined ? [] : typeof sort === "string" ? [sort] : sort;

/**
 * The `sort_by` of a request: the column sort first, then `defaultSort`, which
 * keeps the order stable across pages when the sorted values are equal.
 */
export function toServerSortBy(sortModel: GridSortModel, fields: ServerFields, defaultSort?: string): string | undefined {
    const item = sortModel[0];
    const sortFields = item?.sort ? asList(fields[item.field]?.sort) : [];
    const statements = sortFields.map((field) => `${item.sort}(${field})`);
    if (defaultSort) statements.push(defaultSort);
    return statements.length > 0 ? statements.join(",") : undefined;
}

/** The search filters of the column filters; an unfinished one (no value yet) is left out. */
export function toServerFilters(filterModel: GridFilterModel, fields: ServerFields): SearchFilter[] {
    return filterModel.items.flatMap((item): SearchFilter[] => {
        const field = fields[item.field];
        if (!field?.filter) return [];

        if (field.type === "number") {
            const operator = NUMBER_OPERATORS[item.operator];
            const raw: unknown = item.value;
            if (!operator || raw === undefined || raw === null || String(raw).trim() === "") return [];
            const value = Number(raw);
            return Number.isFinite(value) ? [{ field: field.filter, operator, value }] : [];
        }

        const pattern = STRING_PATTERNS[item.operator];
        const text = typeof item.value === "string" ? item.value.trim() : "";
        return pattern && text ? [{ field: field.filter, operator: "LIKE", value: pattern(text) }] : [];
    });
}

/**
 * The columns as the backend can serve them: sortable and filterable only where
 * `fields` says so, with the filter operators the backend understands.
 */
export function withServerFields<Row extends GridValidRowModel>(columns: GridColDef<Row>[], fields: ServerFields): GridColDef<Row>[] {
    return columns.map((column) => {
        const field = fields[column.field];
        const sortable = column.sortable !== false && asList(field?.sort).length > 0;
        if (!field?.filter || column.filterable === false) return { ...column, sortable, filterable: false };
        return {
            ...column,
            sortable,
            filterable: true,
            filterOperators: field.type === "number" ? NUMBER_FILTER_OPERATORS : STRING_FILTER_OPERATORS,
        };
    });
}

const EMPTY_FILTER_MODEL: GridFilterModel = { items: [] };

/**
 * Sort and filter state of a server-paginated grid, turned into the `sort_by`
 * and the filters of its requests. Spread `gridProps` on the DataGrid and pass
 * its columns through `serverColumns`.
 */
export function useServerGridModels({ fields, defaultSort }: { fields: ServerFields; defaultSort?: string }) {
    const [sortModel, setSortModel] = useState<GridSortModel>([]);
    const [filterModel, setFilterModel] = useState<GridFilterModel>(EMPTY_FILTER_MODEL);

    const sortBy = useMemo(() => toServerSortBy(sortModel, fields, defaultSort), [sortModel, fields, defaultSort]);

    // Typed into the filter panel: one request per pause, like the search box. Compared
    // as JSON so an edit that changes no filter (e.g. picking another column) sends nothing.
    const filtersJson = JSON.stringify(toServerFilters(filterModel, fields));
    const debouncedFiltersJson = useDebounce(filtersJson, 500);
    const columnFilters = useMemo<SearchFilter[]>(() => JSON.parse(debouncedFiltersJson), [debouncedFiltersJson]);

    const gridProps = useMemo(() => ({
        sortingMode: "server" as const,
        filterMode: "server" as const,
        sortModel,
        onSortModelChange: setSortModel,
        filterModel,
        onFilterModelChange: setFilterModel,
    }), [sortModel, filterModel]);

    const serverColumns = useMemo(
        () => <Row extends GridValidRowModel>(columns: GridColDef<Row>[]) => withServerFields(columns, fields),
        [fields],
    );

    return { sortModel, setSortModel, filterModel, setFilterModel, sortBy, columnFilters, gridProps, serverColumns };
}
