import { describe, it, expect, beforeEach } from 'vitest';

import { useAuthStore } from './auth.store';
import type { User } from '../types/user';

const user = {
    user_id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@doe.com',
    is_admin: false,
    organisation: 'CNRS',
    country: 'FR',
    user_planned_usage: 'Research',
} as unknown as User;

describe('auth.store (AA)', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false, isAuthLoading: true });
    });

    // TC-AA1: setUser / clearUser
    it('TC-AA1: setUser authenticates and clearUser resets the state', () => {
        useAuthStore.getState().setUser(user);
        let state = useAuthStore.getState();
        expect(state.user).toEqual(user);
        expect(state.isAuthenticated).toBe(true);
        expect(state.isAuthLoading).toBe(false);

        useAuthStore.getState().clearUser();
        state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.isAuthLoading).toBe(false);
    });

    // TC-AA2: finishAuthLoading / setLoading
    it('TC-AA2: finishAuthLoading and setLoading toggle only isAuthLoading', () => {
        useAuthStore.getState().finishAuthLoading();
        expect(useAuthStore.getState().isAuthLoading).toBe(false);
        // The auth flag is untouched by finishAuthLoading.
        expect(useAuthStore.getState().isAuthenticated).toBe(false);

        useAuthStore.getState().setLoading(true);
        expect(useAuthStore.getState().isAuthLoading).toBe(true);
    });
});
