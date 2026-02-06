import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import ResetPasswordConfirmPage from '@/features/auth/pages/ResetPasswordConfirmPage';
import { renderWithRouter } from '@/test/utils';
import { fillResetConfirmForm } from '@/test/helpers/resetConfirmForm.helpers';

describe('ResetPasswordConfirmPage (Accessibility)', () => {

    // TC-D6: Keyboard Navigation
    it('TC-D6: should allow navigating the form using Tab order', async () => {
        const user = userEvent.setup();
        // Need to render with a token to see the form
        renderWithRouter(
            <Routes>
                <Route path="/reset-password/:token" element={<ResetPasswordConfirmPage />} />
            </Routes>,
            { route: '/reset-password/test-token' }
        );

        // Enable button first
        await fillResetConfirmForm(user);

        const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' });

        // Start focus
        passwordInput.focus();
        expect(passwordInput).toHaveFocus();

        // Tab -> Eye Icon 1
        await user.tab();
        expect(screen.getAllByLabelText(/toggle password visibility/i)[0]).toHaveFocus();

        // Tab -> Confirm Password
        await user.tab();
        expect(screen.getByLabelText(/Confirm password/i)).toHaveFocus();

        // Tab -> Eye Icon 2
        await user.tab();
        expect(screen.getAllByLabelText(/toggle password visibility/i)[1]).toHaveFocus();

        // Tab -> Submit
        await user.tab();
        expect(screen.getByTestId('reset-confirm-submit')).toHaveFocus();
    });
});