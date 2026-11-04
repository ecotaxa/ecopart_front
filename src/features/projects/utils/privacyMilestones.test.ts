import { describe, expect, it } from 'vitest';

import { privacyDates, privacyMilestone } from './privacyMilestones';

// Same cases as the backend (ecopart_back test/domain/utils/project-privacy.test.ts).
describe('privacyMilestone', () => {
    it.each([
        ['2024-01-15T10:20:00Z', 1, '2024-02-15T00:00:00.000Z'],
        ['2024-01-15T10:20:00Z', 12, '2025-01-15T00:00:00.000Z'],
    ])('%s + %i months → %s', (from, months, expected) => {
        expect(privacyMilestone(from, months)).toBe(expected);
    });

    it('a day the target month does not have: reached on the 1st of the following month', () => {
        expect(privacyMilestone('2024-01-31T08:00:00Z', 1)).toBe('2024-03-01T00:00:00.000Z');
    });

    it('no sample date, or an unreadable one: no milestone', () => {
        expect(privacyMilestone(null, 2)).toBeNull();
        expect(privacyMilestone('not a date', 2)).toBeNull();
    });

    it('privacyDates chains the three delays from the oldest sample', () => {
        expect(privacyDates('2024-01-15T10:20:00Z', 2, 24, 36)).toEqual({
            private: '2024-01-15T10:20:00Z',
            visible: '2024-03-15T00:00:00.000Z',
            public: '2026-03-15T00:00:00.000Z',
            open: '2029-03-15T00:00:00.000Z',
        });
        expect(privacyDates(null, 2, 24, 36)).toEqual({ private: null, visible: null, public: null, open: null });
    });
});
