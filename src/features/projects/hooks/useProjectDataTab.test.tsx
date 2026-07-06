import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('../api/projects.api', () => ({
    searchProjectSamples: vi.fn(),
    searchProjectEcoTaxaSamples: vi.fn(),
    searchProjectCtdSamples: vi.fn(),
    deleteProjectSample: vi.fn(),
    deleteProjectEcoTaxaSamples: vi.fn(),
    deleteProjectCtdSamples: vi.fn(),
    // The hook resolves the EcoTaxa instance URL via the project; an unlinked
    // project (null instance) keeps getEcoTaxaInstances out of these unit tests.
    getProjectById: vi.fn().mockResolvedValue({ ecotaxa_project_id: null, ecotaxa_instance_id: null }),
}));

// The deep-link effect resolves the instance base URL from the user-profile API.
vi.mock('@/features/userProfile/api/profile.api', () => ({
    getEcoTaxaInstances: vi.fn(),
}));

import {
    searchProjectSamples,
    searchProjectEcoTaxaSamples,
    searchProjectCtdSamples,
    deleteProjectSample,
    deleteProjectCtdSamples,
    deleteProjectEcoTaxaSamples,
    getProjectById,
} from '../api/projects.api';
import type { Project, EcoTaxaSampleData } from '../api/projects.api';
import { getEcoTaxaInstances } from '@/features/userProfile/api/profile.api';
import type { EcoTaxaInstance } from '@/features/userProfile/api/profile.api';
import { useProjectDataTab } from './useProjectDataTab';

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    project_id: 77,
    project_title: 'Project 77',
    project_acronym: 'P77',
    instrument_model: 'UVP5HD',
    ecotaxa_project_name: null,
    root_folder_path: '/data/p77',
    ...overrides,
});

const makeEcoTaxaSample = (overrides: Partial<EcoTaxaSampleData> = {}): EcoTaxaSampleData => ({
    sample_id: 1,
    sample_name: 'etx-1',
    ecotaxa_sample_id: 5001,
    nb_objects: 0,
    nb_unclassified: 0,
    nb_validated: 0,
    nb_dubious: 0,
    nb_predicted: 0,
    ...overrides,
});

const makeInstance = (overrides: Partial<EcoTaxaInstance> = {}): EcoTaxaInstance => ({
    ecotaxa_instance_id: 1,
    ecotaxa_instance_name: 'FR',
    ecotaxa_instance_description: 'France instance',
    ecotaxa_instance_url: 'https://ecotaxa.example.fr/',
    ...overrides,
});

// TC "P" series is shared with the component test ProjectDataTab.test.tsx, which
// owns TC-P1–P8; the hook-level tests continue the same series from TC-P9 so the
// numbers stay unique across both files.
describe('hooks/useProjectDataTab', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-P9: fetches UVP samples and exposes pagination info', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({
            samples: [{ sample_id: 1, sample_name: 'a' }],
            search_info: { total: 10, page: 1, limit: 10 }
        });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });

        const { result } = renderHook(() => useProjectDataTab(77));

        await waitFor(() => {
            expect(result.current.uvpSamples.length).toBeGreaterThan(0);
            expect(result.current.totalUvpRows).toBe(10);
        });
    });

    it('TC-P10: deletes selected UVP samples and refreshes data', async () => {
        vi.mocked(searchProjectSamples)
            .mockResolvedValueOnce({
                samples: [
                    { sample_id: 1, sample_name: 'a' },
                    { sample_id: 2, sample_name: 'b' },
                ],
                search_info: { total: 2, page: 1, limit: 10 },
            })
            .mockResolvedValueOnce({
                samples: [],
                search_info: { total: 0, page: 1, limit: 10 },
            });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(deleteProjectSample).mockResolvedValue({ message: 'Deleted' });
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        try {
            const { result } = renderHook(() => useProjectDataTab(77));

            await waitFor(() => expect(result.current.uvpSamples.length).toBe(2));

            act(() => {
                result.current.setSelectedUvpSamples({ type: 'include', ids: new Set([1, 2]) });
            });

            await waitFor(() => expect(result.current.uvpSelectionCount).toBe(2));

            await act(async () => {
                await result.current.handleDeleteUvpSamples();
            });

            expect(deleteProjectSample).toHaveBeenCalledTimes(2);
            expect(deleteProjectSample).toHaveBeenCalledWith(77, 1);
            expect(deleteProjectSample).toHaveBeenCalledWith(77, 2);
            await waitFor(() => expect(result.current.uvpSelectionCount).toBe(0));
        } finally {
            confirmSpy.mockRestore();
        }
    });

    it('TC-P11: counts exclude selection as selected rows for UVP samples', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({
            samples: [
                { sample_id: 1, sample_name: 'a' },
                { sample_id: 2, sample_name: 'b' },
            ],
            search_info: { total: 2, page: 1, limit: 10 },
        });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });

        const { result } = renderHook(() => useProjectDataTab(77));

        await waitFor(() => expect(result.current.uvpSamples.length).toBe(2));

        act(() => {
            result.current.setSelectedUvpSamples({ type: 'exclude', ids: new Set() });
        });

        await waitFor(() => expect(result.current.uvpSelectionCount).toBe(2));
    });

    it('TC-P12: deletes selected CTD samples and refreshes data', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples)
            .mockResolvedValueOnce({
                samples: [{ sample_name: 'ctd-1', ctd_import_utc_date_time: '2024-01-15T10:30:00.000Z', file_extension: 'ctd' }],
                search_info: { total: 1, page: 1, limit: 10 },
            })
            .mockResolvedValueOnce({
                samples: [],
                search_info: { total: 0, page: 1, limit: 10 },
            });
        vi.mocked(deleteProjectCtdSamples).mockResolvedValue({ message: 'Deleted' });
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        try {
            const { result } = renderHook(() => useProjectDataTab(77));

            await waitFor(() => expect(result.current.ctdSamples.length).toBe(1));

            act(() => {
                result.current.setSelectedCtdSamples({ type: 'include', ids: new Set(['ctd-1']) });
            });

            await act(async () => {
                await result.current.handleDeleteCtdSamples();
            });

            expect(deleteProjectCtdSamples).toHaveBeenCalledWith(77, ['ctd-1']);
            await waitFor(() => expect(result.current.ctdSelectionCount).toBe(0));
        } finally {
            confirmSpy.mockRestore();
        }
    });

    it('TC-P13: deletes selected EcoTaxa samples with the "from EcoTaxa" messaging and refreshes data', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectEcoTaxaSamples)
            .mockResolvedValueOnce({
                samples: [makeEcoTaxaSample({ sample_name: 'etx-1' })],
                search_info: { total: 1, page: 1, limit: 10 },
            })
            .mockResolvedValueOnce({
                samples: [],
                search_info: { total: 0, page: 1, limit: 10 },
            });
        vi.mocked(deleteProjectEcoTaxaSamples).mockResolvedValue({ message: 'Deleted' });
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        try {
            const { result } = renderHook(() => useProjectDataTab(77));

            await waitFor(() => expect(result.current.ecoTaxaSamples.length).toBe(1));

            act(() => {
                result.current.setSelectedEcoTaxaSamples({ type: 'include', ids: new Set(['etx-1']) });
            });

            await waitFor(() => expect(result.current.ecoTaxaSelectionCount).toBe(1));

            await act(async () => {
                await result.current.handleDeleteEcoTaxaSamples();
            });

            expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/delete 1 samples from EcoTaxa/i));
            expect(deleteProjectEcoTaxaSamples).toHaveBeenCalledWith(77, ['etx-1']);
            await waitFor(() => {
                expect(result.current.snackbar.message).toBe('Samples deleted from EcoTaxa successfully.');
                expect(result.current.snackbar.severity).toBe('success');
            });
            await waitFor(() => expect(result.current.ecoTaxaSelectionCount).toBe(0));
        } finally {
            confirmSpy.mockRestore();
        }
    });

    it('TC-P14: buildEcoTaxaSampleUrl returns null when the project is not linked to EcoTaxa', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });

        const { result } = renderHook(() => useProjectDataTab(77));

        // Wait until the deep-link effect has resolved the (unlinked) project.
        await waitFor(() => expect(getProjectById).toHaveBeenCalled());

        expect(result.current.buildEcoTaxaSampleUrl(makeEcoTaxaSample())).toBeNull();
        // An unlinked project (null instance) short-circuits before the instances call.
        expect(getEcoTaxaInstances).not.toHaveBeenCalled();
    });

    it('TC-P15: buildEcoTaxaSampleUrl builds an EcoTaxa gallery URL when the project is linked', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(getProjectById).mockResolvedValueOnce(
            makeProject({ ecotaxa_project_id: 20092, ecotaxa_instance_id: 1 }),
        );
        vi.mocked(getEcoTaxaInstances).mockResolvedValue([
            makeInstance({ ecotaxa_instance_id: 1, ecotaxa_instance_url: 'https://ecotaxa.example.fr/' }),
        ]);

        const { result } = renderHook(() => useProjectDataTab(77));

        // The effect resolves project -> instance URL asynchronously; poll until ready.
        // The trailing slash on the instance URL must be trimmed in the result.
        await waitFor(() =>
            expect(
                result.current.buildEcoTaxaSampleUrl(makeEcoTaxaSample({ ecotaxa_sample_id: 42 })),
            ).toBe('https://ecotaxa.example.fr/prj/20092?samples=42'),
        );
    });

    it('TC-P16: a failed EcoTaxa instance resolution is non-fatal (samples still load, URL stays null)', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({
            samples: [{ sample_id: 1, sample_name: 'a' }],
            search_info: { total: 1, page: 1, limit: 10 },
        });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(getProjectById).mockRejectedValueOnce(new Error('boom'));
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        try {
            const { result } = renderHook(() => useProjectDataTab(77));

            // UVP data still loads despite the deep-link resolution failing.
            await waitFor(() => expect(result.current.uvpSamples.length).toBe(1));

            expect(result.current.buildEcoTaxaSampleUrl(makeEcoTaxaSample())).toBeNull();
        } finally {
            errorSpy.mockRestore();
        }
    });
});
