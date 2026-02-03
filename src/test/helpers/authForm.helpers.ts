import { screen } from '@testing-library/react';
// We import the UserEvent type to type the 'user' parameter correctly
import type { UserEvent } from '@testing-library/user-event';

type FillAuthFormArgs = {
    email?: string;
    password?: string;
};

/**
 * Fill authentication form with valid credentials.
 * Reusable for Login / Register / Reset Password pages.
 * * @param user - The userEvent instance created in the test (ensures single instance).
 * @param args - The email and password to type.
 */
export async function fillAuthForm(
    user: UserEvent,
    { email = 'john@doe.com', password = 'Valid123!' }: FillAuthFormArgs
) {
    const emailInput = screen.getByLabelText(/email address/i);
    // We specify { selector: 'input' } to avoid selecting the wrapper div
    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });

    await user.clear(emailInput);
    await user.type(emailInput, email);

    await user.clear(passwordInput);
    // We only type the password if it's provided (user.type throws on empty string)
    if (password) await user.type(passwordInput, password);
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