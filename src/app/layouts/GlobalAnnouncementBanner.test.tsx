import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/features/admin/api/broadcastMessages.api', () => ({
    getBroadcastMessage: vi.fn(),
    setBroadcastMessage: vi.fn(),
    deleteBroadcastMessage: vi.fn(),
}));

import GlobalAnnouncementBanner from './GlobalAnnouncementBanner';
import { getBroadcastMessage, type BroadcastMessage } from '@/features/admin/api/broadcastMessages.api';
import { useAnnouncementStore } from '@/features/admin/store/announcement.store';

// ---------------------------------------------------------------------------
// The banner is mounted once in MainLayout and shows the admin site-wide message
// on every page. On mount it fetches the current broadcast from the backend
// (mocked here) and renders it from the announcement store.
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

describe('GlobalAnnouncementBanner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useAnnouncementStore.setState({ broadcast: null, loaded: false, dismissedKey: null });
    });

    it('TC-AU15: renders nothing when the backend has no broadcast', async () => {
        mockedGet.mockResolvedValue(null);

        render(<GlobalAnnouncementBanner />);

        await waitFor(() => expect(mockedGet).toHaveBeenCalled());
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('TC-AU16: renders nothing when the current broadcast has been dismissed', async () => {
        const broadcast = makeBroadcast();
        mockedGet.mockResolvedValue(broadcast);
        useAnnouncementStore.setState({ dismissedKey: broadcast.message_creation_utc_date_time });

        render(<GlobalAnnouncementBanner />);

        await waitFor(() => expect(mockedGet).toHaveBeenCalled());
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('TC-AU17: renders the message and sub message with the chosen level', async () => {
        mockedGet.mockResolvedValue(makeBroadcast());

        render(<GlobalAnnouncementBanner />);

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Downtime tonight');
        expect(alert).toHaveTextContent('Please disconnect');
        expect(alert.className).toContain('MuiAlert-standardWarning');
    });

    it('TC-AU18: the close button dismisses the banner for this viewer', async () => {
        const user = userEvent.setup();
        const broadcast = makeBroadcast({ sub_message: null });
        mockedGet.mockResolvedValue(broadcast);

        render(<GlobalAnnouncementBanner />);

        await user.click(await screen.findByRole('button', { name: /close/i }));

        expect(useAnnouncementStore.getState().dismissedKey).toBe(
            broadcast.message_creation_utc_date_time,
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
