import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AdminUpdatesTab from './AdminUpdatesTab';
import { useAnnouncementStore } from '../store/announcement.store';
import { renderWithRouter } from '@/test/utils';

// ---------------------------------------------------------------------------
// The UPDATES tab broadcasts a single site-wide message through the shared
// announcement store (persisted to localStorage). No backend is involved.
// ---------------------------------------------------------------------------
const renderUpdates = () =>
    renderWithRouter(<AdminUpdatesTab />, { route: '/admin/updates' });

const fillMessage = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    await user.type(screen.getByLabelText('Message'), text);
};

describe('AdminUpdatesTab', () => {
    beforeEach(() => {
        localStorage.clear();
        useAnnouncementStore.setState({ announcement: null, dismissed: false });
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

    it('TC-AU3: creating a message stores it and shows it as the active announcement', async () => {
        const user = userEvent.setup();
        renderUpdates();

        await fillMessage(user, 'Services suspended Saturday');
        await user.type(screen.getByLabelText('Sub message'), 'Please disconnect');
        await user.click(screen.getByRole('radio', { name: 'Warning' }));
        await user.click(screen.getByRole('checkbox'));
        await user.click(screen.getByRole('button', { name: 'Create' }));

        // The store now holds the announcement with the chosen style.
        const stored = useAnnouncementStore.getState().announcement;
        expect(stored).toEqual({
            message: 'Services suspended Saturday',
            subMessage: 'Please disconnect',
            severity: 'warning',
        });

        // The form is replaced by the active-message view.
        expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
        const alerts = screen.getAllByText('Services suspended Saturday');
        expect(alerts.length).toBeGreaterThan(0);
    });

    it('TC-AU4: removing the active message returns to the creation form', async () => {
        useAnnouncementStore.setState({
            announcement: { message: 'Downtime tonight', subMessage: '', severity: 'error' },
            dismissed: false,
        });
        const user = userEvent.setup();
        renderUpdates();

        // The active message shows instead of the form.
        expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
        expect(screen.getByText('Downtime tonight')).toBeInTheDocument();

        // The alert's close button removes the announcement.
        const alert = screen.getByRole('alert');
        await user.click(within(alert).getByRole('button', { name: /close/i }));

        expect(useAnnouncementStore.getState().announcement).toBeNull();
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    });
});
