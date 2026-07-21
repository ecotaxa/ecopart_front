import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';

import { renderWithRouter } from '@/test/utils';
import { logoutUser, loginAsUser } from '@/test/helpers/auth.helpers';
import { useAuthStore } from '@/features/auth/store/auth.store';
import AdminRoute from '@/app/AdminRoute';

function renderGuarded(route: string) {
    return renderWithRouter(
        <Routes>
            <Route
                path="/admin"
                element={
                    <AdminRoute>
                        <h1>Admin Area</h1>
                    </AdminRoute>
                }
            />
            <Route path="/login" element={<h1>Login Page</h1>} />
            <Route path="/" element={<h1>Home Page</h1>} />
        </Routes>,
        { route },
    );
}

describe('AdminRoute (Routing)', () => {
    beforeEach(() => {
        logoutUser();
    });

    it('redirects an unauthenticated user to login', () => {
        renderGuarded('/admin');

        expect(screen.queryByText(/Admin Area/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    });

    it('redirects a logged-in non-admin user to home', () => {
        // loginAsUser authenticates a user with is_admin: false.
        loginAsUser();
        renderGuarded('/admin');

        expect(screen.queryByText(/Admin Area/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Home Page/i)).toBeInTheDocument();
    });

    it('allows an admin user through', () => {
        loginAsUser();
        useAuthStore.setState((s) => ({ user: { ...s.user!, is_admin: true } }));
        renderGuarded('/admin');

        expect(screen.getByText(/Admin Area/i)).toBeInTheDocument();
    });
});
