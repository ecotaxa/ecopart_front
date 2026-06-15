import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';

vi.mock('../api/projects.api', () => ({
    getOneTask: vi.fn(),
    getTaskLog: vi.fn(),
    deleteProjectTask: vi.fn(),
}));

import { getOneTask, getTaskLog, deleteProjectTask, Task } from '../api/projects.api';
import TaskDetailsPage from './TaskDetailsPage';
import { renderWithRouter } from '@/test/utils';

const mockedGetOneTask = vi.mocked(getOneTask);
const mockedGetTaskLog = vi.mocked(getTaskLog);
const mockedDeleteProjectTask = vi.mocked(deleteProjectTask);

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    task_id: 42,
    task_type_id: 1,
    task_type: 'IMPORT',
    task_status_id: 3,
    task_status: 'DONE', // non-processing by default => no polling
    task_owner_id: 1,
    task_owner: 'John Doe',
    task_project_id: 77,
    task_creation_date: '2026-01-01T00:00:00.000Z',
    task_progress_pct: 100,
    task_progress_msg: 'Completed',
    task_params: { foo: 'bar' },
    ...overrides,
});

const renderDetail = (route = '/projects/77/tasks/42') =>
    renderWithRouter(
        <Routes>
            <Route path="/projects/:id/tasks/:taskId" element={<TaskDetailsPage />} />
            <Route path="/projects/:id/tasks" element={<h1>Tasks List Page</h1>} />
        </Routes>,
        { route },
    );

describe('TaskDetailsPage (Functional)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedGetOneTask.mockResolvedValue(makeTask());
        mockedGetTaskLog.mockResolvedValue('streaming log output');
        mockedDeleteProjectTask.mockResolvedValue({ message: 'deleted' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    // TC-S1: Malformed Route
    it('TC-S1: renders a malformed-route alert for non-numeric ids', () => {
        renderDetail('/projects/abc/tasks/xyz');

        expect(screen.getByText('Malformed route identifiers.')).toBeInTheDocument();
        expect(mockedGetOneTask).not.toHaveBeenCalled();
    });

    // TC-S2: Initial Render (General tab)
    it('TC-S2: renders the header and pre-filled task fields', async () => {
        renderDetail();

        expect(await screen.findByText('IMPORT task [42]')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /GENERAL/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByDisplayValue('42')).toBeInTheDocument(); // ID field
        expect(screen.getByDisplayValue('DONE')).toBeInTheDocument(); // Status field
        expect(screen.getByDisplayValue('IMPORT')).toBeInTheDocument(); // Type field
        expect(screen.getByDisplayValue('77')).toBeInTheDocument(); // Project ID field
    });

    // TC-S3: Tab Switch Loads Log
    it('TC-S3: fetches and renders the log when switching to the LOG FILE tab', async () => {
        const user = userEvent.setup();
        renderDetail();
        await screen.findByText('IMPORT task [42]');

        expect(mockedGetTaskLog).not.toHaveBeenCalled();

        await user.click(screen.getByRole('tab', { name: /LOG FILE/i }));

        await waitFor(() => expect(mockedGetTaskLog).toHaveBeenCalledWith(42));
        expect(await screen.findByText('streaming log output')).toBeInTheDocument();
    });

    // TC-S4: Empty Log Fallback
    it('TC-S4: shows the empty-log fallback when no log content is returned', async () => {
        const user = userEvent.setup();
        mockedGetTaskLog.mockResolvedValue('');
        renderDetail();
        await screen.findByText('IMPORT task [42]');

        await user.click(screen.getByRole('tab', { name: /LOG FILE/i }));

        expect(
            await screen.findByText('No log messages captured yet by the kernel stream handler.'),
        ).toBeInTheDocument();
    });

    // TC-S5: Delete Success + Navigation
    it('TC-S5: deletes the task and navigates back to the tasks list', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderDetail();
        await screen.findByText('IMPORT task [42]');

        await user.click(screen.getByRole('button', { name: /^DELETE$/i }));

        await waitFor(() => expect(mockedDeleteProjectTask).toHaveBeenCalledWith(42));
        expect(await screen.findByRole('heading', { name: 'Tasks List Page' })).toBeInTheDocument();
    });

    // TC-S6: Delete Error keeps the user on the page
    it('TC-S6: stays on the detail page and re-enables DELETE when deletion fails', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockedDeleteProjectTask.mockRejectedValueOnce(new Error('boom'));
        renderDetail();
        await screen.findByText('IMPORT task [42]');

        await user.click(screen.getByRole('button', { name: /^DELETE$/i }));

        await waitFor(() => expect(mockedDeleteProjectTask).toHaveBeenCalledWith(42));
        // No navigation happened; header still present and the button is usable again.
        expect(screen.getByText('IMPORT task [42]')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole('button', { name: /^DELETE$/i })).toBeEnabled());
    });

    // TC-S7: Load Error
    it('TC-S7: shows a sync-error alert when the initial load fails', async () => {
        mockedGetOneTask.mockRejectedValueOnce(new Error('down'));
        renderDetail();

        expect(
            await screen.findByText('Failed to synchronize task metrics from server.'),
        ).toBeInTheDocument();
    });

    // TC-S8: Adaptive Polling while RUNNING (fake timers — no real wall-clock wait)
    it('TC-S8: keeps polling getOneTask while the task is RUNNING', async () => {
        vi.useFakeTimers();
        mockedGetOneTask.mockResolvedValue(makeTask({ task_status: 'RUNNING', task_progress_pct: 40 }));
        renderDetail();

        // Settle the initial async hydration so the polling interval is armed.
        await act(async () => { await vi.advanceTimersByTimeAsync(0); });
        expect(mockedGetOneTask).toHaveBeenCalledTimes(1);

        // Advance one 2500ms interval and flush the poll's promise.
        await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
        expect(mockedGetOneTask).toHaveBeenCalledTimes(2);
    });

    // TC-S8b: No polling once the task is DONE
    it('TC-S8b: does not poll again when the task is already DONE', async () => {
        vi.useFakeTimers();
        renderDetail(); // default task is DONE

        await act(async () => { await vi.advanceTimersByTimeAsync(0); });
        expect(mockedGetOneTask).toHaveBeenCalledTimes(1);

        // Even after several intervals, a non-processing task is never re-polled.
        await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
        expect(mockedGetOneTask).toHaveBeenCalledTimes(1);
    });
});
