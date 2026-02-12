import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';

import ProfilePage from './ProfilePage';
import { renderWithRouter } from '@/test/utils';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { loginAsUser, logoutUser } from '@/test/helpers/auth.helpers';

describe('ProfilePage (Functional)', () => {

    beforeEach(() => {
        loginAsUser();
    });

    // TC-E1: Initial Loading & Display
    it('TC-E1: should load and display user profile data correctly', async () => {
        renderWithRouter(<ProfilePage />);

        // Wait for structural element rather than specific text
        expect(await screen.findByRole('heading', { name: /Profile/i })).toBeInTheDocument();

        // Verify fields are loaded and accessible
        expect(screen.getByLabelText(/First name/i)).toHaveValue('John');
        expect(screen.getByLabelText(/Last name/i)).toHaveValue('Doe');
        expect(screen.getByLabelText(/Email/i)).toBeDisabled();
        expect(screen.getByLabelText(/Planned usage/i)).not.toBeDisabled();
    });

    // TC-E2: Update Profile - Cancel Changes
    it('TC-E2: should revert changes when CANCEL is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(<ProfilePage />);

        await screen.findByRole('heading', { name: /Profile/i });

        const firstNameInput = screen.getByLabelText(/First name/i);
        const cancelButton = screen.getByRole('button', { name: /CANCEL/i });

        await user.clear(firstNameInput);
        await user.type(firstNameInput, 'Jane');
        expect(firstNameInput).toHaveValue('Jane');

        await user.click(cancelButton);

        // Reverts to the original mocked value
        expect(firstNameInput).toHaveValue('John');
    });

    // TC-E3: Update Profile - Validation & Disabled State
    it('TC-E3: should display validation errors and disable SAVE if required fields are empty', async () => {
        const user = userEvent.setup();
        renderWithRouter(<ProfilePage />);

        await screen.findByRole('heading', { name: /Profile/i });

        const saveButton = screen.getByRole('button', { name: /SAVE/i });
        const firstNameInput = screen.getByLabelText(/First name/i);
        const countryInput = screen.getByLabelText(/Country/i);

        // Clear First Name
        await user.clear(firstNameInput);
        expect(saveButton).toBeDisabled();

        // Restore First Name
        await user.type(firstNameInput, 'John');

        // Clear Country (Autocomplete usually requires clearing via backspace or clear button)
        await user.clear(countryInput);
        await user.tab(); // Trigger blur

        // Check specific country validation error message
        expect(await screen.findByText(/Please select a country/i)).toBeInTheDocument();
        expect(saveButton).toBeDisabled();
    });

    // TC-E4: Update Profile - Success
    it('TC-E4: should save profile successfully', async () => {
        const user = userEvent.setup();
        renderWithRouter(<ProfilePage />);

        await screen.findByRole('heading', { name: /Profile/i });

        const firstNameInput = screen.getByLabelText(/First name/i);
        const saveButton = screen.getByRole('button', { name: /SAVE/i });

        await user.clear(firstNameInput);
        await user.type(firstNameInput, 'Jane');

        expect(saveButton).toBeEnabled();
        await user.click(saveButton);

        expect(await screen.findByText(/Profile updated successfully/i)).toBeInTheDocument();
    });

    // TC-E5: Update Profile - API Error
    it('TC-E5: should display error message if update fails', async () => {
        const user = userEvent.setup();

        server.use(
            http.patch('*/users/:id', () => {
                // Use HttpResponse.error() to simulate a network failure.
                // This guarantees that fetch() rejects and the component's catch block is triggered.
                return HttpResponse.error();
            })
        );

        renderWithRouter(<ProfilePage />);
        await screen.findByRole('heading', { name: /Profile/i });

        const firstNameInput = screen.getByLabelText(/First name/i);
        await user.clear(firstNameInput);
        await user.type(firstNameInput, 'Jane');

        await user.click(screen.getByRole('button', { name: /SAVE/i }));

        expect(await screen.findByText(/Failed to update profile/i)).toBeInTheDocument();
    });

    // TC-E6: Change Password - Validation & Disabled State
    it('TC-E6: should disable CHANGE button if passwords are invalid or do not match', async () => {
        const user = userEvent.setup();
        renderWithRouter(<ProfilePage />);

        await screen.findByRole('heading', { name: /Change password/i });

        const currentPasswordInput = screen.getByLabelText(/Current password/i);
        const newPasswordInput = screen.getByLabelText(/^New password/i);
        const confirmPasswordInput = screen.getByLabelText(/Re-type new password/i);
        const changeButton = screen.getByRole('button', { name: /CHANGE/i });

        // Weak password
        await user.type(currentPasswordInput, 'OldPass123!');
        await user.type(newPasswordInput, 'weak');
        await user.type(confirmPasswordInput, 'weak');

        expect(changeButton).toBeDisabled();
    });

    // TC-E7: Change Password - Success
    it('TC-E7: should change password successfully', async () => {
        const user = userEvent.setup();
        renderWithRouter(<ProfilePage />);

        await screen.findByRole('heading', { name: /Change password/i });

        await user.type(screen.getByLabelText(/Current password/i), 'OldPass123!');
        await user.type(screen.getByLabelText(/^New password/i), 'NewPass123!');
        await user.type(screen.getByLabelText(/Re-type new password/i), 'NewPass123!');

        const changeButton = screen.getByRole('button', { name: /CHANGE/i });
        expect(changeButton).toBeEnabled();
        await user.click(changeButton);

        expect(await screen.findByText(/Password changed successfully/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Current password/i)).toHaveValue('');
    }, 15000);

    // TC-E8: Delete Account - API Error
    it('TC-E8: should handle deletion failure and keep the user on the page', async () => {
        const user = userEvent.setup();

        server.use(
            http.delete('*/users/:id', () => {
                // Simulate network failure to ensure catch block execution
                return HttpResponse.error();
            })
        );

        renderWithRouter(<ProfilePage />);
        await screen.findByRole('heading', { name: /Delete account/i });

        const deleteSectionButton = screen.getByRole('button', { name: /^DELETE$/i });
        await user.click(deleteSectionButton);

        // Isolate the dialog to prevent ambiguous queries
        const dialog = await screen.findByRole('dialog', { name: /Delete Account/i });
        const confirmDeleteButton = within(dialog).getByRole('button', { name: /Delete/i });

        await user.click(confirmDeleteButton);

        // Wait for the dialog to be completely removed from the DOM
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        // Verify the error message is displayed
        expect(await screen.findByText(/Failed to delete account/i)).toBeInTheDocument();
    });

    // TC-E9: Delete Account - Success
    it('TC-E9: should delete account and redirect to login on success', async () => {
        const user = userEvent.setup();

        renderWithRouter(
            <Routes>
                <Route path="/settings" element={<ProfilePage />} />
                <Route path="/login" element={<h1>Login Page</h1>} />
            </Routes>,
            { route: '/settings' }
        );

        await screen.findByRole('heading', { name: /Delete account/i });

        const deleteSectionButton = screen.getByRole('button', { name: /^DELETE$/i });
        await user.click(deleteSectionButton);

        const dialog = await screen.findByRole('dialog', { name: /Delete Account/i });
        const confirmDeleteButton = within(dialog).getByRole('button', { name: /Delete/i });

        await user.click(confirmDeleteButton);

        // Successful redirection
        expect(await screen.findByText(/Login Page/i)).toBeInTheDocument();
    });

    // TC-E10: Admin Dashboard Navigation
    it('TC-E10: should navigate to admin dashboard when ADMIN button is clicked', async () => {
        logoutUser();

        server.use(
            http.get('*/auth/user/me', () => {
                return HttpResponse.json({
                    user_id: 1,
                    first_name: 'Admin',
                    last_name: 'User',
                    email: 'admin@test.com',
                    organisation: 'CNRS',
                    country: 'FR',
                    user_planned_usage: 'Administration',
                    is_admin: true,
                });
            })
        );

        loginAsUser();

        const user = userEvent.setup();

        renderWithRouter(
            <Routes>
                <Route path="/settings" element={<ProfilePage />} />
                <Route path="/admin" element={<h1>Admin Page</h1>} />
            </Routes>,
            { route: '/settings' }
        );

        const adminButton = await screen.findByRole('button', { name: /ADMIN DASHBOARD/i });
        await user.click(adminButton);

        // Verification of navigation
        expect(await screen.findByText(/Admin Page/i)).toBeInTheDocument();
    });

});