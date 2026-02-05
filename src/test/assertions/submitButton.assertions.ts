import { screen } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Expect submit button disabled.
 * Uses testId to target the exact form button.
 * @param testId - The data-testid of the button (default: 'auth-submit')
 */
export function expectSubmitDisabled(testId = 'auth-submit') {
  expect(screen.getByTestId(testId)).toBeDisabled();
}

/**
 * Expect submit button enabled.
 * @param testId - The data-testid of the button (default: 'auth-submit')
 */
export function expectSubmitEnabled(testId = 'auth-submit') {
  expect(screen.getByTestId(testId)).toBeEnabled();
}