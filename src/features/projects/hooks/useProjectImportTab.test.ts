import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/projects.api', () => ({
    getProjectById: vi.fn(),
    getImportableRawSamples: vi.fn(),
    getImportableEcoTaxaSamples: vi.fn(),
    importRawSamples: vi.fn(),
    importEcoTaxaSamples: vi.fn(),
}));

import {
    getProjectById,
    getImportableRawSamples,
    getImportableEcoTaxaSamples,
    importRawSamples,
    importEcoTaxaSamples,
} from '../api/projects.api';
import { useProjectImportTab } from './useProjectImportTab';

const mockedGetProjectById = vi.mocked(getProjectById);
const mockedGetImportableRawSamples = vi.mocked(getImportableRawSamples);
const mockedGetImportableEcoTaxaSamples = vi.mocked(getImportableEcoTaxaSamples);
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
            ecotaxa_project_name: null,
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

        mockedImportRawSamples.mockResolvedValue({ success: true, task_import_samples: 42 });
        mockedImportEcoTaxaSamples.mockResolvedValue({ success: true });
    });

     // TC-M1: Initialization and data loading
    it('imports selected raw samples and clears importing/selection on success', async () => {
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

    // TC-M2: Importing EcoTaxa samples with error handling
    it('maps selected EcoTaxa sample_id to sample_name and clears importing on error', async () => {
        mockedImportEcoTaxaSamples.mockRejectedValueOnce(new Error('import failed'));

        const { result } = renderHook(() => useProjectImportTab(77));

        await waitFor(() => {
            expect(result.current.loadingRaw).toBe(false);
            expect(result.current.loadingEcoTaxa).toBe(false);
        });

        act(() => {
            result.current.setSelectedEcoTaxaSamples({ type: 'include', ids: new Set([2]) });
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
});
