import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';

import ResetPasswordConfirmPage from './ResetPasswordConfirmPage';
import { renderWithRouter } from '@/test/utils';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Helpers
import { fillResetConfirmForm, submitResetConfirmForm } from '@/test/helpers/resetConfirmForm.helpers';
import { expectSubmitDisabled, expectSubmitEnabled } from '@/test/assertions/submitButton.assertions';

// Messages
import { VALIDATION_MESSAGES } from '@/shared/utils/validation/messages';

describe('ResetPasswordConfirmPage (Functional)', () => {

    // TC-D1: Initial rendering
    it('TC-D1 & D2: should render form when token is present in URL', () => {
        renderWithRouter(
            <Routes>
                {/* We define the route with a parameter :token */}
                <Route path="/reset-password/:token" element={<ResetPasswordConfirmPage />} />
            </Routes>,
            // We simulate arriving on this URL
            { route: '/reset-password/valid-token-123' }
        );

        // Use getByRole 'heading' to target the title specifically and avoid conflict with the button
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
        // Regex anchors (^...$) ensure we verify the exact label "Password" vs "Confirm Password"
        expect(screen.getByLabelText(/^Password/i, { selector: 'input' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument();

        expectSubmitDisabled('reset-confirm-submit');
    });

    // TC-D3: Validation (Strength & Mismatch)
    it('TC-D3: should disable submit and show error if passwords are weak or do not match', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <Routes>
                <Route path="/reset-password/:token" element={<ResetPasswordConfirmPage />} />
            </Routes>,
            { route: '/reset-password/valid-token-123' }
        );

        // 1. Test Weak Password
        await fillResetConfirmForm(user, { password: 'abc', confirmPassword: 'abc' });
        await user.click(document.body); // Blur to trigger validation

        expect(screen.getByText(VALIDATION_MESSAGES.PASSWORD_REQ)).toBeInTheDocument();
        expectSubmitDisabled('reset-confirm-submit');

        // 2. Test Mismatch
        await fillResetConfirmForm(user, {
            password: 'Valid123!',
            confirmPassword: 'Mismatch123!'
        });
        await user.click(document.body);

        expect(screen.getByText(VALIDATION_MESSAGES.PASSWORD_MISMATCH)).toBeInTheDocument();
        expectSubmitDisabled('reset-confirm-submit');
    });

    // TC-D4: Successful Reset
    it('TC-D4: should redirect to login on successful reset', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <Routes>
                <Route path="/reset-password/:token" element={<ResetPasswordConfirmPage />} />
                {/* We mock the Login page to verify redirection */}
                <Route path="/login" element={<h1>Login Page</h1>} />
            </Routes>,
            { route: '/reset-password/valid-token-123' }
        );

        // Fill valid form
        await fillResetConfirmForm(user);

        expectSubmitEnabled('reset-confirm-submit');
        await submitResetConfirmForm(user);

        // Verify Redirection to Login
        expect(await screen.findByText(/Login Page/i)).toBeInTheDocument();
    });

    // TC-D5: API Error Handling
    it('TC-D5: should handle invalid token or server errors', async () => {
        const user = userEvent.setup();

        // Simulate Invalid Token or Expired Token (400)
        server.use(
            http.put('*/auth/password/reset', () => {
                return HttpResponse.json({ message: "Invalid token" }, { status: 400 });
            })
        );

        renderWithRouter(
            <Routes>
                <Route path="/reset-password/:token" element={<ResetPasswordConfirmPage />} />
            </Routes>,
            { route: '/reset-password/invalid-token' }
        );

        await fillResetConfirmForm(user);
        await submitResetConfirmForm(user);

        // Verify Error Message (Generic fetch error or specific message)
        // Since your log showed "fetch failed", ensure your component handles the error text correctly.
        // If the component displays the error message from the backend ("Invalid token"), this will pass.
        // If it displays a generic error, update the regex below (e.g. /fetch failed|error/i).
        expect(await screen.findByText(VALIDATION_MESSAGES.RESET_TOKEN_INVALID)).toBeInTheDocument()
    });

});