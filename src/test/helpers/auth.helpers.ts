import { useAuthStore } from '@/features/auth/store/auth.store';
import type { User } from '@/features/auth/types/user';
import type { ProjectRole } from '@/features/projects/utils/projectAccess';
// IMPORT the new MSW helper
import { setMockAuth } from '@/test/msw/handlers';

/** The id of the logged-in test user (the "John Doe" account of the MSW handlers). */
export const TEST_USER_ID = 1;

const TEST_USER: User = {
    user_id: TEST_USER_ID,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@doe.com',
    is_admin: false,
    organisation: 'Sorbonne Université',
    country: 'FR',
    user_planned_usage: 'Scientific Research',
};

/** Log in as the test user, with another id and / or as an application admin. */
export const loginAs = (user_id = TEST_USER_ID, is_admin = false) => {
    // 1. Update the global state
    useAuthStore.setState({
        isAuthenticated: true,
        user: { ...TEST_USER, user_id, is_admin },
    });

    // 2. IMPORTANT: Tell the fake server that the user is logged in
    // This allows subsequent API calls like GET /me to succeed
    setMockAuth(true);
};

export const loginAsUser = () => loginAs();

export const loginAsAdmin = () => loginAs(TEST_USER_ID, true);

/**
 * Log in as the test user holding `role` on a project, and return the privilege
 * lists to build that project with (`makeProjectFixture({ ...loginAsRole('member') })`).
 * Another account (id 2) manages the project whenever the test user does not.
 */
export const loginAsRole = (role: ProjectRole): { managers: number[]; members: number[] } => {
    loginAs(TEST_USER_ID, role === 'admin');
    return {
        managers: role === 'manager' ? [TEST_USER_ID] : [2],
        members: role === 'member' ? [TEST_USER_ID] : [],
    };
};

export const logoutUser = () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    // Tell the fake server the user is logged out
    setMockAuth(false);
};
