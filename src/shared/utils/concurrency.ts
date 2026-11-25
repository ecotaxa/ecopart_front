/**
 * `Promise.allSettled` over `items` with at most `limit` tasks in flight, so
 * that a long list (e.g. the "All" page size) does not send every request at
 * once to the single-process backend. Results keep the order of `items`, and a
 * rejected task never stops the others.
 */
export async function allSettledWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    task: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            try {
                results[index] = { status: "fulfilled", value: await task(items[index], index) };
            } catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    };
    const workers = Math.min(Math.max(1, Math.floor(limit)), items.length);
    await Promise.all(Array.from({ length: workers }, worker));
    return results;
}
