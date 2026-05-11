import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks API
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
} from '../api/projects.api';

import { useProjectImportTab } from '../hooks/useProjectImportTab';
import { ProjectImportTab } from './ProjectImportTab';

const mockedGetProjectById = vi.mocked(getProjectById);
const mockedGetImportableRawSamples = vi.mocked(getImportableRawSamples);
const mockedGetImportableEcoTaxaSamples = vi.mocked(getImportableEcoTaxaSamples);
const mockedImportRawSamples = vi.mocked(importRawSamples);

describe('I. IMPORT TAB (ProjectImportTab)', () => {
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
            { sample_name: 'raw-1', qc_lvl1: true },
            { sample_name: 'raw-2', qc_lvl1: false },
            { sample_name: 'raw-3', qc_lvl1: true },
        ]);

        mockedGetImportableEcoTaxaSamples.mockResolvedValue([]);
        mockedImportRawSamples.mockResolvedValue({ success: true, task_import_samples: 42 });
    });

    describe('Functional Tests', () => {
        it('TC-N1 - Raw import success + cleanup (Hook level)', async () => {
            const { result } = renderHook(() => useProjectImportTab(77));

            await waitFor(() => {
                expect(result.current.loadingRaw).toBe(false);
            });

            // Select the first sample by its sample_name (row id is sample_name)
            act(() => {
                result.current.setSelectedRawSamples({ type: 'include', ids: new Set(['raw-1']) });
            });

            await waitFor(() => {
                expect(result.current.rawSelectionCount).toBeGreaterThan(0);
            });

            act(() => {
                result.current.handlePreImportRawSamples(false);
            });

            expect(result.current.isQcModalOpen).toBe(true);

            await act(async () => {
                await result.current.confirmAndExecuteRawImport();
            });

            // Called with the expected samples array and backup flags
            expect(mockedImportRawSamples).toHaveBeenCalledWith(
                77,
                expect.objectContaining({
                    samples: ['raw-1'],
                    backup_project: false,
                    backup_project_skip_already_imported: true,
                })
            );

            // Selection should be reset and import flag cleared after execution
            expect(result.current.selectedRawSamples.ids.size).toBe(0);
            expect(result.current.isImporting).toBe(false);
        });

        it('TC-N2 - Select All UVP Samples (UI level)', async () => {
            const user = userEvent.setup();
            render(<ProjectImportTab projectId={77} />);

            // Wait for data grid to render
            const grid = await waitFor(
                () => screen.getByRole('grid'),
                { timeout: 10000 }
            );
            expect(grid).toBeInTheDocument();

            // Find and click select all checkbox
            const selectAllCheckbox = (await screen.findAllByRole('checkbox'))[0];
            await user.click(selectAllCheckbox);

            // Verify all items are selected
            expect(await waitFor(
                () => screen.getByText(/3 items selected/i),
                { timeout: 5000 }
            )).toBeInTheDocument();

            // Verify import button becomes enabled
            const importBtn = screen.getByRole('button', { name: /IMPORT SELECTION/i });
            expect(importBtn).not.toBeDisabled();
        });

        it('TC-N3 - EcoTaxa Empty State Rendering', async () => {
            render(<ProjectImportTab projectId={77} />);

            // Wait for "0 samples found" message to appear
            expect(await waitFor(
                () => screen.getByText(/0 samples found/i),
                { timeout: 10000 }
            )).toBeInTheDocument();

            // Verify the import button is disabled when no EcoTaxa samples
            const importAllEcoBtn = screen.getByRole('button', { name: /IMPORT ALL IN ECOTAXA/i });
            expect(importAllEcoBtn).toBeDisabled();
        });
    });

    describe('Accessibility Tests', () => {
        it('TC-N4 - Keyboard Navigation (DataGrid)', async () => {
            const user = userEvent.setup();
            render(<ProjectImportTab projectId={77} />);

            // Wait for data to load
            const grid = await waitFor(
                () => screen.getByRole('grid'),
                { timeout: 10000 }
            );
            expect(grid).toBeInTheDocument();

            // Find first row checkbox (get all and use first)
            const checkboxes = await screen.findAllByLabelText(/Select row/i);
            const firstRowCheckbox = checkboxes[0];

            // Focus the checkbox directly and use Space to toggle the row selection
            firstRowCheckbox.focus();
            expect(firstRowCheckbox).toHaveFocus();

            // Press space to select and deselect
            await user.keyboard('[Space]');
            expect(firstRowCheckbox).toBeChecked();

            await user.keyboard('[Space]');
            expect(firstRowCheckbox).not.toBeChecked();
        });

        it('TC-N5 - Screen Reader Announcement for Empty States', async () => {
            render(<ProjectImportTab projectId={77} />);

            // Wait for empty state message in the EcoTaxa section
            const emptyStateText = await waitFor(
                () => screen.getByText('0 samples found.'),
                { timeout: 10000 }
            );
            expect(emptyStateText).toBeInTheDocument();

            // Only the UVP grid should remain visible when EcoTaxa is empty
            const grids = screen.queryAllByRole('grid');
            expect(grids).toHaveLength(1);
        });
    });
});
