import { describe, it, expect } from 'vitest';

import { chartColors, chartColorAt } from './chartColors';

// ---------------------------------------------------------------------------
// Ordered categorical palette for the dashboard charts. Section AI (admin
// statistics helpers).
// ---------------------------------------------------------------------------
describe('chartColorAt (AI)', () => {
    it('TC-AI6: returns the palette colour at an index and wraps around past the end', () => {
        expect(chartColorAt(0)).toBe(chartColors[0]);
        expect(chartColorAt(3)).toBe(chartColors[3]);
        // Wraps: index === palette length maps back to the first colour.
        expect(chartColorAt(chartColors.length)).toBe(chartColors[0]);
        expect(chartColorAt(chartColors.length + 1)).toBe(chartColors[1]);
    });
});
