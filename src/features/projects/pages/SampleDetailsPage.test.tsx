import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import SampleDetailsPage from './SampleDetailsPage';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsRole, loginAsUser } from '@/test/helpers/auth.helpers';
import { makeProjectFixture, type ProjectFixtureOptions } from '@/test/helpers/project.fixtures';
import { answerConfirmDialogs } from '@/test/helpers/confirm.helpers';
import type { SampleData } from '../api/projects.api';

/** Every request the page sent, as "METHOD path", to prove what it did not ask for. */
let requests: string[] = [];

/**
 * Mock project 555, its sample 9 and the endpoints the sample tabs read. `access`
 * carries the privileges (`loginAsRole(...)`) and the privacy status; the
 * default is a project visible to anyone.
 */
const mockApi = (sample: Partial<SampleData>, access: ProjectFixtureOptions = {}) => {
    const project = makeProjectFixture({
        project_id: 555,
        project_title: 'uvp5_sn000_tara2011',
        project_acronym: 'tara',
        root_folder_path: '/data/tara',
        ecotaxa_project_id: 636,
        ecotaxa_project_name: 'uvp5_sn000_tara2011',
        ecotaxa_instance_id: 1,
        privacy_status: 'visible',
        ...access,
    });
    server.use(
        http.post('*/projects/searches', () => HttpResponse.json({
            search_info: { total: 1, page: 1, limit: 1 },
            projects: [project],
        })),
        http.get('*/projects/555/samples/9', () => HttpResponse.json(
            { sample_id: 9, sample_name: 'tara_093_00_a', filename: '20110311194210', ...sample },
        )),
        http.get('*/projects/555/samples/9/qc-graphs', () => HttpResponse.json({ errors: ['Not computed in tests'] }, { status: 500 })),
        http.get('*/projects/555/ecotaxa_samples', () => HttpResponse.json({ search_info: { total: 0, page: 1, limit: 10 }, ecotaxa_samples: [] })),
        http.get('*/ecotaxa_instances', () => HttpResponse.json([
            { ecotaxa_instance_id: 1, ecotaxa_instance_name: 'FR', ecotaxa_instance_description: '', ecotaxa_instance_url: 'https://ecotaxa.obs-vlfr.fr/' },
        ])),
    );
};

const renderPage = (route = '/projects/555/samples/9') => renderWithRouter(
    <Routes>
        <Route path="/projects/:id/samples/:sampleId/:tabName?" element={<SampleDetailsPage />} />
        <Route path="/projects/:id/:tabName" element={<h1>Project Data Mock</h1>} />
    </Routes>,
    { route },
);

// The deletion runs as a task: the page waits for its final status before leaving
const mockDeletion = (finalTask: Record<string, unknown>) => {
    server.use(
        http.delete('*/projects/555/samples/9', () => HttpResponse.json({ task_id: 42, task_type: 'DELETE_SAMPLE', task_status: 'PENDING' })),
        http.get('*/tasks/42/', () => HttpResponse.json({ task_id: 42, task_type: 'DELETE_SAMPLE', ...finalTask })),
    );
};

describe('SampleDetailsPage', () => {
    beforeEach(() => {
        loginAsUser();
        requests = [];
        server.events.removeAllListeners('request:start');
        server.events.on('request:start', ({ request }) => {
            requests.push(`${request.method} ${new URL(request.url).pathname}`);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects a malformed sample id', () => {
        renderPage('/projects/555/samples/abc');
        expect(screen.getByText(/Malformed route identifiers/i)).toBeInTheDocument();
    });

    it('rejects a sample id with a numeric prefix instead of loading that prefix', () => {
        renderPage('/projects/555/samples/9abc');
        expect(screen.getByText(/Malformed route identifiers/i)).toBeInTheDocument();
    });

    it('shows the context of the sample, with the EcoTaxa link filtered on the sample', async () => {
        mockApi({ ecotaxa_sample_imported: true, ecotaxa_sample_id: 4242 }, { ...loginAsRole('user'), privacy_status: 'visible' });
        renderPage();

        expect(await screen.findByText('tara_093_00_a')).toBeInTheDocument();
        expect(screen.getByLabelText('File name')).toHaveValue('20110311194210');
        expect(await screen.findByLabelText('EcoPart project name')).toHaveValue('uvp5_sn000_tara2011');

        const link = await screen.findByRole('link', { name: /Open sample in EcoTaxa/i });
        expect(link).toHaveAttribute('href', 'https://ecotaxa.obs-vlfr.fr/prj/636?samples=4242');
    });

    it('fills the CTD section and opens the import task once the backend sends it', async () => {
        mockApi({
            ctd_imported: true,
            ctd_original_file_name: 'tara_sbe_9c_110311_01',
            ctd_import_utc_date_time: '2022-12-05T15:14:44.000Z',
            ctd_description: '01=Oxygen [ml/l]\n02=Ph',
            ctd_import_task_id: 31,
            ctd_file_extension: 'ctd',
            ecotaxa_sample_task_id: 30,
        }, { ...loginAsRole('member') });
        renderPage();

        expect(await screen.findByLabelText('Original file name')).toHaveValue('tara_sbe_9c_110311_01');
        expect(screen.getByLabelText('Import date')).toHaveValue('UTC  2022-12-05 15:14:44');
        expect(screen.getByLabelText('Imported CTD description')).toHaveValue('01=Oxygen [ml/l]\n02=Ph');
        expect(screen.getByLabelText('File extension')).toHaveValue('ctd');
        expect(screen.getByRole('button', { name: /Open CTD import task/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /Open EcoTaxa import task/i })).toBeEnabled();
    });

    it('disables every action when the sample is neither in EcoTaxa nor linked to a CTD', async () => {
        mockApi({ ecotaxa_sample_imported: false, ctd_imported: false }, { ...loginAsRole('member') });
        renderPage();

        expect(await screen.findByText(/No CTD file is linked/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Open CTD import task/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Open EcoTaxa import task/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Open sample in EcoTaxa/i })).toBeDisabled();
    });

    it('offers DELETE to a project manager', async () => {
        mockApi({}, { ...loginAsRole('manager') });
        renderPage();

        expect(await screen.findByRole('button', { name: 'DELETE' })).toBeInTheDocument();
    });

    it('deletes the sample through its task, then returns to the project data', async () => {
        mockApi({}, { ...loginAsRole('manager') });
        mockDeletion({ task_status: 'DONE' });
        answerConfirmDialogs(true);
        renderPage();

        await userEvent.setup().click(await screen.findByRole('button', { name: 'DELETE' }));

        expect(await screen.findByText('Project Data Mock')).toBeInTheDocument();
    });

    it('stays on the sample and shows the task error when the deletion task fails', async () => {
        mockApi({}, { ...loginAsRole('manager') });
        mockDeletion({ task_status: 'ERROR', task_error: 'Deletion failed for 1 of 1 sample(s). tara_093_00_a : EcoTaxa down' });
        answerConfirmDialogs(true);
        renderPage();

        await userEvent.setup().click(await screen.findByRole('button', { name: 'DELETE' }));

        expect(await screen.findByText(/Failed to delete the sample: .*EcoTaxa down/)).toBeInTheDocument();
        expect(screen.queryByText('Project Data Mock')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'DELETE' })).toBeEnabled();
    });

    it('hides DELETE from a user who is not a manager, as the backend would refuse it', async () => {
        mockApi({}, { ...loginAsRole('member') });
        renderPage();

        expect(await screen.findByLabelText('EcoPart project name')).toHaveValue('uvp5_sn000_tara2011');
        expect(screen.queryByRole('button', { name: 'DELETE' })).not.toBeInTheDocument();
    });

    // TC-AM1: the samples of a private project are hidden from a user without privilege
    it('TC-AM1: shows the privacy notice to a user on a private project, without requesting the sample', async () => {
        mockApi({}, { ...loginAsRole('user'), privacy_status: 'private' });
        renderPage();

        expect(await screen.findByText(/Data hidden until the project becomes visible/i)).toBeInTheDocument();
        expect(screen.queryByText(/Failed to load the sample/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'DELETE' })).not.toBeInTheDocument();
        expect(requests).not.toContain('GET /projects/555/samples/9');
    });

    // TC-AM2: a user on a visible project reads the sample but acts on nothing
    it('TC-AM2: gives a user on a visible project a read-only sample (no task, position or QC action)', async () => {
        const user = userEvent.setup({ delay: null });
        mockApi(
            { ecotaxa_sample_imported: true, ecotaxa_sample_id: 4242, ecotaxa_sample_task_id: 30, ctd_import_task_id: 31, visual_qc_status_label: 'PENDING' },
            { ...loginAsRole('user'), privacy_status: 'visible' },
        );
        renderPage();

        expect(await screen.findByRole('link', { name: /Open sample in EcoTaxa/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Open EcoTaxa import task/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Open CTD import task/i })).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: /METADATA/i }));
        expect(await screen.findByRole('radio', { name: 'Location from imported metadata' })).toBeDisabled();

        await user.click(screen.getByRole('tab', { name: /QUALITY CHECKS/i }));
        expect(await screen.findByText(/only shown to the project members/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Validate QC/i })).not.toBeInTheDocument();
        expect(requests).not.toContain('GET /projects/555/ecotaxa_samples');
    });

    // TC-AM3: a member validates the QC and changes the position source
    it('TC-AM3: offers QC validation and the position choice to a member', async () => {
        const user = userEvent.setup({ delay: null });
        mockApi({ visual_qc_status_label: 'PENDING' }, { ...loginAsRole('member'), privacy_status: 'private' });
        renderPage('/projects/555/samples/9/quality-checks');

        expect(await screen.findByRole('button', { name: /Validate QC/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'DELETE' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: /METADATA/i }));
        expect(await screen.findByRole('radio', { name: 'Location from imported metadata' })).toBeEnabled();
    });

    // TC-AM4: an unknown project, or an unknown sample, is a "not found" state
    it('TC-AM4: tells a missing project apart from a missing sample', async () => {
        server.use(
            http.post('*/projects/searches', () => HttpResponse.json({ search_info: { total: 0, page: 1, limit: 1 }, projects: [] })),
            http.get('*/projects/555/samples/9', () => HttpResponse.json({ errors: ['Cannot find sample'] }, { status: 404 })),
        );
        const { unmount } = renderPage();
        expect(await screen.findByText('Project not found')).toBeInTheDocument();
        unmount();

        mockApi({}, { ...loginAsRole('member') });
        server.use(http.get('*/projects/555/samples/9', () => HttpResponse.json({ errors: ['Cannot find sample'] }, { status: 404 })));
        renderPage();
        expect(await screen.findByText(/This sample does not exist/i)).toBeInTheDocument();
    });

    // TC-AM5: a refusal on the sample itself (401 after the refresh retry, or 403) says so
    it('TC-AM5: shows an access message when the backend refuses the sample', async () => {
        mockApi({}, { ...loginAsRole('user'), privacy_status: 'visible' });
        server.use(http.get('*/projects/555/samples/9', () => HttpResponse.json({ errors: ['Logged user cannot get this sample'] }, { status: 403 })));
        renderPage();

        expect(await screen.findByText(/not allowed to see this sample/i)).toBeInTheDocument();
    });
});
