import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './RegisterPage';
import { renderWithRouter } from '@/test/utils';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Helpers
import { logoutUser } from '@/test/helpers/auth.helpers';
import { fillRegisterForm, submitRegisterForm } from '@/test/helpers/registerForm.helpers';
import { expectSubmitDisabled } from '@/test/assertions/submitButton.assertions';

import { VALIDATION_MESSAGES } from '@/shared/utils/validation/messages';

describe('RegisterPage (Functional)', () => {

    // PRECONDITION: Ensure clean state using the shared helper
    beforeEach(() => {
        logoutUser();
    });

    // TC-B1: Initial rendering
    it('TC-B1: should render registration form correctly with disabled submit', () => {
        renderWithRouter(<RegisterPage />);

        expect(screen.getByText(/Sign up into EcoPart/i)).toBeInTheDocument();

        // Sanity check for a complex field (Country)
        expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();

        // Implicitly checks that required fields logic is working
        // We pass the specific testId for the register button.
        expectSubmitDisabled('register-submit');
    });

    // TC-B2: Password Validation (Mismatch)
    it('TC-B2: should show error and disable submit if passwords do not match', async () => {
        const user = userEvent.setup({ delay: null });
        renderWithRouter(<RegisterPage />);

        const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' });
        const confirmInput = screen.getByLabelText(/Confirm password/i, { selector: 'input' });

        // 1. Test weak password feedback
        await user.clear(passwordInput);
        await user.type(passwordInput, 'abc');
        await user.clear(confirmInput);
        await user.type(confirmInput, 'abc');

        // Trigger validation
        await user.click(document.body);

        // Verify "Weak Password" error
        expect(screen.getByText(VALIDATION_MESSAGES.PASSWORD_REQ)).toBeInTheDocument();
        // Pass the correct testId for the register button
        expectSubmitDisabled('register-submit');

        // 2. Test mismatch feedback
        await user.clear(passwordInput);
        await user.type(passwordInput, 'Valid123!');
        await user.clear(confirmInput);
        await user.type(confirmInput, 'Mismatch123!');

        // Trigger validation (blur)
        await user.click(document.body);

        expect(screen.getByText(VALIDATION_MESSAGES.PASSWORD_MISMATCH)).toBeInTheDocument();
        expectSubmitDisabled('register-submit');
    }, 25000);

    // TC-B3: Successful Registration
    it('TC-B3: should display success message on valid registration', async () => {
        const user = userEvent.setup();
        renderWithRouter(<RegisterPage />);

        // Fill with default valid data (Happy Path)
        await fillRegisterForm(user);

        // Submit
        await submitRegisterForm(user);

        // Verify Success (Assuming your app shows a success message)
        // Adjust this text based on your actual UI (e.g., from AuthPageLayout)
        expect(await screen.findByText(/registration was successful/i)).toBeInTheDocument();
    }, 25000);

    // TC-B4: API Error Handling (Conflict)
    it('TC-B4: should handle server errors (e.g. Email exists)', async () => {
        const user = userEvent.setup();

        // Override handler to simulate "Email already exists" (409 Conflict)
        server.use(
            http.post('*/users', () => {
                return HttpResponse.json({ message: VALIDATION_MESSAGES.EXIST_EMAIL }, { status: 409 });
            })
        );

        renderWithRouter(<RegisterPage />);

        await fillRegisterForm(user);
        await submitRegisterForm(user);

        // Verify error message is displayed
        expect(await screen.findByText(VALIDATION_MESSAGES.EXIST_EMAIL)).toBeInTheDocument();

        // User should remain on the form (button still visible)
        expect(screen.getByTestId('register-submit')).toBeInTheDocument();
    }, 15000);

});