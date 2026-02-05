import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

// We define the shape of the data needed to fill the form.
// Using defaults allows us to call fillRegisterForm(user) without arguments for the happy path.
type RegisterFormData = {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    organisation?: string; // Must match the text in the dropdown option
    country?: string; // Must match the text in the dropdown option
    usage?: string;
    acceptTerms?: boolean;
};

/**
 * Fills the registration form with provided data.
 * Handles text inputs, Autocompletes, and Checkboxes logic.
 */
export async function fillRegisterForm(
    user: UserEvent,
    data: RegisterFormData = {}
) {
    // Destructure with default values
    const {
        firstName = 'John',
        lastName = 'Doe',
        email = 'newuser@test.com',
        password = 'Valid123!',
        confirmPassword = 'Valid123!',
        organisation = 'CNRS',
        country = 'France',
        usage = 'Scientific Research',
        acceptTerms = true
    } = data;

    // 1. Fill Standard Text Fields
    const firstNameInput = screen.getByLabelText(/First name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, firstName);

    const lastNameInput = screen.getByLabelText(/Last name/i);
    await user.clear(lastNameInput);
    await user.type(lastNameInput, lastName);

    const emailInput = screen.getByLabelText(/Email/i);
    await user.clear(emailInput);
    await user.type(emailInput, email);

    // Specific selector for password to distinguish from confirm password
    // We use a regex with /^Password/i meaning "starts with Password", case insensitive
    const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' });
    await user.clear(passwordInput);
    await user.type(passwordInput, password);

    const confirmInput = screen.getByLabelText(/Confirm password/i);
    await user.clear(confirmInput);
    await user.type(confirmInput, confirmPassword);

    // 2. Handle Organisation (Autocomplete FreeSolo - allows typing)
    const orgInput = screen.getByLabelText(/Organisation/i);
    await user.clear(orgInput);
    await user.type(orgInput, organisation);

    // 3. Handle Country (Strict Autocomplete - requires selection)
    const countryInput = screen.getByLabelText(/Country/i);
    await user.clear(countryInput);
    await user.click(countryInput); // Open dropdown
    await user.type(countryInput, country); // Filter list

    // Wait for the option to appear and click it.
    // We use a regex for flexibility and findByRole to wait for the portal to render.
    const countryOption = await screen.findByRole('option', {
        name: new RegExp(`^${country}$`, 'i')
    });
    await user.click(countryOption);

    // 4. Handle Usage (Text Area)
    const usageInput = screen.getByLabelText(/Planned usage/i);
    await user.clear(usageInput);
    await user.type(usageInput, usage);

    // 5. Handle Terms Checkbox
    if (acceptTerms) {
        const termsCheckbox = screen.getByRole('checkbox', { name: /I agree/i });
        if (!(termsCheckbox as HTMLInputElement).checked) {
            await user.click(termsCheckbox);
        }
    }
}

/**
 * Clicks the Sign Up button.
 * Relies on the data-testid="register-submit" in the component.
 */
export async function submitRegisterForm(user: UserEvent) {
    const submitButton = screen.getByTestId('register-submit');
    await user.click(submitButton);
}