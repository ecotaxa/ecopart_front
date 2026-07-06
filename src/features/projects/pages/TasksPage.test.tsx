import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

import TasksPage from './TasksPage';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import type { Task } from '../api/projects.api';

// ---------------------------------------------------------------------------
// Helpers — Tasks endpoints have no default MSW handler, so each test registers
// its own (mirrors the `mockProjectFetch` pattern in ProjectDetailsPage.test).
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

/** Register a default search handler that records calls and returns `tasks`. */
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

const renderTasksPage = (route = '/tasks') =>
    renderWithRouter(
        <Routes>
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/projects/:id/tasks/:taskId" element={<h1>Task Details Page</h1>} />
        </Routes>,
        { route },
    );

describe('TasksPage (Functional)', () => {
    beforeEach(() => {
        loginAsUser();
        vi.clearAllMocks();
        searchCalls = [];
        deleteCalls = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // TC-Q1: Initial Render & Data Loading
    it('TC-Q1: renders the headers and the loaded tasks', async () => {
        mockTasksSearch([
            makeTask({ task_id: 1, task_type: 'IMPORT' }),
            makeTask({ task_id: 2, task_type: 'BACKUP' }),
        ], 2);

        renderTasksPage();

        expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Your tasks' })).toBeInTheDocument();

        expect(await screen.findByText('IMPORT')).toBeInTheDocument();
        expect(await screen.findByText('BACKUP')).toBeInTheDocument();
        await waitFor(() => expect(searchCalls.length).toBeGreaterThan(0));
    });

    // TC-Q2: Empty State
    it('TC-Q2: shows the no-rows overlay when there are no tasks', async () => {
        mockTasksSearch([], 0);

        renderTasksPage();

        expect(await screen.findByText(/No rows/i)).toBeInTheDocument();
    });

    // TC-Q3: Server-Side Pagination
    it('TC-Q3: requests the next (1-indexed) page on pagination change', async () => {
        const user = userEvent.setup();
        mockTasksSearch([makeTask({ task_id: 1 })], 45);

        renderTasksPage();

        await screen.findByText('IMPORT');
        await waitFor(() => expect(searchCalls[searchCalls.length - 1]?.page).toBe('1'));

        await user.click(screen.getByRole('button', { name: /Go to next page/i }));

        await waitFor(() => {
            const last = searchCalls[searchCalls.length - 1];
            expect(last?.page).toBe('2');
            expect(last?.limit).toBe('10');
        });
    });

    // TC-Q4: Search by Status (debounced)
    it('TC-Q4: sends a LIKE filter on task_status after typing', async () => {
        const user = userEvent.setup();
        mockTasksSearch([makeTask({ task_id: 1 })], 1);

        renderTasksPage();
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

    // TC-Q5: Search by Task id (exact match)
    it('TC-Q5: sends an exact-match filter when searching by Task id', async () => {
        const user = userEvent.setup();
        mockTasksSearch([makeTask({ task_id: 1 })], 1);

        renderTasksPage();
        await screen.findByText('IMPORT');

        // Open the "Attribute" select and pick "Task id".
        // (Scoped by name because the DataGrid footer also renders a combobox.)
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

    // TC-Q6: Status Icons Mapping
    it('TC-Q6: maps task statuses to the correct icons', async () => {
        mockTasksSearch([
            makeTask({ task_id: 1, task_status: 'DONE' }),
            makeTask({ task_id: 2, task_status: 'ERROR' }),
            makeTask({ task_id: 3, task_status: 'RUNNING' }),
        ], 3);

        renderTasksPage();

        expect(await screen.findByText('DONE')).toBeInTheDocument();
        expect(screen.getByText('ERROR')).toBeInTheDocument();
        expect(screen.getByText('RUNNING')).toBeInTheDocument();

        expect(screen.getByTestId('CheckIcon')).toBeInTheDocument();
        expect(screen.getByTestId('PriorityHighIcon')).toBeInTheDocument();
        expect(screen.getByTestId('MoreHorizIcon')).toBeInTheDocument();
    });

    // TC-Q7: Owner Formatting
    it('TC-Q7: formats object owners and falls back to "System" for null', async () => {
        mockTasksSearch([
            makeTask({
                task_id: 1,
                task_owner: { first_name: 'John', last_name: 'Doe', email: 'john@doe.com' },
            }),
            makeTask({ task_id: 2, task_owner: null }),
        ], 2);

        renderTasksPage();

        expect(await screen.findByText('John Doe (john@doe.com)')).toBeInTheDocument();
        expect(screen.getByText('System')).toBeInTheDocument();
    });

    // TC-Q8: Row Navigation — the whole row is clickable; orphan tasks (no
    // project) stay put since there's no project-scoped route to open.
    it('TC-Q8: opens the task detail route on row click and ignores orphan tasks', async () => {
        const user = userEvent.setup();
        mockTasksSearch([
            makeTask({ task_id: 3, task_project_id: 7 }),
            makeTask({ task_id: 4, task_project_id: null }),
        ], 2);

        renderTasksPage();

        // Orphan task (no project): clicking the row does not navigate.
        await user.click(await screen.findByText('4'));
        expect(screen.queryByRole('heading', { name: 'Task Details Page' })).not.toBeInTheDocument();

        // Valid task: clicking the row opens its project-scoped detail route.
        await user.click(screen.getByText('3'));
        expect(await screen.findByRole('heading', { name: 'Task Details Page' })).toBeInTheDocument();
    });

    // TC-Q9: Delete Flow (with confirmation)
    it('TC-Q9: deletes the selected tasks after confirmation', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockTasksSearch([
            makeTask({ task_id: 1, task_type: 'IMPORT' }),
            makeTask({ task_id: 2, task_type: 'BACKUP' }),
        ], 2);
        mockTaskDelete();

        renderTasksPage();
        await screen.findByText('IMPORT');

        // checkboxes[0] is the header "select all"; the rest are per-row.
        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[1]);
        await user.click(checkboxes[2]);

        expect(await screen.findByText('2 items selected')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /DELETE/i }));

        await waitFor(() => expect(deleteCalls.sort()).toEqual([1, 2]));
        expect(await screen.findByText('Selected tasks removed successfully.')).toBeInTheDocument();
        expect(screen.getByText('0 items selected')).toBeInTheDocument();
    });

    // TC-Q10: API Error Handling
    it('TC-Q10: displays an error alert when the search fails', async () => {
        server.use(
            http.post('*/tasks/searches', () => new HttpResponse(null, { status: 500 })),
        );

        renderTasksPage();

        expect(await screen.findByText(/Failed to load tasks/i)).toBeInTheDocument();
        expect(screen.queryByText('IMPORT')).not.toBeInTheDocument();
    });

    // TC-Q11: navigation moved to the whole-row click, so the action cell no longer
    // renders an OpenInNew button (non-export tasks render an empty action cell).
    it('TC-Q11: no longer renders an OpenInNew navigation button in the action cell', async () => {
        mockTasksSearch([makeTask({ task_id: 1, task_type: 'IMPORT', task_project_id: 7 })], 1);

        renderTasksPage();

        await screen.findByText('IMPORT');

        expect(screen.queryByTestId('OpenInNewIcon')).not.toBeInTheDocument();
    });
});
