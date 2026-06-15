import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('../api/projects.api', () => ({
    searchProjectSamples: vi.fn(),
    searchProjectEcoTaxaSamples: vi.fn(),
    searchProjectCtdSamples: vi.fn(),
    deleteProjectSample: vi.fn(),
    deleteProjectEcoTaxaSamples: vi.fn(),
    deleteProjectCtdSamples: vi.fn(),
}));

import { searchProjectSamples, searchProjectEcoTaxaSamples, searchProjectCtdSamples, deleteProjectSample, deleteProjectCtdSamples } from '../api/projects.api';
import { useProjectDataTab } from './useProjectDataTab';

describe('hooks/useProjectDataTab', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-P6: fetches UVP samples and exposes pagination info', async () => {
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

    it('TC-P7: deletes selected UVP samples and refreshes data', async () => {
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

    it('TC-P8: counts exclude selection as selected rows for UVP samples', async () => {
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

    it('TC-P9: deletes selected CTD samples and refreshes data', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });
        vi.mocked(searchProjectCtdSamples)
            .mockResolvedValueOnce({
                samples: [{ sample_name: 'ctd-1', ctd_import_date: '2024-01-15T10:30:00.000Z', file_extension: 'ctd' }],
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
});
