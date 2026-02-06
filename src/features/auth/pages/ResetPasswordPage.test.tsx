import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ResetPasswordPage from './ResetPasswordPage';
import { renderWithRouter } from '@/test/utils';


// REUSE: Use existing intelligent helpers
import { fillAuthForm } from '@/test/helpers/authForm.helpers';
import { expectSubmitDisabled, expectSubmitEnabled } from '@/test/assertions/submitButton.assertions';
import { expectInvalidEmailMessage } from '@/test/assertions/email.assertions';
import { VALIDATION_MESSAGES } from '@/shared/utils/validation/messages';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

// MESSAGES

describe('ResetPasswordPage (Functional)', () => {

    // TC-C1: Initial rendering & Validation
    it('TC-C1: should render correctly and disable submit for invalid email', async () => {
        const user = userEvent.setup();
        renderWithRouter(<ResetPasswordPage />);

        expect(screen.getByText(/Reset password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();

        // 1. Check initial state (Disabled)
        expectSubmitDisabled('reset-request-submit');

        // 2. Check Validation Logic
        // We reuse fillAuthForm, passing ONLY the email.
        await fillAuthForm(user, { email: 'invalid-email' });
        await user.click(document.body); // Blur

        expectInvalidEmailMessage();
        expectSubmitDisabled('reset-request-submit');
    });

    // TC-C2: Request Submission (Success)
    it('TC-C2: should display success message on valid submission', async () => {
        const user = userEvent.setup();
        renderWithRouter(<ResetPasswordPage />);

        // Fill with valid email
        await fillAuthForm(user, { email: 'john@doe.com' });

        // Button should now be enabled
        expectSubmitEnabled('reset-request-submit');

        // Click submit
        await user.click(screen.getByTestId('reset-request-submit'));

        // Verify Success Message (Update regex to match your UI)
        expect(
            await screen.findByText(VALIDATION_MESSAGES.RESET_LINK_SENT)
        ).toBeInTheDocument();
    });

    // TC-C3: Server Error Handling (HTTP 500)
    it('TC-C3: should show the same success message even if backend returns 500 (anti-enumeration)', async () => {
        const user = userEvent.setup();

        // Simulate Server Crash (500)
        server.use(
            http.post('*/auth/reset', () => {
                return new HttpResponse(null, { status: 500 });
            })
        );

        renderWithRouter(<ResetPasswordPage />);

        await fillAuthForm(user, { email: 'john@doe.com' });
        await user.click(screen.getByTestId('reset-request-submit'));

        // Because of the 'try/catch' block in the component that swallows ALL errors
        // (to prevent user enumeration), the UI will show the SUCCESS message even on 500.
        // We verify here that the app doesn't crash and shows the "safe" message.
        expect(await screen.findByText(VALIDATION_MESSAGES.RESET_LINK_SENT)).toBeInTheDocument();
        
        // Ensure no error message is leaking
        expect(screen.queryByText(VALIDATION_MESSAGES.GENERIC_ERROR)).not.toBeInTheDocument();
    });

});