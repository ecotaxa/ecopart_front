import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { ProjectSecurityTab } from '../components/ProjectSecurityTab';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';

const mockSecurityData = {
    project_id: 101,
    privacy_duration: 6,
    visible_duration: 12,
    public_duration: 48,
    managers: [{ user_id: 1, first_name: 'John', last_name: 'Doe' }],
    members: [{ user_id: 2, first_name: 'Jane', last_name: 'Smith' }],
    contact: { user_id: 1, first_name: 'John', last_name: 'Doe' }
};

describe('ProjectSecurityTab (Functional)', () => {

    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();

        server.use(
            http.post('*/projects/searches', () => {
                return HttpResponse.json({
                    search_info: { total: 1, page: 1, limit: 1 },
                    projects: [mockSecurityData]
                });
            }),
            // Mock the active users list for the dropdown
            http.post('*/users/searches', () => HttpResponse.json({
                users: [
                    { user_id: 1, first_name: 'John', last_name: 'Doe', email: 'j@d.com' },
                    { user_id: 2, first_name: 'Jane', last_name: 'Smith', email: 'j@s.com' }
                ]
            }))
        );
    });

    // TC-K1: Initial Data Loading
    it('TC-K1: should load and display privacy and privileges data correctly', async () => {
        renderWithRouter(<ProjectSecurityTab projectId={101} />);

        // Check Privacy inputs (Months)
        expect(await screen.findByDisplayValue('6')).toBeInTheDocument(); // Private
        expect(screen.getByDisplayValue('12')).toBeInTheDocument(); // Visible
        expect(screen.getByDisplayValue('48')).toBeInTheDocument(); // Public

        // Check Privileges rows
        // We expect to find John Doe and Jane Smith in the form
        // Using getAllByRole because MUI Select renders the value inside a combobox
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(2);

        // Since John is contact in our mock, one radio should be checked
        const radios = screen.getAllByRole('radio');
        const checkedRadios = radios.filter(r => (r as HTMLInputElement).checked);
        expect(checkedRadios.length).toBe(1);
    });

    // TC-K2: Validation (No Contact)
    it('TC-K2: should block submission if no contact is selected', async () => {
        const user = userEvent.setup();

        // Mock a project with NO contact
        const noContactData = { ...mockSecurityData, contact: null };
        server.use(
            http.post('*/projects/searches', () => {
                return HttpResponse.json({
                    search_info: { total: 1 },
                    projects: [noContactData]
                });
            })
        );

        renderWithRouter(<ProjectSecurityTab projectId={101} />);

        await screen.findByDisplayValue('6'); // Wait for load

        const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
        await user.click(saveButton);

        // Expect custom frontend validation message
        expect(await screen.findByText('A contact is required before saving.')).toBeInTheDocument();
    });

    // TC-K3: Update Success
    it('TC-K3: should successfully save updated security settings', async () => {
        const user = userEvent.setup();

        server.use(
            http.patch('*/projects/101', () => {
                return HttpResponse.json({}, { status: 200 });
            })
        );

        renderWithRouter(<ProjectSecurityTab projectId={101} />);

        const delayInput = await screen.findByDisplayValue('6');
        await user.clear(delayInput);
        await user.type(delayInput, '12');

        const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
        await user.click(saveButton);

        expect(await screen.findByText('Security settings updated successfully!')).toBeInTheDocument();
    });

    // TC-K4: Save Error Handling
    it('TC-K4: should show an error and keep edits visible when save fails', async () => {
        const user = userEvent.setup();

        server.use(
            http.patch('*/projects/101', () => {
                return HttpResponse.json({ message: 'Security save failed' }, { status: 500 });
            })
        );

        renderWithRouter(<ProjectSecurityTab projectId={101} />);

        const delayInput = await screen.findByDisplayValue('6');
        await user.clear(delayInput);
        await user.type(delayInput, '9');

        const saveButton = screen.getByRole('button', { name: /^SAVE$/i });
        await user.click(saveButton);

        expect(await screen.findByText(/Security save failed/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Delay until visible/i)).toHaveValue(19);
    });

});