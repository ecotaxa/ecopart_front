import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/broadcastMessages.api', () => ({
    getBroadcastMessage: vi.fn(),
    setBroadcastMessage: vi.fn(),
    deleteBroadcastMessage: vi.fn(),
}));

import AdminUpdatesTab from './AdminUpdatesTab';
import {
    getBroadcastMessage,
    setBroadcastMessage,
    deleteBroadcastMessage,
    type BroadcastMessage,
} from '../api/broadcastMessages.api';
import { useAnnouncementStore } from '../store/announcement.store';
import { renderWithRouter } from '@/test/utils';

// ---------------------------------------------------------------------------
// The UPDATES tab broadcasts a single site-wide message through the backend
// (/broadcast_messages, mocked here). Creating pushes it for every user;
// removing clears it.
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

const renderUpdates = () =>
    renderWithRouter(<AdminUpdatesTab />, { route: '/admin/updates' });

const fillMessage = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    await user.type(screen.getByLabelText('Message'), text);
};

describe('AdminUpdatesTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useAnnouncementStore.setState({ broadcast: null, loaded: false, dismissedKey: null });
        mockedGet.mockResolvedValue(null);
    });

    it('TC-AU1: renders the creation form when no message is active', () => {
        renderUpdates();

        expect(screen.getByRole('heading', { name: 'Show message to all users' })).toBeInTheDocument();
        expect(screen.getByLabelText('Message')).toBeInTheDocument();
        expect(screen.getByLabelText('Sub message')).toBeInTheDocument();
        expect(screen.getByText('Message layout style')).toBeInTheDocument();
    });

    it('TC-AU2: keeps CREATE disabled until a message is typed and the confirmation is ticked', async () => {
        const user = userEvent.setup();
        renderUpdates();

        const createButton = screen.getByRole('button', { name: 'Create' });
        expect(createButton).toBeDisabled();

        await fillMessage(user, 'Services suspended Saturday');
        // A message alone is not enough — the confirmation must be ticked too.
        expect(createButton).toBeDisabled();

        await user.click(screen.getByRole('checkbox'));
        expect(createButton).toBeEnabled();
    });

    it('TC-AU3: creating a message pushes it to the backend and shows it as the active announcement', async () => {
        const user = userEvent.setup();
        mockedSet.mockResolvedValue(
            makeBroadcast({ message: 'Services suspended Saturday', sub_message: 'Please disconnect', level: 'warning' }),
        );
        renderUpdates();

        await fillMessage(user, 'Services suspended Saturday');
        await user.type(screen.getByLabelText('Sub message'), 'Please disconnect');
        await user.click(screen.getByRole('radio', { name: 'Warning' }));
        await user.click(screen.getByRole('checkbox'));
        await user.click(screen.getByRole('button', { name: 'Create' }));

        // The backend received the new broadcast.
        await waitFor(() =>
            expect(mockedSet).toHaveBeenCalledWith({
                message: 'Services suspended Saturday',
                sub_message: 'Please disconnect',
                level: 'warning',
            }),
        );

        // The form is replaced by the active-message view.
        await waitFor(() =>
            expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument(),
        );
        const alerts = screen.getAllByText('Services suspended Saturday');
        expect(alerts.length).toBeGreaterThan(0);
    });

    it('TC-AU4: removing the active message clears it on the backend and returns to the form', async () => {
        const active = makeBroadcast({ message: 'Downtime tonight', sub_message: null, level: 'error' });
        // The mount refresh must report the same active message, not the default null.
        mockedGet.mockResolvedValue(active);
        useAnnouncementStore.setState({ broadcast: active });
        mockedDelete.mockResolvedValue(undefined);
        const user = userEvent.setup();
        renderUpdates();

        // The active message shows instead of the form.
        expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
        expect(screen.getByText('Downtime tonight')).toBeInTheDocument();

        // The alert's close button removes the broadcast.
        const alert = screen.getByRole('alert');
        await user.click(within(alert).getByRole('button', { name: /close/i }));

        await waitFor(() => expect(mockedDelete).toHaveBeenCalled());
        expect(useAnnouncementStore.getState().broadcast).toBeNull();
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    });
});
