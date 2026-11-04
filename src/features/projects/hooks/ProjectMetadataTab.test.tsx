import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
    filtered_project: true,
    time_duration_check: false,
    ecotaxa_instance_id: null,
    ecotaxa_project_id: null,
    // The logged-in user manages the project: the save tests edit it.
    managers: [{ user_id: 1 }],
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

    // TC-J11: the options the quality checks of the STATS tab read
    it('TC-J11: loads the filtered project and time duration check options and saves them', async () => {
        const user = userEvent.setup({ delay: null });
        let capturedPatchBody: Record<string, unknown> | null = null;
        server.use(
            http.patch('*/projects/101', async ({ request }) => {
                capturedPatchBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({}, { status: 200 });
            })
        );

        renderWithRouter(<ProjectMetadataTab projectId={101} />);

        const filtered = await screen.findByRole('switch', { name: /Filtered project/i });
        const duration = screen.getByRole('switch', { name: /Time duration check/i });
        expect(filtered).toBeChecked();
        expect(duration).not.toBeChecked();

        await user.click(filtered);
        await user.click(duration);
        await user.click(screen.getByRole('button', { name: /^SAVE$/i }));

        expect(await screen.findByText('Project updated successfully!')).toBeInTheDocument();
        expect(capturedPatchBody).toMatchObject({ filtered_project: false, time_duration_check: true });
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

    // TC-J6: the backend reads any EcoTaxa field as a link request (account required,
    // "already linked" check), so a plain metadata save on a linked project must not
    // re-send the current link.
    it('TC-J6: saves a new root folder path on a linked project without re-sending the EcoTaxa link', async () => {
        const user = userEvent.setup({ delay: null });
        let capturedPatchBody: Record<string, unknown> | null = null;

        server.use(
            http.post('*/projects/searches*', () => {
                return HttpResponse.json({
                    search_info: { total: 1, page: 1, limit: 1 },
                    projects: [linkedMockProjectData]
                });
            }),
            http.patch('*/projects/102', async ({ request }) => {
                capturedPatchBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ ...linkedMockProjectData, root_folder_path: '/data/moved' }, { status: 200 });
            })
        );

        renderWithRouter(<ProjectMetadataTab projectId={102} />);

        const pathInput = await screen.findByLabelText(/Root folder path/i);
        await user.clear(pathInput);
        await user.type(pathInput, '/data/moved');
        await user.click(screen.getByRole('button', { name: /^SAVE$/i }));

        expect(await screen.findByText('Project updated successfully!')).toBeInTheDocument();
        expect(capturedPatchBody).toMatchObject({ root_folder_path: '/data/moved' });
        for (const key of ['ecotaxa_project_id', 'ecotaxa_instance_id', 'ecotaxa_account_id', 'ecotaxa_project_name', 'new_ecotaxa_project']) {
            expect(capturedPatchBody).not.toHaveProperty(key);
        }
    }, 15000);

    // TC-J7: an EcoTaxa instance left on an unlinked project (no account picked) is not a link request.
    it('TC-J7: sends no EcoTaxa field when an unlinked project only carries an instance', async () => {
        const user = userEvent.setup({ delay: null });
        let capturedPatchBody: Record<string, unknown> | null = null;

        server.use(
            http.post('*/projects/searches*', () => {
                return HttpResponse.json({
                    search_info: { total: 1, page: 1, limit: 1 },
                    projects: [{ ...mockProjectData, ecotaxa_instance_id: 1 }]
                });
            }),
            http.patch('*/projects/101', async ({ request }) => {
                capturedPatchBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({}, { status: 200 });
            })
        );

        renderWithRouter(<ProjectMetadataTab projectId={101} />);

        await screen.findByDisplayValue('Existing Project');
        // Unlike the New Project form, creating an EcoTaxa project is opt-in here.
        expect(screen.getByRole('switch', { name: /Create a new EcoTaxa project/i })).not.toBeChecked();
        await user.click(screen.getByRole('button', { name: /^SAVE$/i }));

        expect(await screen.findByText('Project updated successfully!')).toBeInTheDocument();
        for (const key of ['ecotaxa_project_id', 'ecotaxa_instance_id', 'ecotaxa_account_id', 'new_ecotaxa_project']) {
            expect(capturedPatchBody).not.toHaveProperty(key);
        }
    }, 15000);

    // TC-J5: the title loaded from the backend stays fully editable (no locked prefix).
    it('TC-J5: lets the user replace the loaded project title entirely', async () => {
        const user = userEvent.setup({ delay: null });
        let capturedPatchBody: Record<string, unknown> | null = null;
        server.use(
            http.patch('*/projects/101', async ({ request }) => {
                capturedPatchBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({}, { status: 200 });
            })
        );

        renderWithRouter(<ProjectMetadataTab projectId={101} />);

        const titleInput = await screen.findByDisplayValue('Existing Project');
        expect(screen.queryByText(/The loaded title cannot be removed/i)).not.toBeInTheDocument();

        await user.clear(titleInput);
        expect(titleInput).toHaveValue('');
        await user.type(titleInput, 'Renamed');
        expect(titleInput).toHaveValue('Renamed');

        await user.click(screen.getByRole('button', { name: /^SAVE$/i }));
        expect(await screen.findByText('Project updated successfully!')).toBeInTheDocument();
        expect(capturedPatchBody).toMatchObject({ project_title: 'Renamed' });
    }, 15000);

    // TC-J6: the backend project carries no account ids for the people, so the
    // tab resolves the loaded emails through the users search.
    it('TC-J6: checks the people emails against the EcoPart accounts and shows the confirmed / unknown icons', async () => {
        let receivedFilters: unknown = null;
        server.use(
            http.post('*/users/searches*', async ({ request }) => {
                receivedFilters = await request.json();
                return HttpResponse.json({
                    search_info: { total: 1, page: 1, limit: 3 },
                    // Only the data owner has an account (and the match is case-insensitive).
                    users: [{ user_id: 42, first_name: 'John', last_name: 'Test', email: 'john@test.com' }],
                });
            }),
        );

        renderWithRouter(<ProjectMetadataTab projectId={101} />);
        await screen.findByDisplayValue('Existing Project');

        // One `email IN (...)` lookup for the three loaded emails.
        expect(await screen.findByTestId('VerifiedUserIcon')).toBeInTheDocument();
        expect(receivedFilters).toEqual([
            { field: 'email', operator: 'IN', value: ['john@test.com', 'bob@test.com', 'jane@test.com'] },
        ]);

        // Data owner confirmed, chief scientist + operator unknown (need to register).
        expect(screen.getAllByTestId('VerifiedUserIcon')).toHaveLength(1);
        expect(screen.getAllByTestId('PersonOffIcon')).toHaveLength(2);
    }, 15000);

    // TC-J8: a viewer who may not manage the project reads the same form, frozen.
    it('TC-J8: renders read-only, without save, folder browser, unlink or EcoTaxa account shortcut', async () => {
        const accountRequests: string[] = [];
        server.use(
            http.post('*/projects/searches*', () => HttpResponse.json({
                search_info: { total: 1, page: 1, limit: 1 },
                projects: [{ ...linkedMockProjectData, managers: [{ user_id: 2 }] }],
            })),
            http.get('*/users/:id/ecotaxa_account', ({ request }) => {
                accountRequests.push(request.url);
                return HttpResponse.json({ ecotaxa_accounts: [] });
            }),
        );

        renderWithRouter(<ProjectMetadataTab projectId={102} readOnly />);

        const titleInput = await screen.findByDisplayValue('Linked Project');
        expect(titleInput).toHaveAttribute('readonly');
        expect(screen.getByLabelText(/Project acronym/i)).toHaveAttribute('readonly');
        expect(screen.getByLabelText(/Data owner email/i)).toHaveAttribute('readonly');
        expect(screen.getByLabelText(/Root folder path/i)).toHaveAttribute('readonly');
        expect(screen.getByRole('switch', { name: /Enable descent filter/i })).toBeDisabled();
        expect(screen.queryByText(/The loaded title cannot be removed/i)).not.toBeInTheDocument();

        expect(screen.queryByRole('button', { name: /Browse server folders/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^SAVE$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^CANCEL$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /unlink ecotaxa project/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /ADD AN ECOTAXA ACCOUNT/i })).not.toBeInTheDocument();
        // The linked project itself stays visible (and openable in EcoTaxa).
        expect(screen.getByRole('button', { name: /Open EcoTaxa project/i })).toBeInTheDocument();
        expect(accountRequests).toEqual([]);
    }, 15000);

    // TC-J9: the backend leaves the import folder out of the project a user without privilege sees.
    it('TC-J9: does not render the root folder field when the payload has no root_folder_path', async () => {
        server.use(
            http.post('*/projects/searches*', () => HttpResponse.json({
                search_info: { total: 1, page: 1, limit: 1 },
                projects: [{ ...mockProjectData, root_folder_path: undefined, managers: [{ user_id: 2 }] }],
            })),
        );

        renderWithRouter(<ProjectMetadataTab projectId={101} readOnly />);

        await screen.findByDisplayValue('Existing Project');
        expect(screen.queryByLabelText(/Root folder path/i)).not.toBeInTheDocument();
        expect(screen.getByText(/This project is not linked to an EcoTaxa project/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/EcoTaxa instance/i)).not.toBeInTheDocument();
    }, 15000);

    // TC-J10: fixing a field after a failed save removes its inline error.
    it('TC-J10: clears the inline error of a field once the user edits it', async () => {
        const user = userEvent.setup({ delay: null });
        server.use(
            http.post('*/projects/searches*', () => HttpResponse.json({
                search_info: { total: 1, page: 1, limit: 1 },
                projects: [{ ...mockProjectData, project_acronym: '' }],
            })),
        );

        renderWithRouter(<ProjectMetadataTab projectId={101} />);
        await screen.findByDisplayValue('Existing Project');

        const acronymInput = screen.getByLabelText(/Project acronym/i);
        await user.click(screen.getByRole('button', { name: /^SAVE$/i }));
        await waitFor(() => expect(acronymInput).toHaveAttribute('aria-invalid', 'true'));
        expect(acronymInput).toHaveAccessibleDescription(/Project acronym is required/i);

        await user.type(acronymInput, 'EP');
        expect(acronymInput).toHaveAttribute('aria-invalid', 'false');
        expect(acronymInput).not.toHaveAccessibleDescription(/Project acronym is required/i);
    }, 15000);
});
