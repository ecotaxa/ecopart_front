import { describe, it, expect } from 'vitest';

import type { ExploreProjectRow } from '../types/explore.types';
import { accessRequestRecipients, buildAccessRequestMailto } from './accessRequestMail';

const makeProject = (overrides: Partial<ExploreProjectRow> = {}): ExploreProjectRow => ({
    project_id: 473,
    project_title: 'uvp5_sn201_exports02_filtered',
    instrument_model: 'UVP5SD',
    ecotaxa_project_name: null,
    nb_selected_samples: 6,
    nb_samples: 63,
    privacy_status: 'private',
    is_my_project: false,
    contact: { user_name: 'Contact Person', email: 'contact@example.org' },
    managers: [
        { user_name: 'Manager One', email: 'm1@example.org' },
        { user_name: 'Manager Two', email: 'm2@example.org' },
    ],
    ...overrides,
});

describe('accessRequestMail', () => {
    it('writes to the managers, else to the contact', () => {
        expect(accessRequestRecipients(makeProject())).toEqual(['m1@example.org', 'm2@example.org']);
        expect(accessRequestRecipients(makeProject({ managers: [] }))).toEqual(['contact@example.org']);
    });

    it('has no link when nobody can be written to', () => {
        expect(buildAccessRequestMailto(makeProject({ managers: [], contact: null }), 'depth', null)).toBeNull();
    });

    it('pre-writes the subject and the message', () => {
        const href = buildAccessRequestMailto(makeProject(), 'depth', { first_name: 'Ada', last_name: 'Lovelace' });
        expect(href).toMatch(/^mailto:m1@example\.org,m2@example\.org\?/);

        const params = new URLSearchParams(href!.split('?')[1]);
        expect(params.get('subject')).toBe('[EcoPart] Data request: uvp5_sn201_exports02_filtered [473]');
        expect(params.get('body')).toContain('6 of its 63 samples match my selection');
        expect(params.get('body')).toContain('depth profiles');
        expect(params.get('body')).toContain('Ada Lovelace');
        // Spaces are %20, not "+", which mail clients would show as is.
        expect(href).not.toContain('+');
    });
});
