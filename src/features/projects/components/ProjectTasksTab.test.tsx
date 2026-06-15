import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';

vi.mock('../api/projects.api', () => ({
    searchProjectTasks: vi.fn(),
    deleteProjectTask: vi.fn(),
}));

import { searchProjectTasks, deleteProjectTask, Task, TaskSearchResponse } from '../api/projects.api';
import { ProjectTasksTab } from './ProjectTasksTab';
import { renderWithRouter } from '@/test/utils';

const mockedSearchProjectTasks = vi.mocked(searchProjectTasks);
const mockedDeleteProjectTask = vi.mocked(deleteProjectTask);

const PROJECT_ID = 77;

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    task_id: 1,
    task_type_id: 1,
    task_type: 'IMPORT',
    task_status_id: 1,
    task_status: 'RUNNING',
    task_owner_id: 1,
    task_owner: 'John Doe',
    task_project_id: PROJECT_ID,
    task_creation_date: '2026-01-01T00:00:00.000Z',
    task_progress_pct: 50,
    ...overrides,
});

const makeResponse = (tasks: Task[], total = tasks.length): TaskSearchResponse => ({
    search_info: { total, page: 1, limit: 10 },
    tasks,
});

const renderTab = () =>
    renderWithRouter(
        <Routes>
            <Route path="/" element={<ProjectTasksTab projectId={PROJECT_ID} />} />
            <Route path="/projects/:id/tasks/:taskId" element={<h1>Task Details Page</h1>} />
        </Routes>,
    );

describe('ProjectTasksTab (Functional)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSearchProjectTasks.mockResolvedValue(makeResponse([makeTask({ task_id: 1 }), makeTask({ task_id: 2 })], 2));
        mockedDeleteProjectTask.mockResolvedValue({ message: 'deleted' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // TC-T1: Project-Scoped Fetch
    it('TC-T1: fetches tasks scoped to the project', async () => {
        renderTab();

        await waitFor(() => expect(mockedSearchProjectTasks).toHaveBeenCalled());
        expect(mockedSearchProjectTasks.mock.calls[0][0]).toMatchObject({
            projectId: PROJECT_ID,
            sort_by: 'desc(task_id)',
        });
        expect(await screen.findAllByText('IMPORT')).not.toHaveLength(0);
    });

    // TC-T2: Search Attribute Options differ from the global page
    it('TC-T2: exposes Label / Owner / Message search attributes', async () => {
        const user = userEvent.setup();
        renderTab();
        await screen.findAllByText('IMPORT');

        await user.click(screen.getByRole('combobox', { name: 'Attribute' }));

        expect(await screen.findByRole('option', { name: 'Label' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Owner' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Message' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Status' })).not.toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Task id' })).not.toBeInTheDocument();
    });

    // TC-T3: Search builds a LIKE filter on the selected attribute
    it('TC-T3: sends a LIKE filter on task_type when searching', async () => {
        const user = userEvent.setup();
        renderTab();
        await screen.findAllByText('IMPORT');

        await user.type(screen.getByLabelText('Search'), 'backup');

        await waitFor(
            () => {
                expect(mockedSearchProjectTasks.mock.calls.at(-1)?.[0].filters).toEqual([
                    { field: 'task_type', operator: 'LIKE', value: '%backup%' },
                ]);
            },
            { timeout: 2000 },
        );
    });

    // TC-T4: Row Action Navigation (project-relative)
    it('TC-T4: navigates to the task detail route for this project', async () => {
        const user = userEvent.setup();
        mockedSearchProjectTasks.mockResolvedValue(makeResponse([makeTask({ task_id: 3 })], 1));
        renderTab();

        const icon = await screen.findByTestId('OpenInNewIcon');
        await user.click(icon.closest('button') as HTMLButtonElement);

        expect(await screen.findByRole('heading', { name: 'Task Details Page' })).toBeInTheDocument();
    });

    // TC-T5: Delete Flow
    it('TC-T5: deletes the selected tasks after confirmation', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderTab();
        await screen.findAllByText('IMPORT');

        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[1]);
        await user.click(checkboxes[2]);
        expect(await screen.findByText('2 items selected')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /DELETE/i }));

        await waitFor(() => {
            expect(mockedDeleteProjectTask).toHaveBeenCalledWith(1);
            expect(mockedDeleteProjectTask).toHaveBeenCalledWith(2);
        });
        expect(await screen.findByText('Selected tasks removed successfully.')).toBeInTheDocument();
        expect(screen.getByText('0 items selected')).toBeInTheDocument();
    });

    // TC-T6: Status Icons Mapping
    it('TC-T6: maps task statuses to the correct icons', async () => {
        mockedSearchProjectTasks.mockResolvedValue(makeResponse([
            makeTask({ task_id: 1, task_status: 'DONE' }),
            makeTask({ task_id: 2, task_status: 'ERROR' }),
            makeTask({ task_id: 3, task_status: 'RUNNING' }),
        ], 3));

        renderTab();

        expect(await screen.findByText('DONE')).toBeInTheDocument();
        expect(screen.getByTestId('CheckIcon')).toBeInTheDocument();
        expect(screen.getByTestId('PriorityHighIcon')).toBeInTheDocument();
        expect(screen.getByTestId('MoreHorizIcon')).toBeInTheDocument();
    });
});
