import { describe, it, expect } from 'vitest';

import { allSettledWithConcurrency } from './concurrency';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('allSettledWithConcurrency', () => {
    it('never runs more than `limit` tasks at once and keeps the order of the items', async () => {
        let inFlight = 0;
        let maxInFlight = 0;

        const results = await allSettledWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (item) => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            // Later items finish first: the order must still follow the input.
            for (let i = 0; i < 8 - item; i += 1) await tick();
            inFlight -= 1;
            return item * 10;
        });

        expect(maxInFlight).toBe(3);
        expect(results).toEqual([10, 20, 30, 40, 50, 60, 70].map((value) => ({ status: 'fulfilled', value })));
    });

    it('records a rejection and still runs the other tasks', async () => {
        const error = new Error('boom');
        const ran: number[] = [];

        const results = await allSettledWithConcurrency([1, 2, 3], 1, async (item) => {
            ran.push(item);
            if (item === 2) throw error;
            return item;
        });

        expect(ran).toEqual([1, 2, 3]);
        expect(results).toEqual([
            { status: 'fulfilled', value: 1 },
            { status: 'rejected', reason: error },
            { status: 'fulfilled', value: 3 },
        ]);
    });

    it('returns an empty list without calling the task, and runs one at a time below a limit of 1', async () => {
        let calls = 0;
        expect(await allSettledWithConcurrency([], 6, async () => { calls += 1; })).toEqual([]);
        expect(calls).toBe(0);

        let inFlight = 0;
        let maxInFlight = 0;
        await allSettledWithConcurrency([1, 2, 3], 0, async () => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await tick();
            inFlight -= 1;
        });
        expect(maxInFlight).toBe(1);
    });
});
