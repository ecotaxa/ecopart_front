import userEvent from '@testing-library/user-event';

/**
 * Navigate using keyboard tab key.
 */
export async function tab(user = userEvent.setup()) {
    await user.tab();
}
