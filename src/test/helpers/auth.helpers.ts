import { useAuthStore } from '@/features/auth/store/auth.store';
// IMPORT the new MSW helper
import { setMockAuth } from '@/test/msw/handlers';

export const loginAsUser = () => {
    // 1. Update the global state
    useAuthStore.setState({
        isAuthenticated: true,
        user: {
            user_id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@doe.com',
            is_admin: false,
            organisation: 'Sorbonne Université',
            country: 'FR',
            user_planned_usage: 'Scientific Research',
        }
    });

    // 2. IMPORTANT: Tell the fake server that the user is logged in
    // This allows subsequent API calls like GET /me to succeed
    setMockAuth(true);
};

export const logoutUser = () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    // Tell the fake server the user is logged out
    setMockAuth(false);
};