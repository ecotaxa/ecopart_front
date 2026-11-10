import { describe, expect, it } from 'vitest';

import { buildEcoTaxaProjectUrl, buildEcoTaxaSampleUrl } from './ecotaxaLinks';

describe('buildEcoTaxaProjectUrl', () => {
    it('opens the project on the stored instance URL', () => {
        expect(buildEcoTaxaProjectUrl('https://ecotaxa.obs-vlfr.fr/', 636)).toBe('https://ecotaxa.obs-vlfr.fr/prj/636');
        expect(buildEcoTaxaProjectUrl('https://ecotaxa.example.fr', 636)).toBe('https://ecotaxa.example.fr/prj/636');
    });

    it('returns null while a part of the link is unknown', () => {
        expect(buildEcoTaxaProjectUrl(undefined, 636)).toBeNull();
        expect(buildEcoTaxaProjectUrl('https://ecotaxa.obs-vlfr.fr', null)).toBeNull();
    });

    it('returns null when the stored URL is not http(s)', () => {
        expect(buildEcoTaxaProjectUrl('javascript:alert(1)//', 636)).toBeNull();
    });
});

describe('buildEcoTaxaSampleUrl', () => {
    it('opens the EcoTaxa project filtered on the sample', () => {
        expect(buildEcoTaxaSampleUrl('https://ecotaxa.obs-vlfr.fr/', 636, 4242))
            .toBe('https://ecotaxa.obs-vlfr.fr/prj/636?samples=4242');
    });

    it('returns null while a part of the link is unknown', () => {
        expect(buildEcoTaxaSampleUrl(null, 636, 4242)).toBeNull();
        expect(buildEcoTaxaSampleUrl('https://ecotaxa.obs-vlfr.fr', null, 4242)).toBeNull();
        expect(buildEcoTaxaSampleUrl('https://ecotaxa.obs-vlfr.fr', 636, null)).toBeNull();
    });

    it('returns null when the stored URL is not http(s)', () => {
        expect(buildEcoTaxaSampleUrl('javascript:alert(1)//', 636, 4242)).toBeNull();
    });
});
