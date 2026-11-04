import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import { makeEmptyProjectStats, makeProjectStatsFixture } from '@/test/helpers/projectStats.fixtures';
import type { ProjectStats } from '../api/projectStats.api';
import { ProjectStatsTab } from './ProjectStatsTab';

const answerStats = (stats: ProjectStats) =>
    server.use(http.get('*/projects/:projectId/stats', () => HttpResponse.json(stats)));

const renderTab = (props: Partial<React.ComponentProps<typeof ProjectStatsTab>> = {}) =>
    renderWithRouter(<ProjectStatsTab projectId={101} ecoTaxaLinked={true} {...props} />);

const section = (name: string) => screen.getByRole('region', { name });

describe('ProjectStatsTab', () => {
    beforeEach(() => {
        loginAsUser();
    });

    // TC-S1: the populated STATS tab, section by section
    it('TC-S1: shows the counters, the privacy timeline, the raw backup, the map, the samples and the EcoTaxa state', async () => {
        answerStats(makeProjectStatsFixture());
        renderTab();

        // Headline counters: the value shown in the card of each label
        expect(await screen.findByText('Stations')).toBeInTheDocument();
        for (const [label, value] of [['Stations', '6'], ['Samples', '56'], ['Particles', '1.3M'], ['Vignettes', '640'], ['Exports', '7']]) {
            const card = screen.getByText(label).closest('.MuiPaper-root') as HTMLElement;
            expect(within(card).getByText(value)).toBeInTheDocument();
        }

        // Privacy timeline: the current step and the four dates
        const privacy = section('Data privacy status');
        expect(within(privacy).getByTestId('InfoOutlinedIcon')).toBeInTheDocument();
        expect(within(privacy).getByText('Private').closest('[aria-current="step"]')).not.toBeNull();
        expect(within(privacy).getByText('2021-05-05')).toBeInTheDocument();
        expect(within(privacy).getByText('2021-07-05')).toBeInTheDocument();
        expect(within(privacy).getByText('2023-05-05')).toBeInTheDocument();
        expect(within(privacy).getByText('2024-05-05')).toBeInTheDocument();

        // Raw backup: three weeks ago, samples imported since
        const backup = section('Raw backup');
        expect(within(backup).getByText('3 weeks ago')).toBeInTheDocument();
        expect(within(backup).getByText(/Samples imported without raw backup/i)).toBeInTheDocument();

        // Map: both kinds of points and the three warnings
        const map = section('Samples distribution');
        expect(within(map).getByText(/Missing 1 CTD file/i)).toBeInTheDocument();
        expect(within(map).getByText(/Mismatch 1 sample GPS coordinates/i)).toBeInTheDocument();
        expect(within(map).getByText(/^1 sample on land$/i)).toBeInTheDocument();
        expect(await within(map).findByRole('button', { name: 'tara_001' })).toBeInTheDocument();
        expect(within(map).getByRole('button', { name: 'tara_001 (CTD)' })).toBeInTheDocument();
        expect(within(map).queryByRole('button', { name: 'tara_003 (CTD)' })).not.toBeInTheDocument();
        expect(within(map).getByText('Sample GPS points')).toBeInTheDocument();
        expect(within(map).getByText('CTD GPS points')).toBeInTheDocument();

        // Samples: types, ranges and the six warnings
        expect(screen.getByText('Number of individual depth samples')).toBeInTheDocument();
        expect(screen.getByText('0m - 3056m')).toBeInTheDocument();
        expect(screen.getByText('42µm - 81mm')).toBeInTheDocument();
        expect(screen.getByText('May 1997 - June 2010')).toBeInTheDocument();
        expect(screen.getByText(/Mismatch in instrument parameters/i)).toBeInTheDocument();
        expect(screen.getByText(/Mismatch instrument specification/i)).toBeInTheDocument();
        expect(screen.getByText(/^Suspicious time range$/i)).toBeInTheDocument();
        expect(screen.getByText(/project longer than a year/i)).toBeInTheDocument();
        expect(screen.getByText(/Suspicious pressure range/i)).toBeInTheDocument();
        expect(screen.getByText(/Unfiltered UVP5HD project/i)).toBeInTheDocument();
        expect(screen.getByText('Maximum sample pressure')).toBeInTheDocument();
        expect(screen.getByText('Pressure slice [db]')).toBeInTheDocument();

        // EcoTaxa: the categories, the object and sample shares, the two warnings
        expect(screen.getByText('Acartiidae')).toBeInTheDocument();
        expect(screen.getByText('Copepoda')).toBeInTheDocument();
        const state = section('EcoTaxa classification state');
        expect(within(state).getByText(/3 samples not imported in EcoTaxa/i)).toBeInTheDocument();
        expect(within(state).getByText(/Classification uncompleted/i)).toBeInTheDocument();
        expect(within(state).getAllByText('50%')).toHaveLength(3); // validated objects, predicted objects, samples fully validated
        expect(within(state).getByText('49%')).toBeInTheDocument();
        expect(within(state).getByText('1%')).toBeInTheDocument();

        // Nothing to import or link: no call-to-action card
        expect(screen.queryByRole('button', { name: /IMPORT DATA/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /LINK PROJECT/i })).not.toBeInTheDocument();
    }, 15000);

    // TC-S10: every warning leads where to act on it
    it('TC-S10: links each warning to the tab where to act, the classification one to the EcoTaxa project', async () => {
        answerStats(makeProjectStatsFixture());
        renderTab({ ecoTaxaProjectUrl: 'https://ecotaxa.obs-vlfr.fr/prj/20092' });

        expect(await screen.findByRole('link', { name: /Samples imported without raw backup/i })).toHaveAttribute('href', '/projects/101/backup');
        expect(screen.getByRole('link', { name: /Missing 1 CTD file/i })).toHaveAttribute('href', '/projects/101/import');
        expect(screen.getByRole('link', { name: /Mismatch 1 sample GPS coordinates/i })).toHaveAttribute('href', '/projects/101/data');
        expect(screen.getByRole('link', { name: /1 sample on land/i })).toHaveAttribute('href', '/projects/101/data');
        expect(screen.getByRole('link', { name: /Mismatch in instrument parameters/i })).toHaveAttribute('href', '/projects/101/data');
        expect(screen.getByRole('link', { name: /Mismatch instrument specification/i })).toHaveAttribute('href', '/projects/101/data');
        expect(screen.getByRole('link', { name: /^Suspicious time range$/i })).toHaveAttribute('href', '/projects/101/data');
        expect(screen.getByRole('link', { name: /project longer than a year/i })).toHaveAttribute('href', '/projects/101/metadata');
        expect(screen.getByRole('link', { name: /Suspicious pressure range/i })).toHaveAttribute('href', '/projects/101/data');
        expect(screen.getByRole('link', { name: /Unfiltered UVP5HD project/i })).toHaveAttribute('href', '/projects/101/metadata');
        expect(screen.getByRole('link', { name: /3 samples not imported in EcoTaxa/i })).toHaveAttribute('href', '/projects/101/import');
        const classification = screen.getByRole('link', { name: /Classification uncompleted/i });
        expect(classification).toHaveAttribute('href', 'https://ecotaxa.obs-vlfr.fr/prj/20092');
        expect(classification).toHaveAttribute('target', '_blank');
    }, 15000);

    // TC-S2: a project without sample keeps the call-to-action cards
    it('TC-S2: offers the import and link cards to who can act, and no data section, while the project has no sample', async () => {
        const user = userEvent.setup({ delay: null });
        const onImportData = vi.fn();
        const onLinkProject = vi.fn();
        answerStats(makeEmptyProjectStats());
        renderTab({ ecoTaxaLinked: false, onImportData, onLinkProject });

        await user.click(await screen.findByRole('button', { name: /IMPORT DATA/i }));
        expect(onImportData).toHaveBeenCalledTimes(1);
        await user.click(screen.getByRole('button', { name: /LINK PROJECT/i }));
        expect(onLinkProject).toHaveBeenCalledTimes(1);

        expect(screen.getByText('Stations')).toBeInTheDocument();
        expect(screen.getByText('No sample yet: the delays have not started.')).toBeInTheDocument();
        expect(screen.getByText(/No sample imported yet/i)).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Samples distribution' })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Raw backup' })).not.toBeInTheDocument();
    });

    // TC-S3: no action for a user who may neither import nor manage
    it('TC-S3: shows no card to a user without privilege, the notice first', async () => {
        answerStats(makeEmptyProjectStats());
        renderTab({ ecoTaxaLinked: false, notice: <p>Data hidden notice</p> });

        expect(await screen.findByText('Stations')).toBeInTheDocument();
        expect(screen.getByText('Data hidden notice')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /IMPORT DATA/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /LINK PROJECT/i })).not.toBeInTheDocument();
    });

    // TC-S4: the raw backup is an operational detail of the members
    it('TC-S4: hides the raw backup section when the backend does not serve it', async () => {
        answerStats(makeProjectStatsFixture({ raw_backup: null }));
        renderTab();

        expect(await screen.findByRole('region', { name: 'Samples distribution' })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Raw backup' })).not.toBeInTheDocument();
    });

    // TC-S5: a project with samples but no EcoTaxa link
    it('TC-S5: leaves the EcoTaxa sections out of an unlinked project, and raises no warning without data issue', async () => {
        const stats = makeProjectStatsFixture();
        answerStats(makeProjectStatsFixture({
            ecotaxa: { ...makeEmptyProjectStats().ecotaxa, nb_samples_not_imported: 56 },
            map: { ...stats.map, nb_samples_without_ctd: 0, nb_coordinates_mismatches: 0, nb_samples_on_land: 0 },
            samples: { ...stats.samples, nb_instrument_parameter_mismatches: 0, nb_object_size_mismatches: 0, nb_suspicious_dates: 0, time_span_over_a_year: false, nb_suspicious_pressures: 0, unfiltered_uvp5hd: false },
            raw_backup: { last_backup_utc_date_time: '2026-10-01T00:00:00.000Z', nb_samples_not_backed_up: 0 },
        }));
        renderTab({ ecoTaxaLinked: false });

        expect(await screen.findByRole('region', { name: 'Samples distribution' })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'EcoTaxa classification state' })).not.toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // TC-S6: the EcoTaxa statistics still being read
    it('TC-S6: says which samples are still being read from EcoTaxa', async () => {
        const stats = makeProjectStatsFixture();
        answerStats(makeProjectStatsFixture({ ecotaxa: { ...stats.ecotaxa, partial: true, nb_samples_pending: 4 } }));
        renderTab();

        expect(await screen.findByText(/EcoTaxa statistics are being read for 4 samples/i)).toBeInTheDocument();
    });

    // TC-S7: a failed request
    it('TC-S7: shows the backend error and still offers the actions', async () => {
        server.use(http.get('*/projects/:projectId/stats', () => HttpResponse.json({ errors: ['Cannot get project statistics'] }, { status: 500 })));
        renderTab({ onImportData: vi.fn() });

        expect(await screen.findByRole('alert')).toHaveTextContent('Cannot get project statistics');
        expect(screen.getByRole('button', { name: /IMPORT DATA/i })).toBeInTheDocument();
        expect(screen.queryByText('Stations')).not.toBeInTheDocument();
    });
});
