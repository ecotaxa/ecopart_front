import { describe, it, expect, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
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

    // TC-H7: Keyboard Navigation
    it('TC-H7: should allow navigating the main form inputs using Tab order', async () => {
        const user = userEvent.setup({ delay: null });
        renderWithRouter(<NewProjectPage />);

        await screen.findByRole('heading', { name: /^New project$/i });

        // Start focusing just before the first input
        const rootInput = screen.getByLabelText(/Root folder path/i);
        act(() => {
            rootInput.focus();
        });
        expect(rootInput).toHaveFocus();

        // Next is the folder browser icon button (inside the root path field)
        await user.tab();
        expect(screen.getByRole('button', { name: /Browse Server Folders/i })).toHaveFocus();

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
        act(() => {
            switchInput.focus();
        });
        expect(switchInput).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('switch', { name: /Time duration check/i })).toHaveFocus();
    }, 15000);

    // TC-H8: Root Folder Modal Keyboard Accessibility
    it('TC-H8: should support keyboard flow in root folder modal and apply selected folder', async () => {
        const user = userEvent.setup({ delay: null });

        server.use(
            http.get('*/file_system/import_folders', () => {
                return HttpResponse.json(['selected-folder']);
            })
        );

        renderWithRouter(<NewProjectPage />);
        await screen.findByRole('heading', { name: /^New project$/i });

        const openBrowserButton = screen.getByRole('button', { name: /Browse Server Folders/i });
        act(() => {
            openBrowserButton.focus();
        });
        expect(openBrowserButton).toHaveFocus();

        await user.keyboard('{Enter}');
        expect(await screen.findByRole('dialog', { name: /Select Server Import Folder/i })).toBeInTheDocument();

        // Focus stays trapped inside dialog while open
        await user.tab();
        const dialog = screen.getByRole('dialog', { name: /Select Server Import Folder/i });
        expect(dialog.contains(document.activeElement)).toBe(true);

        // Escape closes modal
        await user.keyboard('{Escape}');
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: /Select Server Import Folder/i })).not.toBeInTheDocument();
        });

        // Re-open and select folder via keyboard
        act(() => {
            openBrowserButton.focus();
        });
        await user.keyboard('{Enter}');
        await screen.findByRole('dialog', { name: /Select Server Import Folder/i });

        const folderNode = await screen.findByRole('button', { name: /selected-folder/i });
        act(() => {
            folderNode.focus();
        });
        await user.keyboard('{Enter}');

        const selectButton = screen.getByRole('button', { name: /^SELECT$/i });
        act(() => {
            selectButton.focus();
        });
        await user.keyboard('{Enter}');

        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: /Select Server Import Folder/i })).not.toBeInTheDocument();
        });
        expect(screen.getByLabelText(/Root folder path/i)).toHaveValue('selected-folder');
    }, 20000);
});