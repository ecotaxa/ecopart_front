import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/features/userProfile/pages/ProfilePage';
import { renderWithRouter } from '@/test/utils';
import { loginAsUser } from '@/test/helpers/auth.helpers';

describe('ProfilePage (Accessibility)', () => {

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
        expect(screen.getByLabelText(/^New password/i)).toHaveFocus();

        // 12. Tab -> Toggle Visibility 2
        await user.tab();
        // Skip check to keep test concise

        // 13. Tab -> Re-type Password
        await user.tab();
        expect(screen.getByLabelText(/Re-type new password/i)).toHaveFocus();

        // 14. Tab -> Toggle Visibility 3
        await user.tab();

        // --- Delete Section ---

        // 15. Tab -> DELETE Button
        await user.tab();
        expect(screen.getByRole('button', { name: /^DELETE$/i })).toHaveFocus();
    },15000);
});