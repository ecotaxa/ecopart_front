import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/auth/api/auth.api')>()),
    fetchMe: vi.fn(),
}));
vi.mock('@/shared/api/http', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/shared/api/http')>()),
    setSessionExpiredHandler: vi.fn(),
}));

import AuthBootstrap from './AuthBootstrap';
import { fetchMe } from '@/features/auth/api/auth.api';
import { setSessionExpiredHandler } from '@/shared/api/http';
import { queryClient } from '@/shared/api/queryClient';
import { useAuthStore } from '@/features/auth';
import type { User } from '@/features/auth/types/user';

const makeUser = (user_id: number): User => ({
    user_id,
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: `ada${user_id}@example.org`,
    is_admin: false,
    organisation: 'LOV',
    country: 'FR',
    user_planned_usage: 'research',
});

const CACHE_KEY = ['projects', 1];

describe('AuthBootstrap', () => {
    beforeEach(() => {
        vi.mocked(fetchMe).mockRejectedValue(new Error('401'));
        vi.mocked(setSessionExpiredHandler).mockClear();
        useAuthStore.getState().clearUser();
        queryClient.clear();
    });

    // TC-AK1: the React Query cache never survives a change of signed-in user
    it('TC-AK1: drops the React Query cache whenever the signed-in user changes', async () => {
        render(<AuthBootstrap />);
        await act(async () => {}); // let the initial fetchMe settle (rejected => still signed out)

        queryClient.setQueryData(CACHE_KEY, { title: 'fetched while signed out' });
        act(() => useAuthStore.getState().setUser(makeUser(1)));
        expect(queryClient.getQueryData(CACHE_KEY)).toBeUndefined();

        queryClient.setQueryData(CACHE_KEY, { title: 'fetched by user 1' });
        act(() => useAuthStore.getState().setUser(makeUser(2)));
        expect(queryClient.getQueryData(CACHE_KEY)).toBeUndefined();

        queryClient.setQueryData(CACHE_KEY, { title: 'fetched by user 2' });
        act(() => useAuthStore.getState().clearUser());
        expect(queryClient.getQueryData(CACHE_KEY)).toBeUndefined();
    });

    // TC-AK2: re-setting the same user (e.g. a profile refresh) must not wipe the cache
    it('TC-AK2: keeps the cache while the same user stays signed in', async () => {
        render(<AuthBootstrap />);
        await act(async () => {});
        act(() => useAuthStore.getState().setUser(makeUser(1)));

        queryClient.setQueryData(CACHE_KEY, { title: 'fetched by user 1' });
        act(() => useAuthStore.getState().setUser({ ...makeUser(1), first_name: 'Renamed' }));
        expect(queryClient.getQueryData(CACHE_KEY)).toEqual({ title: 'fetched by user 1' });
    });

    // TC-AK3: a failed token refresh signs the user out through the registered handler
    it('TC-AK3: registers a session-expired handler that signs the user out', async () => {
        render(<AuthBootstrap />);
        await act(async () => {});
        act(() => useAuthStore.getState().setUser(makeUser(1)));

        const handler = vi.mocked(setSessionExpiredHandler).mock.lastCall?.[0];
        expect(handler).toBeTypeOf('function');
        queryClient.setQueryData(CACHE_KEY, { title: 'fetched by user 1' });

        act(() => handler?.());
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
        expect(useAuthStore.getState().user).toBeNull();
        // Signing out is a user change, so the cache goes with it.
        expect(queryClient.getQueryData(CACHE_KEY)).toBeUndefined();
    });
});
