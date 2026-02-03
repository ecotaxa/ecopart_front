import { screen } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Expect submit button disabled.
 * Uses testId to target the exact form button.
 */
export function expectSubmitDisabled() {
    expect(screen.getByTestId('auth-submit')).toBeDisabled();
}

/**
 * Expect submit button enabled.
 */
export function expectSubmitEnabled() {
    expect(screen.getByTestId('auth-submit')).toBeEnabled();
}