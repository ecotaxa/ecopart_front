import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import { getAdminStats } from './adminStats.api';

// ---------------------------------------------------------------------------
// API-layer tests for the admin statistics endpoint (GET /admin/stats), run
// against MSW. The one contract worth pinning is the query string: the
// expensive `include_storage` knob must appear ONLY when explicitly requested,
// so a load/filter refresh never triggers the on-disk storage walk. Part of the
// admin statistics area (AI).
// ---------------------------------------------------------------------------
describe('adminStats API (AI)', () => {
    it('TC-AI7: getAdminStats forwards from/to/granularity and only sets include_storage when true', async () => {
        let url: URL | null = null;
        server.use(
            http.get('*/admin/stats', ({ request }) => {
                url = new URL(request.url);
                return HttpResponse.json({ generated_at: '2026-07-21T00:00:00.000Z' });
            }),
        );

        await getAdminStats({
            from: '2026-01-01',
            to: '2026-07-01',
            granularity: 'month',
            include_storage: true,
        });

        expect(url!.pathname).toBe('/admin/stats');
        expect(url!.searchParams.get('from')).toBe('2026-01-01');
        expect(url!.searchParams.get('to')).toBe('2026-07-01');
        expect(url!.searchParams.get('granularity')).toBe('month');
        expect(url!.searchParams.get('include_storage')).toBe('true');
    });

    it('TC-AI8: omits include_storage when false and sends a bare path with no params', async () => {
        const seen: URL[] = [];
        server.use(
            http.get('*/admin/stats', ({ request }) => {
                seen.push(new URL(request.url));
                return HttpResponse.json({ generated_at: '2026-07-21T00:00:00.000Z' });
            }),
        );

        // include_storage: false must NOT appear in the query.
        await getAdminStats({ from: '2026-01-01', include_storage: false });
        expect(seen[0].searchParams.has('include_storage')).toBe(false);
        expect(seen[0].searchParams.get('from')).toBe('2026-01-01');

        // No params at all → the bare endpoint, no query string.
        await getAdminStats();
        expect(seen[1].search).toBe('');
    });
});
