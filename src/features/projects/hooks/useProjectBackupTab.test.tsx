import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('../api/projects.api', () => ({
    getProjectById: vi.fn(),
    getLastBackupDate: vi.fn(),
    exportProjectBackup: vi.fn(),
    runProjectBackup: vi.fn(),
}));

import { getProjectById, getLastBackupDate, exportProjectBackup, runProjectBackup } from '../api/projects.api';
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

    it('TC-O8: handleStartBackup updates lastBackupDate after retry', async () => {
        vi.mocked(getProjectById).mockResolvedValue(mockProject);

        // initial load returns null
        vi.mocked(getLastBackupDate)
            .mockResolvedValueOnce({ last_backup_date: null }) // initial
            .mockResolvedValueOnce({ last_backup_date: null }) // first attempt in handler
            .mockResolvedValueOnce({ last_backup_date: '2025-05-01T12:00:00Z' }); // second attempt

        vi.mocked(runProjectBackup).mockResolvedValue({ task_id: 99, task_status: 'PENDING', task_type: 'BACKUP' });

        const { result } = renderHook(() => useProjectBackupTab(77));

        await waitFor(() => expect(result.current.isBackingUp).toBe(false));

        vi.useFakeTimers();
        try {
            const backupPromise = result.current.handleStartBackup();

            await act(async () => {
                await vi.runAllTimersAsync();
                await backupPromise;
            });

            expect(runProjectBackup).toHaveBeenCalledWith(77, expect.any(Object));
            expect(result.current.lastBackupDate).toBe('2025-05-01T12:00:00Z');
            expect(result.current.isBackingUp).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    }, 20000);
});
