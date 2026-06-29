import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/projects.api', () => ({
    searchProjectTasks: vi.fn(),
    deleteProjectTask: vi.fn(),
}));

import { searchProjectTasks, deleteProjectTask, Task, TaskSearchResponse } from '../api/projects.api';
import { useProjectTasksTab } from './useProjectTasksTab';

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
    task_creation_utc_date_time: '2026-01-01T00:00:00.000Z',
    task_progress_pct: 50,
    ...overrides,
});

const makeResponse = (tasks: Task[], total = tasks.length): TaskSearchResponse => ({
    search_info: { total, page: 1, limit: 10 },
    tasks,
});

describe('useProjectTasksTab Hook (Unit)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSearchProjectTasks.mockResolvedValue(makeResponse([makeTask({ task_id: 1 }), makeTask({ task_id: 2 })], 2));
        mockedDeleteProjectTask.mockResolvedValue({ message: 'deleted' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // TC-U1: Initial Fetch with projectId
    it('TC-U1: fetches project-scoped tasks and exposes pagination info', async () => {
        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.tasks).toHaveLength(2);
        expect(result.current.totalRows).toBe(2);

        const callArg = mockedSearchProjectTasks.mock.calls[0][0];
        expect(callArg).toMatchObject({ projectId: PROJECT_ID, sort_by: 'desc(task_id)', page: 1, limit: 10, filters: [] });
    });

    // TC-U2: Default State
    it('TC-U2: defaults to the task_type attribute with an empty selection', async () => {
        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.searchAttribute).toBe('task_type');
        expect(result.current.selectedTasks).toEqual({ type: 'include', ids: new Set() });
        expect(result.current.selectionCount).toBe(0);
        expect(result.current.paginationModel).toEqual({ page: 0, pageSize: 10 });
    });

    // TC-U3: Debounced LIKE filter on the selected attribute
    it('TC-U3: builds a LIKE filter on the selected attribute after debounce', async () => {
        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setSearchText('IMPORT');
        });

        await waitFor(() => {
            const lastCall =
                mockedSearchProjectTasks.mock.calls[
                    mockedSearchProjectTasks.mock.calls.length - 1
                ]?.[0];
            expect(lastCall?.filters).toEqual([
                { field: 'task_type', operator: 'LIKE', value: '%IMPORT%' },
            ]);
        });

        expect(result.current.paginationModel.page).toBe(0);
    });

    // TC-U3b: task_id Exact Match & Numeric Guard
    it('TC-U3b: uses an exact-match task_id filter and ignores non-numeric input', async () => {
        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setSearchAttribute('task_id');
            result.current.setSearchText('42');
        });

        await waitFor(() => {
            const lastCall =
                mockedSearchProjectTasks.mock.calls[
                    mockedSearchProjectTasks.mock.calls.length - 1
                ]?.[0];
            expect(lastCall?.filters).toEqual([
                { field: 'task_id', operator: '=', value: 42 },
            ]);
        });

        // Non-numeric input must not produce a task_id filter.
        act(() => {
            result.current.setSearchText('abc');
        });

        await waitFor(() => {
            const lastCall =
                mockedSearchProjectTasks.mock.calls[
                    mockedSearchProjectTasks.mock.calls.length - 1
                ]?.[0];
            expect(lastCall?.filters).toEqual([]);
        });
    });

    // TC-U4: Pagination 1-indexed to backend
    it('TC-U4: sends page+1 and pageSize to the backend', async () => {
        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setPaginationModel({ page: 2, pageSize: 5 });
        });

        await waitFor(() => {
            const lastCall =
                mockedSearchProjectTasks.mock.calls[
                    mockedSearchProjectTasks.mock.calls.length - 1
                ]?.[0];
            expect(lastCall).toMatchObject({ page: 3, limit: 5, projectId: PROJECT_ID });
        });
    });

    // TC-U5: Delete Success (batch + cleanup)
    it('TC-U5: deletes each selected task, resets selection and refetches', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setSelectedTasks({ type: 'include', ids: new Set([1, 2]) });
        });
        await waitFor(() => expect(result.current.selectionCount).toBe(2));

        const callsBefore = mockedSearchProjectTasks.mock.calls.length;

        await act(async () => {
            await result.current.handleDeleteTasks();
        });

        expect(mockedDeleteProjectTask).toHaveBeenCalledWith(1);
        expect(mockedDeleteProjectTask).toHaveBeenCalledWith(2);
        expect(result.current.selectedTasks.ids.size).toBe(0);
        expect(result.current.snackbar.severity).toBe('success');
        expect(result.current.snackbar.message).toBe('Selected tasks removed successfully.');
        expect(result.current.isActionRunning).toBe(false);
        expect(mockedSearchProjectTasks.mock.calls.length).toBeGreaterThan(callsBefore);

        confirmSpy.mockRestore();
    });

    // TC-U6: Delete Cancelled
    it('TC-U6: does nothing when the confirmation is declined', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setSelectedTasks({ type: 'include', ids: new Set([1, 2]) });
        });
        await waitFor(() => expect(result.current.selectionCount).toBe(2));

        await act(async () => {
            await result.current.handleDeleteTasks();
        });

        expect(mockedDeleteProjectTask).not.toHaveBeenCalled();
        expect(result.current.selectionCount).toBe(2);

        confirmSpy.mockRestore();
    });

    // TC-U7: Delete Error Handling
    it('TC-U7: attempts every delete, keeps only the failed task selected and refetches', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        // Only the first deletion (task 1) fails; task 2 still gets deleted.
        mockedDeleteProjectTask.mockRejectedValueOnce(new Error('boom'));

        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setSelectedTasks({ type: 'include', ids: new Set([1, 2]) });
        });
        await waitFor(() => expect(result.current.selectionCount).toBe(2));

        const callsBefore = mockedSearchProjectTasks.mock.calls.length;

        await act(async () => {
            await result.current.handleDeleteTasks();
        });

        // A single failure must not abort the batch: both deletions are attempted.
        expect(mockedDeleteProjectTask).toHaveBeenCalledWith(1);
        expect(mockedDeleteProjectTask).toHaveBeenCalledWith(2);

        expect(result.current.snackbar.severity).toBe('error');
        expect(result.current.snackbar.message).toBe('Failed to clean up some server tasks.');
        expect(result.current.isActionRunning).toBe(false);
        // Only the task that actually failed (1) stays selected for retry.
        expect(result.current.selectionCount).toBe(1);
        expect(Array.from(result.current.selectedTasks.ids)).toEqual([1]);
        // The grid is refreshed so it reflects what was really removed.
        expect(mockedSearchProjectTasks.mock.calls.length).toBeGreaterThan(callsBefore);

        confirmSpy.mockRestore();
    });

    // TC-U8: Fetch Error Handling (no `error` field exposed by this hook)
    it('TC-U8: empties the data when the search fails', async () => {
        mockedSearchProjectTasks.mockReset();
        mockedSearchProjectTasks.mockRejectedValue(new Error('network down'));

        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.tasks).toEqual([]);
        expect(result.current.totalRows).toBe(0);
    });

    // TC-U9: External Refresh Event
    it('TC-U9: refetches when the "ecopart:tasks:refresh" event is dispatched', async () => {
        const { result } = renderHook(() => useProjectTasksTab(PROJECT_ID));
        await waitFor(() => expect(result.current.loading).toBe(false));
        const callsBefore = mockedSearchProjectTasks.mock.calls.length;

        act(() => {
            window.dispatchEvent(new Event('ecopart:tasks:refresh'));
        });

        await waitFor(() => {
            expect(mockedSearchProjectTasks.mock.calls.length).toBeGreaterThan(callsBefore);
        });
    });
});
