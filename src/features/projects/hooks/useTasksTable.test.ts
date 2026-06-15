import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/projects.api', () => ({
    searchProjectTasks: vi.fn(),
    deleteProjectTask: vi.fn(),
}));

import { searchProjectTasks, deleteProjectTask, Task, TaskSearchResponse } from '../api/projects.api';
import { useTasksTable } from './useTasksTable';

const mockedSearchProjectTasks = vi.mocked(searchProjectTasks);
const mockedDeleteProjectTask = vi.mocked(deleteProjectTask);

// Minimal valid Task factory: only the fields the hook actually reads matter,
// the rest satisfy the interface for type-safety.
const makeTask = (overrides: Partial<Task> = {}): Task => ({
    task_id: 1,
    task_type_id: 1,
    task_type: 'IMPORT',
    task_status_id: 1,
    task_status: 'RUNNING',
    task_owner_id: 1,
    task_owner: 'John Doe',
    task_project_id: 7,
    task_creation_date: '2026-01-01T00:00:00.000Z',
    task_progress_pct: 50,
    ...overrides,
});

const makeResponse = (tasks: Task[], total = tasks.length): TaskSearchResponse => ({
    search_info: { total, page: 1, limit: 10 },
    tasks,
});

describe('useTasksTable Hook (Unit)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSearchProjectTasks.mockResolvedValue(makeResponse([makeTask({ task_id: 1 }), makeTask({ task_id: 2 })], 2));
        mockedDeleteProjectTask.mockResolvedValue({ message: 'deleted' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // TC-R1: Initial Fetch & Pagination Info
    it('TC-R1: fetches tasks without a projectId and exposes pagination info', async () => {
        const { result } = renderHook(() => useTasksTable());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.tasks).toHaveLength(2);
        expect(result.current.totalRows).toBe(2);

        const callArg = mockedSearchProjectTasks.mock.calls[0][0];
        expect(callArg).not.toHaveProperty('projectId');
        expect(callArg.sort_by).toBe('desc(task_id)');
        expect(callArg).toMatchObject({ page: 1, limit: 10, filters: [] });
    });

    // TC-R2: Default State
    it('TC-R2: initializes with default attribute, empty selection and pagination', async () => {
        const { result } = renderHook(() => useTasksTable());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.searchAttribute).toBe('task_status');
        expect(result.current.selectedTasks).toEqual({ type: 'include', ids: new Set() });
        expect(result.current.selectionCount).toBe(0);
        expect(result.current.paginationModel).toEqual({ page: 0, pageSize: 10 });
    });

    // TC-R3: Debounced Status Search resets page and builds LIKE filter
    it('TC-R3: builds a LIKE filter for task_status after debounce', async () => {
        const { result } = renderHook(() => useTasksTable());

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setSearchText('done');
        });

        await waitFor(() => {
            const lastCall = mockedSearchProjectTasks.mock.calls.at(-1)?.[0];
            expect(lastCall?.filters).toEqual([
                { field: 'task_status', operator: 'LIKE', value: '%done%' },
            ]);
        });

        expect(result.current.paginationModel.page).toBe(0);
    });

    // TC-R4: task_id Exact Match & Numeric Guard
    it('TC-R4: uses an exact-match task_id filter and ignores non-numeric input', async () => {
        const { result } = renderHook(() => useTasksTable());

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setSearchAttribute('task_id');
            result.current.setSearchText('42');
        });

        await waitFor(() => {
            const lastCall = mockedSearchProjectTasks.mock.calls.at(-1)?.[0];
            expect(lastCall?.filters).toEqual([
                { field: 'task_id', operator: '=', value: 42 },
            ]);
        });

        // Non-numeric input must not produce a task_id filter.
        act(() => {
            result.current.setSearchText('abc');
        });

        await waitFor(() => {
            const lastCall = mockedSearchProjectTasks.mock.calls.at(-1)?.[0];
            expect(lastCall?.filters).toEqual([]);
        });
    });

    // TC-R5: Pagination is 1-indexed towards the backend
    it('TC-R5: sends page+1 and the selected pageSize to the backend', async () => {
        const { result } = renderHook(() => useTasksTable());

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setPaginationModel({ page: 2, pageSize: 5 });
        });

        await waitFor(() => {
            const lastCall = mockedSearchProjectTasks.mock.calls.at(-1)?.[0];
            expect(lastCall).toMatchObject({ page: 3, limit: 5 });
        });
    });

    // TC-R6: Delete Success (batch + cleanup)
    it('TC-R6: deletes each selected task, resets selection and refetches', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { result } = renderHook(() => useTasksTable());

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
        expect(result.current.isActionRunning).toBe(false);
        expect(mockedSearchProjectTasks.mock.calls.length).toBeGreaterThan(callsBefore);

        confirmSpy.mockRestore();
    });

    // TC-R7: Delete Cancelled
    it('TC-R7: does not delete anything when the confirmation is declined', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const { result } = renderHook(() => useTasksTable());

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

    // TC-R8: Delete Error Handling
    it('TC-R8: shows an error snackbar and preserves selection when deletion fails', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockedDeleteProjectTask.mockRejectedValueOnce(new Error('boom'));

        const { result } = renderHook(() => useTasksTable());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setSelectedTasks({ type: 'include', ids: new Set([1, 2]) });
        });
        await waitFor(() => expect(result.current.selectionCount).toBe(2));

        await act(async () => {
            await result.current.handleDeleteTasks();
        });

        expect(result.current.snackbar.severity).toBe('error');
        expect(result.current.snackbar.message).toMatch(/Failed to clean up/i);
        expect(result.current.isActionRunning).toBe(false);
        expect(result.current.selectionCount).toBe(2);

        confirmSpy.mockRestore();
    });

    // TC-R9: Fetch Error Handling
    it('TC-R9: exposes an error and empties data when the search fails', async () => {
        mockedSearchProjectTasks.mockRejectedValueOnce(new Error('network down'));

        const { result } = renderHook(() => useTasksTable());

        await waitFor(() => expect(result.current.error).toBe('network down'));
        expect(result.current.tasks).toEqual([]);
        expect(result.current.totalRows).toBe(0);
        expect(result.current.loading).toBe(false);
    });

    // TC-R10: External Refresh Event
    it('TC-R10: refetches when the "ecopart:tasks:refresh" event is dispatched', async () => {
        const { result } = renderHook(() => useTasksTable());

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
