import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { PublicOnlyRoute } from '@/app/PublicOnlyRoute';
import { renderWithRouter } from '@/test/utils';
import { loginAsUser, logoutUser } from '@/test/helpers/auth.helpers';

describe('PublicOnlyRoute (Routing)', () => {
    beforeEach(() => {
        logoutUser();
    });

    it('redirects authenticated users away from login and register pages', () => {
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
});