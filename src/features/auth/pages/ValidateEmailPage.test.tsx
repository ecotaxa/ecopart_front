import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import ValidateEmailPage from './ValidateEmailPage';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';

const renderPage = (route: string) =>
    renderWithRouter(
        <Routes>
            <Route path="/validate/:user_id/:token" element={<ValidateEmailPage />} />
            <Route path="/validate" element={<ValidateEmailPage />} />
            <Route path="/login" element={<h1>Login Page</h1>} />
            <Route path="/register" element={<h1>Register Page</h1>} />
        </Routes>,
        { route },
    );

describe('ValidateEmailPage (X)', () => {
    // TC-X1: Success → navigates to /login
    it('TC-X1: validates the token and redirects to the login page', async () => {
        server.use(
            http.get('*/users/:id/welcome/:token', () => HttpResponse.json({ ok: true })),
        );

        renderPage('/validate/1/tok');

        expect(await screen.findByRole('heading', { name: 'Login Page' })).toBeInTheDocument();
    });

    // TC-X2: API error → error layout + "Register again"
    it('TC-X2: shows the error layout and lets the user register again', async () => {
        const user = userEvent.setup();
        server.use(
            http.get('*/users/:id/welcome/:token', () =>
                HttpResponse.json({ message: 'invalid token' }, { status: 400 }),
            ),
        );

        renderPage('/validate/1/badtok');

        const registerAgain = await screen.findByRole('button', { name: /Register again/i });
        expect(registerAgain).toBeInTheDocument();

        await user.click(registerAgain);
        expect(await screen.findByRole('heading', { name: 'Register Page' })).toBeInTheDocument();
    });

    // TC-X3: Missing params → error without hitting the API
    it('TC-X3: shows the error state without calling the API when params are missing', async () => {
        let apiCalled = false;
        server.use(
            http.get('*/users/:id/welcome/:token', () => {
                apiCalled = true;
                return HttpResponse.json({ ok: true });
            }),
        );

        renderPage('/validate');

        expect(await screen.findByRole('button', { name: /Register again/i })).toBeInTheDocument();
        expect(apiCalled).toBe(false);
    });
});
