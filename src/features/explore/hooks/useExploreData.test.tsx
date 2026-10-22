import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';

import { server } from '@/test/msw/server';
import { ecotaxaHandler, exploreFixtures } from '@/test/msw/explore.handlers';
import { loginAsUser, logoutUser } from '@/test/helpers/auth.helpers';
import { createTestQueryClient } from '@/test/utils';
import type { ExploreAggregation, ExploreFilters, ExploreMode, ExploreTab } from '../types/explore.types';
import { DEFAULT_AGGREGATION, createEmptyDraft, toFilters } from '../utils/exploreFilters';
import { ECOTAXA_POLL_MS, useExploreData } from './useExploreData';

interface HookProps {
    mode: ExploreMode;
    filters: ExploreFilters | null;
    tab: ExploreTab;
    aggregation: ExploreAggregation;
}

const FILTERS: ExploreFilters = toFilters(createEmptyDraft());
const OTHER_FILTERS: ExploreFilters = { ...FILTERS, project_ids: [1] };
const NO_SELECTION = { summary: null, projects: [] };
const NO_SHARES = { fully_validated: 0, fully_predicted: 0, partially_validated: 0, partially_predicted: 0 };

let requests: { path: string; request: Request }[] = [];
const callsTo = (path: string) => requests.filter((call) => call.path === path);
const bodiesOf = (path: string) => Promise.all(callsTo(path).map(({ request }) => request.json()));

/** A handler held until `release()` is called. */
function gated(method: 'get' | 'post', path: string, response: unknown) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(http[method](`*${path}`, async () => {
        await gate;
        return HttpResponse.json(response as Record<string, unknown>);
    }));
    return release;
}

function renderExploreData(initial: Partial<HookProps> = {}) {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const props: HookProps = { mode: 'depth', filters: null, tab: 'stats', aggregation: DEFAULT_AGGREGATION, ...initial };
    const rendered = renderHook(
        ({ mode, filters, tab, aggregation }: HookProps) => useExploreData(mode, filters, { aggregation, tab, sumChildTaxa: true }),
        { wrapper, initialProps: props },
    );
    return { ...rendered, props, update: (patch: Partial<HookProps>) => rendered.rerender({ ...props, ...patch }) };
}

/** Lets a request that should not be sent have the time to show up. */
const aMoment = () => new Promise((resolve) => setTimeout(resolve, 50));

/**
 * Only the intervals are faked (the EcoTaxa polling of React Query), still
 * running with the clock so that `waitFor` keeps checking.
 */
const fakeIntervals = () => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'], shouldAdvanceTime: true });
/** Time for one more poll of a partial EcoTaxa part. */
const nextPoll = () => act(() => vi.advanceTimersByTime(ECOTAXA_POLL_MS));

describe('useExploreData', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    beforeEach(() => {
        logoutUser();
        requests = [];
        server.events.removeAllListeners('request:start');
        server.events.on('request:start', ({ request }) => {
            const path = new URL(request.url).pathname;
            if (path.startsWith('/explore')) requests.push({ path, request: request.clone() });
        });
    });

    it('loads the project options and the map of every sample, and nothing else before "Apply filters"', async () => {
        const { result } = renderExploreData();

        // Neither available nor unavailable while the first answer is on its way: no warning flashes.
        expect(result.current).toMatchObject({ available: false, unavailable: false, loading: true });

        await waitFor(() => expect(result.current.available).toBe(true));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.projectOptions).toEqual(exploreFixtures.projects);
        expect(result.current.mapSamples).toEqual(exploreFixtures.mapSamples);
        expect(result.current).toMatchObject({ all: NO_SELECTION, exportable: NO_SELECTION, graphs: null, images: [], error: null });
        expect(requests.map(({ path }) => path).sort()).toEqual(['/explore/map', '/explore/projects']);
        expect(await bodiesOf('/explore/map')).toEqual([{ mode: 'depth', filters: null }]);
    });

    it('says the service is unavailable after a 404 (older backend), without an error, and asks nothing more', async () => {
        server.use(http.all('*/explore/*', () => new HttpResponse(null, { status: 404 })));
        const { result, update } = renderExploreData();

        await waitFor(() => expect(result.current.unavailable).toBe(true));
        expect(result.current).toMatchObject({ available: false, error: null, mapSamples: [] });

        update({ filters: FILTERS });
        await aMoment();
        expect(callsTo('/explore/selection')).toHaveLength(0);
        expect(result.current.all).toEqual(NO_SELECTION);
    });

    it('says the service is unavailable when the backend cannot be reached', async () => {
        server.use(http.all('*/explore/*', () => HttpResponse.error()));
        const { result } = renderExploreData();

        await waitFor(() => expect(result.current.unavailable).toBe(true));
        expect(result.current.error).toBeNull();
    });

    it('shows the selection as soon as it arrives, then merges its EcoTaxa part', async () => {
        const releaseEcoTaxa = gated('post', '/explore/ecotaxa', exploreFixtures.ecotaxa);
        const { result } = renderExploreData({ filters: FILTERS });

        await waitFor(() => expect(result.current.all.summary).not.toBeNull());
        expect(result.current.all.summary).toMatchObject({
            counts: exploreFixtures.selection.all.summary!.counts,
            ecotaxa_categories: [],
            classification: NO_SHARES,
        });
        expect(result.current.all.projects).toEqual(exploreFixtures.selection.all.projects);
        expect(result.current.exportable.summary?.counts).toEqual(exploreFixtures.selection.exportable.summary!.counts);
        expect(result.current.loading).toBe(true);

        releaseEcoTaxa();
        await waitFor(() => expect(result.current.all.summary?.ecotaxa_categories).toEqual(exploreFixtures.ecotaxa.all.categories));
        expect(result.current.all.summary?.classification).toEqual(exploreFixtures.ecotaxa.all.classification);
        expect(result.current.exportable.summary).toMatchObject({
            counts: exploreFixtures.selection.exportable.summary!.counts,
            ecotaxa_categories: exploreFixtures.ecotaxa.exportable.categories,
            classification: exploreFixtures.ecotaxa.exportable.classification,
        });
        expect(await bodiesOf('/explore/selection')).toEqual([{ mode: 'depth', filters: FILTERS }]);
        expect(await bodiesOf('/explore/ecotaxa')).toEqual([{ mode: 'depth', filters: FILTERS }]);
    });

    it('never merges the EcoTaxa part of the previous filters into the new selection', async () => {
        const { result, update } = renderExploreData({ filters: FILTERS });
        await waitFor(() => expect(result.current.all.summary?.ecotaxa_categories).toEqual(exploreFixtures.ecotaxa.all.categories));

        const otherTaxa = { ...exploreFixtures.ecotaxa, all: { ...exploreFixtures.ecotaxa.all, categories: ['Appendicularia'] } };
        const releaseEcoTaxa = gated('post', '/explore/ecotaxa', otherTaxa);
        update({ filters: OTHER_FILTERS });
        await waitFor(() => expect(callsTo('/explore/selection')).toHaveLength(2));
        await waitFor(() => expect(result.current.all.summary?.ecotaxa_categories).toEqual([]));

        releaseEcoTaxa();
        await waitFor(() => expect(result.current.all.summary?.ecotaxa_categories).toEqual(['Appendicularia']));
    });

    it('marks the summaries as complete when the EcoTaxa part is, and asks for it only once', async () => {
        fakeIntervals();
        const { result } = renderExploreData({ filters: FILTERS });
        await waitFor(() => expect(result.current.all.summary?.ecotaxa_categories).toEqual(exploreFixtures.ecotaxa.all.categories));
        expect(result.current.all.summary).toMatchObject({ ecotaxa_partial: false, ecotaxa_pending: 0 });
        expect(result.current.exportable.summary).toMatchObject({ ecotaxa_partial: false, ecotaxa_pending: 0 });

        nextPoll();
        nextPoll();
        await aMoment();
        expect(callsTo('/explore/ecotaxa')).toHaveLength(1);
    });

    it('asks again for a partial EcoTaxa part until it is complete, its figures staying on screen meanwhile', async () => {
        fakeIntervals();
        server.use(ecotaxaHandler(1));
        const { result } = renderExploreData({ filters: FILTERS });

        await waitFor(() => expect(result.current.all.summary?.ecotaxa_partial).toBe(true));
        const { partialEcotaxa } = exploreFixtures;
        expect(result.current.all.summary).toMatchObject({
            ecotaxa_categories: partialEcotaxa.all.categories,
            classification: partialEcotaxa.all.classification,
            ecotaxa_pending: 2,
        });
        expect(result.current.exportable.summary).toMatchObject({ ecotaxa_partial: true, ecotaxa_pending: 1 });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(callsTo('/explore/ecotaxa')).toHaveLength(1);

        // The poll is held: the partial figures stay, and asking again is no load.
        const releaseComplete = gated('post', '/explore/ecotaxa', exploreFixtures.ecotaxa);
        nextPoll();
        await waitFor(() => expect(callsTo('/explore/ecotaxa')).toHaveLength(2));
        expect(result.current.all.summary).toMatchObject({ ecotaxa_categories: partialEcotaxa.all.categories, ecotaxa_partial: true });
        expect(result.current.loading).toBe(false);

        releaseComplete();
        await waitFor(() => expect(result.current.all.summary?.ecotaxa_partial).toBe(false));
        expect(result.current.all.summary).toMatchObject({
            ecotaxa_categories: exploreFixtures.ecotaxa.all.categories,
            classification: exploreFixtures.ecotaxa.all.classification,
            ecotaxa_pending: 0,
        });
        expect(result.current.exportable.summary).toMatchObject({ ecotaxa_partial: false, ecotaxa_pending: 0 });

        // Complete: no more polls, and the other requests were never asked again.
        nextPoll();
        nextPoll();
        await aMoment();
        expect(callsTo('/explore/ecotaxa')).toHaveLength(2);
        expect(callsTo('/explore/selection')).toHaveLength(1);
        expect(callsTo('/explore/map')).toHaveLength(1);
        expect(callsTo('/explore/projects')).toHaveLength(1);
    });

    it('stops asking for a partial EcoTaxa part once the filters are cleared', async () => {
        fakeIntervals();
        server.use(ecotaxaHandler(Infinity));
        const { result, update } = renderExploreData({ filters: FILTERS });
        await waitFor(() => expect(result.current.all.summary?.ecotaxa_partial).toBe(true));

        nextPoll();
        await waitFor(() => expect(callsTo('/explore/ecotaxa')).toHaveLength(2));
        await waitFor(() => expect(result.current.loading).toBe(false));

        update({ filters: null });
        nextPoll();
        nextPoll();
        await aMoment();
        expect(callsTo('/explore/ecotaxa')).toHaveLength(2);
    });

    it('keeps the selection when EcoTaxa fails, and reports why', async () => {
        server.use(http.post('*/explore/ecotaxa', () => HttpResponse.json({ errors: ['EcoTaxa is unreachable'] }, { status: 502 })));
        const { result } = renderExploreData({ filters: FILTERS });

        await waitFor(() => expect(result.current.error).toBe('EcoTaxa is unreachable'));
        expect(result.current.all.summary).toMatchObject({ counts: exploreFixtures.selection.all.summary!.counts, ecotaxa_categories: [] });
    });

    it('keeps the previous selection on screen until new filters answer, and empties it once they are cleared', async () => {
        const { result, update } = renderExploreData({ filters: FILTERS });
        await waitFor(() => expect(result.current.all.summary?.counts.samples).toBe(3));

        const narrower = {
            ...exploreFixtures.selection,
            all: { ...exploreFixtures.selection.all, summary: { ...exploreFixtures.selection.all.summary!, counts: { projects: 1, samples: 1, particles: 10, images: 1 } } },
        };
        const releaseSelection = gated('post', '/explore/selection', narrower);
        update({ filters: OTHER_FILTERS });
        expect(result.current.all.summary?.counts.samples).toBe(3);
        expect(result.current.loading).toBe(true);

        releaseSelection();
        await waitFor(() => expect(result.current.all.summary?.counts.samples).toBe(1));

        update({ filters: null });
        expect(result.current.all).toEqual(NO_SELECTION);
        expect(result.current.exportable).toEqual(NO_SELECTION);
    });

    it('asks for no graph for an anonymous user, and for the graphs once logged in', async () => {
        const { result } = renderExploreData({ filters: FILTERS, tab: 'graphs' });
        await waitFor(() => expect(result.current.all.summary).not.toBeNull());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(callsTo('/explore/graphs')).toHaveLength(0);
        expect(result.current.graphs).toBeNull();

        act(() => loginAsUser());
        await waitFor(() => expect(result.current.graphs).toEqual(exploreFixtures.graphs));
        expect(await bodiesOf('/explore/graphs')).toEqual([{ mode: 'depth', filters: FILTERS, pressure_bin: 5, time_bin: 1 }]);
    });

    it('asks for the graphs only on the graphs tab, and only once filters are applied', async () => {
        loginAsUser();
        const { result, update, props } = renderExploreData({ tab: 'graphs' });
        await waitFor(() => expect(result.current.available).toBe(true));
        await aMoment();
        expect(callsTo('/explore/graphs')).toHaveLength(0);

        update({ filters: FILTERS, tab: 'stats' });
        await waitFor(() => expect(result.current.all.summary).not.toBeNull());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(callsTo('/explore/graphs')).toHaveLength(0);

        update({ ...props, filters: FILTERS, tab: 'graphs' });
        await waitFor(() => expect(result.current.graphs?.warnings).toEqual(exploreFixtures.graphs.warnings));
        expect(callsTo('/explore/graphs')).toHaveLength(1);
    });

    it('asks again for the graphs once the bin size rests, keeping the curves meanwhile', async () => {
        loginAsUser();
        const { result, update } = renderExploreData({ filters: FILTERS, tab: 'graphs' });
        await waitFor(() => expect(result.current.graphs).not.toBeNull());

        update({ filters: FILTERS, tab: 'graphs', aggregation: { pressure_bin: 7, time_bin: 1 } });
        update({ filters: FILTERS, tab: 'graphs', aggregation: { pressure_bin: 20, time_bin: 1 } });
        expect(result.current.graphs).not.toBeNull();

        await waitFor(() => expect(callsTo('/explore/graphs')).toHaveLength(2));
        const bodies = await bodiesOf('/explore/graphs');
        expect(bodies[1]).toMatchObject({ pressure_bin: 20, time_bin: 1 });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.graphs).not.toBeNull();
    });

    it('asks for images on the exportable tab only, and for others on refresh', async () => {
        const { result, update } = renderExploreData({ filters: FILTERS });
        await waitFor(() => expect(result.current.all.summary).not.toBeNull());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(callsTo('/explore/images')).toHaveLength(0);

        update({ filters: FILTERS, tab: 'exportable' });
        await waitFor(() => expect(result.current.images).toEqual(exploreFixtures.images));
        expect(await bodiesOf('/explore/images')).toEqual([{ mode: 'depth', filters: FILTERS, count: 4 }]);

        act(() => result.current.refreshImages());
        await waitFor(() => expect(callsTo('/explore/images')).toHaveLength(2));
    });

    it('reports the message of a failed request', async () => {
        server.use(http.post('*/explore/selection', () => HttpResponse.json({ message: 'Database is locked' }, { status: 500 })));
        const { result } = renderExploreData({ filters: FILTERS });

        await waitFor(() => expect(result.current.error).toBe('Database is locked'));
        expect(result.current.available).toBe(true);
    });
});
