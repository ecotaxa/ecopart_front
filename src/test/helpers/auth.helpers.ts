import { useAuthStore } from '@/features/auth/store/auth.store';
import type { User } from '@/features/auth/types/user';

// Default mock user matching your interface
export const MOCK_USER: User = {
    user_id: 1,
    email: 'test@user.com',
    first_name: 'Test',
    last_name: 'User',
    is_admin: false,
    organisation: 'Test Org',
    country: 'FR'
};

/**
 * Helper to manually set the auth store to "authenticated" state.
 * Useful for testing protected routes or redirection logic.
 * * @param overrides - Optional object to override specific user fields (e.g. { is_admin: true })
 */
export function loginAsUser(overrides: Partial<User> = {}) {
    useAuthStore.setState({
        user: { ...MOCK_USER, ...overrides },
        isAuthenticated: true
    });
}

/**
 * Helper to force logout (reset store)
 */
export function logoutUser() {
    useAuthStore.setState({ user: null, isAuthenticated: false });
}