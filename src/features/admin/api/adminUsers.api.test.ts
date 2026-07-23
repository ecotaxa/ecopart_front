import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import { searchUsers, setUserAdmin } from './adminUsers.api';

// ---------------------------------------------------------------------------
// API-layer tests for the admin users endpoints, run against MSW. searchUsers
// carries pagination/sort in the query string and the filter array in the body;
// setUserAdmin PATCHes a single account. Part of the admin Users area (AF),
// which the AdminUsersTab component tests (TC-AF1–16) drive through the DOM.
// ---------------------------------------------------------------------------
describe('adminUsers API (AF)', () => {
    it('TC-AF17: searchUsers puts page/limit/sort_by in the query and the filters in the body', async () => {
        let url: URL | null = null;
        let body: unknown;
        server.use(
            http.post('*/users/searches', async ({ request }) => {
                url = new URL(request.url);
                body = await request.json();
                return HttpResponse.json({ search_info: { total: 3, page: 2, limit: 10 }, users: [] });
            }),
        );

        const filters = [{ field: 'last_name', operator: 'LIKE' as const, value: '%doe%' }];
        const res = await searchUsers({ page: 2, limit: 10, sort_by: 'desc(user_id)', filters });

        expect(res.search_info.total).toBe(3);
        expect(url!.pathname).toBe('/users/searches');
        expect(url!.searchParams.get('page')).toBe('2');
        expect(url!.searchParams.get('limit')).toBe('10');
        expect(url!.searchParams.get('sort_by')).toBe('desc(user_id)');
        expect(body).toEqual(filters);
    });

    it('TC-AF18: setUserAdmin PATCHes /users/:id/ with the is_admin flag', async () => {
        let method = '';
        let path = '';
        let body: unknown;
        server.use(
            http.patch('*/users/:userId/', async ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                body = await request.json();
                return HttpResponse.json({ user_id: 7, is_admin: true });
            }),
        );

        const updated = await setUserAdmin(7, true);
        expect(method).toBe('PATCH');
        expect(path).toBe('/users/7/');
        expect(body).toEqual({ is_admin: true });
        expect(updated.user_id).toBe(7);
    });
});
