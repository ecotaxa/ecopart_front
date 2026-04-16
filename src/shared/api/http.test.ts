import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http as mswHttp, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { http } from '@/shared/api/http'; // Import your fetch wrapper
import { useAuthStore } from '@/features/auth/store/auth.store';

describe('HTTP Utility (API Fetcher)', () => {

    // Dummy endpoint purely for testing the http wrapper logic
    const TEST_URL = '/api/dummy-test';
    // Your actual refresh token endpoint
    const REFRESH_URL = '*/auth/refreshToken';

    beforeEach(() => {
        // Reset state before each test
        useAuthStore.setState({ user: null, isAuthenticated: false });
        vi.clearAllMocks();
    });

    // TC-M1: Standard Success
    it('TC-M1: should return parsed JSON on a successful request (200 OK)', async () => {
        server.use(
            mswHttp.get(TEST_URL, () => {
                return HttpResponse.json({ message: 'success data' }, { status: 200 });
            })
        );

        const response = await http<{ message: string }>(TEST_URL);
        expect(response.message).toBe('success data');
    });

    // TC-M2: Standard API Error
    it('TC-M2: should throw an error on standard API failures (e.g. 400 Bad Request)', async () => {
        server.use(
            mswHttp.get(TEST_URL, () => {
                return HttpResponse.json({ message: 'Invalid data' }, { status: 400 });
            })
        );

        // We expect the promise to reject and throw an error
        await expect(http(TEST_URL)).rejects.toThrow();
    });

    // TC-M3: The Core Engine - Refresh Token Loop
    it('TC-M3: should intercept 401, refresh the token, and retry the original request successfully', async () => {
        let attemptCount = 0;

        server.use(
            // 1. Mock the target endpoint
            mswHttp.get(TEST_URL, () => {
                attemptCount++;
                if (attemptCount === 1) {
                    // First attempt: simulate an expired token
                    return new HttpResponse(null, { status: 401 });
                }
                // Second attempt: simulate success after token was refreshed
                return HttpResponse.json({ message: 'recovered data' }, { status: 200 });
            }),

            // 2. Mock the refresh endpoint to SUCCEED
            mswHttp.post(REFRESH_URL, () => {
                return HttpResponse.json({
                    token: 'new-valid-token',
                    refresh_token: 'new-refresh-token'
                }, { status: 200 });
            })
        );

        // Execute the call
        const response = await http<{ message: string }>(TEST_URL);

        // Assertions
        expect(response.message).toBe('recovered data'); // It got the final data
        expect(attemptCount).toBe(2); // It tried exactly twice
    });

    // TC-M4: The Core Engine - Refresh Token Failure
    it('TC-M4: should throw "Session expired" if the refresh token also fails (e.g. 401 on refresh)', async () => {
        server.use(
            // 1. Target endpoint fails
            mswHttp.get(TEST_URL, () => {
                return new HttpResponse(null, { status: 401 });
            }),

            // 2. Refresh endpoint ALSO fails (refresh token expired)
            mswHttp.post(REFRESH_URL, () => {
                return new HttpResponse(null, { status: 401 });
            })
        );

        // Based on previous logs, your http.ts throws a specific error when this happens
        await expect(http(TEST_URL)).rejects.toThrow(/Session expired/i);

        // Optional: If your http.ts automatically clears the user store on refresh failure,
        // you can verify it here. (Uncomment if applicable to your code)
        // const authState = useAuthStore.getState();
        // expect(authState.isAuthenticated).toBe(false);
    });

    // TC-M5: Concurrent 401 Deduplication
    it('TC-M5: should perform only one refresh for concurrent 401 responses', async () => {
        let requestCount = 0;
        let refreshCount = 0;

        server.use(
            mswHttp.get(TEST_URL, () => {
                requestCount += 1;

                // First wave: both parallel calls receive 401
                if (requestCount <= 2) {
                    return new HttpResponse(null, { status: 401 });
                }

                // Retry wave after refresh succeeds
                return HttpResponse.json({ message: 'ok' }, { status: 200 });
            }),
            mswHttp.post(REFRESH_URL, () => {
                refreshCount += 1;
                return HttpResponse.json({ token: 'new-token', refresh_token: 'new-refresh' }, { status: 200 });
            })
        );

        const [first, second] = await Promise.all([
            http<{ message: string }>(TEST_URL),
            http<{ message: string }>(TEST_URL),
        ]);

        expect(first.message).toBe('ok');
        expect(second.message).toBe('ok');
        expect(refreshCount).toBe(1);
        expect(requestCount).toBe(4);
    });

    // TC-M6: Retry Failure After Refresh
    it('TC-M6: should surface retry error when request still fails after successful refresh', async () => {
        let attemptCount = 0;

        server.use(
            mswHttp.get(TEST_URL, () => {
                attemptCount += 1;

                if (attemptCount === 1) {
                    return new HttpResponse(null, { status: 401 });
                }

                return HttpResponse.json({ message: 'Retry failed on backend' }, { status: 500 });
            }),
            mswHttp.post(REFRESH_URL, () => {
                return HttpResponse.json({ token: 'refreshed', refresh_token: 'refreshed-rt' }, { status: 200 });
            })
        );

        await expect(http(TEST_URL)).rejects.toThrow(/Retry failed on backend/i);
        expect(attemptCount).toBe(2);
    });
});