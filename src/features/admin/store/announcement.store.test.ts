import { describe, it, expect, beforeEach, vi } from 'vitest';

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
import { useAnnouncementStore, isBroadcastVisible } from './announcement.store';

// ---------------------------------------------------------------------------
// Store-level tests for the site-wide broadcast. The message itself now lives on
// the backend (/broadcast_messages), so these mock that API and cover the state
// transitions the banner and admin form rely on, plus the persistence contract:
// only `dismissedKey` reaches localStorage (never the message).
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'ecopart-admin-announcement';

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

describe('announcement.store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useAnnouncementStore.setState({ broadcast: null, loaded: false, dismissedKey: null });
    });

    it('TC-AU11: refresh loads the current broadcast from the backend', async () => {
        const broadcast = makeBroadcast();
        mockedGet.mockResolvedValue(broadcast);

        await useAnnouncementStore.getState().refresh();

        const state = useAnnouncementStore.getState();
        expect(state.broadcast).toEqual(broadcast);
        expect(state.loaded).toBe(true);
    });

    it('TC-AU11b: refresh swallows backend errors and still marks itself loaded', async () => {
        mockedGet.mockRejectedValue(new Error('boom'));

        await useAnnouncementStore.getState().refresh();

        const state = useAnnouncementStore.getState();
        expect(state.broadcast).toBeNull();
        expect(state.loaded).toBe(true);
    });

    it('TC-AU12: publish sends the input and stores the returned broadcast', async () => {
        const broadcast = makeBroadcast();
        mockedSet.mockResolvedValue(broadcast);

        const returned = await useAnnouncementStore.getState().publish({
            message: 'Downtime tonight',
            sub_message: 'Please disconnect',
            level: 'warning',
        });

        expect(mockedSet).toHaveBeenCalledWith({
            message: 'Downtime tonight',
            sub_message: 'Please disconnect',
            level: 'warning',
        });
        expect(returned).toEqual(broadcast);
        expect(useAnnouncementStore.getState().broadcast).toEqual(broadcast);
    });

    it('TC-AU13: clear deletes the broadcast on the backend and drops it locally', async () => {
        useAnnouncementStore.setState({ broadcast: makeBroadcast() });
        mockedDelete.mockResolvedValue(undefined);

        await useAnnouncementStore.getState().clear();

        expect(mockedDelete).toHaveBeenCalled();
        expect(useAnnouncementStore.getState().broadcast).toBeNull();
    });

    it('TC-AU13b: dismiss records the current broadcast timestamp without deleting it', () => {
        const broadcast = makeBroadcast();
        useAnnouncementStore.setState({ broadcast });

        useAnnouncementStore.getState().dismiss();

        const state = useAnnouncementStore.getState();
        expect(state.dismissedKey).toBe(broadcast.message_creation_utc_date_time);
        expect(state.broadcast).not.toBeNull();
    });

    it('TC-AU13c: a dismissed broadcast is hidden, but a newer one (different timestamp) shows again', () => {
        const first = makeBroadcast({ message_creation_utc_date_time: '2026-07-20T21:30:00.000Z' });
        const second = makeBroadcast({ message_creation_utc_date_time: '2026-07-21T09:00:00.000Z' });

        expect(isBroadcastVisible(first, first.message_creation_utc_date_time)).toBe(false);
        expect(isBroadcastVisible(second, first.message_creation_utc_date_time)).toBe(true);
        expect(isBroadcastVisible(null, null)).toBe(false);
    });

    it('TC-AU14: persists only the dismissal key to localStorage, never the message', () => {
        useAnnouncementStore.setState({ broadcast: makeBroadcast() });
        useAnnouncementStore.getState().dismiss();

        const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
        // zustand/persist wraps the partialized slice under `state`.
        expect(persisted.state.dismissedKey).toBe('2026-07-20T21:30:00.000Z');
        expect(persisted.state.broadcast).toBeUndefined();
    });
});
