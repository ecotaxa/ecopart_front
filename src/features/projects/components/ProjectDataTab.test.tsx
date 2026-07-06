import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

// The EcoTaxa deep-link effect resolves the instance base URL from the profile API.
vi.mock('@/features/userProfile/api/profile.api', () => ({
    getEcoTaxaInstances: vi.fn(),
}));

import { searchProjectSamples, searchProjectEcoTaxaSamples, searchProjectCtdSamples } from '../api/projects.api';
import { deleteProjectSample, getProjectById } from '../api/projects.api';
import type { Project, EcoTaxaSampleData } from '../api/projects.api';
import { getEcoTaxaInstances } from '@/features/userProfile/api/profile.api';
import type { EcoTaxaInstance } from '@/features/userProfile/api/profile.api';
import { ProjectDataTab } from './ProjectDataTab';

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
    sample_name: 'ETX-1',
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
    ecotaxa_instance_url: 'https://ecotaxa.example.fr',
    ...overrides,
});

describe('III. DATA TAB (ProjectDataTab)', () => {
    let confirmSpy: ReturnType<typeof vi.spyOn> | undefined;
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(searchProjectSamples).mockResolvedValue({
            search_info: { total: 45, page: 1, limit: 10 },
            samples: [
                {
                    sample_id: 1,
                    sample_name: 'UVP-1',
                    visual_qc_status_label: 'VALIDATED',
                    sampling_utc_date_time: '20220906',
                    filename: 'file1.raw',
                    sample_type_label: 'Plankton'
                },
                {
                    sample_id: 2,
                    sample_name: 'UVP-2',
                    visual_qc_status_label: 'TO_BE_CHECKED',
                    sampling_utc_date_time: '20220907',
                    filename: 'file2.raw',
                    sample_type_label: 'Plankton'
                },
            ],
        });

        vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({
            search_info: { total: 0, page: 1, limit: 10 },
            samples: [],
        });

        vi.mocked(searchProjectCtdSamples).mockResolvedValue({
            search_info: { total: 0, page: 1, limit: 10 },
            samples: [],
        });

        confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => confirmSpy?.mockRestore());

    const waitForGridText = async (text: string, timeout = 10000) => {
        await waitFor(() => {
            const cells = screen.queryAllByRole('gridcell');
            if (!cells.length) throw new Error('No gridcells yet');
            if (!cells.some(c => c.textContent?.includes(text))) throw new Error(`No cell with ${text}`);
            return true;
        }, { timeout });
    };

    describe('Functional Tests', () => {
        it('TC-P1 - Server-Side Pagination (UVP Samples)', async () => {
            vi.mocked(searchProjectSamples)
                .mockResolvedValueOnce({
                    search_info: { total: 45, page: 1, limit: 10 },
                    samples: [
                        {
                            sample_id: 1,
                            sample_name: 'UVP-1',
                            visual_qc_status_label: 'VALIDATED',
                            sampling_utc_date_time: '20220906',
                            filename: 'file1.raw',
                            sample_type_label: 'Plankton'
                        },
                        {
                            sample_id: 2,
                            sample_name: 'UVP-2',
                            visual_qc_status_label: 'TO_BE_CHECKED',
                            sampling_utc_date_time: '20220907',
                            filename: 'file2.raw',
                            sample_type_label: 'Plankton'
                        },
                    ],
                })
                .mockResolvedValueOnce({
                    search_info: { total: 45, page: 2, limit: 10 },
                    samples: [
                        {
                            sample_id: 3,
                            sample_name: 'UVP-3',
                            visual_qc_status_label: 'VALIDATED',
                            sampling_utc_date_time: '20220908',
                            filename: 'file3.raw',
                            sample_type_label: 'Plankton'
                        },
                    ],
                },);

            render(<ProjectDataTab projectId={77} />);

            // Wait for the DataGrid to render with initial data
            const grid = await waitFor(
                () => screen.getByRole('grid'),
                { timeout: 10000 }
            );
            expect(grid).toBeInTheDocument();

            await waitForGridText('UVP-1');
            expect(screen.getAllByRole('gridcell').some(c => c.textContent?.includes('UVP-1'))).toBeTruthy();

            const nextPageButton = (screen.getAllByRole('button', { name: /Go to next page/i }).find(btn => !btn.hasAttribute('disabled')))!;
            await userEvent.click(nextPageButton);

            await waitForGridText('UVP-3');
            expect(screen.getAllByRole('gridcell').some(c => c.textContent?.includes('UVP-3'))).toBeTruthy();

            // Verify API was called with correct pagination
            await waitFor(() => {
                expect(searchProjectSamples).toHaveBeenCalledWith(77, expect.objectContaining({
                    page: 1,
                    limit: 10
                }));
                expect(searchProjectSamples).toHaveBeenCalledWith(77, expect.objectContaining({
                    page: 2,
                    limit: 10
                }));
            });
        }, 15000);

        it('TC-P2 - Delete UVP Samples Flow', async () => {
            const user = userEvent.setup();
            vi.mocked(deleteProjectSample).mockResolvedValue({ message: 'Deleted' });
            render(<ProjectDataTab projectId={77} />);

            // Wait for data to load
            await waitForGridText('UVP-1');

            const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
            await user.click(checkboxes[0]);
            await user.click(checkboxes[1]);

            expect(await waitFor(
                () => screen.getByText('2 items selected'),
                { timeout: 5000 }
            )).toBeInTheDocument();

            const deleteButtons = await screen.findAllByRole('button', { name: /DELETE/i });
            const enabledDeleteBtn = deleteButtons.find(btn => !btn.hasAttribute('disabled'));
            expect(enabledDeleteBtn).toBeDefined();

            await user.click(enabledDeleteBtn!);

            expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('delete'));
            await waitFor(() => {
                expect(deleteProjectSample).toHaveBeenCalledTimes(2);
                expect(deleteProjectSample).toHaveBeenCalledWith(77, 1);
                expect(deleteProjectSample).toHaveBeenCalledWith(77, 2);
            });
            expect(screen.getAllByText(/0 items selected/i).length).toBeGreaterThanOrEqual(1);
        }, 15000);

        it('TC-P3 - QC Status Icons Mapping', async () => {
            render(<ProjectDataTab projectId={77} />);

            // Wait for data to load
            await waitForGridText('UVP-1');

            // Check for QC status icons
            const successIcon = screen.getByTestId('CheckCircleIcon');
            expect(successIcon).toBeInTheDocument();

            const warningIcon = screen.getByTestId('WarningAmberIcon');
            expect(warningIcon).toBeInTheDocument();
        });

        it('TC-P3b - shows an error state (not "No rows") when the EcoTaxa fetch fails', async () => {
            vi.mocked(searchProjectEcoTaxaSamples).mockRejectedValueOnce(new Error('Cannot get samples'));

            render(<ProjectDataTab projectId={77} />);

            // The EcoTaxa section surfaces the real backend error instead of a silent "No rows".
            expect(
                await screen.findByText(/Failed to load EcoTaxa samples \(Cannot get samples\)/i)
            ).toBeInTheDocument();
        });
    });

    describe('Accessibility Tests', () => {
        it('TC-P4 - Tooltips A11y on Icons', async () => {
            const user = userEvent.setup();
            render(<ProjectDataTab projectId={77} />);

            // Wait for data to load
            await waitForGridText('UVP-1');

            // Verify QC status icons are rendered (CheckCircleIcon for VALIDATED)
            const successIcon = screen.getByTestId('CheckCircleIcon');
            expect(successIcon).toBeInTheDocument();

            await user.hover(successIcon);
            expect(await screen.findByRole('tooltip')).toHaveTextContent(/Validated/i);

            const warningIcon = screen.getByTestId('WarningAmberIcon');
            expect(warningIcon).toBeInTheDocument();

            // Verify icon has accessible name or is wrapped in accessible element
            const iconContainer = successIcon.parentElement;
            expect(iconContainer).toBeTruthy();
            expect(iconContainer?.className).toBeDefined();
        });

        it('TC-P5 - Action Bar Focus Management', async () => {
            const user = userEvent.setup();
            render(<ProjectDataTab projectId={77} />);

            // Wait for data to load
            await waitFor(
                () => screen.getByText('UVP-1'),
                { timeout: 10000 }
            );

            // Find delete button - should be disabled initially (no selection)
            const deleteButtons = await screen.findAllByRole('button', { name: /DELETE/i });
            const deleteBtnInitial = deleteButtons[0]; // UVP section button
            expect(deleteBtnInitial).toBeDisabled();

            // Select a row
            const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
            await user.click(checkboxes[0]);

            // Button should now be enabled
            expect(deleteBtnInitial).not.toBeDisabled();

            // Test focus
            deleteBtnInitial.focus();
            expect(deleteBtnInitial).toHaveFocus();
        });

        it('TC-P6 - Select all activates UVP actions', async () => {
            const user = userEvent.setup();
            render(<ProjectDataTab projectId={77} />);

            await waitForGridText('UVP-1');

            const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
            await user.click(selectAllCheckbox);

            await waitFor(() => {
                const selectionLabels = screen.getAllByText(/items selected/i);
                expect(selectionLabels.some((label) => label.textContent?.includes('2'))).toBe(true);
            }, { timeout: 5000 });

            const deleteButtons = await screen.findAllByRole('button', { name: /DELETE/i });
            const enabledDeleteBtn = deleteButtons.find(btn => !btn.hasAttribute('disabled'));
            expect(enabledDeleteBtn).toBeDefined();
        }, 15000);
    });

    describe('EcoTaxa deep-link', () => {
        // TC-P7: clicking an EcoTaxa row deep-links into the linked EcoTaxa instance.
        it('TC-P7 - opens the EcoTaxa gallery URL in a new tab when clicking a linked EcoTaxa row', async () => {
            const user = userEvent.setup();
            vi.mocked(getProjectById).mockResolvedValueOnce(
                makeProject({ ecotaxa_project_id: 20092, ecotaxa_instance_id: 1 }),
            );
            vi.mocked(getEcoTaxaInstances).mockResolvedValue([
                makeInstance({ ecotaxa_instance_id: 1, ecotaxa_instance_url: 'https://ecotaxa.example.fr' }),
            ]);
            vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({
                search_info: { total: 1, page: 1, limit: 10 },
                samples: [makeEcoTaxaSample({ sample_name: 'ETX-1', ecotaxa_sample_id: 5001 })],
            });
            const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

            try {
                render(<ProjectDataTab projectId={77} />);

                // Ensure the deep-link effect resolved the instance before clicking.
                await waitFor(() => expect(getEcoTaxaInstances).toHaveBeenCalled());
                await user.click(await screen.findByText('ETX-1'));

                await waitFor(() =>
                    expect(openSpy).toHaveBeenCalledWith(
                        'https://ecotaxa.example.fr/prj/20092?samples=5001',
                        '_blank',
                        'noopener,noreferrer',
                    ),
                );
            } finally {
                openSpy.mockRestore();
            }
        });

        // TC-P8: with no EcoTaxa link there is no URL to open, so the row click is inert.
        it('TC-P8 - does not open a tab when clicking an EcoTaxa row on an unlinked project', async () => {
            const user = userEvent.setup();
            // getProjectById keeps its default (unlinked) resolution from the mock factory.
            vi.mocked(searchProjectEcoTaxaSamples).mockResolvedValue({
                search_info: { total: 1, page: 1, limit: 10 },
                samples: [makeEcoTaxaSample({ sample_name: 'ETX-1', ecotaxa_sample_id: 5001 })],
            });
            const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

            try {
                render(<ProjectDataTab projectId={77} />);

                await waitFor(() => expect(getProjectById).toHaveBeenCalled());
                await user.click(await screen.findByText('ETX-1'));

                expect(openSpy).not.toHaveBeenCalled();
            } finally {
                openSpy.mockRestore();
            }
        });
    });
});
