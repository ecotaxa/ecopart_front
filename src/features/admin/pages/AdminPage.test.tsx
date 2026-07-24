import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import AdminPage from './AdminPage';
import { server } from '@/test/msw/server';

// ---------------------------------------------------------------------------
// AdminPage is a thin tabbed shell whose active panel is driven by the
// `:tabName` route param (linkable tabs, defaulting to QUICK ACCESS). Area AJ
// covers only that routing contract; the panels themselves are tested in AE–AI
// and AU. We stub every endpoint the mounted panels touch so the tab wiring is
// asserted without network noise.
// ---------------------------------------------------------------------------
const stubPanelEndpoints = () =>
    server.use(
        http.get('*/broadcast_messages', () => HttpResponse.text('')),
        http.get('*/auth/user/me', () => new HttpResponse(null, { status: 401 })),
        http.post('*/projects/searches', () =>
            HttpResponse.json({ projects: [], search_info: { total: 0, page: 1, limit: 10 } }),
        ),
        http.post('*/users/searches', () =>
            HttpResponse.json({ users: [], search_info: { total: 0, page: 1, limit: 10 } }),
        ),
        http.post('*/tasks/searches', () =>
            HttpResponse.json({ tasks: [], search_info: { total: 0, page: 1, limit: 10 } }),
        ),
    );

const renderAdmin = (route: string) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/:tabName" element={<AdminPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

const tab = (name: RegExp) => screen.getByRole('tab', { name });

describe('AdminPage (AJ)', () => {
    beforeEach(() => stubPanelEndpoints());

    it('TC-AJ1: defaults to the QUICK ACCESS tab when no tab slug is given', () => {
        renderAdmin('/admin');

        expect(screen.getByRole('heading', { name: 'EcoPart administration' })).toBeInTheDocument();
        expect(tab(/QUICK ACCESS/i)).toHaveAttribute('aria-selected', 'true');
    });

    it('TC-AJ2: selects the tab named by the :tabName slug', () => {
        renderAdmin('/admin/users');

        expect(tab(/USERS/i)).toHaveAttribute('aria-selected', 'true');
        expect(tab(/QUICK ACCESS/i)).toHaveAttribute('aria-selected', 'false');
    });

    it('TC-AJ3: falls back to QUICK ACCESS for an unknown slug', () => {
        renderAdmin('/admin/does-not-exist');

        expect(tab(/QUICK ACCESS/i)).toHaveAttribute('aria-selected', 'true');
    });

    it('TC-AJ4: clicking a tab navigates and reselects via the route param', async () => {
        const user = userEvent.setup();
        renderAdmin('/admin');

        await user.click(tab(/PROJECTS/i));

        // Navigation updates the route param, which re-drives the selected tab.
        await waitFor(() => expect(tab(/PROJECTS/i)).toHaveAttribute('aria-selected', 'true'));
        expect(tab(/QUICK ACCESS/i)).toHaveAttribute('aria-selected', 'false');
    });
});
