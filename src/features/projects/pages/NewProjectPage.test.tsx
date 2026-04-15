import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import NewProjectPage from './NewProjectPage';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';

// Helper to fill the massive form
async function fillValidProjectForm(user: UserEvent) {
    // 1. Root Folder
    await user.type(screen.getByLabelText(/Root folder path/i), '/data/my_new_project');

    // 2. Instrument
    // MUI Selects (combobox) need to be clicked, then the option selected
    await waitFor(() => {
        expect(screen.getByLabelText(/Instrument \*/i)).toBeEnabled();
    });
    await user.click(screen.getByLabelText(/Instrument \*/i));
    await user.click(await screen.findByRole('option', { name: 'UVP5HD' }));
    await user.type(screen.getByLabelText(/Instrument serial number/i), 'sn123');

    // 3. Metadata
    await user.type(screen.getByLabelText(/Project title/i), 'Test Project Title');
    await user.type(screen.getByLabelText(/Project acronym/i), 'TPT');

    // Ship is an autocomplete (multiple)
    const shipInput = screen.getByLabelText(/Ship/i);
    await user.type(shipInput, 'tara');
    // Wait for the portal dropdown to render the option
    await user.click(await screen.findByRole('option', { name: 'tara' }));

    // 4. Cruise and Description
    await user.type(screen.getByLabelText(/Cruise/i), 'tara_2026');
    await user.type(screen.getByLabelText(/Project description/i), 'A description of the project');

    // 5. People
    await user.type(screen.getByLabelText(/Data owner name/i), 'Owner Name');
    await user.type(screen.getByLabelText(/Data owner email/i), 'owner@test.com');
    await user.type(screen.getByLabelText(/Chief scientist name/i), 'Scientist Name');
    await user.type(screen.getByLabelText(/Chief scientist email/i), 'scientist@test.com');
    await user.type(screen.getByLabelText(/Operator name/i), 'Operator Name');
    await user.type(screen.getByLabelText(/Operator email/i), 'op@test.com');
}

describe('NewProjectPage (Functional)', () => {

    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();

        // Essential Mocks for the page to load without errors
        server.use(
            // Mock active users for privileges dropdown
            http.post('*/users/searches*', () => {
                return HttpResponse.json({
                    // Must match the currentUser ID (1)
                    users: [{ user_id: 1, first_name: 'John', last_name: 'Doe', email: 'john@doe.com' }]
                });
            }),
            // Mock ecotaxa instances
            http.get('*/ecotaxa_instances', () => {
                return HttpResponse.json([{
                    ecotaxa_instance_id: 1, ecotaxa_instance_name: "FR", ecotaxa_instance_description: "Desc", ecotaxa_instance_url: "url"
                }]);
            }),
            // Mock ecotaxa accounts for the user
            http.get('*/users/*/ecotaxa_account', () => {
                return HttpResponse.json({ ecotaxa_accounts: [] });
            })
        );
    });

    // TC-H1: Initial Render & Auto-fill
    it('TC-H1: should render the form and auto-fill the current user in privileges', async () => {
        renderWithRouter(<NewProjectPage />);

        expect(await screen.findByRole('heading', { name: /^New project$/i })).toBeInTheDocument();

        // Verify Privileges Auto-fill
        // The component automatically adds the logged-in user (John Doe, ID 1) as a Manager.
        const privilegesSection = screen.getByText('Privileges').closest('.MuiBox-root')!;

        // The user list comes from an async API call (GET /users).
        // Therefore, we must use 'await findByText' instead of 'getByText'.
        // Also, MUI Selects display their current value text directly in the DOM.
        expect(await within(privilegesSection as HTMLElement).findByText(/John Doe/i)).toBeInTheDocument();

        // Check that the Manager toggle is pressed
        const managerToggle = within(privilegesSection as HTMLElement).getByRole('button', { name: /Manager/i });
        expect(managerToggle).toHaveAttribute('aria-pressed', 'true');
    }, 10000);

    // TC-H2: Validation (Empty Submit)
    it('TC-H2: should prevent submission and show error if mandatory fields are empty', async () => {
        const user = userEvent.setup();
        renderWithRouter(<NewProjectPage />);

        await screen.findByRole('heading', { name: /^New project$/i });

        const createButton = screen.getByRole('button', { name: /^CREATE$/i });
        await user.click(createButton);

        // Expect the snackbar to show the first validation error
        const alerts = await screen.findAllByText(/Root folder path is required/i);
        expect(alerts.length).toBeGreaterThan(0);
    });

    // TC-H3: Successful Project Creation
    // Increased timeout to 35 seconds (35000) for this heavy form-filling test
    it('TC-H3: should submit successfully and redirect to projects list', async () => {
        // Disable delay in userEvent to type faster during tests
        const user = userEvent.setup({ delay: null });

        server.use(
            http.post('*/projects', () => {
                return HttpResponse.json({ project_id: 999 }, { status: 201 });
            })
        );

        renderWithRouter(
            <Routes>
                <Route path="/new-project" element={<NewProjectPage />} />
                <Route path="/projects" element={<h1>Projects List Mock</h1>} />
            </Routes>,
            { route: '/new-project' }
        );

        await screen.findByRole('heading', { name: /^New project$/i });

        // Fill all mandatory fields
        await fillValidProjectForm(user);

        // Click Submit
        const createButton = screen.getByRole('button', { name: /^CREATE$/i });
        await user.click(createButton);

        // Verify Success Toast
        expect(await screen.findByText(/Project successfully created/i)).toBeInTheDocument();

        // Verify Redirection
        await waitFor(() => {
            expect(screen.getByText('Projects List Mock')).toBeInTheDocument();
        }, { timeout: 2000 });
    }, 55000);

    // TC-H4: Error Handling (API Failure)
    // Increased timeout to 30000 seconds (30000)
    it('TC-H4: should handle backend creation errors gracefully', async () => {
        const user = userEvent.setup({ delay: null });

        server.use(
            http.post('*/projects', () => {
                // Match the response structure expected by our HTTP client / extractErrorMessage
                return HttpResponse.json({ message: "Failed to insert into database" }, { status: 500 });
            })
        );

        renderWithRouter(<NewProjectPage />);

        await screen.findByRole('heading', { name: /^New project$/i });
        await fillValidProjectForm(user);

        const createButton = screen.getByRole('button', { name: /^CREATE$/i });
        await user.click(createButton);

        // The exact error message should appear in the alert
        const alert = await screen.findByRole('alert');
        expect(within(alert).getByText(/Failed to insert into database/i)).toBeInTheDocument();
    }, 40000);

    // TC-H5: Complex Sections Interaction
    it('TC-H5: should allow interacting with EcoTaxa and Privileges dynamic sections', async () => {
        const user = userEvent.setup({ delay: null });

        // We need to ensure MSW provides valid data for the dropdowns
        server.use(
            http.post('*/users/searches*', () => {
                return HttpResponse.json({
                    users: [
                        { user_id: 1, first_name: 'John', last_name: 'Doe' },
                        { user_id: 2, first_name: 'Jane', last_name: 'Smith' } // Second user needed for the dropdown
                    ]
                });
            }),
            http.get('*/ecotaxa_instances', () => {
                return HttpResponse.json([{
                    ecotaxa_instance_id: 1, ecotaxa_instance_name: "FR", ecotaxa_instance_description: "Desc", ecotaxa_instance_url: "url"
                }]);
            })
        );

        renderWithRouter(<NewProjectPage />);
        await screen.findByRole('heading', { name: /^New project$/i });

        // --- 1. Interact with Privileges Section ---

        const privilegesSection = screen.getByText('Privileges').closest('.MuiBox-root')!;

        // Wait for the first auto-filled user to be present
        expect(await within(privilegesSection as HTMLElement).findByText(/John Doe/i)).toBeInTheDocument();

        // Click "Add user"
        const addUserButton = within(privilegesSection as HTMLElement).getByRole('button', { name: /Add user/i });
        await user.click(addUserButton);

        // Now there should be TWO user dropdowns (one filled, one empty saying 'Select user')
        // In MUI, an empty Select often has an invisible input or a specific role. 
        // We look for the label 'Select user'
        const newUserSelect = within(privilegesSection as HTMLElement).getByLabelText('Select user');
        await user.click(newUserSelect);
        // Select 'Jane Smith'
        const janeOption = await screen.findByRole('option', { name: /Jane Smith/i });
        await user.click(janeOption);

        // Verify Jane is selected in the combobox
        expect(await within(privilegesSection as HTMLElement).findByText(/Jane Smith/i)).toBeInTheDocument();
    }, 20000);

    // TC-H6: Load Metadata Failure Resilience
    it('TC-H6: should preserve entered values and show error when metadata loading fails', async () => {
        const user = userEvent.setup({ delay: null });

        server.use(
            http.get('*/file_system/import_folder_metadata*', () => {
                return HttpResponse.json({ message: 'Invalid folder path' }, { status: 500 });
            })
        );

        renderWithRouter(<NewProjectPage />);

        await screen.findByRole('heading', { name: /^New project$/i });

        const rootPathInput = screen.getByLabelText(/Root folder path/i);
        const acronymInput = screen.getByLabelText(/Project acronym/i);

        await user.type(rootPathInput, '/invalid/folder/path');
        await user.type(acronymInput, 'MANUAL');

        await user.click(screen.getByRole('button', { name: /Load metadata/i }));

        const alert = await screen.findByRole('alert');
        expect(within(alert).getByText(/Failed to load metadata/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Project acronym/i)).toHaveValue('MANUAL');
        expect(screen.getByLabelText(/Root folder path/i)).toHaveValue('/invalid/folder/path');
    }, 15000);

    
});