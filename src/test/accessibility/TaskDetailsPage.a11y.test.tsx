import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';

vi.mock('@/features/projects/api/projects.api', () => ({
    getOneTask: vi.fn(),
    getTaskLog: vi.fn(),
    deleteProjectTask: vi.fn(),
    downloadTaskFile: vi.fn(),
    isExportTask: vi.fn(() => false),
}));

import { getOneTask, getTaskLog, deleteProjectTask, Task } from '@/features/projects/api/projects.api';
import TaskDetailsPage from '@/features/projects/pages/TaskDetailsPage';
import { renderWithRouter } from '@/test/utils';

const mockedGetOneTask = vi.mocked(getOneTask);

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    task_id: 42,
    task_type_id: 1,
    task_type: 'IMPORT',
    task_status_id: 3,
    task_status: 'DONE',
    task_owner_id: 1,
    task_owner: 'John Doe',
    task_project_id: 77,
    task_creation_utc_date_time: '2026-01-01T00:00:00.000Z',
    task_progress_pct: 100,
    ...overrides,
});

describe('TaskDetailsPage (Accessibility)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedGetOneTask.mockResolvedValue(makeTask());
        vi.mocked(getTaskLog).mockResolvedValue('log');
        vi.mocked(deleteProjectTask).mockResolvedValue({ message: 'deleted' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // TC-S9: Tabs expose proper ARIA roles and respond to the keyboard
    it('TC-S9: lets a keyboard user move between the GENERAL and LOG FILE tabs', async () => {
        const user = userEvent.setup();
        renderWithRouter(
            <Routes>
                <Route path="/projects/:id/tasks/:taskId/:tabName?" element={<TaskDetailsPage />} />
            </Routes>,
            { route: '/projects/77/tasks/42' },
        );

        await screen.findByText('IMPORT task [42]');

        const tablist = screen.getByRole('tablist');
        expect(tablist).toBeInTheDocument();

        const generalTab = screen.getByRole('tab', { name: /GENERAL/i });
        const logTab = screen.getByRole('tab', { name: /LOG FILE/i });

        expect(generalTab).toHaveAttribute('aria-selected', 'true');

        // MUI Tabs use the roving-tabindex + manual-activation pattern: ArrowRight
        // moves focus to the next tab, and Enter/Space activates (selects) it.
        generalTab.focus();
        expect(generalTab).toHaveFocus();

        await user.keyboard('{ArrowRight}');
        expect(logTab).toHaveFocus();

        await user.keyboard('{Enter}');
        await waitFor(() => expect(logTab).toHaveAttribute('aria-selected', 'true'));
    }, 15000);
});
