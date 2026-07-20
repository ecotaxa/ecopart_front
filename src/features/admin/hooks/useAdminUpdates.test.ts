import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useAdminUpdates } from './useAdminUpdates';
import { useAnnouncementStore } from '../store/announcement.store';

// ---------------------------------------------------------------------------
// Hook-level tests for the admin UPDATES panel. They assert the behaviours the
// component test (AdminUpdatesTab.test.tsx, TC-AU1–AU4) exercises only through
// the DOM: the whitespace guard, form reset, and the transient-toast lifecycle.
// The hook is backed purely by the local announcement store — no network.
// ---------------------------------------------------------------------------
describe('useAdminUpdates', () => {
    beforeEach(() => {
        localStorage.clear();
        useAnnouncementStore.setState({ announcement: null, dismissed: false });
    });

    it('TC-AU5: keeps canCreate false for a whitespace-only message even when confirmed', () => {
        const { result } = renderHook(() => useAdminUpdates());

        act(() => {
            result.current.setMessage('   ');
            result.current.setConfirmed(true);
        });

        expect(result.current.canCreate).toBe(false);
    });

    it('TC-AU6: trims the message and sub message before storing them', () => {
        const { result } = renderHook(() => useAdminUpdates());

        act(() => {
            result.current.setMessage('  Downtime tonight  ');
            result.current.setSubMessage('  Please disconnect  ');
            result.current.setSeverity('warning');
            result.current.setConfirmed(true);
        });
        act(() => {
            result.current.create();
        });

        expect(result.current.activeAnnouncement).toEqual({
            message: 'Downtime tonight',
            subMessage: 'Please disconnect',
            severity: 'warning',
        });
    });

    it('TC-AU7: resets the form and raises justCreated after a successful create', () => {
        const { result } = renderHook(() => useAdminUpdates());

        act(() => {
            result.current.setMessage('Downtime tonight');
            result.current.setSubMessage('Please disconnect');
            result.current.setSeverity('error');
            result.current.setConfirmed(true);
        });
        act(() => {
            result.current.create();
        });

        expect(result.current.message).toBe('');
        expect(result.current.subMessage).toBe('');
        expect(result.current.severity).toBe('info');
        expect(result.current.confirmed).toBe(false);
        expect(result.current.justCreated).toBe(true);
    });

    it('TC-AU8: dismissJustCreated clears the toast flag without touching the announcement', () => {
        const { result } = renderHook(() => useAdminUpdates());

        act(() => {
            result.current.setMessage('Downtime tonight');
            result.current.setConfirmed(true);
        });
        act(() => {
            result.current.create();
        });
        act(() => {
            result.current.dismissJustCreated();
        });

        expect(result.current.justCreated).toBe(false);
        expect(result.current.activeAnnouncement).not.toBeNull();
    });

    it('TC-AU9: create is a no-op when canCreate is false', () => {
        const { result } = renderHook(() => useAdminUpdates());

        // Message present but confirmation not ticked → canCreate is false.
        act(() => {
            result.current.setMessage('Downtime tonight');
        });
        act(() => {
            result.current.create();
        });

        expect(result.current.activeAnnouncement).toBeNull();
        expect(result.current.justCreated).toBe(false);
    });

    it('TC-AU10: remove clears the announcement and lowers justCreated', () => {
        const { result } = renderHook(() => useAdminUpdates());

        act(() => {
            result.current.setMessage('Downtime tonight');
            result.current.setConfirmed(true);
        });
        act(() => {
            result.current.create();
        });
        act(() => {
            result.current.remove();
        });

        expect(result.current.activeAnnouncement).toBeNull();
        expect(result.current.justCreated).toBe(false);
    });
});
