import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';

import { renderWithRouter } from '@/test/utils';
// We use the shared auth helper to manage state (DRY)
import { logoutUser, loginAsUser } from '@/test/helpers/auth.helpers';
// Import the component to test from the app folder
import { ProtectedRoute } from '@/app/ProtectedRoute';

describe('ProtectedRoute (Routing)', () => {

    // RESET STATE
    beforeEach(() => {
        logoutUser();
    });

    // TC-R1: Block unauthenticated access
    it('TC-R1: should redirect unauthenticated user to login', () => {
        renderWithRouter(
            <Routes>
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <h1>Protected Dashboard</h1>
                        </ProtectedRoute>
                    }
                />
                {/* We assume redirection goes to /login */}
                <Route path="/login" element={<h1>Login Page</h1>} />
            </Routes>,
            // Try to access protected route directly
            { route: '/dashboard' }
        );

        // 1. Verify content is HIDDEN
        expect(screen.queryByText(/Protected Dashboard/i)).not.toBeInTheDocument();

        // 2. Verify REDIRECTION happened
        expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    });

    // TC-R2: Allow authenticated access
    it('TC-R2: should allow authenticated user to access protected route', () => {
        // Helper to simulate logged-in state
        loginAsUser();

        renderWithRouter(
            <Routes>
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <h1>Protected Dashboard</h1>
                        </ProtectedRoute>
                    }
                />
            </Routes>,
            { route: '/dashboard' }
        );

        // Verify content is VISIBLE
        expect(screen.getByText(/Protected Dashboard/i)).toBeInTheDocument();
    });

});