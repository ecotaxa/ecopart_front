import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

type ResetConfirmData = {
    password?: string;
    confirmPassword?: string;
};

/**
 * Fills the reset password confirmation form.
 * Handles typing in both password fields.
 */
export async function fillResetConfirmForm(
    user: UserEvent,
    { password = 'Valid123!', confirmPassword = 'Valid123!' }: ResetConfirmData = {}
) {
    // 1. Fill Password
    // We use specific selector to target the input inside the MUI component
    const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' });
    await user.clear(passwordInput);
    await user.type(passwordInput, password);

    // 2. Fill Confirmation
    const confirmInput = screen.getByLabelText(/Confirm password/i);
    await user.clear(confirmInput);
    await user.type(confirmInput, confirmPassword);
}

/**
 * Clicks the submit button.
 */
export async function submitResetConfirmForm(user: UserEvent) {
    const submitButton = screen.getByTestId('reset-confirm-submit');
    await user.click(submitButton);
}