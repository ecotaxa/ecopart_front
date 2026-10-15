import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import { fetchActiveUsers } from './users.api';

const makeUser = (id: number) => ({
    user_id: id,
    first_name: `First${id}`,
    last_name: `Last${id}`,
    email: `user${id}@test.fr`,
});

describe('Users API', () => {
    it('fetchActiveUsers walks every page of the users search', async () => {
        const total = 230;
        const requestedPages: number[] = [];
        server.use(
            http.post('*/users/searches', ({ request }) => {
                const url = new URL(request.url);
                const page = Number(url.searchParams.get('page'));
                const limit = Number(url.searchParams.get('limit'));
                requestedPages.push(page);
                const start = (page - 1) * limit + 1;
                const end = Math.min(page * limit, total);
                const users = Array.from({ length: end - start + 1 }, (_, i) => makeUser(start + i));
                return HttpResponse.json({
                    search_info: { total, page, limit, pages: Math.ceil(total / limit) },
                    users,
                });
            }),
        );

        const response = await fetchActiveUsers();

        expect(requestedPages.sort()).toEqual([1, 2, 3]);
        expect(response.users).toHaveLength(total);
        expect(response.users.at(-1)?.user_id).toBe(total);
    });

    it('fetchActiveUsers makes a single request when everything fits on one page', async () => {
        let calls = 0;
        server.use(
            http.post('*/users/searches', () => {
                calls++;
                return HttpResponse.json({
                    search_info: { total: 2, page: 1, limit: 100, pages: 1 },
                    users: [makeUser(1), makeUser(2)],
                });
            }),
        );

        const response = await fetchActiveUsers();

        expect(calls).toBe(1);
        expect(response.users).toHaveLength(2);
    });
});
