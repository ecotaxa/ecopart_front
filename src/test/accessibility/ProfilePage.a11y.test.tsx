import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import ProfilePage from '@/features/userProfile/pages/ProfilePage';
import { renderWithRouter } from '@/test/utils';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import { server } from '@/test/msw/server';

// ============================================================================
// SUITE 1: ECOPART ACCOUNT TAB (TAB 0)
// ============================================================================
describe('ProfilePage - Ecopart Tab (Accessibility)', () => {

    beforeEach(() => {
        loginAsUser();
    });

    // TC-E11: Keyboard Navigation
    it('TC-E11: should allow navigating the complete profile form using Tab order', async () => {
        const user = userEvent.setup({ delay: null });
        renderWithRouter(<ProfilePage />);

        // Wait for data load
        await screen.findByRole('heading', { name: /Profile/i });

        // 1. Start at Tabs
        const ecoPartTab = screen.getByRole('tab', { name: /ECOPART ACCOUNT/i });
        ecoPartTab.focus();
        expect(ecoPartTab).toHaveFocus();

        // 2. Tab -> First Name
        await user.tab();
        expect(screen.getByLabelText(/First name/i)).toHaveFocus();

        // 3. Tab -> Last Name
        await user.tab();
        expect(screen.getByLabelText(/Last name/i)).toHaveFocus();

        // Note on Email: Disabled fields are typically skipped by Tab in modern browsers/MUI.

        // 4. Tab -> Organisation
        await user.tab();
        expect(screen.getByLabelText(/Organisation/i)).toHaveFocus();

        // 5. Tab -> Country
        await user.tab();
        expect(screen.getByLabelText(/Country/i)).toHaveFocus();

        // 6. Tab -> Planned Usage 
        await user.tab();
        expect(screen.getByLabelText(/Planned usage/i)).toHaveFocus();

        // 7. Tab -> SAVE Button
        await user.tab();
        expect(screen.getByRole('button', { name: /SAVE/i })).toHaveFocus();

        // 8. Tab -> CANCEL Button
        await user.tab();
        expect(screen.getByRole('button', { name: /CANCEL/i })).toHaveFocus();

        // --- Security Section ---

        // 9. Tab -> Current Password
        await user.tab();
        expect(screen.getByLabelText(/Current password/i)).toHaveFocus();

        // 10. Tab -> Toggle Visibility 1
        await user.tab();
        expect(screen.getAllByLabelText(/toggle password visibility/i)[0]).toHaveFocus();

        // 11. Tab -> New Password
        await user.tab();
        expect(screen.getByLabelText(/^New password/i, { selector: 'input' })).toHaveFocus();

        // 12. Tab -> Toggle Visibility 2
        await user.tab();

        // 13. Tab -> Re-type Password
        await user.tab();
        expect(screen.getByLabelText(/Re-type new password/i, { selector: 'input' })).toHaveFocus();

        // 14. Tab -> Toggle Visibility 3
        await user.tab();

        // --- Delete Section ---

        // 15. Tab -> DELETE Button
        await user.tab();
        expect(screen.getByRole('button', { name: /^DELETE$/i })).toHaveFocus();
    }, 15000);
});

// ============================================================================
// SUITE 2: ECOTAXA ACCOUNTS TAB (TAB 1)
// ============================================================================
describe('ProfilePage - EcoTaxa Tab (Accessibility)', () => {

    beforeEach(() => {
        loginAsUser();
    });

    // TC-F8: Keyboard Navigation (List View)
    it('TC-F8: should allow navigating the linked accounts list using Tab order', async () => {
        const user = userEvent.setup({ delay: null });

        // Mock API to return an existing account so the List View renders
        server.use(
            http.get('*/users/:id/ecotaxa_account', () => {
                return HttpResponse.json({
                    ecotaxa_accounts: [{
                        ecotaxa_account_id: 123,
                        ecotaxa_account_instance_id: 1,
                        ecotaxa_user_login: 'mock_ecotaxa_user',
                        ecotaxa_account_instance_name: 'FR',
                        ecotaxa_expiration_date: '2026-12-31'
                    }]
                });
            })
        );

        renderWithRouter(
            <Routes>
                <Route path="/settings" element={<ProfilePage />} />
            </Routes>,
            { route: '/settings', state: { activeTab: 1 } }
        );

        // Wait for the list to render
        await screen.findByText(/Accounts on EcoTaxa instances/i);

        // 1. Set initial focus on the EcoTaxa tab button
        const ecoTaxaTab = screen.getByRole('tab', { name: /ECOTAXA ACCOUNTS/i });
        ecoTaxaTab.focus();
        expect(ecoTaxaTab).toHaveFocus();

        // 2. Tab -> Logout/Unlink IconButton
        // In MUI, icon buttons without text rely on SVG. We find the specific button holding the Logout icon.
        await user.tab();
        const unlinkButtons = screen.getAllByRole('button');
        const logoutButton = unlinkButtons.find(btn => btn.querySelector('svg[data-testid="LogoutIcon"]'));
        expect(logoutButton).toHaveFocus();

        // 3. Tab -> "Connect to another account" Button
        await user.tab();
        expect(screen.getByRole('button', { name: /Connect to another account/i })).toHaveFocus();
    });

    // TC-F9: Keyboard Navigation (Form View)
    it('TC-F9: should allow navigating the EcoTaxa login form using Tab order', async () => {
        const user = userEvent.setup({ delay: null });

        // Mock API to return empty array so the Form View renders directly
        server.use(
            http.get('*/users/:id/ecotaxa_account', () => HttpResponse.json({ ecotaxa_accounts: [] }))
        );

        renderWithRouter(
            <Routes>
                <Route path="/settings" element={<ProfilePage />} />
            </Routes>,
            { route: '/settings', state: { activeTab: 1 } }
        );

        // Wait for the form to render
        await screen.findByText('Log in to EcoTaxa');

        // 1. Set initial focus on the EcoTaxa tab button
        const ecoTaxaTab = screen.getByRole('tab', { name: /ECOTAXA ACCOUNTS/i });
        ecoTaxaTab.focus();
        expect(ecoTaxaTab).toHaveFocus();

        // 2. Tab -> Instance Dropdown (MUI Select)
        await user.tab();
        expect(screen.getByRole('combobox', { name: /Instance/i })).toHaveFocus();

        // 3. Tab -> Email Input
        await user.tab();
        expect(screen.getByLabelText(/Email address/i)).toHaveFocus();

        // 4. Tab -> Password Input (using the strict selector)
        await user.tab();
        expect(screen.getByLabelText(/^Password/i, { selector: 'input' })).toHaveFocus();

        // 5. Tab -> Password Visibility Toggle (IconButton inside the password field)
        await user.tab();
        expect(screen.getByLabelText(/toggle password visibility/i)).toHaveFocus();

        // 6. Tab -> Consent Checkbox
        await user.tab();
        expect(screen.getByRole('checkbox')).toHaveFocus();

        // 7. Tab -> Registration Link
        // EXPLANATION: Since the form is empty, the "LOG IN" button is disabled.
        // Disabled elements are natively skipped by the browser's Tab flow.
        // Therefore, the next focusable element after the checkbox is the link.
        await user.tab();
        expect(screen.getByRole('link', { name: /Create an account!/i })).toHaveFocus();
    });

});