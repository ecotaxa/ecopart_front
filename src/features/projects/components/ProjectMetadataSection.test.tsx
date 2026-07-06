import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// The section fetches ship options on mount; stub it so the tests stay isolated.
vi.mock('@/shared/api/referenceData.api', () => ({
    getShips: vi.fn().mockResolvedValue([]),
}));

import { getShips } from '@/shared/api/referenceData.api';
import { ProjectMetadataSection } from './ProjectMetadataSection';
import type { NewProjectFormValues } from '../types/newProject.types';

const makeMetadata = (
    overrides: Partial<NewProjectFormValues['metadata']> = {},
): NewProjectFormValues['metadata'] => ({
    title: '',
    acronym: '',
    ship: [],
    cruise: '',
    description: '',
    filteredBeforeImport: false,
    timeDurationCheck: true,
    ...overrides,
});

const LOCKED = 'CRUISE_2026';

// M. PROJECT METADATA SECTION (ProjectMetadataSection)
describe('M. PROJECT METADATA SECTION (ProjectMetadataSection)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getShips).mockResolvedValue([]);
    });

    // TC-M1: a loaded/locked title acts as a non-erasable prefix.
    it('TC-M1 - rejects title edits that remove the locked prefix', async () => {
        const onChange = vi.fn();
        render(
            <ProjectMetadataSection
                values={makeMetadata({ title: LOCKED })}
                onChange={onChange}
                lockedTitlePrefix={LOCKED}
            />,
        );

        const input = await screen.findByLabelText(/Project title/i);
        await waitFor(() => expect(getShips).toHaveBeenCalled());

        // Deleting a character from the prefix is rejected...
        fireEvent.change(input, { target: { value: 'CRUISE_202' } });
        // ...as is replacing it with unrelated text.
        fireEvent.change(input, { target: { value: 'X' } });

        expect(onChange).not.toHaveBeenCalled();
    });

    // TC-M2: text can still be appended after the locked prefix.
    it('TC-M2 - allows appending text after the locked prefix', async () => {
        const onChange = vi.fn();
        render(
            <ProjectMetadataSection
                values={makeMetadata({ title: LOCKED })}
                onChange={onChange}
                lockedTitlePrefix={LOCKED}
            />,
        );

        const input = await screen.findByLabelText(/Project title/i);
        await waitFor(() => expect(getShips).toHaveBeenCalled());

        fireEvent.change(input, { target: { value: `${LOCKED} extra` } });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({ title: `${LOCKED} extra` });
    });

    // TC-M3: the field explains the locking behaviour via helper text.
    it('TC-M3 - shows the locked-title helper text when a prefix is set', async () => {
        render(
            <ProjectMetadataSection
                values={makeMetadata({ title: LOCKED })}
                onChange={vi.fn()}
                lockedTitlePrefix={LOCKED}
            />,
        );

        expect(await screen.findByText(/The loaded title cannot be removed/i)).toBeInTheDocument();
    });

    // TC-M4: with no prefix the title is fully editable and shows no lock helper text.
    it('TC-M4 - keeps the title fully editable when no prefix is locked', async () => {
        const onChange = vi.fn();
        render(<ProjectMetadataSection values={makeMetadata()} onChange={onChange} />);

        const input = await screen.findByLabelText(/Project title/i);
        await waitFor(() => expect(getShips).toHaveBeenCalled());

        fireEvent.change(input, { target: { value: 'Anything' } });

        expect(onChange).toHaveBeenCalledWith({ title: 'Anything' });
        expect(screen.queryByText(/cannot be removed/i)).not.toBeInTheDocument();
    });
});
