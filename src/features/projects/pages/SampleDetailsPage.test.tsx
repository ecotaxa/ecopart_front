import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import SampleDetailsPage from './SampleDetailsPage';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import type { SampleData } from '../api/projects.api';

const mockApi = (sample: Partial<SampleData>, managerIds: number[] = []) => {
    server.use(
        http.post('*/projects/searches', () => HttpResponse.json({
            search_info: { total: 1, page: 1, limit: 1 },
            projects: [{
                project_id: 555,
                project_title: 'uvp5_sn000_tara2011',
                project_acronym: 'tara',
                instrument_model: 'UVP5HD',
                root_folder_path: '/data/tara',
                ecotaxa_project_id: 636,
                ecotaxa_project_name: 'uvp5_sn000_tara2011',
                ecotaxa_instance_id: 1,
                managers: managerIds.map((user_id) => ({ user_id })),
            }],
        })),
        http.get('*/projects/555/samples/9', () => HttpResponse.json(
            { sample_id: 9, sample_name: 'tara_093_00_a', filename: '20110311194210', ...sample },
        )),
        http.get('*/ecotaxa_instances', () => HttpResponse.json([
            { ecotaxa_instance_id: 1, ecotaxa_instance_name: 'FR', ecotaxa_instance_description: '', ecotaxa_instance_url: 'https://ecotaxa.obs-vlfr.fr/' },
        ])),
    );
};

const renderPage = (route = '/projects/555/samples/9') => renderWithRouter(
    <Routes>
        <Route path="/projects/:id/samples/:sampleId/:tabName?" element={<SampleDetailsPage />} />
    </Routes>,
    { route },
);

describe('SampleDetailsPage', () => {
    beforeEach(() => {
        loginAsUser();
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
        mockApi({ ecotaxa_sample_imported: true, ecotaxa_sample_id: 4242 });
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
        });
        renderPage();

        expect(await screen.findByLabelText('Original file name')).toHaveValue('tara_sbe_9c_110311_01');
        expect(screen.getByLabelText('Import date')).toHaveValue('UTC  2022-12-05 15:14:44');
        expect(screen.getByLabelText('Imported CTD description')).toHaveValue('01=Oxygen [ml/l]\n02=Ph');
        expect(screen.getByLabelText('File extension')).toHaveValue('ctd');
        expect(screen.getByRole('button', { name: /Open CTD import task/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /Open EcoTaxa import task/i })).toBeEnabled();
    });

    it('disables every action when the sample is neither in EcoTaxa nor linked to a CTD', async () => {
        mockApi({ ecotaxa_sample_imported: false, ctd_imported: false });
        renderPage();

        expect(await screen.findByText(/No CTD file is linked/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Open CTD import task/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Open EcoTaxa import task/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Open sample in EcoTaxa/i })).toBeDisabled();
    });

    it('offers DELETE to a project manager', async () => {
        mockApi({}, [1]);
        renderPage();

        expect(await screen.findByRole('button', { name: 'DELETE' })).toBeInTheDocument();
    });

    it('hides DELETE from a user who is not a manager, as the backend would refuse it', async () => {
        mockApi({}, [2]);
        renderPage();

        expect(await screen.findByLabelText('EcoPart project name')).toHaveValue('uvp5_sn000_tara2011');
        expect(screen.queryByRole('button', { name: 'DELETE' })).not.toBeInTheDocument();
    });
});
