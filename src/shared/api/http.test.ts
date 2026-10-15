import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http as mswHttp, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { ApiError, http, httpBlob, httpText, isAccessDenied, isNotFound, setSessionExpiredHandler } from '@/shared/api/http'; // Import your fetch wrapper
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

    // TC-AC1: Standard Success
    it('TC-AC1: should return parsed JSON on a successful request (200 OK)', async () => {
        server.use(
            mswHttp.get(TEST_URL, () => {
                return HttpResponse.json({ message: 'success data' }, { status: 200 });
            })
        );

        const response = await http<{ message: string }>(TEST_URL);
        expect(response.message).toBe('success data');
    });

    // TC-AC2: Standard API Error
    it('TC-AC2: should throw an error on standard API failures (e.g. 400 Bad Request)', async () => {
        server.use(
            mswHttp.get(TEST_URL, () => {
                return HttpResponse.json({ message: 'Invalid data' }, { status: 400 });
            })
        );

        // We expect the promise to reject and throw an error
        await expect(http(TEST_URL)).rejects.toThrow();
    });

    it('TC-AC2.1: should extract the first backend error from an errors array', async () => {
        server.use(
            mswHttp.get(TEST_URL, () => {
                return HttpResponse.json({ errors: ['EcoTaxa project is already linked to an EcoPart project'] }, { status: 500 });
            })
        );

        await expect(http(TEST_URL)).rejects.toThrow(/already linked/i);
    });

    // TC-AC3: The Core Engine - Refresh Token Loop
    it('TC-AC3: should intercept 401, refresh the token, and retry the original request successfully', async () => {
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

    // TC-AC4: The Core Engine - Refresh Token Failure
    it('TC-AC4: should throw "Session expired" if the refresh token also fails (e.g. 401 on refresh)', async () => {
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

        // The registered session-expired handler (AuthBootstrap wires it to clearUser)
        // is notified so the UI can drop back to the login page.
        const onExpired = vi.fn();
        setSessionExpiredHandler(onExpired);
        try {
            await expect(http(TEST_URL)).rejects.toThrow(/Session expired/i);
            expect(onExpired).toHaveBeenCalledTimes(1);
        } finally {
            setSessionExpiredHandler(null);
        }
    });

    // TC-AC7: Empty successful bodies (DELETE endpoints answering 204 / 200 with no body)
    it('TC-AC7: should resolve to undefined on a 204 or an empty 200 body instead of failing on JSON parsing', async () => {
        server.use(
            mswHttp.delete(TEST_URL, () => new HttpResponse(null, { status: 204 })),
            mswHttp.get(TEST_URL, () => new HttpResponse('', { status: 200 })),
        );

        await expect(http(TEST_URL, { method: 'DELETE' })).resolves.toBeUndefined();
        await expect(http(TEST_URL)).resolves.toBeUndefined();
    });

    // TC-AC5: Concurrent 401 Deduplication
    it('TC-AC5: should perform only one refresh for concurrent 401 responses', async () => {
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

    // TC-AC6: Retry Failure After Refresh
    it('TC-AC6: should surface retry error when request still fails after successful refresh', async () => {
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

    // TC-AC8: failures carry their HTTP status and every backend message
    it('TC-AC8: should throw an ApiError with the status and all the backend messages', async () => {
        server.use(
            mswHttp.get(TEST_URL, () => HttpResponse.json({ errors: ['First problem', { msg: 'Second problem' }] }, { status: 422 })),
        );

        const error = await http(TEST_URL).catch((err: unknown) => err);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 422, message: 'First problem', messages: ['First problem', 'Second problem'] });
        expect(isAccessDenied(error)).toBe(false);
        expect(isNotFound(error)).toBe(false);
    });

    // TC-AC9: access refusals and missing resources are told apart, on every helper
    it('TC-AC9: should classify 401 (after the refresh retry), 403 and 404 for every request helper', async () => {
        const statuses: Record<string, number> = { '/api/denied': 401, '/api/forbidden': 403, '/api/missing': 404 };
        server.use(
            mswHttp.get('/api/:name', ({ request }) => {
                const status = statuses[new URL(request.url).pathname];
                return HttpResponse.json({ errors: [`status ${status}`] }, { status });
            }),
        );

        const fail = (call: Promise<unknown>) => call.catch((err: unknown) => err);

        // A 401 is retried once after a successful refresh, then thrown as is.
        expect(isAccessDenied(await fail(http('/api/denied')))).toBe(true);
        expect(isAccessDenied(await fail(httpText('/api/forbidden')))).toBe(true);
        expect(isNotFound(await fail(httpBlob('/api/missing')))).toBe(true);
        expect(isAccessDenied(await fail(http('/api/missing')))).toBe(false);
        // A plain Error (e.g. a network failure) is neither.
        expect(isAccessDenied(new Error('Failed to fetch'))).toBe(false);
        expect(isNotFound(new Error('Failed to fetch'))).toBe(false);
    });

    // TC-AC10: a body without any usable message keeps the generic wording
    it('TC-AC10: should fall back to "HTTP Error: <status>" with no messages when the body carries none', async () => {
        server.use(mswHttp.get(TEST_URL, () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })));

        const error = await http(TEST_URL).catch((err: unknown) => err);

        expect(error).toMatchObject({ status: 502, message: 'HTTP Error: 502', messages: [] });
    });
});
