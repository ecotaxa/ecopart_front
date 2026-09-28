import { describe, expect, it } from 'vitest';

import { buildEcoTaxaSampleUrl } from './ecotaxaLinks';

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
});
