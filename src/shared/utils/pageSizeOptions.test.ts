import { describe, it, expect } from 'vitest';

import { ALL_PAGE_SIZE, DEFAULT_PAGE_SIZES, buildPageSizeOptions, toRequestLimit } from './pageSizeOptions';

describe('pageSizeOptions', () => {
    it('ends with an "All" entry on the MUI -1 sentinel, never a size above 100', () => {
        const options = buildPageSizeOptions();

        expect(options.slice(0, -1)).toEqual([...DEFAULT_PAGE_SIZES]);
        expect(options.at(-1)).toEqual({ value: ALL_PAGE_SIZE, label: 'All' });
        // The MIT DataGrid throws on any pageSize above 100.
        const values = options.map((option) => (typeof option === 'number' ? option : option.value));
        expect(Math.max(...values)).toBeLessThanOrEqual(100);
    });

    it('sends fixed sizes as-is and turns "All" into a positive limit', () => {
        expect(toRequestLimit(25)).toBe(25);
        expect(toRequestLimit(ALL_PAGE_SIZE)).toBeGreaterThan(100);
    });
});
