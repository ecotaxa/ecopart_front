import { describe, it, expect } from "vitest";

import { getCountSortComparator } from "./countColumn";

const sortWith = (values: unknown[], direction: "asc" | "desc") => {
    const compare = getCountSortComparator(direction);
    // The comparator ignores its cell params, only the values matter.
    return [...values].sort((a, b) => compare(a, b, undefined as never, undefined as never));
};

describe("getCountSortComparator", () => {
    const values = [3, undefined, 0, 12, undefined, 7];

    it("sorts the counts ascending, unknown counts last", () => {
        expect(sortWith(values, "asc")).toEqual([0, 3, 7, 12, undefined, undefined]);
    });

    it("sorts the counts descending, unknown counts still last", () => {
        expect(sortWith(values, "desc")).toEqual([12, 7, 3, 0, undefined, undefined]);
    });
});
