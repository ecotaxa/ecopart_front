import { describe, expect, it } from 'vitest';

import { formatCompact, formatDepth, formatElapsed, formatSize, formatUtcDay, formatUtcMonth } from './statsFormat';

describe('statsFormat', () => {
    it('formatCompact shortens large counts', () => {
        expect(formatCompact(56)).toBe('56');
        expect(formatCompact(1250)).toBe('1.3K');
        expect(formatCompact(1_250_000)).toBe('1.3M');
    });

    it('formatUtcDay keeps the UTC day, "—" otherwise', () => {
        expect(formatUtcDay('2021-05-05T23:30:00Z')).toBe('2021-05-05');
        expect(formatUtcDay(null)).toBe('—');
        expect(formatUtcDay('not a date')).toBe('—');
    });

    it('formatUtcMonth names the month and the year', () => {
        expect(formatUtcMonth('1997-05-02T00:00:00.000Z')).toBe('May 1997');
    });

    it('formatSize switches to mm from 1 mm, formatDepth rounds to the metre', () => {
        expect(formatSize(42)).toBe('42µm');
        expect(formatSize(81000)).toBe('81mm');
        expect(formatSize(1250)).toBe('1.3mm');
        expect(formatDepth(3056.4)).toBe('3056m');
    });

    it('formatElapsed gives the largest round unit', () => {
        const now = new Date('2026-10-23T12:00:00Z');
        const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
        expect(formatElapsed(ago(30_000), now)).toBe('just now');
        expect(formatElapsed(ago(5 * 60_000), now)).toBe('5 minutes');
        expect(formatElapsed(ago(3 * 3_600_000), now)).toBe('3 hours');
        expect(formatElapsed(ago(24 * 3_600_000), now)).toBe('1 day');
        expect(formatElapsed(ago(21 * 24 * 3_600_000), now)).toBe('3 weeks');
        expect(formatElapsed(ago(65 * 24 * 3_600_000), now)).toBe('2 months');
        expect(formatElapsed(ago(800 * 24 * 3_600_000), now)).toBe('2 years');
        expect(formatElapsed(null, now)).toBe('—');
    });
});
