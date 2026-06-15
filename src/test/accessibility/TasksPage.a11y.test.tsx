import { describe, it, expect, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import TasksPage from '@/features/projects/pages/TasksPage';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import type { Task } from '@/features/projects/api/projects.api';

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

const mockTasks = (tasks: Task[]) =>
    server.use(
        http.post('*/tasks/searches', () =>
            HttpResponse.json({ search_info: { total: tasks.length, page: 1, limit: 10 }, tasks }),
        ),
    );

describe('TasksPage (Accessibility)', () => {
    beforeEach(() => {
        loginAsUser();
    });

    // TC-Q11: Keyboard Navigation (Filters & DataGrid)
    it('TC-Q11: lets a keyboard user move through filters and toggle a row with Space', async () => {
        const user = userEvent.setup({ delay: null });
        mockTasks([makeTask({ task_id: 1, task_type: 'IMPORT' })]);

        renderWithRouter(<TasksPage />, { route: '/tasks' });

        await screen.findByText('IMPORT');

        const searchInput = screen.getByLabelText('Search');
        const attributeSelect = screen.getByRole('combobox', { name: 'Attribute' });

        // Start focus deterministically on the Search field, then Tab to the Attribute select.
        act(() => {
            searchInput.focus();
        });
        expect(searchInput).toHaveFocus();

        await user.tab();
        expect(attributeSelect).toHaveFocus();

        // The row checkbox is keyboard-toggleable: focusing it and pressing Space selects the row.
        const checkboxes = screen.getAllByRole('checkbox');
        const rowCheckbox = checkboxes[checkboxes.length - 1];
        act(() => {
            rowCheckbox.focus();
        });
        await user.keyboard(' ');

        expect(await screen.findByText('1 items selected')).toBeInTheDocument();
    }, 15000);

    // TC-Q12: Action Bar Focus / Disabled Buttons
    it('TC-Q12: disables the action buttons until a task is selected', async () => {
        const user = userEvent.setup({ delay: null });
        mockTasks([makeTask({ task_id: 1, task_type: 'IMPORT' })]);

        renderWithRouter(<TasksPage />, { route: '/tasks' });

        await screen.findByText('IMPORT');

        const deleteButton = screen.getByRole('button', { name: /DELETE/i });
        const stopButton = screen.getByRole('button', { name: /STOP/i });

        // No selection: both actions are disabled (and thus skipped by keyboard focus).
        expect(deleteButton).toBeDisabled();
        expect(stopButton).toBeDisabled();

        // Select a row -> DELETE becomes enabled and focusable.
        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[checkboxes.length - 1]);

        expect(await screen.findByText('1 items selected')).toBeInTheDocument();
        expect(deleteButton).toBeEnabled();

        act(() => {
            deleteButton.focus();
        });
        expect(deleteButton).toHaveFocus();
    }, 15000);
});
