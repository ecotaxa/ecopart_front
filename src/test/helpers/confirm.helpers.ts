import { vi } from "vitest";

import { type ConfirmOptions, useConfirmStore } from "@/shared/confirm/confirm.store";

const activeSubscriptions = new Set<() => void>();

/**
 * Answer every `confirmDialog()` request automatically with `answer` — the
 * replacement for the old `vi.spyOn(window, 'confirm').mockReturnValue(answer)`.
 *
 * Returns a mock that records each request's options (so a test can assert on
 * the title / message) and exposes `mockRestore()` to stop answering. Any
 * subscription still active at the end of a test is removed by the global
 * test setup (`resetConfirmDialogs`).
 */
export function answerConfirmDialogs(answer: boolean) {
    const spy = vi.fn<(options: ConfirmOptions) => boolean>(() => answer);

    const unsubscribe = useConfirmStore.subscribe((state) => {
        const pending = state.pending;
        if (!pending) return;
        const { resolve, ...options } = pending;
        spy(options);
        resolve(answer);
    });
    activeSubscriptions.add(unsubscribe);

    return Object.assign(spy, {
        mockRestore: () => {
            unsubscribe();
            activeSubscriptions.delete(unsubscribe);
        },
    });
}

/** Drop every auto-answer subscription and any dialog left open (called after each test). */
export function resetConfirmDialogs() {
    activeSubscriptions.forEach((unsubscribe) => unsubscribe());
    activeSubscriptions.clear();
    useConfirmStore.getState().pending?.resolve(false);
    useConfirmStore.setState({ pending: null });
}
