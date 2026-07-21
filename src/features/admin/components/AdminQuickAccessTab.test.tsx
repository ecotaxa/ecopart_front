import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import AdminQuickAccessTab from './AdminQuickAccessTab';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';

// ---------------------------------------------------------------------------
// The QUICK ACCESS panel derives its four counters from `search_info.total` of:
//   POST /projects/searches           → Projects
//   POST /users/searches              → Users
//   POST /tasks/searches (task_type IN EXPORT_*) → Exports
//   POST /tasks/searches (no type filter)        → Tasks
// The two task searches are told apart by their filters.
// ---------------------------------------------------------------------------
type Filter = { field: string; operator: string; value: unknown };

let projectFilters: Filter[] = [];
let userFilters: Filter[] = [];
let exportFilters: Filter[] = [];
let taskFilters: Filter[] = [];

const hasExportTypeFilter = (filters: Filter[]) =>
    filters.some((f) => f.field === 'task_type' && f.operator === 'IN');

const mockCounters = ({
    projects = 340,
    users = 600,
    exports = 450,
    tasks = 367,
}: Partial<{ projects: number; users: number; exports: number; tasks: number }> = {}) => {
    server.use(
        http.post('*/projects/searches', async ({ request }) => {
            projectFilters = (await request.json()) as Filter[];
            return HttpResponse.json({ search_info: { total: projects, page: 1, limit: 1 }, projects: [] });
        }),
        http.post('*/users/searches', async ({ request }) => {
            userFilters = (await request.json()) as Filter[];
            return HttpResponse.json({ search_info: { total: users, page: 1, limit: 1 }, users: [] });
        }),
        http.post('*/tasks/searches', async ({ request }) => {
            const filters = (await request.json()) as Filter[];
            if (hasExportTypeFilter(filters)) {
                exportFilters = filters;
                return HttpResponse.json({ search_info: { total: exports, page: 1, limit: 1 }, tasks: [] });
            }
            taskFilters = filters;
            return HttpResponse.json({ search_info: { total: tasks, page: 1, limit: 1 }, tasks: [] });
        }),
    );
};

const renderQuickAccess = () =>
    renderWithRouter(<AdminQuickAccessTab />, { route: '/admin/quick-access' });

describe('AdminQuickAccessTab', () => {
    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();
        projectFilters = [];
        userFilters = [];
        exportFilters = [];
        taskFilters = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('TC-AH1: renders the four counters from search_info.total', async () => {
        mockCounters({ projects: 340, users: 600, exports: 450, tasks: 367 });

        renderQuickAccess();

        const quickAccessCard = screen
            .getByRole('heading', { name: 'Quick access' })
            .closest('.MuiPaper-root') as HTMLElement;

        expect(screen.getByRole('heading', { name: 'Quick access' })).toBeInTheDocument();
        expect(await screen.findByText('340')).toBeInTheDocument();
        expect(screen.getByText('600')).toBeInTheDocument();
        expect(screen.getByText('450')).toBeInTheDocument();
        expect(screen.getByText('367')).toBeInTheDocument();

        // Scoped to the counters card: the statistics dashboard below this tab
        // also renders "Projects"/"Users" text (chart legends, breakdown titles).
        expect(within(quickAccessCard).getByText('Projects')).toBeInTheDocument();
        expect(within(quickAccessCard).getByText('Users')).toBeInTheDocument();
        expect(within(quickAccessCard).getByText('Exports')).toBeInTheDocument();
        expect(within(quickAccessCard).getByText('Tasks')).toBeInTheDocument();
    });

    it('TC-AH2: counts exports with an IN filter on the export task types and no date filter by default', async () => {
        mockCounters();

        renderQuickAccess();
        await screen.findByText('450');

        // "All time" (the default) sends no creation-date filter.
        expect(projectFilters).toEqual([]);
        expect(userFilters).toEqual([]);
        expect(taskFilters).toEqual([]);
        expect(exportFilters).toEqual([
            { field: 'task_type', operator: 'IN', value: ['EXPORT', 'EXPORT_BACKUP', 'EXPORT_RAW'] },
        ]);
    });

    it('TC-AH3: scopes every counter to a LIKE date-prefix filter when a period is picked', async () => {
        const user = userEvent.setup();
        mockCounters();

        renderQuickAccess();
        await screen.findByText('340');

        await user.click(screen.getByRole('combobox', { name: 'Period' }));
        await user.click(await screen.findByRole('option', { name: 'This year' }));

        // "This year" matches a four-digit-year prefix (e.g. "2026%").
        const yearPrefix = expect.stringMatching(/^\d{4}%$/);

        await waitFor(() => {
            expect(projectFilters).toEqual([
                { field: 'project_creation_utc_date_time', operator: 'LIKE', value: yearPrefix },
            ]);
        });
        expect(userFilters).toEqual([
            { field: 'user_creation_utc_date_time', operator: 'LIKE', value: yearPrefix },
        ]);
        expect(taskFilters).toEqual([
            { field: 'task_creation_utc_date_time', operator: 'LIKE', value: yearPrefix },
        ]);
        // Exports keep the type filter AND gain the date-prefix filter.
        expect(exportFilters).toEqual([
            { field: 'task_type', operator: 'IN', value: ['EXPORT', 'EXPORT_BACKUP', 'EXPORT_RAW'] },
            { field: 'task_creation_utc_date_time', operator: 'LIKE', value: yearPrefix },
        ]);
    });

    it('TC-AH4: renders the admin shortcuts and the useful links', async () => {
        mockCounters();

        renderQuickAccess();
        await screen.findByText('340');

        expect(screen.getByRole('button', { name: /See all projects as administrator/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /See all tasks as administrator/i })).toBeInTheDocument();

        expect(screen.getByRole('link', { name: 'Github repository' })).toHaveAttribute(
            'href',
            'https://github.com/ecotaxa/ecopart_front',
        );
    });

    it('TC-AH5: shows "—" for a counter whose request fails, without an error banner', async () => {
        mockCounters({ projects: 340, users: 600, tasks: 367 });
        // Override only the export (typed) task search to fail; the plain task search
        // still succeeds because the export handler returns early on error.
        server.use(
            http.post('*/users/searches', () => new HttpResponse(null, { status: 500 })),
        );

        renderQuickAccess();

        expect(await screen.findByText('340')).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
        // A single failing counter must not raise the global error banner.
        expect(screen.queryByText(/Failed to load the administration statistics/i)).not.toBeInTheDocument();
    });

    it('TC-AH6: shows the error banner when every counter fails', async () => {
        server.use(
            http.post('*/projects/searches', () => new HttpResponse(null, { status: 500 })),
            http.post('*/users/searches', () => new HttpResponse(null, { status: 500 })),
            http.post('*/tasks/searches', () => new HttpResponse(null, { status: 500 })),
        );

        renderQuickAccess();

        expect(await screen.findByText(/Failed to load the administration statistics/i)).toBeInTheDocument();
    });
});
