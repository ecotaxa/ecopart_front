import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { ProjectMetadataTab } from '../components/ProjectMetadataTab';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';

const mockProjectData = {
    project_id: 101,
    root_folder_path: '/data/test',
    project_title: 'Existing Project',
    project_acronym: 'EP',
    instrument_model: 'UVP5HD',
    serial_number: 'sn123',
    cruise: 'cruise_2026',
    ship: 'tara',
    project_description: 'Old description',
    data_owner_name: 'John',
    data_owner_email: 'john@test.com',
    operator_name: 'Jane',
    operator_email: 'jane@test.com',
    chief_scientist_name: 'Bob',
    chief_scientist_email: 'bob@test.com',
    override_depth_offset: 0,
    enable_descent_filter: true,
    ecotaxa_instance_id: null,
    ecotaxa_project_id: null,
};

describe('ProjectMetadataTab (Functional)', () => {

    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();

        // 1. Mock the specific project fetch
        server.use(
            http.post('*/projects/searches', () => {
                return HttpResponse.json({
                    search_info: { total: 1, page: 1, limit: 1 },
                    projects: [mockProjectData]
                });
            }),
            http.post('*/users/searches', () => HttpResponse.json({ users: [] })),
            http.get('*/ecotaxa_instances', () => HttpResponse.json([])),
            http.get('*/users/*/ecotaxa_account', () => HttpResponse.json({ ecotaxa_accounts: [] }))
        );
    });

    // TC-J1: Initial Data Loading
    it('TC-J1: should fetch and pre-fill form with existing project data', async () => {
        renderWithRouter(<ProjectMetadataTab projectId={101} />);

        // Wait for loading to finish by finding a pre-filled value
        // Use 'displayValue' for TextFields
        expect(await screen.findByDisplayValue('Existing Project')).toBeInTheDocument();
        expect(screen.getByDisplayValue('EP')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/data/test')).toBeInTheDocument();
    });

    // TC-J2: Update Success
    it('TC-J2: should successfully save updated metadata', async () => {
        const user = userEvent.setup();

        server.use(
            http.patch('*/projects/101', () => {
                return HttpResponse.json({}, { status: 200 });
            })
        );

        renderWithRouter(<ProjectMetadataTab projectId={101} />);

        const titleInput = await screen.findByDisplayValue('Existing Project');
        await user.clear(titleInput);
        await user.type(titleInput, 'Updated Project Title');

        const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
        await user.click(saveButton);

        expect(await screen.findByText('Project updated successfully!')).toBeInTheDocument();
    }, 10000);

    // TC-J3: Update Error
    it('TC-J3: should display error message if API patch fails', async () => {
        const user = userEvent.setup();

        server.use(
            http.patch('*/projects/101', () => {
                return HttpResponse.json({ message: "Validation failed on backend" }, { status: 400 });
            })
        );

        renderWithRouter(<ProjectMetadataTab projectId={101} />);

        // Wait for load
        await screen.findByDisplayValue('Existing Project');

        const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
        await user.click(saveButton);

        expect(await screen.findByText('Validation failed on backend')).toBeInTheDocument();
    }, 10000);
});