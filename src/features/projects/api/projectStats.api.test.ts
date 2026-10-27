import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import { makeProjectStatsFixture } from '@/test/helpers/projectStats.fixtures';
import { isNotFound } from '@/shared/api/http';
import { fetchProjectStats, projectStatsQueryKey } from './projectStats.api';

describe('projectStats.api', () => {
    it('fetchProjectStats reads GET /projects/:id/stats', async () => {
        const stats = makeProjectStatsFixture({ project_id: 77 });
        const urls: string[] = [];
        server.use(http.get('*/projects/:projectId/stats', ({ request }) => {
            urls.push(new URL(request.url).pathname);
            return HttpResponse.json(stats);
        }));

        await expect(fetchProjectStats(77)).resolves.toEqual(stats);
        expect(urls).toEqual(['/projects/77/stats']);
    });

    it('a 404 (project unknown, or an older backend) surfaces as not found', async () => {
        server.use(http.get('*/projects/:projectId/stats', () => HttpResponse.json({ errors: ['Cannot find project'] }, { status: 404 })));

        await expect(fetchProjectStats(77)).rejects.toSatisfy(isNotFound);
    });

    it('the query key sits under the projects root, so a project mutation invalidates it', () => {
        expect(projectStatsQueryKey(77)).toEqual(['projects', 'stats', 77]);
    });
});
