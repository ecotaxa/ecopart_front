import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import ProjectDetailsPage from '@/features/projects/pages/ProjectDetailsPage';
import { renderWithRouter } from '@/test/utils';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import { server } from '@/test/msw/server';

describe('ProjectDetailsPage (Accessibility)', () => {

    beforeEach(() => {
        loginAsUser();

        // Prevent API errors during render
        server.use(
            http.post('*/projects/searches', () => HttpResponse.json({ search_info: { total: 1, page: 1, limit: 1 }, projects: [{ project_id: 101 }] })),
            http.get('*/users', () => HttpResponse.json({ users: [] })),
            http.get('*/ecotaxa_instances', () => HttpResponse.json([])),
            http.get('*/users/*/ecotaxa_account', () => HttpResponse.json({ ecotaxa_accounts: [] }))
        );
    });

    // TC-I5: Keyboard Navigation (Tabs)
    it('TC-I5: should allow navigating the tabs via keyboard', async () => {
        const user = userEvent.setup({ delay: null });

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101' }
        );

        // Wait for page to load
        await screen.findByText('Project Details [101]');

        // 1. Focus the Explore button just before the tabs
        const exploreBtn = screen.getByRole('button', { name: /EXPLORE/i });
        exploreBtn.focus();
        expect(exploreBtn).toHaveFocus();

        // 2. Tab into the Tabs list. 
        // According to W3C ARIA standards, tabbing into a tablist focuses the *active* tab.
        await user.tab();
        const activeTab = screen.getByRole('tab', { name: /METADATA/i });
        expect(activeTab).toHaveFocus();

        // 3. Arrow Keys to navigate tabs.
        // MUI Tabs implement the standard W3C keyboard interaction model for tablists:
        // You use Left/Right arrows to move focus between tabs, NOT the Tab key.
        await user.keyboard('{ArrowRight}');
        const dataTab = screen.getByRole('tab', { name: /^DATA$/i });
        expect(dataTab).toHaveFocus();

        await user.keyboard('{ArrowRight}');
        const importTab = screen.getByRole('tab', { name: /^IMPORT$/i });
        expect(importTab).toHaveFocus();
    }, 15000);

});