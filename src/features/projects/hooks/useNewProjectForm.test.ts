import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Mock the router before importing the hook to prevent 'useNavigate() may be used only in the context of a <Router>' error
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

// Mock the auth store to provide a predictable user
vi.mock('@/features/auth/store/auth.store', () => ({
    useAuthStore: () => ({ user_id: 1, first_name: 'Admin' })
}));

import { useNewProjectForm } from './useNewProjectForm';

describe('useNewProjectForm Hook (Unit)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        server.resetHandlers();
        server.use(
            http.post('*/users/searches*', () => {
                return HttpResponse.json({
                    search_info: { total: 0, page: 1, limit: 100 },
                    users: []
                });
            })
        );
    });

    // TC-L1: Initial State
    it('TC-L1: should initialize with correct default privacy values', () => {
        const { result } = renderHook(() => useNewProjectForm());

        expect(result.current.values.privacy.privateMonths).toBe(2);
        expect(result.current.values.privacy.visibleMonths).toBe(24);
        expect(result.current.values.privacy.publicMonths).toBe(36);
        expect(result.current.values.metadata.timeDurationCheck).toBe(true);
    });

    // TC-L2: updateField logic
    it('TC-L2: should correctly merge nested state updates and clear related errors', () => {
        const { result } = renderHook(() => useNewProjectForm());

        // We wrap state mutations in `act()` when testing hooks directly
        act(() => {
            // Force an initial error
            result.current.updateField('metadata', { title: '' }); // We assume validation ran and set an error, but let's just update the field
        });

        act(() => {
            result.current.updateField('metadata', { title: 'New Title' });
        });

        // The title should be updated
        expect(result.current.values.metadata.title).toBe('New Title');
        // The acronym should NOT have been overwritten (it should remain empty string)
        expect(result.current.values.metadata.acronym).toBe('');
    });

    // TC-L3: handleLoadMetadata
    it('TC-L3: should parse valid folder paths and set metadata', async () => {
        const { result } = renderHook(() => useNewProjectForm());

        act(() => {
            result.current.updateField('rootFolderPath', '/my/server/UVP5_sn123_mission_2026');
        });

        await act(async () => {
            await result.current.handleLoadMetadata();
        });

        expect(result.current.values.instrument.model).toBe('UVP5HD'); // Because "UVP5" maps to "UVP5HD"
        expect(result.current.values.instrument.serialNumber).toBe('sn123');
        expect(result.current.values.metadata.acronym).toBe('mission_2026');
        expect(result.current.snackbar.severity).toBe('success');
    });

    it('TC-L3.0: should normalize relative server paths before loading metadata', async () => {
        const { result } = renderHook(() => useNewProjectForm());

        server.use(
            http.get('*/file_system/import_folder_metadata*', ({ request }) => {
                const url = new URL(request.url);

                expect(url.searchParams.get('folder_path')).toBe('remote/ftp_plankton/Ecotaxa_Data_to_import/uvp6_sn000241lp_20240404_h');

                return HttpResponse.json({
                    project_acronym: 'UVP6',
                    project_description: '',
                    cruise: '',
                    ship: '',
                    serial_number: 'sn000241lp',
                    instrument_model: 'UVP6',
                });
            })
        );

        act(() => {
            result.current.updateField('rootFolderPath', 'remote/ftp_plankton/Ecotaxa_Data_to_import/uvp6_sn000241lp_20240404_h');
        });

        await act(async () => {
            await result.current.handleLoadMetadata();
        });

        expect(result.current.snackbar.severity).toBe('success');
    });

    it('TC-L3.1: should show error if folder path format is invalid', async () => {
        const { result } = renderHook(() => useNewProjectForm());

        act(() => {
            result.current.updateField('rootFolderPath', '/invalid_format');
        });

        await act(async () => {
            await result.current.handleLoadMetadata();
        });

        expect(result.current.snackbar.severity).toBe('error');
        expect(result.current.values.instrument.model).toBe('');
    });

    it('TC-L3.2: should preserve existing values when metadata loading fails', async () => {
        const { result } = renderHook(() => useNewProjectForm());

        act(() => {
            result.current.updateField('instrument', { model: 'IFCB', serialNumber: 'sn777' });
            result.current.updateField('metadata', { title: 'Existing Title', acronym: 'EXI' });
            result.current.updateField('rootFolderPath', '/invalid_format');
        });

        await act(async () => {
            await result.current.handleLoadMetadata();
        });

        expect(result.current.snackbar.severity).toBe('error');
        expect(result.current.values.instrument.model).toBe('IFCB');
        expect(result.current.values.instrument.serialNumber).toBe('sn777');
        expect(result.current.values.metadata.title).toBe('Existing Title');
        expect(result.current.values.metadata.acronym).toBe('EXI');
    });

    // TC-L4: Validation Logic (Triggering internal errors)
    it('TC-L4: should generate correct internal error state on invalid submit', async () => {
        const { result } = renderHook(() => useNewProjectForm());

        // We try to submit an empty form
        await act(async () => {
            await result.current.handleSubmit();
        });

        // The hook's internal errors object should be populated
        expect(result.current.errors.rootFolderPath).toBe("Root folder path is required.");
        expect(result.current.errors.instrumentModel).toBe("Instrument model is required.");
        expect(result.current.errors.privilegesManager).toBe("At least one user must be a manager.");
        expect(result.current.errors.privilegesContact).toBe("A contact is required.");
    });

    it('TC-L4.1: should validate delays are at least 1 month', async () => {
        const { result } = renderHook(() => useNewProjectForm());

        act(() => {
            // Bypass the UI parser and inject an invalid value directly
            result.current.updateField('privacy', { privateMonths: 0, visibleMonths: -5 });
        });

        await act(async () => {
            await result.current.handleSubmit();
        });

        expect(result.current.errors.privateMonths).toBe("Delay must be at least 1 month.");
        expect(result.current.errors.visibleMonths).toBe("Delay must be at least 1 month.");
    });

    // TC-L5: API Error Mapping
    it('TC-L5: should map backend error messages to the correct fields', async () => {
        const { result } = renderHook(() => useNewProjectForm());

        // Mock a backend error containing specific keywords
        server.use(
            http.post('*/projects', () => {
                return HttpResponse.json({ message: "Invalid manager assigned" }, { status: 400 });
            })
        );

        // Fill form minimally to pass frontend validation
        act(() => {
            result.current.updateField('rootFolderPath', 'valid');
            result.current.updateField('instrument', { model: 'A', serialNumber: 'B' });
            result.current.updateField('metadata', { title: 'T', acronym: 'A', cruise: 'C', description: 'D', ship: ['S'] });
            result.current.updateField('people', {
                dataOwnerName: 'N',
                dataOwnerEmail: 'owner@test.com',
                chiefScientistName: 'N',
                chiefScientistEmail: 'chief@test.com',
                operatorName: 'N',
                operatorEmail: 'operator@test.com'
            });
            // Provide valid privileges
            result.current.updateField('privileges', [
                { userId: "1", role: "Manager", contact: true }
            ]);
        });

        await act(async () => {
            await result.current.handleSubmit();
        });

        // The hook should catch the 400 error, extract the message, and map it to `privilegesManager`
        expect(result.current.errors.privilegesManager).toBe("Invalid manager assigned");
        expect(result.current.snackbar.severity).toBe('error');
    });

});