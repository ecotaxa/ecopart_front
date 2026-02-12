import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import { renderWithRouter } from '@/test/utils';
import { fillAuthForm } from '@/test/helpers/authForm.helpers';

describe('ResetPasswordPage (Accessibility)', () => {

    // TC-C4: Keyboard Navigation
    it('TC-C4: should allow navigating the form using Tab order', async () => {
        const user = userEvent.setup({ delay: null });
        renderWithRouter(<ResetPasswordPage />);

        // Enable button
        await fillAuthForm(user, { email: 'test@test.com' });

        const emailInput = screen.getByLabelText(/Email address/i);
        const submitButton = screen.getByTestId('reset-request-submit');

        // Start Focus on Email
        emailInput.focus();
        expect(emailInput).toHaveFocus();

        // Tab -> Submit Button
        await user.tab();
        expect(submitButton).toHaveFocus();
    });
});