import { describe, it, expect, beforeEach } from 'vitest';

import { useAnnouncementStore } from './announcement.store';

// ---------------------------------------------------------------------------
// Store-level tests for the site-wide announcement. They cover the state
// transitions the banner and the admin form rely on, plus the persistence
// contract: only `announcement` reaches localStorage (never `dismissed`).
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'ecopart-admin-announcement';

describe('announcement.store', () => {
    beforeEach(() => {
        localStorage.clear();
        useAnnouncementStore.setState({ announcement: null, dismissed: false });
    });

    it('TC-AU11: setAnnouncement stores the message and clears any previous dismissal', () => {
        useAnnouncementStore.setState({ dismissed: true });

        useAnnouncementStore.getState().setAnnouncement({
            message: 'Downtime tonight',
            subMessage: 'Please disconnect',
            severity: 'warning',
        });

        const state = useAnnouncementStore.getState();
        expect(state.announcement).toEqual({
            message: 'Downtime tonight',
            subMessage: 'Please disconnect',
            severity: 'warning',
        });
        expect(state.dismissed).toBe(false);
    });

    it('TC-AU12: dismiss hides the banner without deleting the announcement', () => {
        useAnnouncementStore.getState().setAnnouncement({
            message: 'Downtime tonight',
            subMessage: '',
            severity: 'info',
        });

        useAnnouncementStore.getState().dismiss();

        const state = useAnnouncementStore.getState();
        expect(state.dismissed).toBe(true);
        expect(state.announcement).not.toBeNull();
    });

    it('TC-AU13: clearAnnouncement removes the message and resets dismissal', () => {
        useAnnouncementStore.setState({
            announcement: { message: 'Downtime tonight', subMessage: '', severity: 'error' },
            dismissed: true,
        });

        useAnnouncementStore.getState().clearAnnouncement();

        const state = useAnnouncementStore.getState();
        expect(state.announcement).toBeNull();
        expect(state.dismissed).toBe(false);
    });

    it('TC-AU14: persists only the announcement to localStorage, never the dismissal', () => {
        useAnnouncementStore.getState().setAnnouncement({
            message: 'Downtime tonight',
            subMessage: 'Please disconnect',
            severity: 'warning',
        });
        useAnnouncementStore.getState().dismiss();

        const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
        // zustand/persist wraps the partialized slice under `state`.
        expect(persisted.state.announcement).toEqual({
            message: 'Downtime tonight',
            subMessage: 'Please disconnect',
            severity: 'warning',
        });
        expect(persisted.state.dismissed).toBeUndefined();
    });
});
