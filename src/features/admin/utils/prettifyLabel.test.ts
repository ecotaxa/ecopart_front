import { describe, it, expect } from 'vitest';

import { prettifyLabel } from './prettifyLabel';

// ---------------------------------------------------------------------------
// Turns raw backend enum labels into display strings, while leaving acronym-
// style instrument names untouched. Section AI (admin statistics helpers).
// ---------------------------------------------------------------------------
describe('prettifyLabel (AI)', () => {
    it('TC-AI3: prettifies snake_case and all-caps enum labels', () => {
        expect(prettifyLabel('EXPORT_RAW')).toBe('Export raw');
        expect(prettifyLabel('IMPORT_ECO_TAXA')).toBe('Import eco taxa');
        // A single all-caps word (e.g. a task status) is still title-cased.
        expect(prettifyLabel('PENDING')).toBe('Pending');
    });

    it('TC-AI4: leaves acronym-style instrument names untouched', () => {
        // Digit-bearing acronym with no separator.
        expect(prettifyLabel('UVP6LP')).toBe('UVP6LP');
        // Mixed-case name that is not fully uppercased.
        expect(prettifyLabel('Zooscan')).toBe('Zooscan');
    });

    it('TC-AI5: returns an empty string unchanged', () => {
        expect(prettifyLabel('')).toBe('');
    });
});
