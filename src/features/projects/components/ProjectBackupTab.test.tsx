import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renderWithRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

vi.mock('../api/projects.api', () => ({
    getProjectById: vi.fn(),
    getLastBackupDate: vi.fn(),
    exportProjectBackup: vi.fn(),
    runProjectBackup: vi.fn(),
}));

import { getProjectById, getLastBackupDate, exportProjectBackup, runProjectBackup } from '../api/projects.api';
import { ProjectBackupTab } from './ProjectBackupTab';

describe('II. BACKUP TAB (ProjectBackupTab)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getProjectById).mockResolvedValue({
            project_id: 77,
            project_title: 'Project',
            project_acronym: 'PRJ',
            instrument_model: 'UVP5HD',
            ecotaxa_project_name: null,
            root_folder_path: '/path/to/backup',
        });
    });

    describe('Functional Tests', () => {
        it('TC-O1 - Dynamic Last Backup Date Formatter', async () => {
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            vi.mocked(getLastBackupDate).mockResolvedValue({ last_backup_date: fiveDaysAgo });

            renderWithRouter(<ProjectBackupTab projectId={77} />);

            expect(await waitFor(
                () => screen.getByText(/Last backup done on .* at .*/i),
                { timeout: 10000 }
            )).toBeInTheDocument();

            cleanup();

            vi.mocked(getLastBackupDate).mockResolvedValue({ last_backup_date: null });
            renderWithRouter(<ProjectBackupTab projectId={78} />);

            expect(await waitFor(
                () => screen.getByText('The project have never been backuped.'),
                { timeout: 10000 }
            )).toBeInTheDocument();
        });

        it('TC-O2 - Export Task Launch & UI Feedback', async () => {
            const user = userEvent.setup();
            vi.mocked(getLastBackupDate).mockResolvedValue({ last_backup_date: null });
            vi.mocked(exportProjectBackup).mockImplementation(() =>
                new Promise((resolve) => setTimeout(() => resolve({ task_id: 88, task_status: 'PENDING', task_type: 'EXPORT' }), 50))
            );

            renderWithRouter(<ProjectBackupTab projectId={77} />);

            const startButtons = await waitFor(
                () => screen.getAllByRole('button', { name: /START/i }),
                { timeout: 10000 }
            );
            const exportStartBtn = startButtons[0];

            await user.click(exportStartBtn);

            // Avoid asserting a transient loading label that may flip too quickly on fast machines.
            expect(vi.mocked(exportProjectBackup)).toHaveBeenCalledTimes(1);

            await waitFor(
                () => {
                    const alert = screen.getByRole('alert');
                    expect(alert.textContent).toMatch(/Export task #88 started successfully!/i);
                },
                { timeout: 15000 }
            );

            expect(exportStartBtn).toHaveTextContent(/^START$/i);
        }, 25000);

        it('TC-O3 - Backup Task Retry Logic', async () => {
            const user = userEvent.setup();
            // First call (mount) returns null; subsequent calls (retry loop) return a date so the loop exits after the first retry.
            vi.mocked(getLastBackupDate)
                .mockResolvedValueOnce({ last_backup_date: null })
                .mockResolvedValue({ last_backup_date: new Date().toISOString() });
            vi.mocked(runProjectBackup).mockResolvedValue({ task_id: 99, task_status: 'PENDING', task_type: 'BACKUP' });

            renderWithRouter(<ProjectBackupTab projectId={77} />);

            const startButtons = await waitFor(
                () => screen.getAllByRole('button', { name: /START/i }),
                { timeout: 10000 }
            );
            const backupStartBtn = startButtons[1];

            await user.click(backupStartBtn);

            await waitFor(
                () => {
                    const alert = screen.getByRole('alert');
                    expect(alert.textContent).toMatch(/Backup task #99 started successfully!/i);
                },
                { timeout: 15000 }
            );
        }, 25000);
    });

    describe('Accessibility Tests', () => {
        it('TC-O4 - Switch Toggles (A11y)', async () => {
            const user = userEvent.setup();
            vi.mocked(getLastBackupDate).mockResolvedValue({ last_backup_date: null });

            render(<ProjectBackupTab projectId={77} />);

            await waitFor(
                () => {
                    const switches = screen.queryAllByRole('switch');
                    if (switches.length > 0) return true;
                    return screen.queryAllByRole('button').length > 0;
                },
                { timeout: 10000 }
            );

            const switches = screen.getAllByRole('switch');
            expect(switches[0]).toHaveAccessibleName(/Export also on FTP/i);
            expect(switches[1]).toHaveAccessibleName(/Skip already imported/i);

            await user.click(switches[0]);
            expect(switches[0]).toHaveFocus();
        });

        it('TC-O5 - Disabled Read-Only Field Contrast', async () => {
            vi.mocked(getLastBackupDate).mockResolvedValue({ last_backup_date: null });
            render(<ProjectBackupTab projectId={77} />);

            const inputFields = await waitFor(
                () => screen.getAllByRole('textbox'),
                { timeout: 10000 }
            );
            const disabledInputField = inputFields.find(input => input.hasAttribute('disabled'));

            expect(disabledInputField).toBeDefined();
            expect(disabledInputField).toBeDisabled();
            expect(disabledInputField).toHaveStyle({ WebkitTextFillColor: 'rgba(0, 0, 0, 0.6) !important' });
        }, 10000);
    });
});
