import type { ReactNode } from "react";
import { create } from "zustand";

export interface ConfirmOptions {
    /** Dialog heading, e.g. "Delete project". */
    title: string;
    /** What will happen and whether it can be undone. */
    message: ReactNode;
    /** Label of the confirming button (default "Confirm"). */
    confirmLabel?: string;
    /** Label of the dismissing button (default "Cancel"). */
    cancelLabel?: string;
    /** Colour of the confirming button; destructive actions use "error" (default). */
    severity?: "error" | "warning" | "primary";
}

interface PendingConfirm extends ConfirmOptions {
    resolve: (confirmed: boolean) => void;
}

interface ConfirmState {
    /** The request currently shown by `ConfirmDialogHost`, or null. */
    pending: PendingConfirm | null;
}

export const useConfirmStore = create<ConfirmState>(() => ({ pending: null }));

/**
 * Ask the user to confirm an action through the app-wide MUI dialog (rendered
 * once by `ConfirmDialogHost` in the providers). Resolves `true` when the user
 * confirms, `false` when they cancel, close or press Escape — a drop-in,
 * awaitable replacement for `window.confirm` that hooks can call without
 * owning any dialog state.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        // A second request while one is open dismisses the first as cancelled.
        useConfirmStore.getState().pending?.resolve(false);
        useConfirmStore.setState({
            pending: {
                ...options,
                resolve: (confirmed) => {
                    useConfirmStore.setState({ pending: null });
                    resolve(confirmed);
                },
            },
        });
    });
}
