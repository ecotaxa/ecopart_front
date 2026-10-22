import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Route, RouterProvider, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { ProtectedRoute } from '@/app/ProtectedRoute';
import { PublicOnlyRoute } from '@/app/PublicOnlyRoute';
import LoginPage from '@/features/auth/pages/LoginPage';
import { createTestQueryClient, renderWithRouter } from '@/test/utils';
import { loginAsUser, logoutUser } from '@/test/helpers/auth.helpers';
import { fillAuthForm, submitAuthForm } from '@/test/helpers/authForm.helpers';

describe('PublicOnlyRoute (Routing)', () => {
    beforeEach(() => {
        logoutUser();
    });

    it('TC-AD3: redirects authenticated users away from login and register pages', () => {
        loginAsUser();

        // Test /login redirect
        const { unmount } = renderWithRouter(
            <Routes>
                <Route
                    path="/login"
                    element={
                        <PublicOnlyRoute>
                            <h1>Login Page</h1>
                        </PublicOnlyRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PublicOnlyRoute>
                            <h1>Register Page</h1>
                        </PublicOnlyRoute>
                    }
                />
                <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Routes>,
            { route: '/login' }
        );

        expect(screen.queryByText(/Login Page/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();

        // Test /register redirect
        unmount();
        renderWithRouter(
            <Routes>
                <Route
                    path="/login"
                    element={
                        <PublicOnlyRoute>
                            <h1>Login Page</h1>
                        </PublicOnlyRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PublicOnlyRoute>
                            <h1>Register Page</h1>
                        </PublicOnlyRoute>
                    }
                />
                <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Routes>,
            { route: '/register' }
        );

        expect(screen.queryByText(/Register Page/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    // TC-AD4: the guard re-renders the moment the login sets the user, before the
    // login page's own navigate() lands, so it must aim at the requested page too.
    it('TC-AD4: logging in from a deep link returns to that page, not the dashboard', async () => {
        const user = userEvent.setup();
        const router = createMemoryRouter([
            { path: '/login', element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute> },
            { path: '/dashboard', element: <h1>Dashboard</h1> },
            { path: '/projects/:id', element: <ProtectedRoute><h1>Project 5</h1></ProtectedRoute> },
        ], { initialEntries: ['/projects/5'] });
        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <RouterProvider router={router} />
            </QueryClientProvider>,
        );

        await screen.findByLabelText(/email address/i);
        await fillAuthForm(user, { email: 'john@doe.com', password: 'Valid123!' });
        await submitAuthForm(user);

        expect(await screen.findByRole('heading', { name: 'Project 5' })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/projects/5');
    });
});
