import { screen } from '@testing-library/react';
import { expect } from 'vitest';
import { VALIDATION_MESSAGES } from '@/shared/utils/validation/messages';

/**
 * Expect invalid email validation message.
 */
export function expectInvalidEmailMessage() {
    expect(
        screen.getByText(VALIDATION_MESSAGES.EMAIL_INVALID)
    ).toBeInTheDocument();
}
