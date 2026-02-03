import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LoginPage from '@/features/auth/pages/LoginPage';
import { renderWithRouter } from '@/test/utils';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { fillAuthForm } from '@/test/helpers/authForm.helpers';

describe('LoginPage (Accessibility)', () => {

    // Reset store
    beforeEach(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
    });

    // TC-A6: Keyboard Navigation
    // We verify that a keyboard-only user can navigate the form logically.
    it('TC-A6: should allow navigating the form using Tab order', async () => {
        const user = userEvent.setup();
        renderWithRouter(<LoginPage />);

        // Enable the submit button by filling the form first.
        // A disabled button is not focusable, which would break the tab flow test.
        await fillAuthForm(user, {});

        const emailInput = screen.getByLabelText(/Email address/i);
        const passwordInput = screen.getByLabelText(/Password/i, { selector: 'input' });
        const rememberCheckbox = screen.getByLabelText(/Remember me/i);
        // We select the submit button by testId
        const submitButton = screen.getByTestId('auth-submit');

        // Start focus on Email
        emailInput.focus();
        expect(emailInput).toHaveFocus();

        // Tab -> Password
        await user.tab();
        expect(passwordInput).toHaveFocus();

        // Tab -> Eye Icon (Visibility Toggle)
        await user.tab();
        expect(screen.getByLabelText(/toggle password visibility/i)).toHaveFocus();

        // Tab -> Remember Me
        await user.tab();
        expect(rememberCheckbox).toHaveFocus();

        // Tab -> Submit Button
        await user.tab();
        expect(submitButton).toHaveFocus();
    });
});