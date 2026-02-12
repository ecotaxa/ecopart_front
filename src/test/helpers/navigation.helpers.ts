import { screen } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Expect redirection to dashboard.
 */
export async function expectDashboard() {
    expect(
        await screen.findByText(/welcome to dashboard/i)
    ).toBeInTheDocument();
}

/**
 * Expect user to stay on current page.
 */
export function expectNotOnDashboard() {
    expect(
        screen.queryByText(/welcome to dashboard/i)
    ).not.toBeInTheDocument();
}
