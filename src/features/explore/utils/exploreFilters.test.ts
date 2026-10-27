import { describe, it, expect } from 'vitest';

import {
    EMPTY_BOUNDS_DRAFT,
    boundsError,
    createEmptyDraft,
    dateRangeError,
    modeOf,
    parseProjectIds,
    sampleTypesError,
    toBoundsDraft,
    toFilters,
} from './exploreFilters';

describe('exploreFilters', () => {
    it('reads the project ids of the projects query parameter, dropping anything else', () => {
        expect(parseProjectIds(null)).toEqual([]);
        expect(parseProjectIds('')).toEqual([]);
        expect(parseProjectIds('12')).toEqual([12]);
        expect(parseProjectIds('12,15,12')).toEqual([12, 15]);
        expect(parseProjectIds('12,abc,,-3,1.5,0,15')).toEqual([12, 15]);
    });

    it('starts with both sample types, every criterion empty and every status kept', () => {
        const filters = toFilters(createEmptyDraft());
        expect(filters.sample_types).toEqual(['depth', 'time']);
        expect(filters.project_ids).toEqual([]);
        expect(filters.bounds).toBeNull();
        expect(filters.hour_range).toBeNull();
        expect(filters.privacy_statuses).toEqual(['private', 'visible', 'public', 'open']);
        expect(filters.classification_state).toBe('all');
    });

    it('needs at least one sample type, and asks one type or both', () => {
        expect(sampleTypesError(['depth', 'time'])).toBeNull();
        expect(sampleTypesError(['time'])).toBeNull();
        expect(sampleTypesError([])).toBe('Check at least one sample type.');
        expect(modeOf(['depth', 'time'])).toBe('all');
        expect(modeOf(['depth'])).toBe('depth');
        expect(modeOf(['time'])).toBe('time');
    });

    it('accepts an empty or a complete location, nothing in between', () => {
        expect(boundsError(EMPTY_BOUNDS_DRAFT)).toBeNull();
        expect(boundsError({ ...EMPTY_BOUNDS_DRAFT, north: '10' })).toBe('Fill the four coordinates, or none.');
        expect(boundsError({ north: '43.9', south: '42.6', east: '8.4', west: '-5' })).toBeNull();
    });

    it('rejects out-of-range or inverted coordinates', () => {
        expect(boundsError({ north: '91', south: '0', east: '0', west: '0' })).toBe('North must be between -90 and 90.');
        expect(boundsError({ north: '10', south: '0', east: '181', west: '0' })).toBe('East must be between -180 and 180.');
        expect(boundsError({ north: 'abc', south: '0', east: '1', west: '0' })).toBe('North must be between -90 and 90.');
        expect(boundsError({ north: '0', south: '10', east: '1', west: '0' })).toBe('South must be below North.');
    });

    it('turns a typed location into numbers, and a drawn one back into text', () => {
        const draft = { ...createEmptyDraft(), bounds: { north: '43.938', south: '42.619', east: '8.446', west: '-5.5' } };
        expect(toFilters(draft).bounds).toEqual({ north: 43.938, south: 42.619, east: 8.446, west: -5.5 });
        expect(toBoundsDraft({ north: 43.93812, south: 42.6, east: 8.4456, west: -5 }))
            .toEqual({ north: '43.938', south: '42.6', east: '8.446', west: '-5' });
    });

    it('rejects a date range ending before it starts', () => {
        expect(dateRangeError('2020-01-13', '2020-01-11')).toBe('The start date must be before the end date.');
        expect(dateRangeError('2020-01-11', '2020-01-13')).toBeNull();
        expect(dateRangeError('2020-01-11', null)).toBeNull();
    });
});
