import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, useLocation } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import AdminTasksTab from './AdminTasksTab';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import type { Task } from '@/features/projects/api/projects.api';

// ---------------------------------------------------------------------------
// Helpers — the admin TASKS tab reuses useTasksTable, so it hits the same
// POST /tasks/searches + DELETE /tasks/:id endpoints as the global Tasks page.
// ---------------------------------------------------------------------------
type SearchCall = { page: string | null; limit: string | null; filters: unknown };

let searchCalls: SearchCall[] = [];
let deleteCalls: number[] = [];

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    task_id: 1,
    task_type_id: 1,
    task_type: 'IMPORT',
    task_status_id: 1,
    task_status: 'RUNNING',
    task_owner_id: 1,
    task_owner: 'John Doe',
    task_project_id: 7,
    task_creation_utc_date_time: '2026-01-01T00:00:00.000Z',
    task_progress_pct: 50,
    task_progress_msg: 'Working',
    ...overrides,
});

const mockTasksSearch = (tasks: Task[], total = tasks.length) => {
    server.use(
        http.post('*/tasks/searches', async ({ request }) => {
            const url = new URL(request.url);
            const filters = await request.json();
            searchCalls.push({
                page: url.searchParams.get('page'),
                limit: url.searchParams.get('limit'),
                filters,
            });
            return HttpResponse.json({ search_info: { total, page: 1, limit: 10 }, tasks });
        }),
    );
};

const mockTaskDelete = () => {
    server.use(
        http.delete('*/tasks/:taskId/', ({ params }) => {
            deleteCalls.push(Number(params.taskId));
            return HttpResponse.json({ message: 'deleted' });
        }),
    );
};

/** Reflects the current location's pathname + state so navigation can be asserted. */
const LocationProbe = () => {
    const location = useLocation();
    return (
        <div>
            <h1>Task Details Page</h1>
            <span data-testid="loc-state-from">{(location.state as { from?: string })?.from ?? ''}</span>
        </div>
    );
};

const renderAdminTasksTab = (route = '/admin/tasks') =>
    renderWithRouter(
        <Routes>
            <Route path="/admin/tasks" element={<AdminTasksTab />} />
            <Route path="/projects/:id/tasks/:taskId" element={<LocationProbe />} />
        </Routes>,
        { route },
    );

describe('AdminTasksTab', () => {
    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();
        searchCalls = [];
        deleteCalls = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('TC-AE1: renders the headers and the loaded tasks', async () => {
        mockTasksSearch([
            makeTask({ task_id: 1, task_type: 'IMPORT' }),
            makeTask({ task_id: 2, task_type: 'BACKUP' }),
        ], 2);

        renderAdminTasksTab();

        expect(screen.getByRole('heading', { name: 'Task list' })).toBeInTheDocument();
        expect(screen.getByText('Additional description if required')).toBeInTheDocument();

        expect(await screen.findByText('IMPORT')).toBeInTheDocument();
        expect(await screen.findByText('BACKUP')).toBeInTheDocument();
        await waitFor(() => expect(searchCalls.length).toBeGreaterThan(0));
    });

    it('TC-AE2: shows the no-rows overlay when there are no tasks', async () => {
        mockTasksSearch([], 0);

        renderAdminTasksTab();

        expect(await screen.findByText(/No rows/i)).toBeInTheDocument();
    });

    it('TC-AE3: requests the next (1-indexed) page on pagination change', async () => {
        const user = userEvent.setup();
        mockTasksSearch([makeTask({ task_id: 1 })], 45);

        renderAdminTasksTab();

        await screen.findByText('IMPORT');
        await waitFor(() => expect(searchCalls[searchCalls.length - 1]?.page).toBe('1'));

        await user.click(screen.getByRole('button', { name: /Go to next page/i }));

        await waitFor(() => {
            const last = searchCalls[searchCalls.length - 1];
            expect(last?.page).toBe('2');
            expect(last?.limit).toBe('10');
        });
    });

    it('TC-AE4: sends a LIKE filter on task_status after typing', async () => {
        const user = userEvent.setup();
        mockTasksSearch([makeTask({ task_id: 1 })], 1);

        renderAdminTasksTab();
        await screen.findByText('IMPORT');

        await user.type(screen.getByLabelText('Search'), 'error');

        await waitFor(
            () => {
                expect(searchCalls[searchCalls.length - 1]?.filters).toEqual([
                    { field: 'task_status', operator: 'LIKE', value: '%error%' },
                ]);
            },
            { timeout: 2000 },
        );
    });

    it('TC-AE5: sends an exact-match filter when searching by Task id', async () => {
        const user = userEvent.setup();
        mockTasksSearch([makeTask({ task_id: 1 })], 1);

        renderAdminTasksTab();
        await screen.findByText('IMPORT');

        await user.click(screen.getByRole('combobox', { name: 'Attribute' }));
        await user.click(await screen.findByRole('option', { name: 'Task id' }));

        await user.type(screen.getByLabelText('Search'), '42');

        await waitFor(
            () => {
                expect(searchCalls[searchCalls.length - 1]?.filters).toEqual([
                    { field: 'task_id', operator: '=', value: 42 },
                ]);
            },
            { timeout: 2000 },
        );
    });

    it('TC-AE6: opens the task detail route with a from=/admin/tasks state on row click', async () => {
        const user = userEvent.setup();
        mockTasksSearch([
            makeTask({ task_id: 3, task_project_id: 7 }),
            makeTask({ task_id: 4, task_project_id: null }),
        ], 2);

        renderAdminTasksTab();

        // Orphan task (no project): clicking the row does not navigate.
        await user.click(await screen.findByText('4'));
        expect(screen.queryByRole('heading', { name: 'Task Details Page' })).not.toBeInTheDocument();

        // Valid task: navigates and passes the admin origin so "Back" returns here.
        await user.click(screen.getByText('3'));
        expect(await screen.findByRole('heading', { name: 'Task Details Page' })).toBeInTheDocument();
        expect(screen.getByTestId('loc-state-from')).toHaveTextContent('/admin/tasks');
    });

    it('TC-AE7: deletes the selected tasks after confirmation', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockTasksSearch([
            makeTask({ task_id: 1, task_type: 'IMPORT' }),
            makeTask({ task_id: 2, task_type: 'BACKUP' }),
        ], 2);
        mockTaskDelete();

        renderAdminTasksTab();
        await screen.findByText('IMPORT');

        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[1]);
        await user.click(checkboxes[2]);

        expect(await screen.findByText('2 items selected')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /DELETE/i }));

        await waitFor(() => expect(deleteCalls.sort()).toEqual([1, 2]));
        expect(await screen.findByText('Selected tasks removed successfully.')).toBeInTheDocument();
        expect(screen.getByText('0 items selected')).toBeInTheDocument();
    });

    it('TC-AE8: renders the reserved USERS and PROJECTS bulk actions as disabled', async () => {
        mockTasksSearch([makeTask({ task_id: 1 })], 1);

        renderAdminTasksTab();
        await screen.findByText('IMPORT');

        expect(screen.getByRole('button', { name: 'USERS' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'PROJECTS' })).toBeDisabled();
    });

    it('TC-AE9: displays an error alert when the search fails', async () => {
        server.use(
            http.post('*/tasks/searches', () => new HttpResponse(null, { status: 500 })),
        );

        renderAdminTasksTab();

        expect(await screen.findByText(/Failed to load tasks/i)).toBeInTheDocument();
        expect(screen.queryByText('IMPORT')).not.toBeInTheDocument();
    });
});
