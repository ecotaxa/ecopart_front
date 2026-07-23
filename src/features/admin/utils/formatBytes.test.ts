import { describe, it, expect } from 'vitest';

import { formatBytes } from './formatBytes';

// ---------------------------------------------------------------------------
// Pure formatter for the admin dashboard storage KPIs (binary units). Section
// AI covers the admin statistics helpers that no component test exercises
// directly.
// ---------------------------------------------------------------------------
describe('formatBytes (AI)', () => {
    it('TC-AI1: renders a dash for nullish/NaN and "0 B" for zero or negative input', () => {
        expect(formatBytes(null)).toBe('—');
        expect(formatBytes(undefined)).toBe('—');
        expect(formatBytes(Number.NaN)).toBe('—');
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(-42)).toBe('0 B');
    });

    it('TC-AI2: scales to the right binary unit, rounds bytes whole and keeps decimals above', () => {
        // Bytes: always whole, no decimals.
        expect(formatBytes(512)).toBe('512 B');
        // KB/MB/… keep `decimals` (default 1) places.
        expect(formatBytes(1024)).toBe('1.0 KB');
        expect(formatBytes(123456789)).toBe('117.7 MB');
        // Custom decimals.
        expect(formatBytes(1536, 2)).toBe('1.50 KB');
        // Never scales past the last known unit (EB).
        expect(formatBytes(Number.MAX_VALUE)).toMatch(/ EB$/);
    });
});
