import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import ProjectDetailsPage from './ProjectDetailsPage';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsRole, loginAsUser } from '@/test/helpers/auth.helpers';
import { answerConfirmDialogs } from '@/test/helpers/confirm.helpers';
import { makeProjectFixture, type ProjectFixtureOptions } from '@/test/helpers/project.fixtures';
import type { ProjectRole } from '../utils/projectAccess';

/**
 * Log in with `role` on project 101 and mock its fetch (and the endpoints its
 * tabs call on mount). The role is a parameter: a test that edits or manages
 * the project runs as a manager, one that imports as a member.
 */
const mockProjectFetch = (role: ProjectRole = 'user', overrides: ProjectFixtureOptions = {}) => {
    const project = makeProjectFixture({ ...loginAsRole(role), ...overrides });
    server.use(
        // Note: getProjectById uses POST /projects/searches under the hood
        http.post('*/projects/searches', () => {
            return HttpResponse.json({
                search_info: { total: 1, page: 1, limit: 1 },
                projects: [project]
            });
        }),
        // Also mock standard endpoints to prevent noisy console errors during mount
        http.get('*/users', () => HttpResponse.json({ users: [] })),
        http.get('*/ecotaxa_instances', () => HttpResponse.json([])),
        http.get('*/users/*/ecotaxa_account', () => HttpResponse.json({ ecotaxa_accounts: [] })),
        http.get('*/projects/*/backup/last-date', () => HttpResponse.json({ last_backup_utc_date_time: null })),
        // Import tab hooks can be mounted and request these endpoints even when testing other tabs.
        http.get('*/projects/*/samples/can_be_imported', () => HttpResponse.json([])),
        http.get('*/projects/*/ecotaxa_samples/can_be_imported', () => HttpResponse.json([])),
        http.get('*/projects/*/ctd_samples/can_be_imported', () => HttpResponse.json([]))
    );
};

const renderPage = (route = '/projects/101', state?: Record<string, unknown>) => renderWithRouter(
    <Routes>
        <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
        <Route path="/projects" element={<h1>Projects List Mock</h1>} />
    </Routes>,
    { route, state }
);

const tabLabels = () => screen.getAllByRole('tab').map((tab) => tab.textContent);

describe('ProjectDetailsPage (Functional)', () => {

    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();
    });

    // TC-I1: Invalid ID Handling
    it('TC-I1: should display an error if the URL ID is invalid', () => {
        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/invalid-string' }
        );

        expect(screen.getByText(/Invalid Project ID/i)).toBeInTheDocument();
        expect(screen.queryByText(/Project Details/i)).not.toBeInTheDocument();
    });

    // TC-I2: Initial Render (Default Tab)
    it('TC-I2: should render the header and default to the Metadata tab', async () => {
        mockProjectFetch('user');

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101' }
        );

        // Verify Header
        expect(await screen.findByRole('heading', { name: 'Test Project' })).toBeInTheDocument();

        // Verify Default Tab is Metadata
        const metadataTab = screen.getByRole('tab', { name: /METADATA/i });
        expect(metadataTab).toHaveAttribute('aria-selected', 'true');

        // Verify Metadata content is visible
        expect(await screen.findByLabelText(/Project acronym/i)).toBeInTheDocument();
    }, 15000);

    // TC-I3: Tab Switching
    it('TC-I3: should switch content when different tabs are clicked', async () => {
        const user = userEvent.setup({ delay: null });
        mockProjectFetch('manager');

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101' }
        );

        // Wait for initial load
        await screen.findByRole('heading', { name: 'Test Project' });

        // Click SECURITY tab
        const securityTab = screen.getByRole('tab', { name: /SECURITY/i });
        await user.click(securityTab);

        // Verify SECURITY tab is active
        expect(securityTab).toHaveAttribute('aria-selected', 'true');

        // Verify Security content appears (e.g. Data privacy delays)
        expect(await screen.findByText(/Data privacy delays/i)).toBeInTheDocument();

        // Verify STATS tab (empty-state guidance)
        const statsTab = screen.getByRole('tab', { name: /STATS/i });
        await user.click(statsTab);

        expect(await screen.findByText(/Import data to get started\./i)).toBeInTheDocument();
        expect(screen.getByText(/is not linked to an EcoTaxa project/i)).toBeInTheDocument();
    }, 20000);

    // TC-I3c: Stats tab call-to-actions
    it('TC-I3c: should route to the Import tab and the EcoTaxa link anchor from the Stats actions', async () => {
        const user = userEvent.setup({ delay: null });
        mockProjectFetch('manager');

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101/stats' }
        );

        await screen.findByRole('heading', { name: 'Test Project' });

        await user.click(await screen.findByRole('button', { name: /IMPORT DATA/i }));
        expect(screen.getByRole('tab', { name: /IMPORT/i })).toHaveAttribute('aria-selected', 'true');

        // Back to STATS, then follow the EcoTaxa call-to-action
        await user.click(screen.getByRole('tab', { name: /STATS/i }));
        await user.click(await screen.findByRole('button', { name: /LINK PROJECT/i }));

        expect(screen.getByRole('tab', { name: /METADATA/i })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByLabelText(/Project acronym/i)).toBeInTheDocument();
    }, 20000);

    // TC-I3b: Deep-linked tab URL
    it('TC-I3b: should open the Backup tab when the URL includes the tab name', async () => {
        mockProjectFetch('member');

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101/backup' }
        );

        expect(await screen.findByRole('heading', { name: 'Test Project' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /BACKUP/i })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByRole('heading', { name: /Backup of the raw project/i })).toBeInTheDocument();
    }, 20000);

    // TC-I6: Initial Render From Navigation State
    it('TC-I6: should open the Import tab when activeTab is provided in navigation state', async () => {
        mockProjectFetch('member');

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101', state: { activeTab: 3 } }
        );

        expect(await screen.findByRole('heading', { name: 'Test Project' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /IMPORT/i })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByRole('heading', { name: /New UVP samples/i })).toBeInTheDocument();
    });

    // TC-I4: Explore Navigation
    it('TC-I4: should navigate to explore page with the correct project ID', async () => {
        const user = userEvent.setup();
        mockProjectFetch('user');

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
                <Route path="/explore" element={<h1>Explore Page Mock</h1>} />
            </Routes>,
            { route: '/projects/101' }
        );

        await screen.findByRole('heading', { name: 'Test Project' });

        const exploreButton = screen.getByRole('button', { name: /EXPLORE/i });
        await user.click(exploreButton);

        // Verify navigation occurred
        expect(await screen.findByText('Explore Page Mock')).toBeInTheDocument();

        // Note: In a real test we might spy on the useNavigate hook, 
        // but checking the rendered route mock is the React Testing Library way.
    });

    // TC-I7: Delete hidden for a non-manager
    it('TC-I7: should not offer DELETE when the user does not manage the project', async () => {
        mockProjectFetch('member');

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101' }
        );

        await screen.findByRole('heading', { name: 'Test Project' });

        expect(screen.queryByRole('button', { name: /^DELETE$/i })).not.toBeInTheDocument();
    }, 15000);

    // TC-I8: Delete then navigate back to the project list
    it('TC-I8: should delete the project and return to the project list', async () => {
        const user = userEvent.setup();
        const deletedIds: string[] = [];

        // Managed by the logged-in user, so DELETE is offered.
        mockProjectFetch('manager');
        server.use(
            http.delete('*/projects/:projectId/', ({ params }) => {
                deletedIds.push(String(params.projectId));
                return HttpResponse.json({ message: 'deleted' });
            })
        );
        const confirmSpy = answerConfirmDialogs(true);

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
                <Route path="/projects" element={<h1>Projects List Mock</h1>} />
            </Routes>,
            { route: '/projects/101' }
        );

        await screen.findByRole('heading', { name: 'Test Project' });

        await user.click(await screen.findByRole('button', { name: /^DELETE$/i }));

        expect(confirmSpy).toHaveBeenCalled();
        expect(await screen.findByText('Projects List Mock')).toBeInTheDocument();
        expect(deletedIds).toEqual(['101']);

        confirmSpy.mockRestore();
    }, 15000);

    // TC-I5: API Error Handling
    it('TC-I5: should show an error state when project details loading fails', async () => {
        server.use(
            http.post('*/users/searches*', () => {
                return HttpResponse.json({
                    search_info: { total: 0, page: 1, limit: 100 },
                    users: []
                });
            }),
            http.post('*/projects/searches', () => {
                return HttpResponse.json({ message: 'Project details unavailable' }, { status: 500 });
            })
        );

        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/:tabName?" element={<ProjectDetailsPage />} />
            </Routes>,
            { route: '/projects/101' }
        );

        // A page-level error replaces the header and the tabs: nothing half-loaded is shown.
        expect(await screen.findByText(/Failed to load project details\. \(Project details unavailable\)/i)).toBeInTheDocument();
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
        expect(screen.queryByText('Project Details')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /BACK TO PROJECTS/i })).toBeInTheDocument();
    });

    // TC-I9: the tabs follow the role on the project and its privacy status
    it.each([
        ['user', 'private', ['STATS', 'METADATA']],
        ['user', 'visible', ['STATS', 'METADATA', 'DATA']],
        ['user', 'open', ['STATS', 'METADATA', 'DATA']],
        ['member', 'private', ['STATS', 'METADATA', 'DATA', 'IMPORT', 'UPDATE', 'TASKS', 'BACKUP']],
        ['manager', 'private', ['STATS', 'METADATA', 'DATA', 'IMPORT', 'UPDATE', 'SECURITY', 'TASKS', 'BACKUP']],
        ['admin', 'private', ['STATS', 'METADATA', 'DATA', 'IMPORT', 'UPDATE', 'SECURITY', 'TASKS', 'BACKUP']],
    ] as const)('TC-I9: a %s on a %s project sees the tabs %j', async (role, privacy_status, expectedTabs) => {
        mockProjectFetch(role, { privacy_status });

        renderPage();

        await screen.findByRole('heading', { name: 'Test Project' });
        expect(tabLabels()).toEqual(expectedTabs);
        expect(screen.queryByRole('button', { name: /^DELETE$/i }) !== null).toBe(role === 'manager' || role === 'admin');
    }, 15000);

    // TC-I10: the privacy status computed by the backend is shown to everyone
    it.each([
        ['user', 'private', 'Private'],
        ['user', 'visible', 'Visible'],
        ['member', 'public', 'Public'],
        ['manager', 'open', 'Public+'],
    ] as const)('TC-I10: shows the privacy chip to a %s (%s -> %s)', async (role, privacy_status, label) => {
        mockProjectFetch(role, { privacy_status });

        renderPage();

        await screen.findByRole('heading', { name: 'Test Project' });
        expect(screen.getByText(label)).toBeInTheDocument();
    }, 15000);

    // TC-I11: a deep link to a tab the user may not open falls back to METADATA
    it.each([
        ['the URL', '/projects/101/security', undefined],
        ['the URL', '/projects/101/data', undefined],
        ['the navigation state (legacy index)', '/projects/101', { activeTab: 3 }],
        ['the navigation state (slug)', '/projects/101', { activeTab: 'backup' }],
    ] as const)('TC-I11: falls back to METADATA when %s targets a hidden tab', async (_source, route, state) => {
        mockProjectFetch('user', { privacy_status: 'private' });

        renderPage(route, state);

        await screen.findByRole('heading', { name: 'Test Project' });
        expect(screen.getByRole('tab', { name: /METADATA/i })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByLabelText(/Project acronym/i)).toBeInTheDocument();
    }, 15000);

    // TC-I12: a user on a private project is told why the data is hidden and whom to ask
    it('TC-I12: explains on the STATS tab that the data is hidden, without import or link actions', async () => {
        mockProjectFetch('user', { privacy_status: 'private' });

        renderPage('/projects/101/stats');

        expect(await screen.findByText(/Data hidden until the project becomes visible/i)).toBeInTheDocument();
        // The contact is the first manager of the fixture (another account).
        expect(screen.getByRole('link', { name: 'user2@test.com' })).toHaveAttribute('href', 'mailto:user2@test.com');
        expect(screen.queryByRole('button', { name: /IMPORT DATA/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /LINK PROJECT/i })).not.toBeInTheDocument();
    }, 15000);

    // TC-I13: a member imports but does not manage: IMPORT DATA yes, LINK PROJECT no, metadata read-only
    it('TC-I13: gives a member the import action but a read-only metadata tab', async () => {
        const user = userEvent.setup({ delay: null });
        mockProjectFetch('member');

        renderPage('/projects/101/stats');

        expect(await screen.findByRole('button', { name: /IMPORT DATA/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /LINK PROJECT/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/Data hidden until/i)).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: /METADATA/i }));
        expect(await screen.findByLabelText(/Project acronym/i)).toHaveAttribute('readonly');
        expect(screen.queryByRole('button', { name: /^SAVE$/i })).not.toBeInTheDocument();
    }, 15000);

    // TC-I14: an unknown project id is a "not found" page, not an empty project
    it('TC-I14: shows a not-found state when the project does not exist', async () => {
        server.use(
            http.post('*/projects/searches', () => HttpResponse.json({ search_info: { total: 0, page: 1, limit: 1 }, projects: [] })),
        );

        renderPage();

        expect(await screen.findByText('Project not found')).toBeInTheDocument();
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    // TC-I15: a refusal from the backend (401 after the refresh retry, or 403) is a "no access" page
    it.each([401, 403])('TC-I15: shows a no-access state when the project fetch answers %i', async (status) => {
        server.use(
            http.post('*/projects/searches', () => HttpResponse.json({ errors: ['Logged user cannot get this project'] }, { status })),
        );

        renderPage();

        expect(await screen.findByText('No access to this project')).toBeInTheDocument();
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

});