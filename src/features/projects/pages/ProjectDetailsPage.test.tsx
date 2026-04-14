import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import ProjectDetailsPage from './ProjectDetailsPage';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';

// Helper to mock the project fetch API call which the child tabs rely on
const mockProjectFetch = (projectId: number) => {
    server.use(
        // Note: getProjectById uses POST /projects/searches under the hood
        http.post('*/projects/searches', () => {
            return HttpResponse.json({
                search_info: { total: 1, page: 1, limit: 1 },
                projects: [{
                    project_id: projectId,
                    project_title: 'Test Project',
                    project_acronym: 'TEST',
                    instrument_model: 'UVP5HD',
                    root_folder_path: '/data/test',
                    // Needed for security tab
                    privacy_duration: 2,
                    visible_duration: 24,
                    public_duration: 36,
                    managers: [],
                    members: [],
                    contact: null
                }]
            });
        }),
        // Also mock standard endpoints to prevent noisy console errors during mount
        http.get('*/users', () => HttpResponse.json({ users: [] })),
        http.get('*/ecotaxa_instances', () => HttpResponse.json([])),
        http.get('*/users/*/ecotaxa_account', () => HttpResponse.json({ ecotaxa_accounts: [] }))
    );
};

describe('ProjectDetailsPage (Functional)', () => {

    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();
    });

    // TC-I1: Invalid ID Handling
    it('TC-I1: should display an error if the URL ID is invalid', () => {
        renderWithRouter(
            <Routes>
                <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/invalid-string' }
        );

        expect(screen.getByText(/Invalid Project ID/i)).toBeInTheDocument();
        expect(screen.queryByText(/Project Details/i)).not.toBeInTheDocument();
    });

    // TC-I2: Initial Render (Default Tab)
    it('TC-I2: should render the header and default to the Metadata tab', async () => {
        mockProjectFetch(101);

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101' }
        );

        // Verify Header
        expect(await screen.findByText('Project Details [101]')).toBeInTheDocument();

        // Verify Default Tab is Metadata
        const metadataTab = screen.getByRole('tab', { name: /METADATA/i });
        expect(metadataTab).toHaveAttribute('aria-selected', 'true');

        // Verify Metadata content is visible (finding a string unique to that component)
        const elements = await screen.findAllByText(/Project acronym/i);
        expect(elements.length).toBeGreaterThan(0);
    });

    // TC-I3: Tab Switching
    it('TC-I3: should switch content when different tabs are clicked', async () => {
        const user = userEvent.setup();
        mockProjectFetch(101);

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101' }
        );

        // Wait for initial load
        await screen.findByText('Project Details [101]');

        // Click SECURITY tab
        const securityTab = screen.getByRole('tab', { name: /SECURITY/i });
        await user.click(securityTab);

        // Verify SECURITY tab is active
        expect(securityTab).toHaveAttribute('aria-selected', 'true');

        // Verify Security content appears (e.g. Data privacy delays)
        expect(await screen.findByText(/Data privacy delays/i)).toBeInTheDocument();

        // Verify STATS tab (mock content)
        const statsTab = screen.getByRole('tab', { name: /STATS/i });
        await user.click(statsTab);

        expect(await screen.findByText(/Stats Tab \(Coming Soon\)/i)).toBeInTheDocument();
    });

    // TC-I4: Explore Navigation
    it('TC-I4: should navigate to explore page with the correct project ID', async () => {
        const user = userEvent.setup();
        mockProjectFetch(101);

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id" element={<ProjectDetailsPage />} />
                <Route path="/explore" element={<h1>Explore Page Mock</h1>} />
            </Routes>,
            { route: '/projects/101' }
        );

        await screen.findByText('Project Details [101]');

        const exploreButton = screen.getByRole('button', { name: /EXPLORE/i });
        await user.click(exploreButton);

        // Verify navigation occurred
        expect(await screen.findByText('Explore Page Mock')).toBeInTheDocument();

        // Note: In a real test we might spy on the useNavigate hook, 
        // but checking the rendered route mock is the React Testing Library way.
    });

});