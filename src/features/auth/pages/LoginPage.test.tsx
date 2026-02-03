import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { renderWithRouter } from '@/test/utils';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Shared helpers
import { fillAuthForm, submitAuthForm } from '@/test/helpers/authForm.helpers';
import { expectDashboard, expectNotOnDashboard } from '@/test/helpers/navigation.helpers';
import { expectInvalidEmailMessage } from '@/test/assertions/email.assertions';
import { expectSubmitDisabled } from '@/test/assertions/submitButton.assertions';
import { loginAsUser } from '@/test/helpers/auth.helpers';

describe('LoginPage (Functional)', () => {

    // RESET STORE BEFORE EACH TEST
    beforeEach(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
    });

    // TC-A1: Initial rendering & Initial State
    // This implicitly tests that empty fields disable the button.
    it('TC-A1: should render login form correctly with disabled submit', () => {
        renderWithRouter(<LoginPage />);

        expect(screen.getByText(/Login into EcoPart/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i, { selector: 'input' })).toBeInTheDocument();

        expectSubmitDisabled();
    });

    // TC-A2: Validation logic
    it('TC-A2: should show error for invalid email', async () => {
        const user = userEvent.setup();
        renderWithRouter(<LoginPage />);

        // We pass empty password to verify button stays disabled even if email is typed (but invalid)
        await fillAuthForm(user, { email: 'invalid-email', password: '' });

        // Trigger validation by clicking outside
        await user.click(document.body);

        expectInvalidEmailMessage();
        expectSubmitDisabled();
    });

    // TC-A3: Happy path (Successful Login)
    it('TC-A3: should redirect to dashboard on success', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/dashboard" element={<h1>Welcome to Dashboard</h1>} />
            </Routes>
        );

        await fillAuthForm(user, {}); // Default valid credentials
        await submitAuthForm(user);

        await expectDashboard();
    });

    // TC-A4: API Error Handling (Combined 401/500)
    // We test 500 because it's the "worst case". If 500 works, 401 works too.
    it('TC-A4: should handle server errors gracefully', async () => {
        const user = userEvent.setup();
        server.resetHandlers();

        // Override handlers to simulate a server crash
        server.use(
            http.post('*/auth/login', () => new HttpResponse(null, { status: 500 })),
            http.get('*/auth/user/me', () => new HttpResponse(null, { status: 401 }))
        );

        renderWithRouter(
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/dashboard" element={<h1>Welcome to Dashboard</h1>} />
            </Routes>
        );

        await fillAuthForm(user, {});
        await submitAuthForm(user);

        // Ensure we stayed on page and got an error
        expectNotOnDashboard();
        expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument();
    });

    // TC-A5: Redirect if authenticated
    it('TC-A5: should redirect immediately if user is already authenticated', () => {
        // 1. Precondition: Use helper to set authenticated state
        // This replaces the manual useAuthStore.setState({...})
        loginAsUser();

        // 2. Render
        renderWithRouter(
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<h1>Welcome to Dashboard</h1>} />
            </Routes>,
            { route: '/login' }
        );

        // 3. Assertions
        expect(screen.queryByText(/Login into EcoPart/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Welcome to Dashboard/i)).toBeInTheDocument();
    });

});