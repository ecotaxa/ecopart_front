import { screen } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Expect invalid email validation message.
 */
export function expectInvalidEmailMessage() {
    expect(
        screen.getByText(/valid email address/i)
    ).toBeInTheDocument();
}
