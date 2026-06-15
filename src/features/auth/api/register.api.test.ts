import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import { registerUser, validateEmail } from './register.api';
import type { RegisterPayload } from '../types/user';

const payload = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@doe.com',
    password: 'Valid123!',
    organisation: 'CNRS',
    country: 'France',
    user_planned_usage: 'Research',
} as unknown as RegisterPayload;

describe('Register API (Y)', () => {
    // TC-Y1: registerUser success
    it('TC-Y1: registerUser resolves on a successful POST /users', async () => {
        let path = '';
        server.use(
            http.post('*/users', ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json({ user_id: 1 }, { status: 201 });
            }),
        );

        await expect(registerUser(payload)).resolves.toEqual({ user_id: 1 });
        expect(path).toBe('/users');
    });

    // TC-Y1b: registerUser tolerates an empty (non-JSON) success body
    it('TC-Y1b: registerUser resolves to null when the success body is empty', async () => {
        server.use(
            http.post('*/users', () => new HttpResponse(null, { status: 201 })),
        );
        await expect(registerUser(payload)).resolves.toBeNull();
    });

    // TC-Y2: registerUser error mapping
    it('TC-Y2: registerUser maps backend error messages and falls back on empty body', async () => {
        server.use(
            http.post('*/users', () =>
                HttpResponse.json({ errors: [{ msg: 'Email taken' }] }, { status: 400 }),
            ),
        );
        await expect(registerUser(payload)).rejects.toThrow('Email taken');

        server.use(
            http.post('*/users', () => new HttpResponse(null, { status: 500 })),
        );
        await expect(registerUser(payload)).rejects.toThrow('Registration failed (HTTP 500)');
    });

    // TC-Y3: validateEmail success + error mapping
    it('TC-Y3: validateEmail resolves on success and throws the backend message on error', async () => {
        let path = '';
        server.use(
            http.get('*/users/:id/welcome/:token', ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json({ ok: true });
            }),
        );
        await expect(validateEmail('1', 'tok')).resolves.toEqual({ ok: true });
        expect(path).toBe('/users/1/welcome/tok');

        // Empty (non-JSON) success body → resolves to null.
        server.use(
            http.get('*/users/:id/welcome/:token', () => new HttpResponse(null, { status: 200 })),
        );
        await expect(validateEmail('1', 'tok')).resolves.toBeNull();

        // Error without a parseable body → falls back to the generic HTTP message.
        server.use(
            http.get('*/users/:id/welcome/:token', () => new HttpResponse(null, { status: 404 })),
        );
        await expect(validateEmail('1', 'tok')).rejects.toThrow('Email validation failed (HTTP 404)');

        server.use(
            http.get('*/users/:id/welcome/:token', () =>
                HttpResponse.json({ message: 'bad' }, { status: 400 }),
            ),
        );
        await expect(validateEmail('1', 'tok')).rejects.toThrow('bad');
    });
});
