import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import { renderWithRouter } from '@/test/utils';
import { logoutUser } from '@/test/helpers/auth.helpers';

describe('RegisterPage (Accessibility)', () => {

    beforeEach(() => {
        logoutUser();
    });

    // TC-B5: Keyboard Navigation
    it('TC-B5: should allow navigating the complete form using Tab order', async () => {
        const user = userEvent.setup({ delay: null });
        renderWithRouter(<RegisterPage />);

        const firstName = screen.getByLabelText(/First name/i);

        // 1. Start Focus on First Name
        firstName.focus();
        expect(firstName).toHaveFocus();

        // 2. Tab -> Last Name
        await user.tab();
        expect(screen.getByLabelText(/Last name/i)).toHaveFocus();

        // 3. Tab -> Email
        await user.tab();
        expect(screen.getByLabelText(/Email/i)).toHaveFocus();

        // 4. Tab -> Password Input
        await user.tab();
        expect(screen.getByLabelText(/^Password/i, { selector: 'input' })).toHaveFocus();

        // 5. Tab -> Password Visibility Toggle (Eye icon)
        // Material UI puts a button inside the password field to show/hide text.
        // This button is focusable by keyboard, so we must account for it.
        await user.tab();
        const toggles = screen.getAllByLabelText(/toggle password visibility/i);
        expect(toggles[0]).toHaveFocus(); // The first eye icon

        // 6. Tab -> Confirm Password Input
        await user.tab();
        expect(screen.getByLabelText(/Confirm password/i)).toHaveFocus();

        await user.tab();
        expect(toggles[1]).toHaveFocus(); // The second eye icon

        // 8. Tab -> Organisation (Autocomplete)
        await user.tab();
        expect(screen.getByLabelText(/Organisation/i)).toHaveFocus();

        // 9. Tab -> Country (Autocomplete)
        await user.tab();
        expect(screen.getByLabelText(/Country/i)).toHaveFocus();

        // 10. Tab -> Planned Usage (Textarea)
        await user.tab();
        expect(screen.getByLabelText(/Planned usage/i)).toHaveFocus();

        // 11. Tab -> Terms Checkbox
        await user.tab();
        expect(screen.getByLabelText(/I agree with the Usage conditions/i)).toHaveFocus();

        // 12. Tab -> Submit Button
        // Note: The button is disabled initially, so it might be skipped by Tab 
        // depending on browser/JSDOM behavior. In strict accessbility, 
        // disabled elements are not focusable. We stop here.
    });
});