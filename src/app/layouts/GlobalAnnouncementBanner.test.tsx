import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link } from 'react-router-dom';

vi.mock('@/features/admin/api/broadcastMessages.api', () => ({
    getBroadcastMessage: vi.fn(),
    setBroadcastMessage: vi.fn(),
    deleteBroadcastMessage: vi.fn(),
}));

import GlobalAnnouncementBanner from './GlobalAnnouncementBanner';
import { getBroadcastMessage, type BroadcastMessage } from '@/features/admin/api/broadcastMessages.api';
import { useAnnouncementStore } from '@/features/admin/store/announcement.store';
import { renderWithRouter } from '@/test/utils';
import { loginAsUser, logoutUser } from '@/test/helpers/auth.helpers';

// ---------------------------------------------------------------------------
// The banner is mounted once in MainLayout (a layout route) and shows the admin
// site-wide message on every page. The backend only serves it to signed-in users:
// it is fetched once a user is known and on every navigation, then rendered from
// the announcement store.
// ---------------------------------------------------------------------------
const mockedGet = vi.mocked(getBroadcastMessage);

const makeBroadcast = (overrides: Partial<BroadcastMessage> = {}): BroadcastMessage => ({
    broadcast_message_id: 1,
    message: 'Downtime tonight',
    sub_message: 'Please disconnect',
    level: 'warning',
    created_by_user_id: 42,
    message_creation_utc_date_time: '2026-07-20T21:30:00.000Z',
    ...overrides,
});

const renderBanner = () =>
    renderWithRouter(
        <>
            <GlobalAnnouncementBanner />
            <Link to="/other">Other page</Link>
        </>,
    );

/** Wait for the fetch to have been applied to the store, not just started. */
const waitForLoaded = () => waitFor(() => expect(useAnnouncementStore.getState().loaded).toBe(true));

describe('GlobalAnnouncementBanner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useAnnouncementStore.setState({ broadcast: null, loaded: false, dismissedKey: null });
        loginAsUser();
    });

    it('TC-AU15: renders nothing when the backend has no broadcast', async () => {
        mockedGet.mockResolvedValue(null);

        renderBanner();

        await waitForLoaded();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('TC-AU16: renders nothing when the current broadcast has been dismissed', async () => {
        const broadcast = makeBroadcast();
        mockedGet.mockResolvedValue(broadcast);
        useAnnouncementStore.setState({ dismissedKey: broadcast.message_creation_utc_date_time });

        renderBanner();

        await waitForLoaded();
        expect(useAnnouncementStore.getState().broadcast).toEqual(broadcast);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('TC-AU17: renders the message and sub message with the chosen level', async () => {
        mockedGet.mockResolvedValue(makeBroadcast());

        renderBanner();

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Downtime tonight');
        expect(alert).toHaveTextContent('Please disconnect');
        expect(alert.className).toContain('MuiAlert-standardWarning');
    });

    it('TC-AU18: the close button dismisses the banner for this viewer', async () => {
        const user = userEvent.setup();
        const broadcast = makeBroadcast({ sub_message: null });
        mockedGet.mockResolvedValue(broadcast);

        renderBanner();

        await user.click(await screen.findByRole('button', { name: /close/i }));

        expect(useAnnouncementStore.getState().dismissedKey).toBe(
            broadcast.message_creation_utc_date_time,
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('TC-AU22: a signed-out visitor sends no request and sees no banner', async () => {
        logoutUser();
        mockedGet.mockResolvedValue(makeBroadcast());
        useAnnouncementStore.setState({ broadcast: makeBroadcast() });

        renderBanner();

        await act(async () => {});
        expect(mockedGet).not.toHaveBeenCalled();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('TC-AU23: signing in fetches the broadcast without a reload', async () => {
        logoutUser();
        mockedGet.mockResolvedValue(makeBroadcast());

        renderBanner();
        expect(mockedGet).not.toHaveBeenCalled();

        act(() => loginAsUser());

        expect(await screen.findByRole('alert')).toHaveTextContent('Downtime tonight');
    });

    it('TC-AU24: refetches on navigation, so a newly pushed message shows up', async () => {
        const user = userEvent.setup();
        mockedGet.mockResolvedValue(null);

        renderBanner();
        await waitForLoaded();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();

        mockedGet.mockResolvedValue(makeBroadcast({ message: 'Pushed meanwhile' }));
        await user.click(screen.getByRole('link', { name: 'Other page' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Pushed meanwhile');
    });
});
