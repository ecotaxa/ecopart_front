import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

type FillAuthFormArgs = {
    email?: string;
    password?: string;
};

/**
 * Fill authentication form.
 * Compatible with Login (Email + Password) AND Reset Password (Email only).
 */
export async function fillAuthForm(
    user: UserEvent,
    // We REMOVE the default value for password here to detect if it's undefined
    { email = 'john@doe.com', password }: FillAuthFormArgs
) {
    // 1. Always fill Email
    const emailInput = screen.getByLabelText(/email address/i);
    await user.clear(emailInput);
    await user.type(emailInput, email);

    // 2. Conditionally fill Password
    // We only look for the password input IF a password was explicitly provided.
    // This prevents the test from crashing on the ResetPasswordPage where the input doesn't exist.
    if (password) {
        const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
        await user.clear(passwordInput);
        await user.type(passwordInput, password);
    }
}

/**
 * Click submit button of auth form.
 * FIX: Default label is now case-sensitive 'LOG IN' to avoid matching the header button.
 * We use 'getByTestId' for precision, targeting the specific form button.
 */
export async function submitAuthForm(user: UserEvent) {
    const submitButton = screen.getByTestId('auth-submit');
    await user.click(submitButton);
}
