import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GlobalAnnouncementBanner from './GlobalAnnouncementBanner';
import { useAnnouncementStore } from '@/features/admin/store/announcement.store';

// ---------------------------------------------------------------------------
// The banner is mounted once in MainLayout and shows the admin site-wide
// message on every page. It renders straight from the announcement store, so
// these tests drive the store directly.
// ---------------------------------------------------------------------------
describe('GlobalAnnouncementBanner', () => {
    beforeEach(() => {
        localStorage.clear();
        useAnnouncementStore.setState({ announcement: null, dismissed: false });
    });

    it('TC-AU15: renders nothing when there is no announcement', () => {
        render(<GlobalAnnouncementBanner />);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('TC-AU16: renders nothing when the announcement has been dismissed', () => {
        useAnnouncementStore.setState({
            announcement: { message: 'Downtime tonight', subMessage: '', severity: 'info' },
            dismissed: true,
        });

        render(<GlobalAnnouncementBanner />);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('TC-AU17: renders the message and sub message with the chosen severity', () => {
        useAnnouncementStore.setState({
            announcement: {
                message: 'Downtime tonight',
                subMessage: 'Please disconnect',
                severity: 'warning',
            },
            dismissed: false,
        });

        render(<GlobalAnnouncementBanner />);

        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Downtime tonight');
        expect(alert).toHaveTextContent('Please disconnect');
        expect(alert.className).toContain('MuiAlert-standardWarning');
    });

    it('TC-AU18: the close button dismisses the banner', async () => {
        const user = userEvent.setup();
        useAnnouncementStore.setState({
            announcement: { message: 'Downtime tonight', subMessage: '', severity: 'info' },
            dismissed: false,
        });

        render(<GlobalAnnouncementBanner />);

        await user.click(screen.getByRole('button', { name: /close/i }));

        expect(useAnnouncementStore.getState().dismissed).toBe(true);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
