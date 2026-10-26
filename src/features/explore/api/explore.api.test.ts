import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import { exploreFixtures } from '@/test/msw/explore.handlers';
import { ApiError } from '@/shared/api/http';
import { createEmptyDraft, toFilters } from '../utils/exploreFilters';
import {
    exploreQueryKeys,
    fetchExploreEcoTaxa,
    fetchExploreGraphs,
    fetchExploreImages,
    fetchExploreMap,
    fetchExploreProjects,
    fetchExploreSelection,
} from './explore.api';

interface Captured {
    method: string;
    path: string;
    contentType: string | null;
    body: unknown;
}

/** Answers `response` on `path` and records how it was called. */
const capture = (method: 'get' | 'post', path: string, response: unknown): Captured[] => {
    const calls: Captured[] = [];
    server.use(http[method](`*${path}`, async ({ request }) => {
        calls.push({
            method: request.method,
            path: new URL(request.url).pathname,
            contentType: request.headers.get('content-type'),
            body: request.method === 'GET' ? null : await request.json(),
        });
        return HttpResponse.json(response as Record<string, unknown>);
    }));
    return calls;
};

const filters = { ...toFilters(createEmptyDraft()), project_ids: [1], ctd_only: true };

describe('explore API', () => {
    it('GETs the project options and unwraps them', async () => {
        const calls = capture('get', '/explore/projects', { projects: exploreFixtures.projects });

        await expect(fetchExploreProjects()).resolves.toEqual(exploreFixtures.projects);
        expect(calls).toEqual([expect.objectContaining({ method: 'GET', path: '/explore/projects' })]);
    });

    it('POSTs the mode and the filters (null before any filter) for the map, and unwraps the samples', async () => {
        const calls = capture('post', '/explore/map', { samples: exploreFixtures.mapSamples });

        await expect(fetchExploreMap({ mode: 'depth', filters: null })).resolves.toEqual(exploreFixtures.mapSamples);
        await fetchExploreMap({ mode: 'time', filters });
        expect(calls.map(({ method, path, contentType, body }) => ({ method, path, contentType, body }))).toEqual([
            { method: 'POST', path: '/explore/map', contentType: 'application/json', body: { mode: 'depth', filters: null } },
            { method: 'POST', path: '/explore/map', contentType: 'application/json', body: { mode: 'time', filters } },
        ]);
    });

    it('POSTs the selection request and returns both selections', async () => {
        const calls = capture('post', '/explore/selection', exploreFixtures.selection);

        await expect(fetchExploreSelection({ mode: 'depth', filters })).resolves.toEqual(exploreFixtures.selection);
        expect(calls[0].body).toEqual({ mode: 'depth', filters });
    });

    it('POSTs the EcoTaxa request apart', async () => {
        const calls = capture('post', '/explore/ecotaxa', exploreFixtures.ecotaxa);

        await expect(fetchExploreEcoTaxa({ mode: 'time', filters })).resolves.toEqual(exploreFixtures.ecotaxa);
        expect(calls[0]).toEqual(expect.objectContaining({ path: '/explore/ecotaxa', body: { mode: 'time', filters } }));
    });

    it('POSTs the number of images wanted and unwraps them', async () => {
        const calls = capture('post', '/explore/images', { images: exploreFixtures.images });

        await expect(fetchExploreImages({ mode: 'depth', filters, count: 4 })).resolves.toEqual(exploreFixtures.images);
        expect(calls[0].body).toEqual({ mode: 'depth', filters, count: 4 });
    });

    it('POSTs the bin sizes with the graphs request and returns the curves with their warnings', async () => {
        const calls = capture('post', '/explore/graphs', exploreFixtures.graphs);

        const graphs = await fetchExploreGraphs({ mode: 'depth', filters, pressure_bin: 10, time_bin: 2 });
        expect(graphs.warnings).toEqual(['1 sample of a private project is not drawn']);
        expect(graphs.abundance.keys).toEqual(['64-128 µm', '128-256 µm']);
        expect(calls[0].body).toEqual({ mode: 'depth', filters, pressure_bin: 10, time_bin: 2 });
    });

    it('surfaces the backend message of a refused request', async () => {
        server.use(http.post('*/explore/selection', () => HttpResponse.json({ errors: ['Invalid filters'] }, { status: 422 })));

        const error = await fetchExploreSelection({ mode: 'depth', filters }).catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 422, message: 'Invalid filters' });
    });

    it('keys the cached answers by request and by user', () => {
        const request = { mode: 'depth' as const, filters };

        expect(exploreQueryKeys.projects).toEqual(['explore', 'projects']);
        expect(exploreQueryKeys.selection(request, 1)).toEqual(['explore', 'selection', { mode: 'depth', filters, viewer: 1 }]);
        expect(exploreQueryKeys.selection(request, null)).not.toEqual(exploreQueryKeys.selection(request, 1));
        expect(exploreQueryKeys.graphs({ ...request, pressure_bin: 5, time_bin: 1 }, 1)[2]).toMatchObject({ pressure_bin: 5, time_bin: 1 });
    });
});
