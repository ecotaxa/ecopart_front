import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PrivacyStatusInfo from './PrivacyStatusInfo';

describe('PrivacyStatusInfo', () => {
    // TC-AL9: the info point defines the four statuses, in the order a project goes through them
    it('TC-AL9: defines Private, Visible, Public and Open on hover', async () => {
        const user = userEvent.setup();
        render(<PrivacyStatusInfo />);

        await user.hover(screen.getByTestId('InfoOutlinedIcon'));

        const tooltip = await screen.findByRole('tooltip');
        const definitions = Array.from(tooltip.querySelectorAll('p')).map((p) => p.textContent);
        expect(definitions).toEqual([
            "Private: the user can see the project's metadata and stats, enough to request access, but nothing else (no sample list, no QC graphs, no export). A project with no dated sample stays private.",
            'Visible: the user can also see the figures, meaning the sample list, sample details and QC graphs. Still no export.',
            'Public: the user can also download the binned particle export.',
            'Open: the user can also download the EcoTaxa classification data. This is the final status, reached once all three delays have passed.',
        ]);
    });
});
