import { describe, it, expect } from "vitest";
import type { GridColDef } from "@mui/x-data-grid";

import { toServerFilters, toServerSortBy, withServerFields, type ServerFields } from "./useServerGridModels";

const FIELDS: ServerFields = {
    title: { sort: "project_title", filter: "project_title" },
    name: { sort: ["last_name", "first_name"] },
    samples: { sort: "nbr_sample", filter: "nbr_sample", type: "number" },
    instrument: { filter: "instrument_model" },
};

describe("toServerSortBy", () => {
    it("puts the column sort before the default one, which breaks the ties", () => {
        expect(toServerSortBy([{ field: "samples", sort: "desc" }], FIELDS, "desc(project_id)"))
            .toBe("desc(nbr_sample),desc(project_id)");
    });

    it("sorts a column on each of its fields", () => {
        expect(toServerSortBy([{ field: "name", sort: "asc" }], FIELDS)).toBe("asc(last_name),asc(first_name)");
    });

    it("falls back to the default sort without a sortable column sort", () => {
        expect(toServerSortBy([], FIELDS, "desc(project_id)")).toBe("desc(project_id)");
        expect(toServerSortBy([{ field: "instrument", sort: "asc" }], FIELDS, "desc(project_id)")).toBe("desc(project_id)");
        expect(toServerSortBy([{ field: "title", sort: null }], FIELDS)).toBeUndefined();
    });
});

describe("toServerFilters", () => {
    const filter = (field: string, operator: string, value: unknown) =>
        toServerFilters({ items: [{ id: 1, field, operator, value }] }, FIELDS);

    it("turns the text operators into a LIKE pattern", () => {
        expect(filter("title", "contains", " uvp ")).toEqual([{ field: "project_title", operator: "LIKE", value: "%uvp%" }]);
        expect(filter("title", "equals", "a")).toEqual([{ field: "project_title", operator: "LIKE", value: "a" }]);
        expect(filter("title", "startsWith", "a")).toEqual([{ field: "project_title", operator: "LIKE", value: "a%" }]);
        expect(filter("instrument", "endsWith", "6")).toEqual([{ field: "instrument_model", operator: "LIKE", value: "%6" }]);
    });

    it("sends the numeric operators with a number", () => {
        expect(filter("samples", ">", "100")).toEqual([{ field: "nbr_sample", operator: ">", value: 100 }]);
        expect(filter("samples", "!=", 0)).toEqual([{ field: "nbr_sample", operator: "<>", value: 0 }]);
    });

    it("leaves out an unfinished filter, an unknown operator or a column the backend does not filter", () => {
        expect(filter("title", "contains", "  ")).toEqual([]);
        expect(filter("samples", ">", "")).toEqual([]);
        expect(filter("samples", ">", "abc")).toEqual([]);
        expect(filter("title", "isEmpty", undefined)).toEqual([]);
        expect(filter("name", "contains", "x")).toEqual([]);
    });
});

describe("withServerFields", () => {
    const columns: GridColDef[] = [
        { field: "title" },
        { field: "samples" },
        { field: "instrument" },
        { field: "privilege" },
        { field: "name", sortable: false },
    ];

    it("keeps only the sort and filter menus the backend serves", () => {
        const [title, samples, instrument, privilege, name] = withServerFields(columns, FIELDS);

        expect(title).toMatchObject({ sortable: true, filterable: true });
        expect(title.filterOperators?.map((operator) => operator.value)).toEqual(["contains", "equals", "startsWith", "endsWith"]);
        expect(samples.filterOperators?.map((operator) => operator.value)).toEqual(["=", "!=", ">", ">=", "<", "<="]);
        expect(instrument).toMatchObject({ sortable: false, filterable: true });
        expect(privilege).toMatchObject({ sortable: false, filterable: false });
        // A column the page made unsortable stays so.
        expect(name).toMatchObject({ sortable: false, filterable: false });
    });
});
