import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/projects.api', () => ({
    getProjectById: vi.fn(),
    getImportableRawSamples: vi.fn(),
    getImportableEcoTaxaSamples: vi.fn(),
    getImportableCtdSamples: vi.fn(),
    importRawSamples: vi.fn(),
    importEcoTaxaSamples: vi.fn(),
    importProjectCtdSamples: vi.fn(),
}));

import {
    getProjectById,
    getImportableRawSamples,
    getImportableEcoTaxaSamples,
    getImportableCtdSamples,
    importRawSamples,
    importEcoTaxaSamples,
} from '../api/projects.api';
import { useProjectImportTab } from './useProjectImportTab';

const mockedGetProjectById = vi.mocked(getProjectById);
const mockedGetImportableRawSamples = vi.mocked(getImportableRawSamples);
const mockedGetImportableEcoTaxaSamples = vi.mocked(getImportableEcoTaxaSamples);
const mockedGetImportableCtdSamples = vi.mocked(getImportableCtdSamples);
const mockedImportRawSamples = vi.mocked(importRawSamples);
const mockedImportEcoTaxaSamples = vi.mocked(importEcoTaxaSamples);

describe('useProjectImportTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockedGetProjectById.mockResolvedValue({
            project_id: 77,
            project_title: 'Project',
            project_acronym: 'PRJ',
            instrument_model: 'UVP5HD',
            ecotaxa_project_id: 20092,
            ecotaxa_project_name: 'EcoTaxa Project',
            root_folder_path: '/data/project_77',
        });

        mockedGetImportableRawSamples.mockResolvedValue([
            { sample_name: 'raw-1' },
            { sample_name: 'raw-2' },
        ]);

        mockedGetImportableEcoTaxaSamples.mockResolvedValue([
            {
                sample_id: 1,
                sample_name: 'eco-1',
                tsv_file_name: 'eco-1.tsv',
                local_folder_tsv_path: '/tmp/eco-1.tsv',
                images: 10,
            },
            {
                sample_id: 2,
                sample_name: 'eco-2',
                tsv_file_name: 'eco-2.tsv',
                local_folder_tsv_path: '/tmp/eco-2.tsv',
                images: 8,
            },
        ]);

        mockedGetImportableCtdSamples.mockResolvedValue([]);

        mockedImportRawSamples.mockResolvedValue({ success: true, task_import_samples: 42 });
        mockedImportEcoTaxaSamples.mockResolvedValue({ success: true });
    });

    // TC-N6: Hook-level raw import success and cleanup
    it('TC-N6: imports selected raw samples and clears importing/selection on success', async () => {
        const { result } = renderHook(() => useProjectImportTab(77));

        await waitFor(() => {
            expect(result.current.loadingRaw).toBe(false);
            expect(result.current.loadingEcoTaxa).toBe(false);
        });

        act(() => {
            result.current.setSelectedRawSamples({ type: 'include', ids: new Set(['raw-1']) });
        });

        await waitFor(() => {
            expect(result.current.rawSelectionCount).toBe(1);
        });

        act(() => {
            result.current.handlePreImportRawSamples(false);
        });

        expect(result.current.isQcModalOpen).toBe(true);

        await act(async () => {
            await result.current.confirmAndExecuteRawImport();
        });

        expect(mockedImportRawSamples).toHaveBeenCalledWith(77, {
            samples: ['raw-1'],
            backup_project: false,
            backup_project_skip_already_imported: true,
        });
        expect(result.current.selectedRawSamples.ids.size).toBe(0);
        expect(result.current.isImporting).toBe(false);
    });

    // TC-N7: Hook-level EcoTaxa import error handling
    it('TC-N7: maps selected EcoTaxa sample_id to sample_name and clears importing on error', async () => {
        mockedImportEcoTaxaSamples.mockRejectedValueOnce(new Error('import failed'));

        const { result } = renderHook(() => useProjectImportTab(77));

        await waitFor(() => {
            expect(result.current.loadingRaw).toBe(false);
            expect(result.current.loadingEcoTaxa).toBe(false);
        });

        act(() => {
            result.current.setSelectedEcoTaxaSamples({ type: 'include', ids: new Set([2]) });
        });

        await waitFor(() => {
            expect(result.current.selectedEcoTaxaSamples.ids.size).toBe(1);
        });

        await act(async () => {
            await result.current.handleImportEcoTaxaSamples(false);
        });

        expect(mockedImportEcoTaxaSamples).toHaveBeenCalledWith(77, {
            samples: ['eco-2'],
            backup_project: false,
            backup_project_skip_already_imported: true,
        });
        expect(result.current.isImporting).toBe(false);
        expect(result.current.selectedEcoTaxaSamples.ids.size).toBe(1);
        expect(result.current.snackbar.open).toBe(true);
        expect(result.current.snackbar.severity).toBe('error');
    });

    // TC-N8: Hook-level empty raw import action guard
    it('TC-N8: keeps selection unchanged when there are no raw samples to import', async () => {
        mockedGetImportableRawSamples.mockResolvedValue([]);

        const { result } = renderHook(() => useProjectImportTab(77));

        await waitFor(() => {
            expect(result.current.loadingRaw).toBe(false);
        });

        act(() => {
            result.current.handlePreImportRawSamples(false);
        });

        expect(result.current.isQcModalOpen).toBe(false);
        expect(result.current.snackbar.open).toBe(true);
        expect(result.current.snackbar.severity).toBe('warning');
    });

    // TC-N9: Hook-level EcoTaxa import supports exclude selection mode
    it('TC-N9: imports EcoTaxa samples using exclude selection mode', async () => {
        const { result } = renderHook(() => useProjectImportTab(77));

        await waitFor(() => {
            expect(result.current.loadingEcoTaxa).toBe(false);
        });

        // Exclude sample_id=2 so only eco-1 should be imported
        act(() => {
            result.current.setSelectedEcoTaxaSamples({ type: 'exclude', ids: new Set([2]) });
        });

        await waitFor(() => {
            expect(result.current.selectedEcoTaxaSamples.type).toBe('exclude');
        });

        await act(async () => {
            await result.current.handleImportEcoTaxaSamples(false);
        });

        expect(mockedImportEcoTaxaSamples).toHaveBeenCalledWith(77, {
            samples: ['eco-1'],
            backup_project: false,
            backup_project_skip_already_imported: true,
        });
        expect(result.current.selectedEcoTaxaSamples.ids.size).toBe(0);
        expect(result.current.snackbar.open).toBe(true);
        expect(result.current.snackbar.severity).toBe('success');
    });

    // TC-N10: Hook-level raw import all with backup options + snackbar close
    it('TC-N10: imports all raw samples with backup options and closes snackbar', async () => {
        const { result } = renderHook(() => useProjectImportTab(77));

        await waitFor(() => {
            expect(result.current.loadingRaw).toBe(false);
        });

        act(() => {
            result.current.setEnableAutoBackup(true);
            result.current.setSkipAlreadyImported(false);
        });

        act(() => {
            result.current.handlePreImportRawSamples(true);
        });

        expect(result.current.isQcModalOpen).toBe(true);

        await act(async () => {
            await result.current.confirmAndExecuteRawImport();
        });

        expect(mockedImportRawSamples).toHaveBeenCalledWith(77, {
            samples: ['raw-1', 'raw-2'],
            backup_project: true,
            backup_project_skip_already_imported: false,
        });

        expect(result.current.snackbar.open).toBe(true);
        act(() => {
            result.current.closeSnackbar();
        });
        expect(result.current.snackbar.open).toBe(false);
    });

    // TC-N11: Hook-level initialization fallback when project fetch fails
    it('TC-N11: sets error root path when project loading fails', async () => {
        mockedGetProjectById.mockRejectedValueOnce(new Error('init failed'));

        const { result } = renderHook(() => useProjectImportTab(77));

        await waitFor(() => {
            expect(result.current.rootFolderPath).toBe('Error loading data');
        });

        expect(result.current.hasEcoTaxaProject).toBe(false);
    });

    // TC-N12: Hook-level EcoTaxa import-all guard when there is no sample
    it('TC-N12: shows warning and skips API call when importing all EcoTaxa samples with empty list', async () => {
        mockedGetImportableEcoTaxaSamples.mockResolvedValueOnce([]);

        const { result } = renderHook(() => useProjectImportTab(77));

        await waitFor(() => {
            expect(result.current.loadingEcoTaxa).toBe(false);
        });

        await act(async () => {
            await result.current.handleImportEcoTaxaSamples(true);
        });

        expect(mockedImportEcoTaxaSamples).not.toHaveBeenCalled();
        expect(result.current.snackbar.open).toBe(true);
        expect(result.current.snackbar.severity).toBe('warning');
        expect(result.current.snackbar.message).toBe('No samples to import.');
    });
});
