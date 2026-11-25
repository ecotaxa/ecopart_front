import { describe, it, expect } from 'vitest';

import type { ExploreMapSample } from '../types/explore.types';
import { samplePopup } from './samplePopup';

const sample = (overrides: Partial<ExploreMapSample> = {}): ExploreMapSample => ({
    sample_id: 101, sample_name: 'tara_001', project_id: 1, project_title: 'Tara Oceans 2009',
    latitude: 43.68, longitude: 7.31, instrument_model: 'UVP5HD', privacy_status: 'public', is_my_project: false,
    ...overrides,
});

const linkLabels = (popup: ReturnType<typeof samplePopup>) => popup.links.map((link) => link.label);

describe('samplePopup', () => {
    it('names the project and the instrument, and links to the sample and project pages in a new tab', () => {
        const popup = samplePopup(sample(), false);
        expect(popup.details).toEqual(['Tara Oceans 2009 [1]', 'UVP5HD · Public']);
        expect(popup.links).toEqual([
            { label: 'Open sample', to: '/projects/1/samples/101', newTab: true },
            { label: 'Open project', to: '/projects/1/stats', newTab: true },
        ]);
    });

    it('leaves the sample page out of a private project the user has no privilege on', () => {
        expect(linkLabels(samplePopup(sample({ privacy_status: 'private' }), false))).toEqual(['Open project']);
    });

    it('links to the sample page of a private project to its members and to admins', () => {
        expect(linkLabels(samplePopup(sample({ privacy_status: 'private', is_my_project: true }), false)))
            .toEqual(['Open sample', 'Open project']);
        expect(linkLabels(samplePopup(sample({ privacy_status: 'private' }), true))).toEqual(['Open sample', 'Open project']);
    });

    it('links to the sample page of a visible project', () => {
        expect(linkLabels(samplePopup(sample({ privacy_status: 'visible' }), false))).toEqual(['Open sample', 'Open project']);
    });
});
