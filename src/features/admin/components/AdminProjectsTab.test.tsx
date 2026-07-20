import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import AdminProjectsTab from './AdminProjectsTab';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import type { Project } from '@/features/projects/api/projects.api';

// ---------------------------------------------------------------------------
// Helpers — the admin PROJECTS tab hits POST /projects/searches (list),
// POST /projects/:id/samples/searches (per-row sample count enrichment) and
// DELETE /projects/:id/ (bulk delete).
// ---------------------------------------------------------------------------
type SearchCall = { page: string | null; limit: string | null; sort_by: string | null; filters: unknown };

let searchCalls: SearchCall[] = [];
let deletedIds: number[] = [];

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    project_id: 1,
    project_title: 'uvp5_sn201_exports02_filtered',
    project_acronym: 'UVP5',
    instrument_model: 'UVP5',
    ecotaxa_project_name: 'BATS2020-21 UVP5 (EU)',
    root_folder_path: 'plankton/uvp5_missions',
    managers: [{ user_id: 10, user_name: 'Marc Picheral' }],
    members: [{ user_id: 20, user_name: 'Julie Coustenoble' }],
    ...overrides,
});

const mockProjectsSearch = (projects: Project[], total = projects.length) => {
    server.use(
        http.post('*/projects/searches', async ({ request }) => {
            const url = new URL(request.url);
            const filters = await request.json();
            searchCalls.push({
                page: url.searchParams.get('page'),
                limit: url.searchParams.get('limit'),
                sort_by: url.searchParams.get('sort_by'),
                filters,
            });
            return HttpResponse.json({ search_info: { total, page: 1, limit: 10 }, projects });
        }),
    );
};

// The rows are enriched with a sample count via one samples search per row.
const mockSampleCounts = (total = 0) => {
    server.use(
        http.post('*/projects/:projectId/samples/searches', () =>
            HttpResponse.json({ search_info: { total, page: 1, limit: 1 }, samples: [] }),
        ),
    );
};

const mockProjectDelete = () => {
    server.use(
        http.delete('*/projects/:projectId/', ({ params }) => {
            deletedIds.push(Number(params.projectId));
            return HttpResponse.json({ message: 'deleted' });
        }),
    );
};

const renderProjectsTab = () => renderWithRouter(<AdminProjectsTab />, { route: '/admin/projects' });

describe('AdminProjectsTab', () => {
    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();
        searchCalls = [];
        deletedIds = [];
        mockSampleCounts(0);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('TC-AG1: renders the headers and the loaded projects (managers & members)', async () => {
        mockProjectsSearch([
            makeProject({ project_id: 473 }),
            makeProject({
                project_id: 411,
                project_title: 'uvp5_sn209_bval57',
                managers: [{ user_id: 10, user_name: 'Marc Picheral' }],
                members: [],
            }),
        ], 2);

        renderProjectsTab();

        expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Project list' })).toBeInTheDocument();
        expect(screen.getByText('All projects with advanced filters')).toBeInTheDocument();

        expect(await screen.findByText('uvp5_sn209_bval57')).toBeInTheDocument();
        expect(screen.getAllByText('Marc Picheral').length).toBeGreaterThan(0);
        expect(screen.getByText('Julie Coustenoble')).toBeInTheDocument();
        // Default sort is desc(project_id) and the admin scope omits for_managing.
        await waitFor(() => {
            const last = searchCalls[searchCalls.length - 1];
            expect(last?.sort_by).toBe('desc(project_id)');
            expect(last?.filters).toEqual([]);
        });
    });

    it('TC-AG2: renders a "Not linked" chip when there is no EcoTaxa project', async () => {
        mockProjectsSearch([makeProject({ project_id: 5, ecotaxa_project_name: null })], 1);

        renderProjectsTab();

        expect(await screen.findByText('Not linked')).toBeInTheDocument();
    });

    it('TC-AG3: shows the no-rows overlay when there are no projects', async () => {
        mockProjectsSearch([], 0);

        renderProjectsTab();

        expect(await screen.findByText(/No rows/i)).toBeInTheDocument();
    });

    it('TC-AG4: sends a LIKE filter on project_title after typing (Title is the default attribute)', async () => {
        const user = userEvent.setup();
        mockProjectsSearch([makeProject({ project_id: 1 })], 1);

        renderProjectsTab();
        await screen.findByText('uvp5_sn201_exports02_filtered');

        await user.type(screen.getByLabelText('Search'), 'bats');

        await waitFor(
            () => {
                expect(searchCalls[searchCalls.length - 1]?.filters).toEqual([
                    { field: 'project_title', operator: 'LIKE', value: '%bats%' },
                ]);
            },
            { timeout: 2000 },
        );
    });

    it('TC-AG5: sends an exact-match filter when searching by Project id', async () => {
        const user = userEvent.setup();
        mockProjectsSearch([makeProject({ project_id: 1 })], 1);

        renderProjectsTab();
        await screen.findByText('uvp5_sn201_exports02_filtered');

        await user.click(screen.getByRole('combobox', { name: 'Attribute' }));
        await user.click(await screen.findByRole('option', { name: 'Project id' }));

        await user.type(screen.getByLabelText('Search'), '473');

        await waitFor(
            () => {
                expect(searchCalls[searchCalls.length - 1]?.filters).toEqual([
                    { field: 'project_id', operator: '=', value: 473 },
                ]);
            },
            { timeout: 2000 },
        );
    });

    it('TC-AG6: sends an exact-match managers filter when searching by Manager (user id)', async () => {
        const user = userEvent.setup();
        mockProjectsSearch([makeProject({ project_id: 1 })], 1);

        renderProjectsTab();
        await screen.findByText('uvp5_sn201_exports02_filtered');

        await user.click(screen.getByRole('combobox', { name: 'Attribute' }));
        await user.click(await screen.findByRole('option', { name: 'Manager (user id)' }));

        await user.type(screen.getByLabelText('Search'), '10');

        await waitFor(
            () => {
                expect(searchCalls[searchCalls.length - 1]?.filters).toEqual([
                    { field: 'managers', operator: '=', value: 10 },
                ]);
            },
            { timeout: 2000 },
        );
    });

    it('TC-AG7: does not send a managers filter for non-numeric input', async () => {
        const user = userEvent.setup();
        mockProjectsSearch([makeProject({ project_id: 1 })], 1);

        renderProjectsTab();
        await screen.findByText('uvp5_sn201_exports02_filtered');

        await user.click(screen.getByRole('combobox', { name: 'Attribute' }));
        await user.click(await screen.findByRole('option', { name: 'Manager (user id)' }));

        await user.type(screen.getByLabelText('Search'), 'Marc');

        // Non-numeric manager input sends no filter (an empty filter list) rather
        // than a value the backend would reject.
        await waitFor(
            () => {
                expect(searchCalls[searchCalls.length - 1]?.filters).toEqual([]);
            },
            { timeout: 2000 },
        );
    });

    it('TC-AG8: deletes the selection after confirmation', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockProjectsSearch([
            makeProject({ project_id: 1 }),
            makeProject({ project_id: 2, project_title: 'second_project' }),
        ], 2);
        mockProjectDelete();

        renderProjectsTab();
        await screen.findByText('second_project');

        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[1]);
        await user.click(checkboxes[2]);

        expect(await screen.findByText('2 items selected')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'DELETE' }));

        await waitFor(() => expect(deletedIds.length).toBe(2));
        expect(deletedIds.sort()).toEqual([1, 2]);
        expect(await screen.findByText('Project(s) deleted.')).toBeInTheDocument();
        expect(screen.getByText('0 items selected')).toBeInTheDocument();
    });

    it('TC-AG9: does not call the API when the delete is not confirmed', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        mockProjectsSearch([makeProject({ project_id: 1 })], 1);
        mockProjectDelete();

        renderProjectsTab();
        await screen.findByText('uvp5_sn201_exports02_filtered');

        await user.click(screen.getAllByRole('checkbox')[1]);
        await user.click(screen.getByRole('button', { name: 'DELETE' }));

        await new Promise((r) => setTimeout(r, 100));
        expect(deletedIds).toHaveLength(0);
    });

    it('TC-AG10: disables DELETE while nothing is selected', async () => {
        mockProjectsSearch([makeProject({ project_id: 1 })], 1);

        renderProjectsTab();
        await screen.findByText('uvp5_sn201_exports02_filtered');

        expect(screen.getByRole('button', { name: 'DELETE' })).toBeDisabled();
    });

    it('TC-AG11: renders the not-yet-wired actions as disabled', async () => {
        mockProjectsSearch([makeProject({ project_id: 1 })], 1);

        renderProjectsTab();
        await screen.findByText('uvp5_sn201_exports02_filtered');

        expect(screen.getByRole('button', { name: 'REMOVE ALL MANAGER' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'REMOVE ALL MEMBERS' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'TASKS' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'USERS' })).toBeDisabled();
    });

    it('TC-AG12: keeps only the failed projects selected when some deletions fail', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockProjectsSearch([
            makeProject({ project_id: 1 }),
            makeProject({ project_id: 2, project_title: 'second_project' }),
        ], 2);
        // project 2 fails, project 1 succeeds.
        server.use(
            http.delete('*/projects/:projectId/', ({ params }) => {
                const projectId = Number(params.projectId);
                if (projectId === 2) return new HttpResponse(null, { status: 500 });
                return HttpResponse.json({ message: 'deleted' });
            }),
        );

        renderProjectsTab();
        await screen.findByText('second_project');

        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[1]);
        await user.click(checkboxes[2]);
        await user.click(screen.getByRole('button', { name: 'DELETE' }));

        expect(await screen.findByText('Failed to delete some projects.')).toBeInTheDocument();
        expect(await screen.findByText('1 items selected')).toBeInTheDocument();
    });

    it('TC-AG13: displays an error alert when the search fails', async () => {
        server.use(
            http.post('*/projects/searches', () => new HttpResponse(null, { status: 500 })),
        );

        renderProjectsTab();

        expect(await screen.findByText(/Failed to load projects/i)).toBeInTheDocument();
    });
});
