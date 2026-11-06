import { describe, expect, it } from 'vitest';

import { safeHttpUrl } from './safeHttpUrl';

describe('safeHttpUrl', () => {
    it('keeps an http(s) URL as it is', () => {
        expect(safeHttpUrl('https://ecotaxa.obs-vlfr.fr/')).toBe('https://ecotaxa.obs-vlfr.fr/');
        expect(safeHttpUrl('http://ecotaxa.example.fr')).toBe('http://ecotaxa.example.fr');
    });

    it.each([
        'javascript:alert(1)',
        'JavaScript:alert(1)',
        ' javascript:alert(1)',
        'java\nscript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
    ])('rejects the other schemes: %j', (url) => {
        expect(safeHttpUrl(url)).toBeNull();
    });

    it('rejects what is not an absolute URL', () => {
        expect(safeHttpUrl('ecotaxa.obs-vlfr.fr')).toBeNull();
        expect(safeHttpUrl('')).toBeNull();
        expect(safeHttpUrl(null)).toBeNull();
        expect(safeHttpUrl(undefined)).toBeNull();
    });
});
