import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/features/projects/api/projects.api', () => ({
    searchProjectTasks: vi.fn(),
    deleteProjectTask: vi.fn(),
    downloadTaskFile: vi.fn(),
    isExportTask: vi.fn(() => false),
}));

import { searchProjectTasks, deleteProjectTask, Task } from '@/features/projects/api/projects.api';
import { ProjectTasksTab } from '@/features/projects/components/ProjectTasksTab';
import { renderWithRouter } from '@/test/utils';

const mockedSearchProjectTasks = vi.mocked(searchProjectTasks);

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    task_id: 1,
    task_type_id: 1,
    task_type: 'IMPORT',
    task_status_id: 1,
    task_status: 'RUNNING',
    task_owner_id: 1,
    task_owner: 'John Doe',
    task_project_id: 77,
    task_creation_utc_date_time: '2026-01-01T00:00:00.000Z',
    task_progress_pct: 50,
    ...overrides,
});

describe('ProjectTasksTab (Accessibility)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSearchProjectTasks.mockResolvedValue({
            search_info: { total: 1, page: 1, limit: 10 },
            tasks: [makeTask({ task_id: 1 })],
        });
        vi.mocked(deleteProjectTask).mockResolvedValue({ message: 'deleted' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // TC-T7: Action buttons disabled until a task is selected, then focusable
    it('TC-T7: keeps the action buttons disabled until a row is selected via keyboard', async () => {
        const user = userEvent.setup({ delay: null });
        renderWithRouter(<ProjectTasksTab projectId={77} />);

        await screen.findByText('IMPORT');

        const deleteButton = screen.getByRole('button', { name: /DELETE/i });
        const restartButton = screen.getByRole('button', { name: /RESTART/i });

        expect(deleteButton).toBeDisabled();
        expect(restartButton).toBeDisabled();

        // Select the row using the keyboard (focus the checkbox, press Space).
        const checkboxes = screen.getAllByRole('checkbox');
        const rowCheckbox = checkboxes[checkboxes.length - 1];
        act(() => {
            rowCheckbox.focus();
        });
        await user.keyboard(' ');

        expect(await screen.findByText('1 items selected')).toBeInTheDocument();
        expect(deleteButton).toBeEnabled();

        act(() => {
            deleteButton.focus();
        });
        expect(deleteButton).toHaveFocus();
    }, 15000);
});
