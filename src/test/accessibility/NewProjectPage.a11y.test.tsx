import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import NewProjectPage from '@/features/projects/pages/NewProjectPage';
import { renderWithRouter } from '@/test/utils';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import { server } from '@/test/msw/server';

describe('NewProjectPage (Accessibility)', () => {

    beforeEach(() => {
        loginAsUser();

        server.use(
            http.get('*/users', () => HttpResponse.json({ users: [] })),
            http.get('*/ecotaxa_instances', () => HttpResponse.json([])),
            http.get('*/users/*/ecotaxa_account', () => HttpResponse.json({ ecotaxa_accounts: [] }))
        );
    });

    // TC-H6: Keyboard Navigation
    it('TC-H6: should allow navigating the main form inputs using Tab order', async () => {
        const user = userEvent.setup({ delay: null });
        renderWithRouter(<NewProjectPage />);

        await screen.findByRole('heading', { name: /^New project$/i });

        // Start focusing just before the first input
        const rootInput = screen.getByLabelText(/Root folder path/i);
        rootInput.focus();
        expect(rootInput).toHaveFocus();

        // Next is the Load Metadata button
        await user.tab();
        expect(screen.getByRole('button', { name: /Load metadata/i })).toHaveFocus();

        // Next is Instrument Select
        await user.tab();
        expect(screen.getByRole('combobox', { name: /Instrument/i })).toHaveFocus();

        // Next is Serial Number
        await user.tab();
        expect(screen.getByLabelText(/Instrument serial number/i)).toHaveFocus();

        // We jump ahead to test a switch to verify structural flow.
        // MUI Switch components use `role="switch"`, not `role="checkbox"`.
        const switchInput = screen.getByRole('switch', { name: /Data filtered before import into EcoPart/i });
        switchInput.focus();
        expect(switchInput).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('switch', { name: /Time duration check/i })).toHaveFocus();
    }, 15000);
});