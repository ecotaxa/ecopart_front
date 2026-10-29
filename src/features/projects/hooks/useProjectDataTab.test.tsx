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
    regenerateSamplePivots: vi.fn(),
    getProjectById: vi.fn().mockResolvedValue({ ecotaxa_project_id: null, ecotaxa_instance_id: null }),
}));

// The deep-link effect resolves the instance base URL from the user-profile API.
vi.mock('@/shared/api/ecotaxa.api', () => ({
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
    regenerateSamplePivots,
} from '../api/projects.api';
import type { Project, EcoTaxaSampleData } from '../api/projects.api';
import { getEcoTaxaInstances } from '@/shared/api/ecotaxa.api';
import type { EcoTaxaInstance } from '@/features/userProfile/api/profile.api';
import { useProjectDataTab } from './useProjectDataTab';
import { answerConfirmDialogs } from '@/test/helpers/confirm.helpers';

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
        const confirmSpy = answerConfirmDialogs(true);

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
        const confirmSpy = answerConfirmDialogs(true);

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
        const confirmSpy = answerConfirmDialogs(true);

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

            expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Delete samples from EcoTaxa',
                message: expect.stringMatching(/removes 1 sample\(s\) from the linked EcoTaxa project/i),
            }));
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

    it('TC-P21: steps back to the last non-empty page when the UVP page comes back empty after a delete', async () => {
        // 21 samples over 3 pages of 10; deleting the only sample of page 3 leaves 20.
        let deleted = false;
        vi.mocked(searchProjectSamples).mockImplementation(async (_projectId, { page }) => {
            if (page === 3) {
                return deleted
                    ? { samples: [], search_info: { total: 20, page: 3, limit: 10 } }
                    : { samples: [{ sample_id: 21, sample_name: 's21' }], search_info: { total: 21, page: 3, limit: 10 } };
            }
            return {
                samples: [{ sample_id: page * 10, sample_name: `s${page * 10}` }],
                search_info: { total: deleted ? 20 : 21, page, limit: 10 },
            };
        });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(deleteProjectSample).mockImplementation(async () => {
            deleted = true;
            return { message: 'Deleted' };
        });
        const confirmSpy = answerConfirmDialogs(true);

        try {
            const { result } = renderHook(() => useProjectDataTab(77));
            await waitFor(() => expect(result.current.uvpSamples[0]?.sample_name).toBe('s10'));

            act(() => result.current.setUvpPaginationModel({ page: 2, pageSize: 10 }));
            await waitFor(() => expect(result.current.uvpSamples[0]?.sample_name).toBe('s21'));

            act(() => result.current.setSelectedUvpSamples({ type: 'include', ids: new Set([21]) }));
            await act(async () => {
                await result.current.handleDeleteUvpSamples();
            });

            // Page 3 is now past the end: the hook goes back to page 2 and shows its rows.
            await waitFor(() => expect(result.current.uvpPaginationModel.page).toBe(1));
            await waitFor(() => expect(result.current.uvpSamples[0]?.sample_name).toBe('s20'));
            expect(result.current.totalUvpRows).toBe(20);
            expect(result.current.loadingUvp).toBe(false);
            expect(searchProjectSamples).toHaveBeenLastCalledWith(77, expect.objectContaining({ page: 2, limit: 10 }));
        } finally {
            confirmSpy.mockRestore();
        }
    });

    it('TC-P22: steps back to the last non-empty page when the EcoTaxa page comes back empty', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectEcoTaxaSamples).mockImplementation(async (_projectId, { page }) =>
            page === 1
                ? { samples: [makeEcoTaxaSample({ sample_name: 'etx-1' })], search_info: { total: 5, page: 1, limit: 10 } }
                : { samples: [], search_info: { total: 5, page, limit: 10 } },
        );

        const { result } = renderHook(() => useProjectDataTab(77));
        await waitFor(() => expect(result.current.ecoTaxaSamples).toHaveLength(1));

        act(() => result.current.setEcoTaxaPaginationModel({ page: 1, pageSize: 10 }));

        await waitFor(() => expect(result.current.ecoTaxaPaginationModel.page).toBe(0));
        await waitFor(() => expect(result.current.loadingEcoTaxa).toBe(false));
        expect(result.current.ecoTaxaSamples.map((s) => s.sample_name)).toEqual(['etx-1']);
    });

    it('TC-P23: regenerates the pivots of the selected UVP samples, forced, by name', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({
            samples: [
                { sample_id: 1, sample_name: 'a' },
                { sample_id: 2, sample_name: 'b' },
            ],
            search_info: { total: 2, page: 1, limit: 10 },
        });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(regenerateSamplePivots).mockResolvedValue({ task_id: 12, task_status: 'PENDING', task_type: 'REGENERATE_PIVOT' });
        const confirmSpy = answerConfirmDialogs(true);

        try {
            const { result } = renderHook(() => useProjectDataTab(77));
            await waitFor(() => expect(result.current.uvpSamples.length).toBe(2));

            act(() => {
                result.current.setSelectedUvpSamples({ type: 'include', ids: new Set([2]) });
            });
            await act(async () => {
                await result.current.handleRegeneratePivots();
            });

            expect(regenerateSamplePivots).toHaveBeenCalledWith(77, { sample_names: ['b'], force: true });
            expect(result.current.snackbar.severity).toBe('success');
        } finally {
            confirmSpy.mockRestore();
        }
    });

    it('TC-P24: without selection, regenerates every sample; a refused confirmation sends nothing', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({
            samples: [{ sample_id: 1, sample_name: 'a' }],
            search_info: { total: 1, page: 1, limit: 10 },
        });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(regenerateSamplePivots).mockRejectedValue(new Error('Pivots only exist for UVP5 projects'));

        const { result } = renderHook(() => useProjectDataTab(77));
        await waitFor(() => expect(result.current.uvpSamples.length).toBe(1));

        const refuseSpy = answerConfirmDialogs(false);
        try {
            await act(async () => {
                await result.current.handleRegeneratePivots();
            });
            expect(regenerateSamplePivots).not.toHaveBeenCalled();
        } finally {
            refuseSpy.mockRestore();
        }

        const acceptSpy = answerConfirmDialogs(true);
        try {
            await act(async () => {
                await result.current.handleRegeneratePivots();
            });
            expect(regenerateSamplePivots).toHaveBeenCalledWith(77, { sample_names: [], force: true });
            expect(result.current.snackbar).toMatchObject({ open: true, severity: 'error', message: 'Pivots only exist for UVP5 projects' });
        } finally {
            acceptSpy.mockRestore();
        }
    });
});
