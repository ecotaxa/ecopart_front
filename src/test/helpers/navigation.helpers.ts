import { screen } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Expect redirection to the page a login lands on (Explore).
 */
export async function expectExplore() {
    expect(
        await screen.findByText(/welcome to explore/i)
    ).toBeInTheDocument();
}

/**
 * Expect user to stay on current page.
 */
export function expectNotOnExplore() {
    expect(
        screen.queryByText(/welcome to explore/i)
    ).not.toBeInTheDocument();
}
