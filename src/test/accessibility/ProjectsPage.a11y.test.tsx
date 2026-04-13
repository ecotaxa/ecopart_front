import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import ProjectsPage from '@/features/projects/pages/ProjectsPage';
import { renderWithRouter } from '@/test/utils';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import { server } from '@/test/msw/server';

describe('ProjectsPage (Accessibility)', () => {

    beforeEach(() => {
        loginAsUser();

        // Mock API so the page renders without errors
        server.use(
            http.post('*/projects/searches', () => {
                return HttpResponse.json({ search_info: { total: 0, page: 1, limit: 10 }, projects: [] });
            })
        );
    });

    // TC-G6: Keyboard Navigation
    it('TC-G6: should allow navigating the main controls using Tab order', async () => {
        const user = userEvent.setup({ delay: null });
        renderWithRouter(<ProjectsPage />);

        // A robust way is to focus the "Search" input directly, then test the SUBSEQUENT tab order.
        const searchInput = screen.getByPlaceholderText('Search...');
        searchInput.focus();
        expect(searchInput).toHaveFocus();

        // 1. Tab -> Attribute Select (Combobox)
        await user.tab();
        expect(screen.getByRole('combobox', { name: /Attribute/i })).toHaveFocus();

        // 2. Tab -> Filter Button
        await user.tab();
        // FIX: The default selectedFilter is "All", so the button says "All My Projects"
        expect(screen.getByRole('button', { name: /All My Projects/i })).toHaveFocus();

        // 3. Tab -> NEW PROJECT Button
        await user.tab();
        expect(screen.getByRole('button', { name: /NEW PROJECT/i })).toHaveFocus();
    }, 15000);
});