import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('../api/projects.api', () => ({
    searchProjectSamples: vi.fn(),
    searchProjectEcoTaxaSamples: vi.fn(),
    deleteProjectSample: vi.fn(),
}));

import { searchProjectSamples, searchProjectEcoTaxaSamples, deleteProjectSample } from '../api/projects.api';
import { useProjectDataTab } from './useProjectDataTab';

describe('hooks/useProjectDataTab', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-P6: fetches UVP samples and exposes pagination info', async () => {
        vi.mocked(searchProjectSamples).mockResolvedValue({
            samples: [{ sample_id: 1, sample_name: 'a' }],
            search_info: { total: 10, page: 1, limit: 10 }
        });
        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({ samples: [], search_info: { total: 0, page: 1, limit: 10 } });

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
        vi.mocked(deleteProjectSample).mockResolvedValue({ message: 'Deleted' });
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        const { result } = renderHook(() => useProjectDataTab(77));

        await waitFor(() => expect(result.current.uvpSamples.length).toBe(2));

        result.current.setSelectedUvpSamples({ type: 'include', ids: new Set([1, 2]) });

        await waitFor(() => expect(result.current.uvpSelectionCount).toBe(2));

        await result.current.handleDeleteUvpSamples();

        expect(deleteProjectSample).toHaveBeenCalledTimes(2);
        expect(deleteProjectSample).toHaveBeenCalledWith(77, 1);
        expect(deleteProjectSample).toHaveBeenCalledWith(77, 2);
        await waitFor(() => expect(result.current.uvpSelectionCount).toBe(0));
    });
});
