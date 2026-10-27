import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import { renderHookWithProviders } from '@/test/utils';
import { makeProjectStatsFixture } from '@/test/helpers/projectStats.fixtures';
import { PROJECT_STATS_POLL_MS, useProjectStats } from './useProjectStats';

const partial = makeProjectStatsFixture({ ecotaxa: { ...makeProjectStatsFixture().ecotaxa, partial: true, nb_samples_pending: 4, categories: ['Copepoda'] } });
const complete = makeProjectStatsFixture();

/** Answers a partial EcoTaxa part `partialAnswers` times, then the complete one, counting the calls. */
const statsHandler = (partialAnswers: number) => {
    let answers = 0;
    const calls = () => answers;
    server.use(http.get('*/projects/:projectId/stats', () => HttpResponse.json(answers++ < partialAnswers ? partial : complete)));
    return calls;
};

describe('useProjectStats', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('holds the fetch without a project id', () => {
        const calls = statsHandler(0);
        const { result } = renderHookWithProviders(() => useProjectStats(null));
        expect(result.current.isPending).toBe(true);
        expect(result.current.fetchStatus).toBe('idle');
        expect(calls()).toBe(0);
    });

    it('serves the statistics of the project', async () => {
        statsHandler(0);
        const { result } = renderHookWithProviders(() => useProjectStats(101));
        await waitFor(() => expect(result.current.data).toEqual(complete));
    });

    it('asks again while the EcoTaxa part is partial, then stops once it is complete', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'], shouldAdvanceTime: true });
        const calls = statsHandler(1);
        const { result } = renderHookWithProviders(() => useProjectStats(101));

        await waitFor(() => expect(result.current.data?.ecotaxa.partial).toBe(true));
        expect(calls()).toBe(1);

        act(() => { vi.advanceTimersByTime(PROJECT_STATS_POLL_MS); });
        await waitFor(() => expect(result.current.data?.ecotaxa.partial).toBe(false));
        expect(calls()).toBe(2);

        act(() => { vi.advanceTimersByTime(2 * PROJECT_STATS_POLL_MS); });
        expect(calls()).toBe(2);
    });
});
