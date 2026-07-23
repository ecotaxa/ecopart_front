import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/broadcastMessages.api', () => ({
    getBroadcastMessage: vi.fn(),
    setBroadcastMessage: vi.fn(),
    deleteBroadcastMessage: vi.fn(),
}));

import {
    getBroadcastMessage,
    setBroadcastMessage,
    deleteBroadcastMessage,
    type BroadcastMessage,
} from '../api/broadcastMessages.api';
import { useAdminUpdates } from './useAdminUpdates';
import { useAnnouncementStore } from '../store/announcement.store';

/** Mount the hook and wait for its on-mount backend refresh to settle. */
const renderReady = async () => {
    const rendered = renderHook(() => useAdminUpdates());
    await waitFor(() => expect(useAnnouncementStore.getState().loaded).toBe(true));
    return rendered;
};

// ---------------------------------------------------------------------------
// Hook-level tests for the admin UPDATES panel. They assert the behaviours the
// component test (AdminUpdatesTab.test.tsx, TC-AU1–AU4) exercises only through
// the DOM: the whitespace guard, form reset, the transient-toast lifecycle, and
// the backend-error path. The hook is backed by the announcement store, whose
// publish/clear actions hit the mocked /broadcast_messages API.
// ---------------------------------------------------------------------------
const mockedGet = vi.mocked(getBroadcastMessage);
const mockedSet = vi.mocked(setBroadcastMessage);
const mockedDelete = vi.mocked(deleteBroadcastMessage);

const makeBroadcast = (overrides: Partial<BroadcastMessage> = {}): BroadcastMessage => ({
    broadcast_message_id: 1,
    message: 'Downtime tonight',
    sub_message: 'Please disconnect',
    level: 'warning',
    created_by_user_id: 42,
    message_creation_utc_date_time: '2026-07-20T21:30:00.000Z',
    ...overrides,
});

describe('useAdminUpdates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useAnnouncementStore.setState({ broadcast: null, loaded: false, dismissedKey: null });
        // The hook refreshes on mount; default to "no message set".
        mockedGet.mockResolvedValue(null);
    });

    it('TC-AU5: keeps canCreate false for a whitespace-only message even when confirmed', async () => {
        const { result } = await renderReady();

        act(() => {
            result.current.setMessage('   ');
            result.current.setConfirmed(true);
        });

        expect(result.current.canCreate).toBe(false);
    });

    it('TC-AU6: trims the message and sub message before sending them to the backend', async () => {
        mockedSet.mockImplementation(async (input) =>
            makeBroadcast({ message: input.message, sub_message: input.sub_message ?? null, level: input.level }),
        );
        const { result } = await renderReady();

        act(() => {
            result.current.setMessage('  Downtime tonight  ');
            result.current.setSubMessage('  Please disconnect  ');
            result.current.setSeverity('warning');
            result.current.setConfirmed(true);
        });
        await act(async () => {
            await result.current.create();
        });

        expect(mockedSet).toHaveBeenCalledWith({
            message: 'Downtime tonight',
            sub_message: 'Please disconnect',
            level: 'warning',
        });
        expect(result.current.activeAnnouncement).toEqual({
            message: 'Downtime tonight',
            subMessage: 'Please disconnect',
            severity: 'warning',
        });
    });

    it('TC-AU6b: sends a null sub_message when the sub message is left blank', async () => {
        mockedSet.mockResolvedValue(makeBroadcast({ sub_message: null }));
        const { result } = await renderReady();

        act(() => {
            result.current.setMessage('Downtime tonight');
            result.current.setConfirmed(true);
        });
        await act(async () => {
            await result.current.create();
        });

        expect(mockedSet).toHaveBeenCalledWith({
            message: 'Downtime tonight',
            sub_message: null,
            level: 'info',
        });
    });

    it('TC-AU7: resets the form and raises justCreated after a successful create', async () => {
        mockedSet.mockResolvedValue(makeBroadcast({ level: 'error' }));
        const { result } = await renderReady();

        act(() => {
            result.current.setMessage('Downtime tonight');
            result.current.setSubMessage('Please disconnect');
            result.current.setSeverity('error');
            result.current.setConfirmed(true);
        });
        await act(async () => {
            await result.current.create();
        });

        expect(result.current.message).toBe('');
        expect(result.current.subMessage).toBe('');
        expect(result.current.severity).toBe('info');
        expect(result.current.confirmed).toBe(false);
        expect(result.current.justCreated).toBe(true);
    });

    it('TC-AU8: dismissJustCreated clears the toast flag without touching the announcement', async () => {
        mockedSet.mockResolvedValue(makeBroadcast());
        const { result } = await renderReady();

        act(() => {
            result.current.setMessage('Downtime tonight');
            result.current.setConfirmed(true);
        });
        await act(async () => {
            await result.current.create();
        });
        act(() => {
            result.current.dismissJustCreated();
        });

        expect(result.current.justCreated).toBe(false);
        expect(result.current.activeAnnouncement).not.toBeNull();
    });

    it('TC-AU9: create is a no-op when canCreate is false', async () => {
        const { result } = await renderReady();

        // Message present but confirmation not ticked → canCreate is false.
        act(() => {
            result.current.setMessage('Downtime tonight');
        });
        await act(async () => {
            await result.current.create();
        });

        expect(mockedSet).not.toHaveBeenCalled();
        expect(result.current.activeAnnouncement).toBeNull();
        expect(result.current.justCreated).toBe(false);
    });

    it('TC-AU10: remove clears the announcement and lowers justCreated', async () => {
        mockedSet.mockResolvedValue(makeBroadcast());
        mockedDelete.mockResolvedValue(undefined);
        const { result } = await renderReady();

        act(() => {
            result.current.setMessage('Downtime tonight');
            result.current.setConfirmed(true);
        });
        await act(async () => {
            await result.current.create();
        });
        await act(async () => {
            await result.current.remove();
        });

        expect(mockedDelete).toHaveBeenCalled();
        expect(result.current.activeAnnouncement).toBeNull();
        expect(result.current.justCreated).toBe(false);
    });

    it('TC-AU10b: surfaces an error and keeps the form when publish fails', async () => {
        mockedSet.mockRejectedValue(new Error('Cannot set broadcast message'));
        const { result } = await renderReady();

        act(() => {
            result.current.setMessage('Downtime tonight');
            result.current.setConfirmed(true);
        });
        await act(async () => {
            await result.current.create();
        });

        await waitFor(() => expect(result.current.error).toBe('Cannot set broadcast message'));
        expect(result.current.activeAnnouncement).toBeNull();
        // Form is preserved so the admin can retry.
        expect(result.current.message).toBe('Downtime tonight');
        expect(result.current.justCreated).toBe(false);
    });
});
