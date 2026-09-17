import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('../api/projects.api', () => ({
    getProjectById: vi.fn(),
    getLastBackupDate: vi.fn(),
    exportProjectBackup: vi.fn(),
    runProjectBackup: vi.fn(),
    getOneTask: vi.fn(),
}));

import { getProjectById, getLastBackupDate, exportProjectBackup, runProjectBackup, getOneTask } from '../api/projects.api';
import { useProjectBackupTab } from './useProjectBackupTab';

describe('hooks/useProjectBackupTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockProject = {
        project_id: 77,
        project_title: 'Project',
        project_acronym: 'PRJ',
        instrument_model: 'UVP5HD',
        ecotaxa_project_name: null,
        root_folder_path: '/backups/proj',
    };

    it('TC-O6: initializes with project path and last backup date', async () => {
        vi.mocked(getProjectById).mockResolvedValue(mockProject);
        vi.mocked(getLastBackupDate).mockResolvedValue({ last_backup_date: '2024-01-01T00:00:00Z' });

        const { result } = renderHook(() => useProjectBackupTab(77));

        await waitFor(() => {
            expect(result.current.backupFolderPath).toContain('/backups/proj');
            expect(result.current.lastBackupDate).toBe('2024-01-01T00:00:00Z');
        });
    });

    it('TC-O7: handleStartExport calls API and clears isExporting', async () => {
        vi.mocked(getProjectById).mockResolvedValue(mockProject);
        vi.mocked(getLastBackupDate).mockResolvedValue({ last_backup_date: null });
        // Keep the mock synchronous; we only assert final state and API call
        vi.mocked(exportProjectBackup).mockResolvedValue({ task_id: 1, task_status: 'PENDING', task_type: 'EXPORT' });

        const { result } = renderHook(() => useProjectBackupTab(77));

        await waitFor(() => expect(result.current.isExporting).toBe(false));

        await act(async () => {
            await result.current.handleStartExport();
        });

        expect(exportProjectBackup).toHaveBeenCalledWith(77, expect.any(Object));
        expect(result.current.isExporting).toBe(false);
    });

    it('TC-O8: handleStartBackup follows the task and refreshes lastBackupDate once it is DONE', async () => {
        vi.mocked(getProjectById).mockResolvedValue(mockProject);

        // Initial load: never backed up. After the task completes the server reports the real date.
        vi.mocked(getLastBackupDate)
            .mockResolvedValueOnce({ last_backup_date: null })
            .mockResolvedValue({ last_backup_date: '2025-05-01T12:00:00Z' });

        vi.mocked(runProjectBackup).mockResolvedValue({ task_id: 99, task_status: 'PENDING', task_type: 'BACKUP' });
        // First poll: still running; second poll: done.
        vi.mocked(getOneTask)
            .mockResolvedValueOnce({ task_id: 99, task_status: 'RUNNING' } as never)
            .mockResolvedValue({ task_id: 99, task_status: 'DONE' } as never);

        const { result } = renderHook(() => useProjectBackupTab(77));

        await waitFor(() => expect(result.current.isLoadingMetadata).toBe(false));
        expect(result.current.lastBackupDate).toBeNull();

        await act(async () => {
            await result.current.handleStartBackup();
        });

        expect(runProjectBackup).toHaveBeenCalledWith(77, expect.any(Object));
        // The launch itself is over; the date is untouched until the server confirms the backup.
        expect(result.current.isBackingUp).toBe(false);
        expect(result.current.runningBackupTaskId).toBe(99);
        expect(result.current.lastBackupDate).toBeNull();

        // Two polls (3 s apart) until the task reports DONE.
        await waitFor(() => expect(result.current.lastBackupDate).toBe('2025-05-01T12:00:00Z'), { timeout: 10000 });
        expect(getOneTask).toHaveBeenCalledTimes(2);
        expect(result.current.runningBackupTaskId).toBeNull();
    }, 20000);

    it('TC-O9: a failed backup task never updates lastBackupDate', async () => {
        vi.mocked(getProjectById).mockResolvedValue(mockProject);
        vi.mocked(getLastBackupDate).mockResolvedValue({ last_backup_date: null });
        vi.mocked(runProjectBackup).mockResolvedValue({ task_id: 100, task_status: 'PENDING', task_type: 'BACKUP' });
        vi.mocked(getOneTask).mockResolvedValue({ task_id: 100, task_status: 'ERROR', task_error: 'disk full' } as never);

        const { result } = renderHook(() => useProjectBackupTab(77));
        await waitFor(() => expect(result.current.isLoadingMetadata).toBe(false));

        await act(async () => {
            await result.current.handleStartBackup();
        });

        await waitFor(() => expect(result.current.runningBackupTaskId).toBeNull(), { timeout: 10000 });
        expect(result.current.lastBackupDate).toBeNull();
        expect(result.current.snackbar.severity).toBe('error');
        // Only the initial load asked for the date: a failed task never refreshes it.
        expect(getLastBackupDate).toHaveBeenCalledTimes(1);
    }, 20000);
});
