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

const linkedMockProjectData = {
    ...mockProjectData,
    project_id: 102,
    project_title: 'Linked Project',
    ecotaxa_instance_id: 1,
    ecotaxa_project_id: 20092,
    ecotaxa_project_name: 'EcoTaxa linked project',
};

describe('ProjectMetadataTab (Functional)', () => {

    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();

        // 1. Mock the specific project fetch
        server.use(
            http.post('*/projects/searches*', () => {
                return HttpResponse.json({
                    search_info: { total: 1, page: 1, limit: 1 },
                    projects: [mockProjectData]
                });
            }),
            http.post('*/users/searches*', () => HttpResponse.json({ users: [] })),
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
    }, 25000);

    // TC-J2: Update Success
    it('TC-J2: should successfully save updated metadata', async () => {
        const user = userEvent.setup({ delay: null });

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
    }, 15000);

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

    it('TC-J4: should show linked EcoTaxa summary and switch back to editable fields after unlink', async () => {
        const user = userEvent.setup({ delay: null });
        let capturedPatchBody: Record<string, unknown> | null = null;

        server.use(
            http.post('*/projects/searches*', () => {
                return HttpResponse.json({
                    search_info: { total: 1, page: 1, limit: 1 },
                    projects: [linkedMockProjectData]
                });
            }),
            http.get('*/ecotaxa_instances', () => HttpResponse.json([
                {
                    ecotaxa_instance_id: 1,
                    ecotaxa_instance_name: 'FR',
                    ecotaxa_instance_description: 'France instance',
                    ecotaxa_instance_url: 'https://ecotaxa.obs-vlfr.fr'
                }
            ])),
            http.patch('*/projects/102', async ({ request }) => {
                capturedPatchBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({}, { status: 200 });
            })
        );

        renderWithRouter(<ProjectMetadataTab projectId={102} />);

        expect(await screen.findByDisplayValue('EcoTaxa linked project - 20092 - FR')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /unlink ecotaxa project/i }));

        expect(await screen.findByText(/You will still need to click the save button to validate the changes/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/EcoTaxa instance/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^SAVE$/i }));

        expect(await screen.findByText('Project updated successfully!')).toBeInTheDocument();
        if (!capturedPatchBody) {
            throw new Error('PATCH body was not captured');
        }
        type PatchBody = {
            ecotaxa_project_id?: number | null;
            ecotaxa_instance_id?: number | null;
            ecotaxa_account_id?: number | null;
            ecotaxa_project_name?: string | null;
            new_ecotaxa_project?: boolean;
        };

        const patchBody = capturedPatchBody as PatchBody;
        expect(patchBody.ecotaxa_project_id).toBeNull();
        expect(capturedPatchBody).not.toHaveProperty('ecotaxa_instance_id');
        expect(capturedPatchBody).not.toHaveProperty('ecotaxa_account_id');
        expect(capturedPatchBody).not.toHaveProperty('ecotaxa_project_name');
        expect(capturedPatchBody).not.toHaveProperty('new_ecotaxa_project');
    }, 15000);

    // TC-J5: the title loaded from the backend is locked as a non-erasable prefix.
    it('TC-J5: locks the loaded project title so it cannot be erased', async () => {
        const user = userEvent.setup({ delay: null });

        renderWithRouter(<ProjectMetadataTab projectId={101} />);

        const titleInput = await screen.findByDisplayValue('Existing Project');

        // The field advertises that the loaded title cannot be removed...
        expect(screen.getByText(/The loaded title cannot be removed/i)).toBeInTheDocument();

        // ...and trying to clear it leaves the loaded value in place.
        await user.clear(titleInput);
        expect(screen.getByDisplayValue('Existing Project')).toBeInTheDocument();
    }, 15000);
});