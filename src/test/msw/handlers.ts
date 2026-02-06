import { http, HttpResponse } from 'msw';

// We use a simple variable to simulate server-side session state.
// By default, the user is NOT logged in.
let isLoggedIn = false;

// We export a function to reset this state between tests (optional but clean)
export const resetMockAuth = () => { isLoggedIn = false; };

export const handlers = [
    // --- MOCK LOGIN ---
    http.post('*/auth/login', async ({ request }) => {
        const body = (await request.json()) as { email?: string; password?: string };

        // Check credentials
        if (body.email === 'john@doe.com' && body.password === 'Valid123!') {
            // Simulate creating a session on the server
            isLoggedIn = true;
            return HttpResponse.json({
                token: 'fake_jwt',
                refresh_token: 'fake_refresh',
                user: { email: 'john@doe.com' }
            });
        }

        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }),

    // --- MOCK USER PROFILE (GET /me) ---
    // This handler is now "state-aware". It checks if the user logged in previously.
    http.get('*/auth/user/me', () => {
        if (!isLoggedIn) {
            // If login wasn't called successfully, return 401 Unauthorized
            return new HttpResponse(null, { status: 401 });
        }

        // If logged in, return the user profile
        return HttpResponse.json({
            user_id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@doe.com',
            organisation: 'Sorbonne Université',
            country: 'FR',
            is_admin: false,
        });
    }),

    // --- MOCK REGISTER ---
    http.post('*/users', async () => {
        // Always return success for registration in basic tests 
        return HttpResponse.json({ message: "Success" }, { status: 201 });
    }),

    // --- MOCK RESET PASSWORD REQUEST ---
    http.post('*/auth/reset', async () => {
        // We simulate a slight delay for realism
        return HttpResponse.json({ message: "Reset email sent" }, { status: 200 });
    }),
];